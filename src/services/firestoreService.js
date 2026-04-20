import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { groupService, expenseService } from './api';

// ── GROUPS ──────────────────────────────────────────────────────────────────
// Mutations go via the Express backend (auth-checked, business logic enforced).
// Real-time reads stay on the Firestore SDK directly (IndexedDB cache + live push).

export const groupsService = {
  // POST /api/groups — creates group, enforces server-side auth
  create: async ({ name, description, memberEmails, userEmail, userId }) => {
    const res = await groupService.create({ name, description, memberEmails, userEmail, userId });
    return res.data;
  },

  // Client-side real-time read — still used by EditGroup for a single doc
  getById: async (id) => {
    const snap = await getDoc(doc(db, 'groups', id));
    if (!snap.exists()) throw new Error('Group not found');
    return { id: snap.id, ...snap.data() };
  },

  // Firestore onSnapshot helper — used by Dashboard and GroupDetail
  subscribeAll: (userEmail, onData, onError) => {
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userEmail)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onData(data);
    }, onError);
  },

  subscribeOne: (id, onData, onError) =>
    onSnapshot(doc(db, 'groups', id), (snap) => {
      if (!snap.exists()) { onError(new Error('Group not found')); return; }
      onData({ id: snap.id, ...snap.data() });
    }, onError),

  // PUT /api/groups/:id — only creator can update (enforced on backend)
  update: async (id, { name, description, memberEmails, creatorEmail }) => {
    const res = await groupService.update(id, { name, description, memberEmails, creatorEmail });
    return res.data;
  },

  // DELETE /api/groups/:id — cascade-deletes expenses, only creator can delete
  delete: async (id) => {
    await groupService.delete(id);
  },
};

// ── EXPENSES ─────────────────────────────────────────────────────────────────
// Same pattern: mutations via backend API, reads via Firestore SDK.

export const expensesService = {
  add: async ({ description, amount, groupId, paidBy, splitBetween, category, customAmounts }) => {
    const res = await expenseService.add({
      description, amount, groupId, paidBy, splitBetween,
      ...(category     ? { category }     : {}),
      ...(customAmounts && Object.keys(customAmounts).length > 0 ? { customAmounts } : {}),
    });
    return res.data;
  },

  getByGroup: async (groupId) => {
    const q = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId)
    );
    const snap = await getDocs(q);
    const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return expenses.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  },

  // PUT /api/expenses/:id — only payer can edit (enforced on backend)
  update: async (id, { description, amount, splitBetween, customAmounts }) => {
    const res = await expenseService.update(id, {
      description, amount, splitBetween,
      ...(customAmounts !== undefined ? { customAmounts } : {}),
    });
    return res.data;
  },

  // DELETE /api/expenses/:id — payer or group creator (enforced on backend)
  delete: async (id) => {
    await expenseService.delete(id);
  },
};

// ── BALANCES ──────────────────────────────────────────────────────────────────
// Calculated client-side from the live onSnapshot data — zero extra Firestore reads.

export const balancesService = {
  getBalances: async (groupId) => {
    // Run both reads in parallel — cuts latency roughly in half vs serial awaits
    const [group, expenses] = await Promise.all([
      groupsService.getById(groupId),
      expensesService.getByGroup(groupId),
    ]);

    const balanceMap = {};
    group.members.forEach(email => (balanceMap[email] = 0));

    expenses.forEach(exp => {
      if (balanceMap[exp.paidBy] !== undefined) {
        balanceMap[exp.paidBy] += exp.amount;
      }
      const share = exp.amount / (exp.splitBetween?.length || 1);
      (exp.splitBetween || []).forEach(email => {
        if (balanceMap[email] !== undefined) balanceMap[email] -= share;
      });
    });

    const userSummary = group.members.map(email => ({
      email,
      name: email.split('@')[0],
      balance: Math.round(balanceMap[email] * 100) / 100,
    }));

    // Greedy debt simplification
    const debtors   = userSummary.filter(u => u.balance < -0.01).map(u => ({ ...u, amount: Math.abs(u.balance) }));
    const creditors = userSummary.filter(u => u.balance >  0.01).map(u => ({ ...u, amount: u.balance }));
    const settlements = [];
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
      const debtor   = debtors[d];
      const creditor = creditors[c];
      const amt = Math.min(debtor.amount, creditor.amount);
      if (amt > 0.01) {
        settlements.push({
          from: debtor.email, fromName: debtor.name,
          to: creditor.email, toName: creditor.name,
          amount: parseFloat(amt.toFixed(2)),
        });
      }
      debtor.amount   -= amt;
      creditor.amount -= amt;
      if (debtor.amount   <= 0.01) d++;
      if (creditor.amount <= 0.01) c++;
    }

    return { userSummary, settlements };
  },
};

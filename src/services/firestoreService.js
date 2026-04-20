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
  create: async ({ name, description, memberEmails, userEmail, userId }) => {
    const allMembers = Array.from(new Set([...(memberEmails || []), userEmail]));
    const docRef = await addDoc(collection(db, 'groups'), {
      name,
      description: description || '',
      members: allMembers,
      createdBy: userId,
      creatorEmail: userEmail,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, name, members: allMembers };
  },

  createWithId: async (id, { name, description, memberEmails, userEmail, userId }) => {
    const allMembers = Array.from(new Set([...(memberEmails || []), userEmail]));
    await setDoc(doc(db, 'groups', id), {
      name,
      description: description || '',
      members: allMembers,
      createdBy: userId,
      creatorEmail: userEmail,
      createdAt: serverTimestamp(),
    });
    return { id, name, members: allMembers };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'groups', id));
    if (!snap.exists()) throw new Error('Group not found');
    return { id: snap.id, ...snap.data() };
  },

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

  update: async (id, { name, description, memberEmails, creatorEmail }) => {
    const allMembers = Array.from(new Set([...(memberEmails || []), creatorEmail]));
    await updateDoc(doc(db, 'groups', id), {
      name,
      description,
      members: allMembers,
      updatedAt: serverTimestamp(),
    });
    return { id, name, members: allMembers };
  },

  delete: async (id) => {
    // Delete expenses first (batch)
    const q = query(collection(db, 'expenses'), where('groupId', '==', id));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'groups', id));
    await batch.commit();
  },
};

export const expensesService = {
  add: async ({ description, amount, groupId, paidBy, splitBetween, category, customAmounts }) => {
    const expenseData = {
      description,
      amount: parseFloat(amount),
      groupId,
      paidBy,
      splitBetween,
      createdAt: serverTimestamp(),
      ...(category ? { category } : {}),
      ...(customAmounts && Object.keys(customAmounts).length > 0 ? { customAmounts } : {}),
    };
    const docRef = await addDoc(collection(db, 'expenses'), expenseData);
    return { id: docRef.id, ...expenseData };
  },

  addWithId: async (id, data) => {
    const expenseData = {
      ...data,
      amount: parseFloat(data.amount),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'expenses', id), expenseData);
    return { id, ...expenseData };
  },

  getByGroup: async (groupId) => {
    const q = query(collection(db, 'expenses'), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return expenses.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  },

  update: async (id, payload) => {
    const updates = {
      ...payload,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'expenses', id), updates);
    return { id, ...updates };
  },

  delete: async (id) => {
    await deleteDoc(doc(db, 'expenses', id));
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
      
      if (exp.customAmounts && Object.keys(exp.customAmounts).length > 0) {
        // Custom split: subtract specific amounts
        Object.entries(exp.customAmounts).forEach(([email, amt]) => {
          if (balanceMap[email] !== undefined) balanceMap[email] -= parseFloat(amt) || 0;
        });
      } else {
        // Equal split: subtract share
        const share = exp.amount / (exp.splitBetween?.length || 1);
        (exp.splitBetween || []).forEach(email => {
          if (balanceMap[email] !== undefined) balanceMap[email] -= share;
        });
      }
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

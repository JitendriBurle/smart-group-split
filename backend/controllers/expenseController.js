import admin from 'firebase-admin';

export const addExpense = async (req, res) => {
  const { description, amount, groupId, paidBy, splitBetween, category, customAmounts } = req.body;
  const db = admin.firestore();

  try {
    const expenseData = {
      description,
      amount: parseFloat(amount),
      groupId,
      paidBy, // Email
      splitBetween, // Array of Emails
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(category     ? { category }     : {}),
      ...(customAmounts && Object.keys(customAmounts).length > 0 ? { customAmounts } : {}),
    };

    const docRef = await db.collection('expenses').add(expenseData);
    
    // Convert timestamp for immediate UI response
    res.status(201).json({ id: docRef.id, ...expenseData, createdAt: new Date() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getGroupExpenses = async (req, res) => {
  const db = admin.firestore();
  try {
    const snapshot = await db.collection('expenses')
      .where('groupId', '==', req.params.groupId)
      .orderBy('createdAt', 'desc')
      .get();

    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── UPDATE EXPENSE ──────────────────────────────────────────────────────────
export const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { description, amount, splitBetween, customAmounts } = req.body;
  const db = admin.firestore();

  try {
    const expDoc = await db.collection('expenses').doc(id).get();
    if (!expDoc.exists) return res.status(404).json({ error: 'Expense not found' });

    const expData = expDoc.data();

    // Verify the requesting user is a member of the expense's group
    const groupDoc = await db.collection('groups').doc(expData.groupId).get();
    if (!groupDoc.exists || !groupDoc.data().members.includes(req.user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only the payer can edit the expense
    if (expData.paidBy !== req.user.email) {
      return res.status(403).json({ error: 'Only the expense payer can edit it' });
    }

    const updates = {};
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (splitBetween !== undefined) updates.splitBetween = splitBetween;
    if (customAmounts !== undefined) updates.customAmounts = customAmounts;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('expenses').doc(id).update(updates);
    res.json({ id, ...expData, ...updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE EXPENSE ──────────────────────────────────────────────────────────
export const deleteExpense = async (req, res) => {
  const { id } = req.params;
  const db = admin.firestore();

  try {
    const expDoc = await db.collection('expenses').doc(id).get();
    if (!expDoc.exists) return res.status(404).json({ error: 'Expense not found' });

    const expData = expDoc.data();

    // Verify user is a group member
    const groupDoc = await db.collection('groups').doc(expData.groupId).get();
    if (!groupDoc.exists || !groupDoc.data().members.includes(req.user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only the payer or group creator can delete
    const isCreator = groupDoc.data().createdBy === req.user.uid;
    if (expData.paidBy !== req.user.email && !isCreator) {
      return res.status(403).json({ error: 'Only the expense payer or group creator can delete it' });
    }

    await db.collection('expenses').doc(id).delete();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

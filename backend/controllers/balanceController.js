import admin from 'firebase-admin';

export const getGroupBalances = async (req, res) => {
  const { groupId } = req.params;
  const db = admin.firestore();

  try {
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();

    const expensesSnapshot = await db.collection('expenses')
      .where('groupId', '==', groupId)
      .get();
    const expenses = expensesSnapshot.docs.map(doc => doc.data());

    // 1. Calculate net balances using Emails
    const netBalances = {};
    group.members.forEach(email => {
      netBalances[email] = 0;
    });

    expenses.forEach(expense => {
      const payerEmail = expense.paidBy;
      if (netBalances[payerEmail] !== undefined) {
        netBalances[payerEmail] += expense.amount;
      }

      const splitCount = expense.splitBetween.length;
      const perPerson = expense.amount / splitCount;

      expense.splitBetween.forEach(email => {
        if (netBalances[email] !== undefined) {
          netBalances[email] -= perPerson;
        }
      });
    });

    // 2. Format result
    const userSummary = group.members.map(email => ({
      email,
      name: email.split('@')[0],
      balance: netBalances[email]
    }));

    // 3. Debt simplification (Settlements)
    const debtors = [];
    const creditors = [];

    Object.entries(netBalances).forEach(([email, balance]) => {
      if (balance < -0.01) {
        debtors.push({ email, balance: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ email, balance });
      }
    });

    const settlements = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const amount = Math.min(debtor.balance, creditor.balance);

      settlements.push({
        from: debtor.email,
        fromName: debtor.email.split('@')[0],
        to: creditor.email,
        toName: creditor.email.split('@')[0],
        amount: parseFloat(amount.toFixed(2))
      });

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance < 0.01) dIdx++;
      if (creditor.balance < 0.01) cIdx++;
    }

    res.json({ userSummary, settlements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

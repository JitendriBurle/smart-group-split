import { supabase } from '../config/supabase.js';

export const getGroupBalances = async (req, res) => {
  const { groupId } = req.params;

  try {
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('*, group_members(email)')
      .eq('id', groupId)
      .single();

    if (groupErr || !group) return res.status(404).json({ error: 'Group not found' });
    const members = group.group_members.map(m => m.email);

    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', groupId);

    if (expErr) throw expErr;

    // 1. Calculate net balances
    const netBalances = {};
    members.forEach(email => (netBalances[email] = 0));

    expenses.forEach(exp => {
      const payer = exp.paid_by;
      if (netBalances[payer] !== undefined) {
        netBalances[payer] += parseFloat(exp.amount);
      }
      
      exp.expense_splits.forEach(split => {
        if (netBalances[split.email] !== undefined) {
          if (split.amount !== null) {
            netBalances[split.email] -= parseFloat(split.amount);
          } else {
            // Equal split
            const share = exp.amount / (exp.expense_splits.length || 1);
            netBalances[split.email] -= share;
          }
        }
      });
    });

    // 2. Format result
    const userSummary = members.map(email => ({
      email,
      name: email.split('@')[0],
      balance: Math.round(netBalances[email] * 100) / 100
    }));

    // 3. Debt simplification
    const debtors = [];
    const creditors = [];

    Object.entries(netBalances).forEach(([email, balance]) => {
      if (balance < -0.01) debtors.push({ email, balance: Math.abs(balance) });
      else if (balance > 0.01) creditors.push({ email, balance });
    });

    const settlements = [];
    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx], creditor = creditors[cIdx];
      const amount = Math.min(debtor.balance, creditor.balance);
      if (amount > 0.01) {
        settlements.push({
          from: debtor.email, fromName: debtor.email.split('@')[0],
          to: creditor.email, toName: creditor.email.split('@')[0],
          amount: parseFloat(amount.toFixed(2))
        });
      }
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

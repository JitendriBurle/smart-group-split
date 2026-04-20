import { supabase } from '../config/supabase.js';

export const addExpense = async (req, res) => {
  const { description, amount, groupId, paidBy, splitBetween, category, customAmounts } = req.body;

  try {
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description,
        amount,
        paid_by: paidBy,
        category: category || 'Other'
      })
      .select()
      .single();

    if (error) throw error;

    // Add splits
    const splits = (splitBetween || []).map(email => ({
      expense_id: expense.id,
      email,
      amount: customAmounts ? customAmounts[email] : null
    }));

    if (splits.length > 0) {
      await supabase.from('expense_splits').insert(splits);
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getGroupExpenses = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', req.params.groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, customAmounts, splitBetween } = req.body;

  try {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...(description ? { description } : {}),
        ...(amount ? { amount } : {}),
        ...(category ? { category } : {})
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (splitBetween) {
       await supabase.from('expense_splits').delete().eq('expense_id', id);
       const splits = splitBetween.map(email => ({
         expense_id: id,
         email,
         amount: customAmounts ? customAmounts[email] : null
       }));
       await supabase.from('expense_splits').insert(splits);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

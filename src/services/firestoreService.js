import { supabase } from '../supabase';

// ── GROUPS ──────────────────────────────────────────────────────────────────
export const groupsService = {
  create: async ({ name, description, memberEmails, userEmail, userId }) => {
    const allEmails = Array.from(new Set([...(memberEmails || []), userEmail]));
    
    // 1. Create Group
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || '',
        created_by: userId,
        creator_email: userEmail
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Add Members
    const membersToInsert = allEmails.map(email => ({
      group_id: group.id,
      email
    }));
    await supabase.from('group_members').insert(membersToInsert);

    return group;
  },

  createWithId: async (id, { name, description, memberEmails, userEmail, userId }) => {
    // Note: In Supabase, we usually let DB generate ID, but if we need optimistic:
    const allEmails = Array.from(new Set([...(memberEmails || []), userEmail]));
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        id,
        name,
        description: description || '',
        created_by: userId,
        creator_email: userEmail
      })
      .select()
      .single();

    if (error) throw error;

    const membersToInsert = allEmails.map(email => ({
      group_id: group.id,
      email
    }));
    await supabase.from('group_members').insert(membersToInsert);

    return group;
  },

  getById: async (id) => {
    const { data: group, error } = await supabase
      .from('groups')
      .select('*, group_members(email)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    // Format to match old structure
    return { 
      ...group, 
      members: group.group_members.map(m => m.email),
      createdBy: group.created_by,
      creatorEmail: group.creator_email
    };
  },

  subscribeAll: (userEmail, onData, onError) => {
    // Complex queries in real-time are hard in Supabase, 
    // so we listen to changes and re-fetch if needed
    const channel = supabase
      .channel('groups_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `email=eq.${userEmail}` }, async () => {
         const { data: membership } = await supabase.from('group_members').select('group_id').eq('email', userEmail);
         const groupIds = membership?.map(m => m.group_id) || [];
         if (groupIds.length === 0) {
           onData([]);
           return;
         }
         const { data } = await supabase.from('groups').select('*, group_members(email)').in('id', groupIds);
         const formattedData = (data || []).map(group => ({
           ...group,
           members: group.group_members?.map(m => m.email) || [],
           createdBy: group.created_by,
           creatorEmail: group.creator_email
         }));
         onData(formattedData);
      })
      .subscribe();

    // Initial fetch
    supabase.from('group_members').select('group_id').eq('email', userEmail)
      .then(async ({ data: membership }) => {
        const groupIds = membership?.map(m => m.group_id) || [];
        if (groupIds.length === 0) return onData([]);
        const { data } = await supabase.from('groups').select('*, group_members(email)').in('id', groupIds);
        const formattedData = (data || []).map(group => ({
          ...group,
          members: group.group_members?.map(m => m.email) || [],
          createdBy: group.created_by,
          creatorEmail: group.creator_email
        }));
        onData(formattedData);
      });

    return () => supabase.removeChannel(channel);
  },

  subscribeOne: (id, onData, onError) => {
    const channel = supabase
      .channel(`group_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${id}` }, async () => {
         const d = await groupsService.getById(id);
         onData(d);
      })
      .subscribe();

    // Initial
    groupsService.getById(id).then(onData).catch(onError);

    return () => supabase.removeChannel(channel);
  },

  update: async (id, { name, description, memberEmails, creatorEmail }) => {
    const { data, error } = await supabase
      .from('groups')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    if (memberEmails) {
      // Sync members (delete old, add new)
      await supabase.from('group_members').delete().eq('group_id', id);
      const allMembers = Array.from(new Set([...memberEmails, creatorEmail]));
      await supabase.from('group_members').insert(allMembers.map(email => ({ group_id: id, email })));
    }

    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── EXPENSES ─────────────────────────────────────────────────────────────────
export const expensesService = {
  add: async (payload) => {
    const { description, amount, groupId, paidBy, category, customAmounts } = payload;
    
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
    const splits = (payload.splitBetween || []).map(email => ({
      expense_id: expense.id,
      email,
      amount: customAmounts ? customAmounts[email] : null
    }));

    if (splits.length > 0) {
      await supabase.from('expense_splits').insert(splits);
    }

    return expense;
  },

  addWithId: async (id, payload) => {
    const { description, amount, groupId, paidBy, category, customAmounts } = payload;
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        id,
        group_id: groupId,
        description,
        amount,
        paid_by: paidBy,
        category: category || 'Other'
      })
      .select()
      .single();

    if (error) throw error;

    const splits = (payload.splitBetween || []).map(email => ({
      expense_id: id,
      email,
      amount: customAmounts ? customAmounts[email] : null
    }));

    if (splits.length > 0) {
      await supabase.from('expense_splits').insert(splits);
    }

    return expense;

  },

  getByGroup: async (groupId) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format to match old structure
    return data.map(exp => ({
      ...exp,
      paidBy: exp.paid_by,
      createdAt: exp.created_at,
      splitBetween: exp.expense_splits.map(s => s.email),
      customAmounts: exp.expense_splits.reduce((acc, s) => {
        if (s.amount !== null) acc[s.email] = s.amount;
        return acc;
      }, {})
    }));
  },

  update: async (id, payload) => {
    const { description, amount, category, customAmounts, splitBetween } = payload;
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

    return data;
  },

  delete: async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
  },
};

// ── BALANCES ──────────────────────────────────────────────────────────────────
// Logic remains identical, but inputs are mapped correctly within getByGroup
export const balancesService = {
  getBalances: async (groupId) => {
    const [group, expenses] = await Promise.all([
      groupsService.getById(groupId),
      expensesService.getByGroup(groupId),
    ]);

    const balanceMap = {};
    group.members.forEach(email => (balanceMap[email] = 0));

    expenses.forEach(exp => {
      if (balanceMap[exp.paidBy] !== undefined) {
        balanceMap[exp.paidBy] += parseFloat(exp.amount);
      }
      
      const isCustom = exp.customAmounts && Object.keys(exp.customAmounts).length > 0;
      if (isCustom) {
        Object.entries(exp.customAmounts).forEach(([email, amt]) => {
          if (balanceMap[email] !== undefined) balanceMap[email] -= parseFloat(amt) || 0;
        });
      } else {
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

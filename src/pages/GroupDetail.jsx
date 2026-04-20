import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { groupsService, expensesService } from '../services/firestoreService';
import { categorizeExpense, getSpendingInsights } from '../services/ai';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Users, Receipt, ArrowLeft,
  DollarSign, Calendar, User, CheckCircle,
  Pencil, Trash2, Settings, Sparkles, Tag,
  SplitSquareHorizontal, Sliders, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Food:          'bg-orange-100 text-orange-700',
  Travel:        'bg-sky-100 text-sky-700',
  Rent:          'bg-purple-100 text-purple-700',
  Entertainment: 'bg-pink-100 text-pink-700',
  Shopping:      'bg-yellow-100 text-yellow-700',
  Utilities:     'bg-teal-100 text-teal-700',
  Health:        'bg-red-100 text-red-700',
  Other:         'bg-gray-100 text-gray-600',
};

const CategoryBadge = ({ cat }) => {
  const cls = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>
      <Tag className="w-2.5 h-2.5" /> {cat || 'Other'}
    </span>
  );
};

const GroupDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup]                 = useState(null);
  const [expenses, setExpenses]           = useState([]);
  const [balances, setBalances]           = useState({ userSummary: [], settlements: [] });
  const [groupLoading, setGroupLoading]   = useState(true);
  const [expensesReady, setExpensesReady] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // AI insights state
  const [insight, setInsight]             = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // ── Add Expense form state ──────────────────────────────────────────────────
  const [description, setDescription]     = useState('');
  const [amount, setAmount]               = useState('');
  const [participants, setParticipants]   = useState([]);
  const [splitMode, setSplitMode]         = useState('equal');      // 'equal' | 'custom'
  const [customAmounts, setCustomAmounts] = useState({});           // email → string amount
  const [submitting, setSubmitting]       = useState(false);

  // ── Edit Expense form state ─────────────────────────────────────────────────
  const [editingExpense, setEditingExpense]     = useState(null);
  const [editDesc, setEditDesc]                 = useState('');
  const [editAmount, setEditAmount]             = useState('');
  const [editParticipants, setEditParticipants] = useState([]);
  const [editSplitMode, setEditSplitMode]       = useState('equal');
  const [editCustomAmounts, setEditCustomAmounts] = useState({});
  const [deleteConfirmId, setDeleteConfirmId]   = useState(null);

  // ── Balance recalculation ───────────────────────────────────────────────────
  const recalcBalances = useCallback((currentExpenses, currentGroup) => {
    if (!currentGroup) return;
    const balanceMap = {};
    currentGroup.members.forEach(email => (balanceMap[email] = 0));

    currentExpenses.forEach(exp => {
      if (balanceMap[exp.paidBy] !== undefined) balanceMap[exp.paidBy] += exp.amount;

      // Support both equal and custom splits
      if (exp.customAmounts && Object.keys(exp.customAmounts).length > 0) {
        Object.entries(exp.customAmounts).forEach(([email, amt]) => {
          if (balanceMap[email] !== undefined) balanceMap[email] -= parseFloat(amt) || 0;
        });
      } else {
        const splitList = exp.splitBetween || [];
        const share = exp.amount / (splitList.length || 1);
        splitList.forEach(email => {
          if (balanceMap[email] !== undefined) balanceMap[email] -= share;
        });
      }
    });

    const userSummary = currentGroup.members.map(email => ({
      email, name: email.split('@')[0],
      balance: Math.round(balanceMap[email] * 100) / 100,
    }));

    const debtors   = userSummary.filter(u => u.balance < -0.01).map(u => ({ ...u, amount: Math.abs(u.balance) }));
    const creditors = userSummary.filter(u => u.balance >  0.01).map(u => ({ ...u, amount: u.balance }));
    const settlements = [];
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d], creditor = creditors[c];
      const amt = Math.min(debtor.amount, creditor.amount);
      if (amt > 0.01) settlements.push({
        from: debtor.email, fromName: debtor.name,
        to: creditor.email, toName: creditor.name,
        amount: parseFloat(amt.toFixed(2)),
      });
      debtor.amount -= amt; creditor.amount -= amt;
      if (debtor.amount <= 0.01) d++;
      if (creditor.amount <= 0.01) c++;
    }
    setBalances({ userSummary, settlements });
  }, []);

  // ── Real-time group listener ─────────────────────────────────────────────────
  useEffect(() => {
    setPageLoading(true);
    const unsub = groupsService.subscribeOne(id, (data) => {
      setGroup(data);
      setParticipants(prev => (prev.length === 0 ? data.members : prev));
      setPageLoading(false);
    }, (err) => {
      toast.error('Circle not found');
      navigate('/');
    });

    return () => unsub();
  }, [id, navigate]);

  // ── Real-time expenses listener ──────────────────────────────────────────────
  useEffect(() => {
    setExpensesLoading(true);
    const fetchExpenses = async () => {
       try {
         const data = await expensesService.getByGroup(id);
         setExpenses(data);
         setExpensesReady(true);
         setExpensesLoading(false);
       } catch (err) {
         console.error(err);
         setExpensesReady(true);
         setExpensesLoading(false);
       }
    };
    fetchExpenses();

    // Listen for changes
    const channel = supabase
      .channel(`expenses_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${id}` }, fetchExpenses)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  // ── Recalc balances when data changes ───────────────────────────────────────
  useEffect(() => { recalcBalances(expenses, group); }, [expenses, group, recalcBalances]);

  // ── Fetch AI insights once expenses are ready ────────────────────────────────
  useEffect(() => {
    if (!expensesReady || expenses.length === 0) return;
    setInsightLoading(true);
    getSpendingInsights(expenses)
      .then(text => setInsight(text))
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }, [expensesReady, expenses.length]); // only re-fetch when count changes

  // ── Custom split helpers ─────────────────────────────────────────────────────
  const customTotal = (amounts) =>
    Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  // ── Add Expense ──────────────────────────────────────────────────────────────
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description.trim()) { toast.error('Description is required'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (participants.length === 0) { toast.error('Select at least one participant'); return; }

    if (splitMode === 'custom') {
      const total = customTotal(customAmounts);
      if (Math.abs(total - parseFloat(amount)) > 0.01) {
        toast.error(`Custom amounts ($${total.toFixed(2)}) must equal total ($${parseFloat(amount).toFixed(2)})`);
        return;
      }
    }

    // AI categorise (non-blocking — runs in background after submit)
    const categoryPromise = categorizeExpense(description);

    // 1. Generate local ID for instant save
    const expenseRef = doc(collection(db, "expenses"));
    const expenseId = expenseRef.id;

    const expensePayload = {
      description: description.trim(),
      amount: parseFloat(amount),
      groupId: id,
      paidBy: user.email,
      splitBetween: participants,
      category: 'Other', // temporary placeholder
      ...(splitMode === 'custom' ? { customAmounts } : {}),
    };

    // Close modal & Notify immediately
    setShowAddExpense(false);
    toast.success('Expense added!');
    setDescription(''); setAmount('');
    setParticipants(group?.members || []);
    setSplitMode('equal'); setCustomAmounts({});
    setSubmitting(false);

    // 2. Perform Save & AI Update in background
    (async () => {
      try {
        await expensesService.addWithId(expenseId, expensePayload);
        const aiCategory = await categoryPromise;
        if (aiCategory && aiCategory !== 'Other') {
          await expensesService.update(expenseId, { category: aiCategory });
        }
      } catch (error) {
        console.error("Background save/AI failed:", error);
      }
    })();
  };

  // ── Edit Expense ─────────────────────────────────────────────────────────────
  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditDesc(expense.description);
    setEditAmount(String(expense.amount));
    setEditParticipants(expense.splitBetween || []);
    setEditSplitMode(expense.customAmounts ? 'custom' : 'equal');
    setEditCustomAmounts(expense.customAmounts || {});
  };

  const handleUpdateExpense = (e) => {
    e.preventDefault();
    if (!editDesc.trim()) { toast.error('Description required'); return; }
    if (!editAmount || parseFloat(editAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (editParticipants.length === 0) { toast.error('Select at least one participant'); return; }

    if (editSplitMode === 'custom') {
      const total = customTotal(editCustomAmounts);
      if (Math.abs(total - parseFloat(editAmount)) > 0.01) {
        toast.error(`Custom amounts ($${total.toFixed(2)}) must equal total ($${parseFloat(editAmount).toFixed(2)})`);
        return;
      }
    }

    const payload = {
      description: editDesc.trim(),
      amount: parseFloat(editAmount),
      splitBetween: editParticipants,
      ...(editSplitMode === 'custom' ? { customAmounts: editCustomAmounts } : { customAmounts: {} }),
    };

    const expId = editingExpense.id;
    const oldDesc = editingExpense.description;
    
    setEditingExpense(null);
    toast.success('Expense updated!');

    // Only re-categorize if description changed
    const runUpdate = async () => {
      let finalPayload = { ...payload };
      if (payload.description !== oldDesc) {
        try {
          const category = await categorizeExpense(payload.description);
          finalPayload.category = category;
        } catch (e) { console.error('AI Edit Error:', e); }
      }
      await expensesService.update(expId, finalPayload);
    };

    runUpdate().catch(err => toast.error('Update failed: ' + err.message));
  };

  const handleDeleteExpense = (expId) => {
    setDeleteConfirmId(null);
    toast.success('Expense deleted');
    expensesService.delete(expId).catch(err => toast.error('Delete failed: ' + err.message));
  };

  const toggleParticipant     = (email) => setParticipants(prev => prev.includes(email) ? prev.filter(p => p !== email) : [...prev, email]);
  const toggleEditParticipant = (email) => setEditParticipants(prev => prev.includes(email) ? prev.filter(p => p !== email) : [...prev, email]);

  const formatDate = (ts) => {
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'Just now'; }
  };

  // ── Expense Form (shared) ─────────────────────────────────────────────────────
  const renderExpenseForm = ({
    isEdit, onSubmit,
    desc, setDesc, amt, setAmt,
    parts, togglePart, mode, setMode,
    customs, setCustoms
  }) => (
    <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
      {/* Description */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">What is this for?</label>
        <div className="relative">
          <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          <input
            type="text" required autoFocus={!isEdit}
            className="w-full pl-14 pr-4 py-4 sm:py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-black placeholder:text-gray-300"
            placeholder="Groceries, Hotel, Dinner etc."
            value={desc} onChange={e => setDesc(e.target.value)}
          />
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total Bill Amount</label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
          <input
            type="number" step="0.01" min="0.01" required
            className="w-full pl-14 pr-4 py-4 sm:py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none text-2xl sm:text-3xl font-black placeholder:text-gray-300"
            placeholder="0.00"
            value={amt} onChange={e => setAmt(e.target.value)}
          />
        </div>
      </div>

      {/* Split mode toggle */}
      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Split Type</label>
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button" onClick={() => setMode('equal')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
              mode === 'equal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <SplitSquareHorizontal className="w-4 h-4" /> Equal
          </button>
          <button
            type="button" onClick={() => setMode('custom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
              mode === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Sliders className="w-4 h-4" /> Custom
          </button>
        </div>
      </div>

      {/* Participants (equal mode) */}
      {mode === 'equal' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Split with…</label>
            <span className="text-xs text-indigo-600 font-bold">
              {parts.length > 0 ? `$${(parseFloat(amt || 0) / parts.length).toFixed(2)} each` : 'Select participants'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
            {(group.members || []).map(email => (
              <button key={email} type="button" onClick={() => togglePart(email)}
                className={`p-3 sm:p-4 rounded-2xl text-sm font-black border-2 transition-all flex items-center gap-2 ${
                  parts.includes(email)
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-black ${
                  parts.includes(email) ? 'bg-indigo-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {parts.includes(email) ? '✓' : email[0].toUpperCase()}
                </div>
                <span className="truncate text-xs">{email === user.email ? 'You' : email.split('@')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom amounts */}
      {mode === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Custom Amounts</label>
            <span className={`text-xs font-bold ${
              Math.abs(customTotal(customs) - parseFloat(amt || 0)) < 0.01
                ? 'text-emerald-600'
                : 'text-rose-500'
            }`}>
              ${customTotal(customs).toFixed(2)} / ${parseFloat(amt || 0).toFixed(2)}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(group.members || []).map(email => (
              <div key={email} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600 flex-shrink-0">
                  {email[0].toUpperCase()}
                </div>
                <span className="flex-grow text-sm font-bold text-gray-700 truncate">
                  {email === user.email ? 'You' : email.split('@')[0]}
                </span>
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full pl-6 pr-3 py-2 bg-white border-2 border-gray-100 focus:border-indigo-400 rounded-xl text-sm font-black outline-none transition-all text-right"
                    placeholder="0.00"
                    value={customs[email] || ''}
                    onChange={e => setCustoms(prev => ({ ...prev, [email]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isEdit ? false : submitting}
        className="w-full py-5 sm:py-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-black text-lg sm:text-xl rounded-2xl shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        {isEdit ? 'Save Changes' : (submitting ? 'Saving…' : 'Track Expense')}
      </button>
    </form>
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (groupLoading) return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20">
      <div className="h-6 w-36 bg-gray-100 rounded-xl animate-pulse" />
      <div className="bg-white p-5 sm:p-10 rounded-[24px] sm:rounded-[40px] shadow-sm border border-gray-100 animate-pulse space-y-4">
        <div className="h-4 w-24 bg-indigo-100 rounded" />
        <div className="h-10 w-64 bg-gray-200 rounded-xl" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
        <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-6 w-16 bg-indigo-50 rounded-full" />)}</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        <div className="lg:col-span-2 space-y-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 animate-pulse flex items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 animate-pulse h-48" />
          <div className="bg-indigo-100 p-8 rounded-[40px] animate-pulse h-40" />
        </div>
      </div>
    </div>
  );

  if (!group) return (
    <div className="text-center py-20 text-gray-500 font-bold">
      Group not found. <Link to="/" className="text-indigo-600 underline">Go back</Link>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-bold transition-all group">
        <div className="p-1.5 bg-gray-100 group-hover:bg-indigo-50 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Back to Dashboard
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 bg-white p-5 sm:p-8 lg:p-10 rounded-[24px] sm:rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Expenses Group</p>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-tight">{group.name}</h1>
          <p className="text-gray-500 font-medium max-w-sm text-sm sm:text-base">{group.description || 'Tracking shared expenses for this group.'}</p>
          <div className="flex flex-wrap gap-2">
            {(group.members || []).map(email => (
              <span key={email} className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full">
                {email === user.email ? 'You' : email.split('@')[0]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {group.createdBy === user.uid && (
            <Link
              to={`/group/${id}/edit`}
              className="border-2 border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 px-5 py-3 sm:py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> Edit Group
            </Link>
          )}
          <button
            onClick={() => setShowAddExpense(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-95 whitespace-nowrap text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" /> Add New Expense
          </button>
        </div>
      </header>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">

        {/* ── Expense Timeline ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Timeline</h2>
            <span className="text-sm font-bold text-gray-400">{expensesReady ? `${expenses.length} Records` : '...'}</span>
          </div>

          {!expensesReady ? (
            <div className="space-y-4">
              {[0,1,2].map(i => (
                <div key={i} className="bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 animate-pulse flex items-center gap-4 sm:gap-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="bg-white border-4 border-dashed border-gray-100 rounded-[32px] p-16 text-center space-y-3">
              <Receipt className="w-12 h-12 text-gray-200 mx-auto" />
              <p className="font-black text-gray-400 text-lg">No expenses yet</p>
              <p className="text-gray-400">Click "Add New Expense" to start splitting!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 text-lg sm:text-xl flex-shrink-0">
                        {(expense.paidBy || '?')[0].toUpperCase()}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors text-sm sm:text-base lg:text-lg uppercase tracking-tight truncate">
                          {expense.description}
                        </h4>
                        {/* AI Category badge */}
                        {expense.category && <CategoryBadge cat={expense.category} />}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {expense.paidBy === user.email ? 'You' : (expense.paidBy || '').split('@')[0]}
                          </span>
                          <span className="hidden sm:inline w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(expense.createdAt)}
                          </span>
                          {expense.customAmounts && Object.keys(expense.customAmounts).length > 0 && (
                            <span className="flex items-center gap-1 text-purple-500">
                              <Sliders className="w-3 h-3" /> Custom split
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="text-right space-y-1">
                        <p className="text-lg sm:text-2xl font-black text-gray-900">${expense.amount?.toFixed(2)}</p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] hidden sm:block">
                          {(expense.splitBetween || []).length} participants
                        </p>
                      </div>
                      {(expense.paidBy === user.email || group.createdBy === user.uid) && (
                        <div className="flex gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                          {expense.paidBy === user.email && (
                            <button onClick={() => openEditExpense(expense)} title="Edit expense"
                              className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {deleteConfirmId === expense.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDeleteExpense(expense.id)}
                                className="px-2 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg transition-all">
                                Confirm
                              </button>
                              <button onClick={() => setDeleteConfirmId(null)}
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-black rounded-lg transition-all">
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(expense.id)} title="Delete expense"
                              className="w-8 h-8 sm:w-9 sm:h-9 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="space-y-6">
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-indigo-100 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black">AI Insight</h3>
            </div>
            {insightLoading ? (
              <div className="flex items-center gap-3 opacity-70">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span className="text-sm font-bold">Analysing your spending…</span>
              </div>
            ) : insight ? (
              <p className="text-sm font-semibold leading-relaxed text-white/90">{insight}</p>
            ) : expenses.length === 0 ? (
              <p className="text-sm font-semibold text-white/70">Add some expenses to unlock AI-powered spending insights.</p>
            ) : (
              <p className="text-sm font-semibold text-white/70">Insights loading…</p>
            )}
          </div>

          {/* Who Pays Who */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-xl font-black text-gray-900 border-b-2 border-gray-50 pb-4">Who Pays Who</h3>
            <div className="space-y-4">
              {balances.settlements.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">All balances are settled!</p>
                </div>
              ) : (
                balances.settlements.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-200 transition-all">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">{s.from === user.email ? 'You' : s.fromName}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        pays {s.to === user.email ? 'You' : s.toName}
                      </p>
                    </div>
                    <p className="text-lg font-black text-indigo-600">${s.amount.toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Net Balances */}
          <div className="bg-indigo-600 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-indigo-100 space-y-6 text-white">
            <h3 className="text-xl font-black pb-2 border-b-4 border-indigo-400/30">Net Balances</h3>
            <div className="space-y-3">
              {balances.userSummary.map((summary) => (
                <div key={summary.email} className="flex justify-between items-center bg-indigo-700/50 p-4 rounded-2xl border border-indigo-500/30">
                  <span className="text-sm font-bold truncate pr-4">
                    {summary.email === user.email ? 'You' : summary.name}
                  </span>
                  <span className={`text-lg font-black ${
                    summary.balance > 0.01 ? 'text-emerald-300'
                    : summary.balance < -0.01 ? 'text-rose-300'
                    : 'text-indigo-300'
                  }`}>
                    {summary.balance > 0.01 ? '+' : summary.balance < -0.01 ? '-' : ''}
                    ${Math.abs(summary.balance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Add Expense Modal ─────────────────────────────────────────── */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowAddExpense(false)} />
          <div className="relative bg-white w-full sm:max-w-xl p-6 sm:p-10 rounded-t-[32px] sm:rounded-[40px] shadow-2xl border border-gray-100 animate-fade-in max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Post New Bill</h2>
              <button onClick={() => setShowAddExpense(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-black transition-all">✕</button>
            </div>
            {renderExpenseForm({
              isEdit: false, onSubmit: handleAddExpense,
              desc: description, setDesc: setDescription,
              amt: amount, setAmt: setAmount,
              parts: participants, togglePart: toggleParticipant,
              mode: splitMode, setMode: setSplitMode,
              customs: customAmounts, setCustoms: setCustomAmounts,
            })}
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ────────────────────────────────────────── */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setEditingExpense(null)} />
          <div className="relative bg-white w-full sm:max-w-xl p-6 sm:p-10 rounded-t-[32px] sm:rounded-[40px] shadow-2xl border border-gray-100 animate-fade-in max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Edit Expense</h2>
              <button onClick={() => setEditingExpense(null)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-black transition-all">✕</button>
            </div>
            {renderExpenseForm({
              isEdit: true, onSubmit: handleUpdateExpense,
              desc: editDesc, setDesc: setEditDesc,
              amt: editAmount, setAmt: setEditAmount,
              parts: editParticipants, togglePart: toggleEditParticipant,
              mode: editSplitMode, setMode: setEditSplitMode,
              customs: editCustomAmounts, setCustoms: setEditCustomAmounts,
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;

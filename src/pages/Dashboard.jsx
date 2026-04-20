import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { groupsService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Users, ChevronRight, Wallet, TrendingUp, TrendingDown,
  X, FileText, Mail, Loader2, Pencil, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 animate-pulse space-y-6">
    <div className="flex justify-between items-start">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
      <div className="w-5 h-5 bg-gray-100 rounded" />
    </div>
    <div className="space-y-2">
      <div className="h-5 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-50 rounded w-1/2" />
    </div>
    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
      <div className="flex -space-x-2">
        {[0,1,2].map(i => <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white" />)}
      </div>
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  </div>
);

// ── Quick-Create modal ────────────────────────────────────────────────────────
const CreateGroupModal = ({ user, onClose, onCreated }) => {
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [memberEmail, setMe]      = useState('');
  const [memberEmails, setMEmails]= useState([]);
  const [saving, setSaving]       = useState(false);

  const addMember = () => {
    if (!memberEmail) return;
    if (!memberEmail.includes('@')) { toast.error('Invalid email'); return; }
    if (memberEmails.includes(memberEmail) || memberEmail === user.email) {
      toast.error('Already in list'); return;
    }
    setMEmails(prev => [...prev, memberEmail]);
    setMe('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Group name required');
    setSaving(true);
    try {
      await groupsService.create({
        name: name.trim(), description, memberEmails,
        userEmail: user.email, userId: user.uid,
      });
      toast.success('Group created!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg p-6 sm:p-10 rounded-t-[32px] sm:rounded-[40px] shadow-2xl border border-gray-100 animate-fade-in max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">New Circle</h2>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-black transition-all">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Group Title *</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="text" required autoFocus
                className="w-full pl-14 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                placeholder="Trip to Goa, Rent, etc."
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="text"
                className="w-full pl-14 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                placeholder="What's this about?"
                value={description} onChange={e => setDesc(e.target.value)}
              />
            </div>
          </div>

          {/* Invite members */}
          <div className="space-y-3 pt-4 border-t-2 border-dashed border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invite Members</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="email"
                  className="w-full pl-14 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                  placeholder="friend@example.com"
                  value={memberEmail} onChange={e => setMe(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
                />
              </div>
              <button type="button" onClick={addMember}
                className="px-6 py-4 sm:py-0 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all active:scale-95 whitespace-nowrap">
                Add
              </button>
            </div>

            {/* Member badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="bg-indigo-600 text-white text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">✓</span>
                {user.email} (You)
              </span>
              {memberEmails.map(email => (
                <span key={email} className="bg-white border-2 border-gray-100 text-gray-800 text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-2">
                  <span className="truncate max-w-[130px]">{email}</span>
                  <button type="button" onClick={() => setMEmails(p => p.filter(m => m !== email))}
                    className="text-gray-300 hover:text-rose-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-black text-lg rounded-2xl shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Delete confirm inline for a group card ────────────────────────────────────
const DeleteGroupModal = ({ group, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await groupsService.delete(group.id);
      toast.success('Group deleted');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete group');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm p-8 rounded-[32px] shadow-2xl border border-gray-100 animate-fade-in space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900">Delete "{group.name}"?</h3>
          <p className="text-sm text-gray-400 font-medium">This will permanently delete the group and <span className="font-black text-gray-700">all its expenses</span>.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-black rounded-2xl hover:border-gray-300 transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [groups, setGroups]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null); // group object
  const { user, userProfile }             = useAuth();
  const userEmail                         = user?.email;

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }

    const q = query(collection(db, 'groups'), where('members', 'array-contains', userEmail));
    const unsub = onSnapshot(q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort: newest first
        data.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return tb - ta;
        });
        setGroups(data);
        setLoading(false);
      },
      () => { toast.error('Failed to load groups'); setLoading(false); }
    );
    return () => unsub();
  }, [userEmail]);

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-12 w-36 bg-indigo-100 rounded-2xl animate-pulse" />
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[0,1,2].map(i => (
          <div key={i} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 animate-pulse">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-8 w-12 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {[0,1,2].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Financial Overview</h1>
          <p className="text-gray-500 font-medium text-sm sm:text-base">
            Welcome back, {userProfile?.name || user?.email?.split('@')[0] || 'there'}!
          </p>
        </div>
        <button
          id="btn-create-group"
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base"
        >
          <Plus className="w-5 h-5" /> Create Group
        </button>
      </header>

      {/* ── Quick Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-3 sm:p-4 bg-indigo-50 rounded-2xl text-indigo-600 flex-shrink-0">
            <Wallet className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Groups</p>
            <p className="text-3xl font-black text-gray-900">{groups.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-3 sm:p-4 bg-emerald-50 rounded-2xl text-emerald-600 flex-shrink-0">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">You are Owed</p>
            <p className="text-3xl font-black text-emerald-600">$0.00</p>
          </div>
        </div>
        <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-3 sm:p-4 bg-rose-50 rounded-2xl text-rose-600 flex-shrink-0">
            <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">You Owe</p>
            <p className="text-3xl font-black text-rose-600">$0.00</p>
          </div>
        </div>
      </div>

      {/* ── Groups Grid ─────────────────────────────────────────────────── */}
      <section className="space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">My Groups</h2>
          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{groups.length} Total</span>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white border-4 border-dashed border-gray-100 rounded-[32px] sm:rounded-[40px] p-12 sm:p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No groups yet</h3>
            <p className="text-gray-400 max-w-xs mx-auto text-sm">Create a group to start tracking and splitting expenses with your friends.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-block text-indigo-600 font-black hover:underline mt-4"
            >
              Create your first group →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            {groups.map((group) => (
              <div key={group.id} className="relative group">
                <Link
                  to={`/group/${group.id}`}
                  className="block bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-50" />

                  <div className="relative z-10 space-y-5 sm:space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="p-3 sm:p-4 bg-gray-50 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all duration-300">
                        <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-all" />
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-400 font-bold mt-1 line-clamp-1">
                        {group.description || 'Shared Expense Group'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {(group.members || []).slice(0, 3).map((email, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                            {(email || '?')[0]}
                          </div>
                        ))}
                        {(group.members || []).length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-400">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{(group.members || []).length} Members</span>
                    </div>
                  </div>
                </Link>

                {/* Action buttons — visible only to creator */}
                {group.createdBy === user?.uid && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                    <Link
                      to={`/group/${group.id}/edit`}
                      title="Edit group"
                      className="w-8 h-8 bg-white border border-gray-200 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white text-gray-500 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      title="Delete group"
                      onClick={e => { e.preventDefault(); setDeleteTarget(group); }}
                      className="w-8 h-8 bg-white border border-gray-200 hover:bg-red-600 hover:border-red-600 hover:text-white text-gray-500 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateGroupModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={() => {}} // onSnapshot handles the refresh automatically
        />
      )}
      {deleteTarget && (
        <DeleteGroupModal
          group={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

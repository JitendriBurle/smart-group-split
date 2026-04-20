import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { groupsService } from '../services/firestoreService';
import toast from 'react-hot-toast';
import { Users, Plus, X, Save, ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EditGroup = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberEmails, setMemberEmails] = useState([]);
  const [creatorEmail, setCreatorEmail] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Real-time group listener — same pattern as GroupDetail
  useEffect(() => {
    const unsub = groupsService.subscribeOne(
      id,
      (groupData) => {
        // Permission: only creator can edit
        if (groupData.createdBy !== user.uid) {
          toast.error('Only the group creator can edit this group');
          navigate(`/group/${id}`);
          return;
        }
        setName(groupData.name);
        setDescription(groupData.description || '');
        setCreatorEmail(groupData.creatorEmail || user.email);
        // Members list excludes the creator (shown as Owner badge)
        setMemberEmails(
          (groupData.members || []).filter(e => e !== (groupData.creatorEmail || user.email))
        );
        setPageLoading(false);
      },
      (err) => {
        toast.error('Failed to load group');
        navigate('/');
      }
    );
    return () => unsub();
  }, [id, user.uid, navigate]);

  const addMember = () => {
    if (!memberEmail) return;
    if (!memberEmail.includes('@')) { toast.error('Invalid email format'); return; }
    if (memberEmails.includes(memberEmail) || memberEmail === creatorEmail) {
      toast.error('User already in group');
      return;
    }
    setMemberEmails([...memberEmails, memberEmail]);
    setMemberEmail('');
  };

  const removeMember = (email) => setMemberEmails(memberEmails.filter(m => m !== email));

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Group name required');

    const payload = { name: name.trim(), description, memberEmails, creatorEmail };

    // Optimistic — navigate immediately
    toast.success('Group updated!');
    navigate(`/group/${id}`);

    groupsService.update(id, payload).catch(err => {
      toast.error('Failed to update: ' + (err.message || 'Please try again'));
    });
  };

  const handleDelete = async () => {
    // Navigate immediately, delete in background
    toast.success('Group deleted');
    navigate('/');

    groupsService.delete(id).catch(err => {
      toast.error('Delete failed: ' + (err.message || 'Please try again'));
    });
  };

  if (pageLoading) return (
    <div className="max-w-3xl mx-auto pt-4 sm:pt-10 space-y-6 animate-fade-in">
      <div className="h-6 w-36 bg-gray-100 rounded-xl animate-pulse" />
      <div className="bg-white p-6 sm:p-12 rounded-[28px] sm:rounded-[50px] shadow-2xl border border-gray-100 animate-pulse space-y-8">
        <div className="h-10 w-3/4 bg-gray-200 rounded-xl" />
        <div className="h-14 bg-gray-100 rounded-2xl" />
        <div className="h-14 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pt-4 sm:pt-10">
      <Link to={`/group/${id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-bold transition-all group mb-6 sm:mb-8 block">
        <div className="p-1.5 bg-gray-100 group-hover:bg-indigo-50 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Back to Group
      </Link>

      <div className="bg-white p-6 sm:p-10 lg:p-12 rounded-[28px] sm:rounded-[50px] shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 -mr-32 -mt-32 rounded-full opacity-30" />

        <div className="flex items-center gap-4 mb-8 sm:mb-12 relative z-10">
          <div className="p-4 sm:p-5 bg-indigo-600 rounded-[20px] sm:rounded-[25px] text-white shadow-xl shadow-indigo-100 flex-shrink-0">
            <Users className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Edit Group</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Update group details</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Group Title</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  required
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-black text-lg"
                  placeholder="Trip to Goa, Rent etc."
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brief Description</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                  placeholder="What's this about?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="space-y-4 pt-6 border-t-2 border-dashed border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Members</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="email"
                  className="w-full pl-14 pr-4 py-4 sm:py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                  placeholder="mate@example.com"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
                />
              </div>
              <button
                type="button"
                onClick={addMember}
                className="px-8 py-4 sm:py-0 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 whitespace-nowrap"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {/* Creator badge — always present, non-removable */}
              <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-3 shadow-lg shadow-indigo-100">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">✓</div>
                {creatorEmail} (Owner)
              </div>
              {memberEmails.map(email => (
                <div key={email} className="bg-white border-2 border-gray-100 text-gray-900 px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-3 hover:border-rose-200 transition-all group">
                  <span className="truncate max-w-[150px]">{email}</span>
                  <button type="button" onClick={() => removeMember(email)} className="text-gray-300 hover:text-rose-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-4 active:scale-[0.98] mt-8"
          >
            <Save className="w-7 h-7" /> Save Changes
          </button>
        </form>

        {/* Danger zone */}
        <div className="mt-10 pt-8 border-t-2 border-dashed border-red-100 relative z-10">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">⚠ Danger Zone</p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-2xl transition-all border-2 border-red-100 hover:border-red-300 active:scale-95"
            >
              <Trash2 className="w-5 h-5" />
              Delete this Group
            </button>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 space-y-4">
              <p className="font-black text-red-700">Are you sure? This will permanently delete the group and <span className="underline">all its expenses</span>.</p>
            <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Yes, Delete Everything
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 font-black rounded-xl transition-all hover:border-gray-300 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditGroup;

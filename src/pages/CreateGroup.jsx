import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsService } from '../services/firestoreService';
import { db } from '../firebase';
import { collection, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Users, Plus, X, Save, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberEmails, setMemberEmails] = useState([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const addMember = () => {
    if (!memberEmail) return;
    if (!memberEmail.includes('@')) {
      toast.error('Invalid email format');
      return;
    }
    if (memberEmails.includes(memberEmail) || memberEmail === user.email) {
      toast.error('User already in list');
      return;
    }
    setMemberEmails([...memberEmails, memberEmail]);
    setMemberEmail('');
  };

  const removeMember = (email) => {
    setMemberEmails(memberEmails.filter((m) => m !== email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Group name required');
    setSaving(true);
    try {
      // 1. Generate ID locally for instant navigation
      const groupRef = doc(collection(db, "groups"));
      const groupId = groupRef.id;

      const allMembers = Array.from(new Set([...memberEmails, user.email]));

      // 2. Clear UI fast
      setSaving(true);
      toast.success('New circle created!');
      navigate(`/group/${groupId}`); // Navigate immediately

      // 3. Save to Firestore in background
      await groupsService.createWithId(groupId, {
        name: name.trim(),
        description,
        memberEmails: allMembers,
        userEmail: user.email,
        userId: user.uid,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to create group');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pt-4 sm:pt-10">
      <div className="bg-white p-6 sm:p-10 lg:p-12 rounded-[28px] sm:rounded-[50px] shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 -mr-32 -mt-32 rounded-full opacity-30"></div>
        
        <div className="flex items-center gap-4 mb-8 sm:mb-12 relative z-10">
          <div className="p-4 sm:p-5 bg-indigo-600 rounded-[20px] sm:rounded-[25px] text-white shadow-xl shadow-indigo-100 flex-shrink-0">
            <Users className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Create New Circle</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Start Splitting Expenses</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brief Description</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                  placeholder="What's this about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t-2 border-dashed border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Invite Members by Email</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                 <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                 <input
                  type="email"
                  className="w-full pl-14 pr-4 py-4 sm:py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none font-bold"
                  placeholder="mate@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
                />
              </div>
              <button
                type="button"
                onClick={addMember}
                className="px-8 py-4 sm:py-0 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 whitespace-nowrap"
              >
                Invite
              </button>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-3 shadow-lg shadow-indigo-100">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">✓</div>
                {user.email} (Owner)
              </div>
              {memberEmails.map((email) => (
                <div key={email} className="bg-white border-2 border-gray-100 text-gray-900 px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-3 hover:border-indigo-200 transition-all group">
                  <span className="truncate max-w-[150px]">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(email)}
                    className="text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-4 active:scale-[0.98] mt-8"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-7 h-7" />}
            {saving ? 'Creating…' : 'Initialize Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;

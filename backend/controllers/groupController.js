import { supabase } from '../config/supabase.js';

export const createGroup = async (req, res) => {
  const { name, description, memberEmails = [] } = req.body;

  try {
    if (!name) throw new Error('Group name is required');
    
    // 1. Create Group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || '',
        created_by: req.user.uid,
        creator_email: req.user.email
      })
      .select()
      .single();

    if (groupErr) throw groupErr;

    // 2. Add Members
    const allMembers = Array.from(new Set([...memberEmails, req.user.email]));
    const membersToInsert = allMembers.map(email => ({
      group_id: group.id,
      email
    }));
    await supabase.from('group_members').insert(membersToInsert);

    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getGroups = async (req, res) => {
  try {
    // 1. Get IDs of groups where the user is a member
    const { data: membership, error: membershipErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('email', req.user.email);

    if (membershipErr) throw membershipErr;

    const groupIds = membership?.map(m => m.group_id) || [];
    if (groupIds.length === 0) return res.json([]);

    // 2. Get those groups with ALL members
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_members(email)')
      .in('id', groupIds);

    if (error) throw error;

    const formattedData = (data || []).map(group => ({
      ...group,
      members: group.group_members?.map(m => m.email) || [],
      createdBy: group.created_by,
      creatorEmail: group.creator_email
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupDetails = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_members(email)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    
    const members = data.group_members.map(m => m.email);
    if (!members.includes(req.user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ 
      ...data, 
      members,
      createdBy: data.created_by,
      creatorEmail: data.creator_email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description, memberEmails } = req.body;

  try {
    // Check ownership
    const { data: group, error: fetchErr } = await supabase.from('groups').select('*').eq('id', id).single();
    if (fetchErr || !group) return res.status(404).json({ error: 'Group not found' });
    if (group.created_by !== req.user.uid) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('groups')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (memberEmails) {
      await supabase.from('group_members').delete().eq('group_id', id);
      const allMembers = Array.from(new Set([...memberEmails, group.creator_email]));
      await supabase.from('group_members').insert(allMembers.map(email => ({ group_id: id, email })));
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGroup = async (req, res) => {
  const { id } = req.params;
  try {
    // Check ownership
    const { data: group, error: fetchErr } = await supabase.from('groups').select('*').eq('id', id).single();
    if (fetchErr || !group) return res.status(404).json({ error: 'Group not found' });
    if (group.created_by !== req.user.uid) return res.status(403).json({ error: 'Access denied' });

    // Supabase RLS/FK Cascade will handle expenses if set up correctly, 
    // but we can also manually delete to be sure.
    await supabase.from('groups').delete().eq('id', id);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

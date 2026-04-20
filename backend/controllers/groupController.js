import admin from 'firebase-admin';

export const createGroup = async (req, res) => {
  const { name, description, memberEmails } = req.body;
  const db = admin.firestore();

  try {
    const allMembers = Array.from(new Set([...memberEmails, req.user.email]));
    
    const groupRef = await db.collection('groups').add({
      name,
      description,
      members: allMembers,
      createdBy: req.user.uid,
      creatorEmail: req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: groupRef.id, name, description, members: allMembers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getGroups = async (req, res) => {
  const db = admin.firestore();
  try {
    const snapshot = await db.collection('groups')
      .where('members', 'array-contains', req.user.email)
      .get();

    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupDetails = async (req, res) => {
  const db = admin.firestore();
  try {
    const doc = await db.collection('groups').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Group not found' });
    
    const groupData = doc.data();
    if (!groupData.members.includes(req.user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: doc.id, ...groupData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── UPDATE GROUP ─────────────────────────────────────────────────────────────
export const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description, memberEmails } = req.body;
  const db = admin.firestore();

  try {
    const groupDoc = await db.collection('groups').doc(id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });

    const groupData = groupDoc.data();
    // Only the creator can update the group
    if (groupData.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the group creator can edit this group' });
    }

    const allMembers = Array.from(new Set([...(memberEmails || groupData.members), groupData.creatorEmail]));

    await db.collection('groups').doc(id).update({
      name: name || groupData.name,
      description: description ?? groupData.description,
      members: allMembers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ id, name, description, members: allMembers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE GROUP ─────────────────────────────────────────────────────────────
export const deleteGroup = async (req, res) => {
  const { id } = req.params;
  const db = admin.firestore();

  try {
    const groupDoc = await db.collection('groups').doc(id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });

    const groupData = groupDoc.data();
    if (groupData.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the group creator can delete this group' });
    }

    // Cascade delete all expenses belonging to this group
    const expensesSnap = await db.collection('expenses').where('groupId', '==', id).get();
    const batch = db.batch();
    expensesSnap.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('groups').doc(id));
    await batch.commit();

    res.json({ message: 'Group and all its expenses deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

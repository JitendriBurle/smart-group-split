import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, 
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw error || new Error('User not found');
    }

    req.user = {
      uid: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email.split('@')[0]
    };
    next();
  } catch (error) {
    console.error('--- Supabase Token Verify Error ---');
    console.error('Error Message:', error.message);
    res.status(401).json({ error: 'Unauthorized: Invalid token', message: error.message });
  }
};



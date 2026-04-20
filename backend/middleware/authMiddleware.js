import admin from 'firebase-admin';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('--- Auth Warning: No Token Provided ---');
    console.warn('Headers received:', JSON.stringify(req.headers, null, 2));
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split('@')[0]
    };
    next();
  } catch (error) {
    console.error('--- Firebase Token Verify Error ---');
    console.error('Error Message:', error.message);
    console.error('Expected Project ID (aud):', admin.app().options.projectId);
    console.log('Token (start):', token.substring(0, 15) + '...');
    res.status(401).json({ error: 'Unauthorized: Invalid token', message: error.message });
  }
};



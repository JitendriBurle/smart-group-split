import dotenv from 'dotenv';
dotenv.config();
console.log('PORT:', process.env.PORT);
console.log('PROJECT_ID:', process.env.VITE_FIREBASE_PROJECT_ID);

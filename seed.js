import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';
import Group from './backend/models/Group.js';
import Expense from './backend/models/Expense.js';

dotenv.config();

const users = [
  { name: 'John Doe', email: 'john@example.com', password: 'password123' },
  { name: 'Jane Smith', email: 'jane@example.com', password: 'password123' },
  { name: 'Bob Wilson', email: 'bob@example.com', password: 'password123' },
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Group.deleteMany();
    await Expense.deleteMany();

    // Create users
    const createdUsers = await User.create(users);
    console.log('Users created.');

    // Create a group
    const group = await Group.create({
      name: 'Weekend Trip',
      description: 'Trip to the mountains',
      members: createdUsers.map(u => u._id),
      createdBy: createdUsers[0]._id,
    });
    console.log('Group created.');

    // Create some expenses
    await Expense.create([
      {
        description: 'Fuel',
        amount: 300,
        groupId: group._id,
        paidBy: createdUsers[0]._id,
        splitType: 'EQUAL',
        splits: createdUsers.map(u => ({ user: u._id, amount: 100 })),
      },
      {
        description: 'Dinner',
        amount: 150,
        groupId: group._id,
        paidBy: createdUsers[1]._id,
        splitType: 'EQUAL',
        splits: createdUsers.map(u => ({ user: u._id, amount: 50 })),
      }
    ]);
    console.log('Expenses created.');

    console.log('Seed successful!');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();

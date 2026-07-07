import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { User } from '../models/user';

dotenv.config();

// Ensure connection checks bypass the empty collection guard
process.env.BYPASS_DB_EMPTY_CHECK = 'true';

const migrate = async () => {
  try {
    await connectDB();
    console.log('\n==================================================');
    console.log('UPDATING SEED CREDENTIALS WITH BCRYPT HASHES');
    console.log('==================================================');

    const users = await User.find({});
    
    if (users.length === 0) {
      console.warn('No users found in database. Please run npm run seed first.');
      process.exit(0);
    }

    for (const user of users) {
      // Map usernames to their respective PIN secrets
      let plainTextPin = '123456';

      console.log(`Hashing PIN "${plainTextPin}" for user "${user.username}" (role: ${user.role})...`);
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(plainTextPin, salt);
      
      user.passwordHash = hash;
      await user.save();
      
      console.log(`[BCRYPT] Updated user "${user.username}" successfully.`);
    }

    console.log('Password migration finished successfully.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Password migration failed:', error);
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

migrate();

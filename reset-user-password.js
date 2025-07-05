// reset-user-password.js
// Usage: node reset-user-password.js <NEW_PASSWORD>
// Example: node reset-user-password.js MyNewSecurePassword123!

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

if (process.argv.length < 3) {
  console.error('Usage: node reset-user-password.js <NEW_PASSWORD>');
  process.exit(1);
}

const newPassword = process.argv[2];
const userId = '6864959dcac90302e939a415'; // The user's ObjectId as a string

// TODO: Update this with your actual MongoDB connection string
const MONGODB_URI = 'mongodb+srv://prajalshetedelxn:Prajal@cluster0.sfnbxic.mongodb.net/multi-tenant-database?retryWrites=true&w=majority&appName=unigen';

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const hash = await bcrypt.hash(newPassword, 10);
    const result = await mongoose.connection.db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          password: hash,
          isPasswordSet: true,
          needsPasswordReset: false
        }
      }
    );

    if (result.matchedCount === 0) {
      console.error('User not found.');
    } else {
      console.log('Password reset successfully.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword(); 
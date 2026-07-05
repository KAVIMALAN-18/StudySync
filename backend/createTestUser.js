import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const URI = 'mongodb://127.0.0.1:27017/studysync';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
});

// Avoid OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    await mongoose.connect(URI);
    console.log('Connected to MongoDB');

    const email = 'test@example.com';
    const password = 'password123';
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('User already exists. Updating password to ensure it matches.');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
      console.log('Password updated successfully.');
    } else {
      console.log('User not found. Creating new user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      user = new User({
        username: 'TestUser',
        email,
        password: hashedPassword
      });
      await user.save();
      console.log('User created successfully.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createTestUser();

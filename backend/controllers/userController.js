import User from '../models/User.js';

export const getOnlineUsers = async (req, res) => {
  try {
    const users = await User.find({ isOnline: true })
      .select('username avatar bio currentRoomId')
      .lean();

    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('friends', 'username avatar');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, bio, avatar } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Profile updated',
      data: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('friends', 'username avatar bio isOnline');

    res.json({ data: user.friends || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

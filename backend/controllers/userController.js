import User from '../models/User.js';

export const getOnlineUsers = async (req, res) => {
  try {
    const users = await User.find({ isOnline: true })
      .select('username avatar bio currentRoomId fullName city country')
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
      .populate('friends', 'username avatar isOnline');

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
    const { username, bio, avatar, subjects, fullName, country, state, city } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username && username !== user.username) {
      const existing = await User.findOne({ username, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (subjects !== undefined) user.subjects = subjects;
    if (fullName !== undefined) user.fullName = fullName;
    if (country !== undefined) user.country = country;
    if (state !== undefined) user.state = state;
    if (city !== undefined) user.city = city;

    await user.save();

    res.json({
      message: 'Profile updated',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        bio: user.bio,
        avatar: user.avatar,
        subjects: user.subjects,
        country: user.country,
        state: user.state,
        city: user.city,
        isOnline: user.isOnline,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('friends', 'username avatar bio isOnline city country');

    res.json({ data: user.friends || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.userId;

    if (!q || q.trim().length < 1) {
      return res.json({ data: [] });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: userId }
    })
      .select('username avatar bio isOnline email fullName city country')
      .limit(20)
      .lean();

    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
        themePreference: user.themePreference,
        notificationPreferences: user.notificationPreferences,
        privacyPreference: user.privacyPreference,
        studyPreferences: user.studyPreferences,
        friendRequestsEnabled: user.friendRequestsEnabled,
        roomInvitesEnabled: user.roomInvitesEnabled,
        allowAI: user.allowAI,
        soundNotifications: user.soundNotifications
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

export const updateSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      email, 
      currentPassword, 
      newPassword, 
      themePreference, 
      notificationPreferences, 
      privacyPreference, 
      studyPreferences,
      friendRequestsEnabled,
      roomInvitesEnabled,
      allowAI,
      soundNotifications
    } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Change Email
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: 'Email already taken' });
      }
      user.email = email;
    }

    // 2. Change Password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid current password' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      user.password = newPassword;
    }

    // 3. Preferences
    if (themePreference !== undefined) user.themePreference = themePreference;
    if (notificationPreferences !== undefined) {
      user.notificationPreferences = { 
        emailNotifications: notificationPreferences.emailNotifications !== undefined ? notificationPreferences.emailNotifications : user.notificationPreferences.emailNotifications,
        pushNotifications: notificationPreferences.pushNotifications !== undefined ? notificationPreferences.pushNotifications : user.notificationPreferences.pushNotifications
      };
    }
    if (privacyPreference !== undefined) {
      user.privacyPreference = { 
        showOnlineStatus: privacyPreference.showOnlineStatus !== undefined ? privacyPreference.showOnlineStatus : user.privacyPreference.showOnlineStatus,
        publicProfile: privacyPreference.publicProfile !== undefined ? privacyPreference.publicProfile : user.privacyPreference.publicProfile
      };
    }
    if (studyPreferences !== undefined) {
      user.studyPreferences = { 
        defaultFocusDuration: studyPreferences.defaultFocusDuration !== undefined ? studyPreferences.defaultFocusDuration : user.studyPreferences.defaultFocusDuration,
        defaultBreakDuration: studyPreferences.defaultBreakDuration !== undefined ? studyPreferences.defaultBreakDuration : user.studyPreferences.defaultBreakDuration,
        studyGoal: studyPreferences.studyGoal !== undefined ? studyPreferences.studyGoal : user.studyPreferences.studyGoal,
        preferredStudyTime: studyPreferences.preferredStudyTime !== undefined ? studyPreferences.preferredStudyTime : user.studyPreferences.preferredStudyTime
      };
    }

    if (friendRequestsEnabled !== undefined) user.friendRequestsEnabled = friendRequestsEnabled;
    if (roomInvitesEnabled !== undefined) user.roomInvitesEnabled = roomInvitesEnabled;
    if (allowAI !== undefined) user.allowAI = allowAI;
    if (soundNotifications !== undefined) user.soundNotifications = soundNotifications;

    await user.save();

    res.json({
      message: 'Settings updated successfully',
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
        themePreference: user.themePreference,
        notificationPreferences: user.notificationPreferences,
        privacyPreference: user.privacyPreference,
        studyPreferences: user.studyPreferences,
        friendRequestsEnabled: user.friendRequestsEnabled,
        roomInvitesEnabled: user.roomInvitesEnabled,
        allowAI: user.allowAI,
        soundNotifications: user.soundNotifications
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


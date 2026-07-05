import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';

export const sendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.userId;

    if (senderId === recipientId) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    const sender = await User.findById(senderId);
    if (sender.friends.includes(recipientId)) {
      return res.status(400).json({ error: 'You are already friends with this user' });
    }

    // Check if request already exists (in either direction)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ error: 'A pending friend request already exists between you' });
      }
      // If declined, we can reset it to pending
      if (existingRequest.sender.toString() === senderId) {
        existingRequest.status = 'pending';
        await existingRequest.save();
        return res.json({ message: 'Friend request sent successfully', data: existingRequest });
      } else {
        // Swap sender and recipient
        existingRequest.sender = senderId;
        existingRequest.recipient = recipientId;
        existingRequest.status = 'pending';
        await existingRequest.save();
        return res.json({ message: 'Friend request sent successfully', data: existingRequest });
      }
    }

    const request = new FriendRequest({
      sender: senderId,
      recipient: recipientId,
      status: 'pending'
    });

    await request.save();

    res.status(201).json({
      message: 'Friend request sent successfully',
      data: request
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const requests = await FriendRequest.find({
      recipient: userId,
      status: 'pending'
    })
      .populate('sender', 'username avatar bio isOnline')
      .sort({ createdAt: -1 });

    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (request.recipient.toString() !== userId) {
      return res.status(403).json({ error: 'You are not authorized to accept this request' });
    }

    request.status = 'accepted';
    await request.save();

    // Add to friends lists
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.recipient } });
    await User.findByIdAndUpdate(request.recipient, { $addToSet: { friends: request.sender } });

    // Clean up request document to allow re-requesting if unfriended
    await FriendRequest.findByIdAndDelete(requestId);

    res.json({ message: 'Friend request accepted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const declineRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (request.recipient.toString() !== userId) {
      return res.status(403).json({ error: 'You are not authorized to decline this request' });
    }

    // We can delete the request document
    await FriendRequest.findByIdAndDelete(requestId);

    res.json({ message: 'Friend request declined successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;

    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    // Clean up any request in the DB just in case
    await FriendRequest.findOneAndDelete({
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId }
      ]
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

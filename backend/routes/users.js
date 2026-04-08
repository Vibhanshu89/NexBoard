const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

router.use(protect);

// Get user by ID (public profile)
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('name avatar bio isOnline createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Search users
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('name avatar email isOnline').limit(10);
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

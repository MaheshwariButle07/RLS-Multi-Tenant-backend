const express = require('express');
const router = express.Router();
const { userProfiles } = require('../utils/user-profiles');
const { generateToken } = require('../services/jwt-simulator');

/**
 * GET /api/auth/profiles
 * Returns all predefined simulation user profiles
 */
router.get('/profiles', (req, res) => {
  res.json({ profiles: Object.values(userProfiles) });
});

/**
 * POST /api/auth/token
 * Generates a simulated JWT token for the selected user profile
 */
router.post('/token', (req, res) => {
  const { profileId } = req.body;
  
  if (!profileId || !userProfiles[profileId]) {
    return res.status(400).json({ error: 'Valid profileId is required' });
  }

  try {
    const token = generateToken(profileId);
    res.json({
      token,
      user: userProfiles[profileId]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

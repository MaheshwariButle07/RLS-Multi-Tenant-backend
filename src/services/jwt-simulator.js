const jwt = require('jsonwebtoken');
const { userProfiles } = require('../utils/user-profiles');

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'super-secret-supabase-jwt-key-for-local-development-change-in-prod';

/**
 * Generates a signed JWT with claims matching the specified user profile
 * @param {string} profileId - Key of the user profile ('priya', 'vikram', etc.)
 * @returns {string} Signed JWT token
 */
function generateToken(profileId) {
  const profile = userProfiles[profileId];
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Supabase standard claims + our custom application claims
  const payload = {
    aud: 'authenticated',
    role: 'authenticated', // standard Supabase role
    sub: profile.id,
    email: `${profile.id}@healthcare-system.org`,
    org_id: profile.org_id,
    department: profile.department,
    role: profile.role, // Custom app role (ADMIN, HOD, EDITOR, VIEWER)
    ceiling_level: profile.ceiling_level,
    compliance_clearance: profile.compliance_clearance,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours expiration
  };

  return jwt.sign(payload, JWT_SECRET);
}

module.exports = { generateToken, JWT_SECRET };

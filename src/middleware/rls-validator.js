const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/jwt-simulator');
const { userProfiles } = require('../utils/user-profiles');

/**
 * Express middleware to authenticate and parse the user security context
 * Supports both standard JWT bearer tokens and rapid-switching headers for testing.
 */
function rlsValidator(req, res, next) {
  try {
    let userContext = null;

    // 1. Check for rapid demo switching via x-user-profile header or query param
    const profileId = req.headers['x-user-profile'] || req.query.profileId;
    
    if (profileId && userProfiles[profileId]) {
      userContext = { ...userProfiles[profileId] };
    } else {
      // 2. Check for standard Authorization Header Bearer JWT
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userContext = {
            id: decoded.sub,
            name: decoded.email.split('@')[0],
            org_id: decoded.org_id,
            role: decoded.role,
            department: decoded.department,
            ceiling_level: decoded.ceiling_level,
            compliance_clearance: decoded.compliance_clearance,
          };
        } catch (jwtErr) {
          return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }
      }
    }

    // If no context was identified, default to an anonymous, low-privilege fallback user
    if (!userContext) {
      userContext = {
        id: 'anonymous',
        name: 'Anonymous',
        role: 'VIEWER',
        org_id: 'guest',
        department: 'guest',
        ceiling_level: 10,
        compliance_clearance: [],
      };
    }

    // 3. Extract policy toggles from query parameters or custom headers
    // e.g. policy_org_isolation=false
    const policyToggles = {
      org_isolation: req.query.policy_org_isolation !== 'false' && req.headers['x-policy-org-isolation'] !== 'false',
      dept_scope: req.query.policy_dept_scope !== 'false' && req.headers['x-policy-dept-scope'] !== 'false',
      permission_ceiling: req.query.policy_permission_ceiling !== 'false' && req.headers['x-policy-permission-ceiling'] !== 'false',
      compliance_filter: req.query.policy_compliance_filter !== 'false' && req.headers['x-policy-compliance-filter'] !== 'false',
    };

    req.user = {
      ...userContext,
      policyToggles
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = rlsValidator;

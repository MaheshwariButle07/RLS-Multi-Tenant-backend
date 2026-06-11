const express = require('express');
const router = express.Router();
const queryExecutor = require('../services/query-executor');
const performanceMonitor = require('../services/performance-monitor');
const rlsValidator = require('../middleware/rls-validator');
const { rlsPolicies } = require('../utils/rls-policies');

// Apply RLS validator middleware to all routes in this router
router.use(rlsValidator);

/**
 * GET /api/rls-demo/nodes
 * Fetches knowledge nodes filtered by user context and gets query execution metrics
 */
router.get('/nodes', async (req, res) => {
  try {
    const sqlQuery = "SELECT * FROM knowledge_nodes WHERE id NOT LIKE 'perf_%' ORDER BY id ASC";
    
    // 1. Run actual query to get the filtered rows
    const nodes = await queryExecutor.executeQueryWithContext(sqlQuery, req.user);
    
    // 2. Run EXPLAIN ANALYZE on same query to get plan and metrics
    const metrics = await performanceMonitor.executeQueryWithMetrics(sqlQuery, req.user);

    res.json({
      success: true,
      user: {
        id: req.user.id,
        role: req.user.role,
        org_id: req.user.org_id,
        department: req.user.department,
        ceiling_level: req.user.ceiling_level,
        compliance_clearance: req.user.compliance_clearance
      },
      count: nodes.length,
      nodes,
      metrics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rls-demo/policies
 * Returns list of RLS policies with details and toggle status
 */
router.get('/policies', (req, res) => {
  const toggles = req.user.policyToggles;
  const policiesWithStatus = rlsPolicies.map(policy => ({
    ...policy,
    enabled: toggles[policy.id] !== false
  }));
  res.json({ policies: policiesWithStatus });
});

/**
 * POST /api/rls-demo/query
 * Custom query console - runs custom SQL statement with user context RLS
 */
router.post('/query', async (req, res) => {
  const { sql } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query parameter is required' });
  }

  // Basic security: only allow SELECT or EXPLAIN statements to prevent updates/deletes in this panel
  const normalizedSql = sql.trim().toLowerCase();
  if (!normalizedSql.startsWith('select') && !normalizedSql.startsWith('explain')) {
    return res.status(403).json({ error: 'Only SELECT or EXPLAIN statements are authorized in this simulator' });
  }

  try {
    // 1. Execute SQL to get row outcomes
    const results = await queryExecutor.executeQueryWithContext(sql, req.user);
    
    // 2. Execute SQL with EXPLAIN ANALYZE to fetch index and timing plans
    // (If the user query is already an EXPLAIN, execute it directly as-is)
    let metrics = null;
    if (normalizedSql.startsWith('explain')) {
      // If it's already an explain query, execute directly
      const rows = await queryExecutor.executeQueryWithContext(sql, req.user);
      metrics = {
        query: sql,
        rawPlan: rows.map(r => Object.values(r)[0]),
        executionTimeMs: 0,
        planningTimeMs: 0
      };
    } else {
      metrics = await performanceMonitor.executeQueryWithMetrics(sql, req.user);
    }

    res.json({
      success: true,
      count: results.length,
      results,
      metrics
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

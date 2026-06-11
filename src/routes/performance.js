const express = require('express');
const router = express.Router();
const { pgPool } = require('../services/supabase');
const rlsValidator = require('../middleware/rls-validator');
const performanceMonitor = require('../services/performance-monitor');

router.use(rlsValidator);

/**
 * POST /api/performance/seed
 * Triggers database seeding for scale testing (e.g. 50,000 nodes)
 */
router.post('/seed', async (req, res) => {
  const count = parseInt(req.body.count) || 50000;
  
  if (count > 100000) {
    return res.status(400).json({ error: 'Max seeding limit is 100,000 rows for this sandbox demo' });
  }

  const client = await pgPool.connect();
  try {
    console.log(`[Perf] Starting scale seeding for ${count} nodes...`);
    const startTime = performance.now();
    
    // Call pg SQL helper function to generate test rows
    const dbRes = await client.query('SELECT seed_perf_data($1) as seeded_count', [count]);
    const duration = performance.now() - startTime;
    
    res.json({
      success: true,
      message: `Successfully seeded ${dbRes.rows[0].seeded_count} scale testing nodes.`,
      durationMs: parseFloat(duration.toFixed(2)),
      count: dbRes.rows[0].seeded_count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/performance/benchmark
 * Runs queries against the scaled dataset and gathers performance metrics
 */
router.get('/benchmark', async (req, res) => {
  try {
    // We will benchmark 3 different query patterns to show index efficiency and RLS overhead:
    // 1. Point search with full index hit (matching org_id, department, and ceiling)
    // 2. Scan with array operations (using compliance GIN index)
    // 3. Wide scan (matching org_id only)
    
    const queries = {
      indexScan: "SELECT * FROM knowledge_nodes WHERE org_id = 'supra' AND department = 'ortho' AND hierarchy_level >= 5",
      ginScan: "SELECT * FROM knowledge_nodes WHERE org_id = 'supra' AND compliance_tags @> ARRAY['MNPI']::text[]",
      wideScan: "SELECT * FROM knowledge_nodes WHERE org_id = 'supra'"
    };

    const results = {};
    for (const [key, sql] of Object.entries(queries)) {
      results[key] = await performanceMonitor.executeQueryWithMetrics(sql, req.user);
    }

    // Get database row counts for scale info
    const client = await pgPool.connect();
    const countRes = await client.query('SELECT COUNT(*) as total FROM knowledge_nodes');
    client.release();

    res.json({
      success: true,
      totalNodesInDb: parseInt(countRes.rows[0].total),
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/performance/cleanup
 * Removes all scale performance test data, keeping only seed nodes
 */
router.delete('/cleanup', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const resDelete = await client.query("DELETE FROM knowledge_nodes WHERE id LIKE 'perf_%'");
    res.json({
      success: true,
      message: `Cleaned up scaled testing nodes. Removed ${resDelete.rowCount} rows.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

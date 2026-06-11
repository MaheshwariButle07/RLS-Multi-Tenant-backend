const { pgPool } = require('./supabase');

/**
 * Service to execute EXPLAIN ANALYZE on queries, parse performance metrics,
 * and analyze PostgreSQL query plans to verify index usage and RLS overhead.
 */
class PerformanceMonitor {
  /**
   * Executes a query with EXPLAIN (ANALYZE, FORMAT JSON) under a simulated context
   * and compiles performance metrics from the PostgreSQL engine.
   * @param {string} sqlQuery - Select statement to analyze
   * @param {Object} context - User context object containing claims and toggles
   * @returns {Promise<Object>} Formatted performance statistics and raw query plan
   */
  async executeQueryWithMetrics(sqlQuery, context) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');

      // 1. Set context variables for this session transaction
      const orgId = context.org_id || '';
      const dept = context.department || '';
      const role = context.role || '';
      const ceiling = context.ceiling_level !== undefined ? context.ceiling_level.toString() : '10';
      const clearance = Array.isArray(context.compliance_clearance)
        ? context.compliance_clearance.join(',')
        : (context.compliance_clearance || '');

      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
      await client.query("SELECT set_config('app.current_department', $1, true)", [dept]);
      await client.query("SELECT set_config('app.current_role', $1, true)", [role]);
      await client.query("SELECT set_config('app.current_ceiling', $1, true)", [ceiling]);
      await client.query("SELECT set_config('app.current_clearance', $1, true)", [clearance]);

      // 2. Set policy toggles
      const toggles = context.policyToggles || {};
      const orgIsolation = toggles.org_isolation !== false ? 'true' : 'false';
      const deptScope = toggles.dept_scope !== false ? 'true' : 'false';
      const permissionCeiling = toggles.permission_ceiling !== false ? 'true' : 'false';
      const complianceFilter = toggles.compliance_filter !== false ? 'true' : 'false';

      await client.query("SELECT set_config('app.policy_org_isolation_enabled', $1, true)", [orgIsolation]);
      await client.query("SELECT set_config('app.policy_dept_scope_enabled', $1, true)", [deptScope]);
      await client.query("SELECT set_config('app.policy_permission_ceiling_enabled', $1, true)", [permissionCeiling]);
      await client.query("SELECT set_config('app.policy_compliance_filter_enabled', $1, true)", [complianceFilter]);

      // 3. Execute EXPLAIN (ANALYZE, COSTS, BUFFERS, FORMAT JSON)
      const startTime = performance.now();
      const explainRes = await client.query(`EXPLAIN (ANALYZE, COSTS, BUFFERS, SUMMARY, FORMAT JSON) ${sqlQuery}`);
      const endTime = performance.now();
      const clientTotalTime = endTime - startTime;

      await client.query('COMMIT');

      // Parse PostgreSQL query plan JSON
      const rawPlanArray = explainRes.rows[0]['QUERY PLAN'];
      const rootPlanNode = rawPlanArray[0];

      const executionTime = rootPlanNode['Execution Time'] || (endTime - startTime);
      const planningTime = rootPlanNode['Planning Time'] || 0;

      // Scan plan recursively for key parameters
      const scanTypes = [];
      const indexesUsed = [];
      let rlsFilterDetails = [];
      let sharedHitBlocks = 0;
      let sharedReadBlocks = 0;

      function traverse(node) {
        if (node['Node Type']) {
          scanTypes.push(node['Node Type']);
        }
        if (node['Index Name']) {
          indexesUsed.push(node['Index Name']);
        }
        
        // Check for filters that show RLS evaluations
        if (node['Filter']) {
          const filterStr = String(node['Filter']);
          if (filterStr.includes('current_setting') || filterStr.includes('get_current_context')) {
            rlsFilterDetails.push({ nodeType: node['Node Type'], filter: filterStr });
          }
        }
        if (node['Index Cond']) {
          const condStr = String(node['Index Cond']);
          if (condStr.includes('get_current_context') || condStr.includes('current_setting')) {
            rlsFilterDetails.push({ nodeType: node['Node Type'], indexCondition: condStr });
          }
        }

        // Aggregate buffers
        if (node['Shared Hit Blocks']) sharedHitBlocks += node['Shared Hit Blocks'];
        if (node['Shared Read Blocks']) sharedReadBlocks += node['Shared Read Blocks'];

        if (node['Plans']) {
          for (const subPlan of node['Plans']) {
            traverse(subPlan);
          }
        }
      }

      traverse(rootPlanNode['Plan']);

      return {
        query: sqlQuery,
        planningTimeMs: parseFloat(planningTime.toFixed(3)),
        executionTimeMs: parseFloat(executionTime.toFixed(3)),
        totalDurationMs: parseFloat((planningTime + executionTime).toFixed(3)),
        clientTotalTimeMs: parseFloat(clientTotalTime.toFixed(3)),
        scanTypes,
        indexesUsed,
        hasIndexScan: indexesUsed.length > 0,
        sharedHitBlocks,
        sharedReadBlocks,
        rlsFilterDetails,
        rawPlan: rawPlanArray,
        timestamp: new Date()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new PerformanceMonitor();

const { pgPool } = require('./supabase');

/**
 * Service to execute PostgreSQL queries within stateful transactions,
 * setting the session-level variables before running the queries.
 */
class QueryExecutor {
  /**
   * Executes a SELECT query under a specific simulated user context and policy toggle configuration.
   * @param {string} sql - SQL query string to run
   * @param {Object} context - User context object (claims & toggles)
   * @returns {Promise<Array>} Array of result rows
   */
  async executeQueryWithContext(sql, context) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');

      // 1. Apply user claims context
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

      // 2. Apply policy toggles (default is 'true' if not provided)
      const toggles = context.policyToggles || {};
      const orgIsolation = toggles.org_isolation !== false ? 'true' : 'false';
      const deptScope = toggles.dept_scope !== false ? 'true' : 'false';
      const permissionCeiling = toggles.permission_ceiling !== false ? 'true' : 'false';
      const complianceFilter = toggles.compliance_filter !== false ? 'true' : 'false';

      await client.query("SELECT set_config('app.policy_org_isolation_enabled', $1, true)", [orgIsolation]);
      await client.query("SELECT set_config('app.policy_dept_scope_enabled', $1, true)", [deptScope]);
      await client.query("SELECT set_config('app.policy_permission_ceiling_enabled', $1, true)", [permissionCeiling]);
      await client.query("SELECT set_config('app.policy_compliance_filter_enabled', $1, true)", [complianceFilter]);

      // 3. Execute query
      const res = await client.query(sql);
      
      await client.query('COMMIT');
      return res.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new QueryExecutor();

// Metadata for RLS policies for documentation and simulation toggling

const rlsPolicies = [
  {
    id: 'org_isolation',
    name: 'Organization Isolation',
    boundary: 'Policy 1',
    type: 'Permissive',
    description: 'Enforces strict organizational tenant boundary. Users can only see nodes matching their org_id.',
    sql: `CREATE POLICY org_isolation ON knowledge_nodes\n    AS RESTRICTIVE FOR SELECT USING (\n        current_setting('app.policy_org_isolation_enabled', true) = 'false'\n        OR org_id = get_current_context('org_id')\n    );`
  },
  {
    id: 'dept_scope',
    name: 'Department Scoping',
    boundary: 'Policy 2',
    type: 'Restrictive',
    description: 'Restricts nodes by department. Users see nodes of their department, NULL department nodes, or Zone 2 global bypass nodes. Bypassed by ADMIN role.',
    sql: `CREATE POLICY dept_scope ON knowledge_nodes\n    AS RESTRICTIVE FOR SELECT USING (\n        current_setting('app.policy_dept_scope_enabled', true) = 'false'\n        OR department = get_current_context('department')\n        OR department IS NULL\n        OR zone = 2\n        OR get_current_context('role') = 'ADMIN'\n    );`
  },
  {
    id: 'permission_ceiling',
    name: 'Permission Ceiling',
    boundary: 'Policy 3',
    type: 'Restrictive',
    description: 'Restricts visibility by hierarchy level. Users can see hierarchy_level >= user ceiling level. Bypassed by ADMIN and HOD roles.',
    sql: `CREATE POLICY permission_ceiling ON knowledge_nodes\n    AS RESTRICTIVE FOR SELECT USING (\n        current_setting('app.policy_permission_ceiling_enabled', true) = 'false'\n        OR hierarchy_level >= get_current_context('ceiling')::int\n        OR get_current_context('role') IN ('ADMIN', 'HOD')\n    );`
  },
  {
    id: 'compliance_filter',
    name: 'Compliance Filtering',
    boundary: 'Policy 4',
    type: 'Restrictive',
    description: 'Restricts nodes with compliance tags (MNPI/CONFIDENTIAL). Row tags must be subset of user clearance tags.',
    sql: `CREATE POLICY compliance_filter ON knowledge_nodes\n    AS RESTRICTIVE FOR SELECT USING (\n        current_setting('app.policy_compliance_filter_enabled', true) = 'false'\n        OR compliance_tags = '{}'\n        OR compliance_tags IS NULL\n        OR compliance_tags <@ string_to_array(\n            COALESCE(get_current_context('clearance'), ''), ','\n        )::text[]\n    );`
  }
];

module.exports = { rlsPolicies };

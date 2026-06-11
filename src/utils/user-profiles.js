// User Profiles and JWT claim mappings for the RLS simulator

const userProfiles = {
  priya: {
    id: 'priya',
    name: 'Priya',
    role: 'VIEWER',
    org_id: 'supra',
    department: 'ortho',
    ceiling_level: 10,
    compliance_clearance: [],
    description: 'Ortho Clinic Viewer (Level 10 limit, no Cardio/Medicine, no MNPI/CONF)'
  },
  vikram: {
    id: 'vikram',
    name: 'Vikram',
    role: 'HOD',
    org_id: 'supra',
    department: 'ortho',
    ceiling_level: 4,
    compliance_clearance: [],
    description: 'Ortho Head of Department (Bypasses ceiling, no Cardio/Medicine, no MNPI/CONF)'
  },
  suresh: {
    id: 'suresh',
    name: 'Suresh',
    role: 'ADMIN',
    org_id: 'supra',
    department: 'admin',
    ceiling_level: 1,
    compliance_clearance: ['MNPI', 'CONFIDENTIAL'],
    description: 'Supra Administrator (Full admin bypass, views all Supra nodes, zero City Clinic)'
  },
  ananya: {
    id: 'ananya',
    name: 'Ananya',
    role: 'EDITOR',
    org_id: 'supra',
    department: 'medicine',
    ceiling_level: 8,
    compliance_clearance: [],
    description: 'Medicine Editor (Level 8 limit, no Ortho/Cardio, no MNPI/CONF)'
  },
  cc_dr: {
    id: 'cc_dr',
    name: 'CC Dr.',
    role: 'EDITOR',
    org_id: 'city_clinic',
    department: 'medicine',
    ceiling_level: 8,
    compliance_clearance: [],
    description: 'City Clinic Doctor (Level 8 limit, isolated to City Clinic medicine/globals)'
  },
  cc_admin: {
    id: 'cc_admin',
    name: 'CC Admin',
    role: 'ADMIN',
    org_id: 'city_clinic',
    department: 'admin',
    ceiling_level: 1,
    compliance_clearance: ['MNPI', 'CONFIDENTIAL'],
    description: 'City Clinic Administrator (Full admin bypass, isolated to City Clinic only)'
  },
  // ravi: {
  //   id: 'ravi',
  //   name: 'Ravi',
  //   role: 'VIEWER',
  //   org_id: 'supra',
  //   department: 'pharmacy',
  //   ceiling_level: 1,
  //   compliance_clearance: ['CONTROLLED_SUBSTANCE'],
  //   description: 'Supra Pharmacist (Level 1 bypass, views all Supra nodes, zero City Clinic)'
  // }
};

module.exports = { userProfiles };

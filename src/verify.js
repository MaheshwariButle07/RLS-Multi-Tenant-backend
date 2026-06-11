const http = require('http');

const usersToVerify = [
  { id: 'priya', name: 'Priya', expectedCount: 3 },
  { id: 'vikram', name: 'Vikram', expectedCount: 13 },
  { id: 'suresh', name: 'Suresh', expectedCount: 24 },
  { id: 'ananya', name: 'Ananya', expectedCount: 2 },
  { id: 'cc_dr', name: 'CC Dr.', expectedCount: 2 },
  { id: 'cc_admin', name: 'CC Admin', expectedCount: 5 },
  // { id: 'ravi', name: 'Ravi', expectedCount: 6 }
];

function fetchNodes(profileId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/rls-demo/nodes?profileId=${profileId}`,
      method: 'GET',
      headers: {
        'x-user-profile': profileId
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON Parse Error: ${e.message}. Raw data: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  console.log('========================================================');
  console.log(' AUTOMATED RLS BOUNDARY VERIFICATION AUDIT');
  console.log('========================================================\n');

  let allPassed = true;

  for (const user of usersToVerify) {
    try {
      const res = await fetchNodes(user.id);
      
      if (!res.success) {
        console.log(`❌ ${user.name}: API reported failure. Error: ${res.error}`);
        allPassed = false;
        continue;
      }

      const match = res.count === user.expectedCount;
      const statusIcon = match ? '✅' : '❌';
      
      console.log(`${statusIcon} ${user.name} Profile:`);
      console.log(`   - Role: ${res.user.role}`);
      console.log(`   - Org ID: ${res.user.org_id}`);
      console.log(`   - Department: ${res.user.department || 'NULL'}`);
      console.log(`   - Expected Nodes: ${user.expectedCount}`);
      console.log(`   - Actual Nodes Returned: ${res.count}`);
      
      if (!match) {
        allPassed = false;
        console.log(`     WARNING: Count mismatch! Expected ${user.expectedCount} but got ${res.count}.`);
      }
      
      // Print first 3 nodes
      if (res.nodes && res.nodes.length > 0) {
        console.log(`   - Sample Nodes: ${res.nodes.slice(0, 3).map(n => n.id).join(', ')}...`);
      }
      console.log('');
    } catch (err) {
      console.error(`❌ ${user.name}: Request failed: ${err.message}`);
      allPassed = false;
    }
  }

  console.log('========================================================');
  if (allPassed) {
    console.log(' AUDIT SUCCESS: ALL RLS POLICIES VERIFIED CORRECTLY!');
  } else {
    console.log(' AUDIT FAILED: ONE OR MORE COUNT MISMATCHES DETECTED!');
  }
  console.log('========================================================');

  process.exit(allPassed ? 0 : 1);
}

// Give Express a split second to make sure it started, then run
setTimeout(run, 1000);

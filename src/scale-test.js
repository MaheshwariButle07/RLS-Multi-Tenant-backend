const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-user-profile': 'suresh' // Run as admin to seed/benchmark
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'x-user-profile': 'suresh'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

function deleteRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'DELETE',
      headers: {
        'x-user-profile': 'suresh'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  console.log('========================================================');
  console.log(' DATABASE SCALE & INDEX PERFORMANCE AUDIT');
  console.log('========================================================\n');

  try {
    // 1. Seed 50,000 nodes
    console.log('[Scale] Seeding 50,000 scale test nodes (this takes a few seconds)...');
    const seedRes = await postJson('/api/performance/seed', { count: 50000 });
    console.log(`[Scale] ${seedRes.message} (Duration: ${seedRes.durationMs}ms)\n`);

    // 2. Run query benchmarks
    console.log('[Benchmark] Running query performance benchmarks on scale dataset...');
    const benchRes = await getJson('/api/performance/benchmark');
    console.log(`[Benchmark] Active Nodes in Database: ${benchRes.totalNodesInDb.toLocaleString()}\n`);

    // Point Search
    const pt = benchRes.results.indexScan;
    console.log('1. POINT SEARCH (Composite Index: org_id, department, hierarchy_level):');
    console.log(`   - Query: "${pt.query}"`);
    console.log(`   - Execution Time: ${pt.executionTimeMs} ms`);
    console.log(`   - Planning Time: ${pt.planningTimeMs} ms`);
    console.log(`   - Index Scan Hit: ${pt.hasIndexScan ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Indexes Used: ${pt.indexesUsed.join(', ') || 'None'}`);
    console.log(`   - Buffers Hit: ${pt.sharedHitBlocks} blocks (Cache)`);
    console.log('');

    // GIN Search
    const gin = benchRes.results.ginScan;
    console.log('2. GIN ARRAY SEARCH (GIN Index: compliance_tags):');
    console.log(`   - Query: "${gin.query}"`);
    console.log(`   - Execution Time: ${gin.executionTimeMs} ms`);
    console.log(`   - Planning Time: ${gin.planningTimeMs} ms`);
    console.log(`   - Index Scan Hit: ${gin.hasIndexScan ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Indexes Used: ${gin.indexesUsed.join(', ') || 'None'}`);
    console.log(`   - Buffers Hit: ${gin.sharedHitBlocks} blocks (Cache)`);
    console.log('');

    // Wide Scan
    const wide = benchRes.results.wideScan;
    console.log('3. WIDE TENANT SCAN (Table / Index Scan):');
    console.log(`   - Query: "${wide.query}"`);
    console.log(`   - Execution Time: ${wide.executionTimeMs} ms`);
    console.log(`   - Planning Time: ${wide.planningTimeMs} ms`);
    console.log(`   - Scan Types: ${wide.scanTypes.join(', ')}`);
    console.log(`   - Buffers Hit: ${wide.sharedHitBlocks} blocks (Cache)`);
    console.log('');

    // 3. Clean up
    console.log('[Cleanup] Deleting scale test data...');
    const cleanupRes = await deleteRequest('/api/performance/cleanup');
    console.log(`[Cleanup] ${cleanupRes.message}`);

    console.log('\n========================================================');
    console.log(' PERFORMANCE SCALE TEST AUDIT COMPLETE!');
    console.log('========================================================');
    
  } catch (err) {
    console.error('Scale testing failed:', err.message);
  }
}

// Give Express a split second to make sure it started, then run
setTimeout(run, 1000);

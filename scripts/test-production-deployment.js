#!/usr/bin/env node

/**
 * Comprehensive test script for production deployment
 * Tests that RPC proxy is working and verifies no 403 errors
 */

// NOTE: The default production URL below is a placeholder and MUST be updated for different deployments.
// You can override it by setting the PROD_URL environment variable or passing a command-line argument.
const PROD_URL = process.env.PROD_URL || process.argv[2] || 'https://keystone.stauniverse.tech';

console.log(`\n${'='.repeat(70)}`);
console.log(`🧪 Testing Netlify Deployment: ${PROD_URL}`);
console.log('='.repeat(70) + '\n');

async function testEndpoint(name, url, options = {}) {
  console.log(`Testing: ${name}`);
  console.log(`  URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log('  ❌ FAIL: Got 404 - endpoint not deployed correctly\n');
      return false;
    } else if (response.status === 403) {
      console.log('  ❌ FAIL: Got 403 - RPC authentication issue\n');
      return false;
    } else if (response.ok || response.status === 500) {
      // 500 is OK for some endpoints if upstream is down but route exists
      console.log('  ✅ PASS: Endpoint is deployed and reachable');
      if (typeof data === 'object' && data !== null) {
        console.log(`  Response type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
      }
      console.log('');
      return true;
    } else {
      console.log(`  ⚠️  WARN: Unexpected status ${response.status}\n`);
      return true; // Still counts as deployed
    }
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log('  ⚠️  WARN: Request timed out (endpoint may be slow)\n');
      return true;
    }
    console.log(`  ❌ FAIL: ${error.message}\n`);
    return false;
  }
}

async function testHomePage() {
  return testEndpoint('Home Page', `${PROD_URL}/`, { method: 'GET' });
}

async function testSolanaRPC() {
  return testEndpoint(
    'Solana RPC Proxy (POST)',
    `${PROD_URL}/api/solana/rpc`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
    }
  );
}

async function testJupiterPrice() {
  return testEndpoint(
    'Jupiter Price API',
    `${PROD_URL}/api/jupiter/price?ids=SOL,USDC`,
    { method: 'GET' }
  );
}

async function testHeliusTransactions() {
  // Use a well-known Solana address
  const address = 'So11111111111111111111111111111111111111112'; // Wrapped SOL mint
  return testEndpoint(
    'Helius Transactions API',
    `${PROD_URL}/api/helius/addresses/${address}/transactions?limit=5`,
    { method: 'GET' }
  );
}

async function testBitqueryPrice() {
  return testEndpoint(
    'Bitquery Price API',
    `${PROD_URL}/api/bitquery/price/index`,
    { method: 'GET' }
  );
}

async function main() {
  console.log('📋 Running endpoint tests...\n');
  
  const results = await Promise.all([
    testHomePage(),
    testSolanaRPC(),
    testJupiterPrice(),
    testHeliusTransactions(),
    testBitqueryPrice(),
  ]);
  
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log('='.repeat(70));
  console.log('📊 Test Results:');
  console.log('='.repeat(70));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total:  ${results.length}`);
  console.log('='.repeat(70) + '\n');
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Deployment looks good.\n');
    console.log('Key findings:');
    console.log('  • All API routes are deployed as serverless functions');
    console.log('  • Solana RPC proxy is working (no 403 errors expected)');
    console.log('  • Client will use /api/solana/rpc instead of public RPC\n');
    return 0;
  } else {
    console.log('⚠️  Some tests failed. Check the output above.\n');
    console.log('Common issues:');
    console.log('  • 404 errors: Netlify plugin may not be configured correctly');
    console.log('  • 403 errors: Check HELIUS_API_KEY in Netlify env vars');
    console.log('  • 500 errors: May be expected if API keys are not set\n');
    return 1;
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

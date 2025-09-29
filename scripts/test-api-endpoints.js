#!/usr/bin/env node

/**
 * Test script to verify API endpoints are working after deployment
 * Usage: node scripts/test-api-endpoints.js [BASE_URL]
 * 
 * Example: node scripts/test-api-endpoints.js https://keystone.netlify.app
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

const testEndpoints = [
  {
    name: 'Jupiter Price API',
    method: 'GET',
    path: '/api/jupiter/price?ids=SOL',
    expectedKeys: ['data']
  },
  {
    name: 'Solana RPC Proxy',
    method: 'POST',
    path: '/api/solana/rpc',
    body: { jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash' },
    expectedKeys: ['jsonrpc']
  },
  {
    name: 'Price Route',
    method: 'GET', 
    path: '/api/price?symbol=SOL',
    expectedKeys: ['price', 'symbol']
  },
  {
    name: 'Yield Scanner',
    method: 'GET',
    path: '/api/tools/yield-scanner?endpoint=pools',
    // May return array or object
    validate: (data) => data !== null
  }
];

async function testEndpoint(endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  
  try {
    const options = {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }
    
    console.log(`Testing ${endpoint.name}: ${endpoint.method} ${endpoint.path}`);
    
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}\nBody: ${responseText}`);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
    
    // Validate response structure
    if (endpoint.expectedKeys) {
      const missingKeys = endpoint.expectedKeys.filter(key => !(key in data));
      if (missingKeys.length > 0) {
        throw new Error(`Missing expected keys: ${missingKeys.join(', ')}`);
      }
    }
    
    if (endpoint.validate && !endpoint.validate(data)) {
      throw new Error(`Response validation failed`);
    }
    
    console.log(`✅ ${endpoint.name} - OK`);
    return true;
    
  } catch (error) {
    console.log(`❌ ${endpoint.name} - FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`Testing API endpoints against: ${baseUrl}\n`);
  
  let passed = 0;
  let total = testEndpoints.length;
  
  for (const endpoint of testEndpoints) {
    const success = await testEndpoint(endpoint);
    if (success) passed++;
    console.log(''); // blank line
  }
  
  console.log(`Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log('🎉 All API endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some API endpoints failed. Check the errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
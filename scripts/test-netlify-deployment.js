#!/usr/bin/env node

/**
 * Test script to verify Netlify deployment readiness
 * Usage: node scripts/test-netlify-deployment.js [BASE_URL]
 * 
 * Example: node scripts/test-netlify-deployment.js https://keystone.netlify.app
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

const criticalEndpoints = [
  {
    name: 'Homepage',
    method: 'GET',
    path: '/',
    expectedText: 'KeyStone'
  },
  {
    name: 'Atlas Page',
    method: 'GET',
    path: '/atlas',
    expectedText: 'Solana Atlas'
  },
  {
    name: 'Airdrops API',
    method: 'GET',
    path: '/api/airdrops/speculative/solana',
    expectedKeys: ['count', 'items', 'source']
  },
  {
    name: 'Build Output Check',
    method: 'GET',
    path: '/_next/static/css/app.css',
    optional: true
  }
];

async function testEndpoint(endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  
  try {
    const options = {
      method: endpoint.method,
      headers: { 'User-Agent': 'Netlify-Deployment-Test/1.0' }
    };
    
    if (endpoint.body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(endpoint.body);
    }
    
    console.log(`Testing ${endpoint.name}: ${endpoint.method} ${endpoint.path}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok && !endpoint.optional) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (response.ok) {
      const responseText = await response.text();
      
      // Check for expected text content
      if (endpoint.expectedText && !responseText.includes(endpoint.expectedText)) {
        throw new Error(`Response does not contain expected text: "${endpoint.expectedText}"`);
      }
      
      // Check for JSON structure
      if (endpoint.expectedKeys) {
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
        }
        
        const missingKeys = endpoint.expectedKeys.filter(key => !(key in data));
        if (missingKeys.length > 0) {
          throw new Error(`Missing expected keys: ${missingKeys.join(', ')}`);
        }
      }
      
      console.log(`✅ ${endpoint.name} - OK`);
      return true;
    } else if (endpoint.optional) {
      console.log(`⚠️  ${endpoint.name} - Optional endpoint not available (${response.status})`);
      return true;
    }
    
  } catch (error) {
    console.log(`❌ ${endpoint.name} - FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🚀 Testing Netlify deployment readiness against: ${baseUrl}\n`);
  
  let passed = 0;
  let total = criticalEndpoints.length;
  
  for (const endpoint of criticalEndpoints) {
    const success = await testEndpoint(endpoint);
    if (success) passed++;
    console.log(''); // blank line
  }
  
  console.log(`Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log('🎉 All critical endpoints are working correctly! Netlify deployment should be successful.');
    process.exit(0);
  } else {
    console.log('⚠️  Some critical endpoints failed. Check the errors above before deploying to Netlify.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Deployment test failed:', error);
  process.exit(1);
});
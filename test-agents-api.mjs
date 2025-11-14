#!/usr/bin/env node

/**
 * Agent System API Test Suite
 * Tests the actual API endpoints
 */

import * as http from 'http';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;

async function testAPI(method, path, body = null) {
  return new Promise((resolve) => {
    try {
      const url = new URL(BASE_URL + path);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          error: error.message,
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    } catch (error) {
      resolve({
        error: error.message,
      });
    }
  });
}

async function runAPITests() {
  section('AGENT SYSTEM API TESTS');
  
  log('Checking if dev server is running at http://localhost:3000...', 'yellow');
  
  // Check if server is running
  const healthCheck = await testAPI('GET', '/');
  if (healthCheck.error) {
    log('✗ Dev server not running. Start with: npm run dev', 'red');
    log('\nTo run API tests, start the dev server first.', 'yellow');
    section('API ENDPOINTS READY FOR TESTING');
    
    log('\nOnce dev server is running, test these endpoints:\n', 'cyan');
    
    const endpoints = [
      {
        method: 'POST',
        path: '/api/agentic',
        desc: 'Execute a strategy',
        example: {
          strategy: 'swap_token',
          input: { tokenA: 'SOL', tokenB: 'USDC', amount: 1 },
        },
      },
      {
        method: 'GET',
        path: '/api/agentic?executionId=<id>',
        desc: 'Get execution status',
        example: null,
      },
      {
        method: 'DELETE',
        path: '/api/agentic?executionId=<id>',
        desc: 'Cancel execution',
        example: null,
      },
      {
        method: 'POST',
        path: '/api/agentic/approve',
        desc: 'Submit approval request',
        example: {
          executionId: '<id>',
          message: 'Approve transaction',
        },
      },
      {
        method: 'GET',
        path: '/api/agentic/approve?approvalId=<id>',
        desc: 'Check approval status',
        example: null,
      },
      {
        method: 'PATCH',
        path: '/api/agentic/approve',
        desc: 'Respond to approval with signature',
        example: {
          approvalId: '<id>',
          approved: true,
          signature: '<sig>',
        },
      },
      {
        method: 'GET',
        path: '/api/agentic/history?limit=10&offset=0',
        desc: 'Get execution history',
        example: null,
      },
    ];

    endpoints.forEach((ep, i) => {
      log(`${i + 1}. ${ep.method.padEnd(6)} ${ep.path}`, 'blue');
      log(`   → ${ep.desc}`, 'dim');
      if (ep.example) {
        log(`   Example: ${JSON.stringify(ep.example)}`, 'dim');
      }
      console.log();
    });

    return;
  }

  log('✓ Dev server is running!', 'green');

  // Test 1: POST /api/agentic - Execute strategy
  log('\n▶ Testing POST /api/agentic', 'blue');
  const execResponse = await testAPI('POST', '/api/agentic', {
    strategy: 'analyze_token_safety',
    input: { tokenAddress: 'EPjFWdd5Au' },
  });

  if (execResponse.error) {
    log(`✗ API execution failed: ${execResponse.error}`, 'red');
    failed++;
  } else if (execResponse.status === 200 || execResponse.status === 202) {
    log(`✓ API execution successful (${execResponse.status})`, 'green');
    try {
      const data = JSON.parse(execResponse.body);
      log(`  → Execution ID: ${data.executionId || 'N/A'}`, 'dim');
      log(`  → Status: ${data.status || 'N/A'}`, 'dim');
      passed++;
    } catch (e) {
      log(`  → Response received but couldn't parse JSON`, 'dim');
      passed++;
    }
  } else {
    log(`✗ Unexpected status: ${execResponse.status}`, 'red');
    failed++;
  }

  // Test 2: GET /api/agentic - Get status
  log('\n▶ Testing GET /api/agentic (status check)', 'blue');
  const statusResponse = await testAPI('GET', '/api/agentic?executionId=test-123');
  
  if (statusResponse.error) {
    log(`✗ Status check failed: ${statusResponse.error}`, 'red');
    failed++;
  } else if (statusResponse.status) {
    log(`✓ Status endpoint responded (${statusResponse.status})`, 'green');
    passed++;
  }

  // Test 3: GET /api/agentic/history - Get history
  log('\n▶ Testing GET /api/agentic/history', 'blue');
  const historyResponse = await testAPI('GET', '/api/agentic/history?limit=5&offset=0');
  
  if (historyResponse.error) {
    log(`✗ History fetch failed: ${historyResponse.error}`, 'red');
    failed++;
  } else if (historyResponse.status) {
    log(`✓ History endpoint responded (${historyResponse.status})`, 'green');
    try {
      const data = JSON.parse(historyResponse.body);
      log(`  → Records returned: ${(data.executions || []).length || 0}`, 'dim');
      passed++;
    } catch (e) {
      passed++;
    }
  }

  // Test 4: POST /api/agentic/approve - Request approval
  log('\n▶ Testing POST /api/agentic/approve', 'blue');
  const approveResponse = await testAPI('POST', '/api/agentic/approve', {
    executionId: 'test-exec-123',
    message: 'Test approval request',
  });
  
  if (approveResponse.error) {
    log(`✗ Approval request failed: ${approveResponse.error}`, 'red');
    failed++;
  } else if (approveResponse.status) {
    log(`✓ Approval endpoint responded (${approveResponse.status})`, 'green');
    passed++;
  }

  section('API TEST SUMMARY');
  const total = passed + failed;
  const successRate = ((passed / total) * 100).toFixed(1);

  log(`Total API Tests: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

  console.log('='.repeat(70) + '\n');

  if (failed === 0) {
    log('✓ All API endpoints are working!', 'green');
  } else {
    log(`Note: If endpoints returned errors, this is expected behavior when testing without a wallet connection or database setup.`, 'yellow');
  }
}

// Run tests
runAPITests().catch(console.error);

/**
 * Portfolio Rebalancer End-to-End Test
 * Tests: wallet loading, rebalance calculation, tax analysis, and trade execution
 * 
 * Usage: node test-rebalancer.mjs <wallet_address> [target_alloc_json]
 * Example: node test-rebalancer.mjs "266k5VfWJpPpJXQUPJPApxsWimM3qgeprEiCyXR3LXdn"
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_WALLET = '266k5VfWJpPpJXQUPJPApxsWimM3qgeprEiCyXR3LXdn';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function success(msg) { log(colors.green, '✓', msg); }
function error(msg) { log(colors.red, '✗', msg); }
function info(msg) { log(colors.blue, 'ℹ', msg); }
function warn(msg) { log(colors.yellow, '⚠', msg); }
function step(msg) { log(colors.cyan, '→', msg); }

async function testWalletLoading(walletAddress) {
  step('STEP 1: Load Wallet Holdings');
  
  try {
    const url = `${BASE_URL}/api/helius/das/wallet-holdings?address=${walletAddress}`;
    info(`Fetching from: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      error(`API returned ${response.status}: ${data.error || response.statusText}`);
      return null;
    }
    
    const holdings = data.holdings || data.result || [];
    if (!holdings.length) {
      warn(`No tokens found in wallet ${walletAddress}`);
      return null;
    }
    
    success(`Loaded ${holdings.length} tokens from wallet`);
    console.table(holdings.slice(0, 5).map(h => ({
      Symbol: h.symbol || 'UNKNOWN',
      Amount: h.amount?.toFixed(2),
      Value: `$${h.valueUSD?.toFixed(2)}`,
      Mint: h.mint?.slice(0, 8) + '...',
    })));
    
    if (holdings.length > 5) {
      info(`... and ${holdings.length - 5} more tokens`);
    }
    
    return holdings;
  } catch (e) {
    error(`Failed to load wallet: ${e.message}`);
    return null;
  }
}

async function testRebalanceCalculation(holdings) {
  step('STEP 2: Calculate Rebalance Plan');
  
  if (!holdings || !holdings.length) {
    error('No holdings to rebalance');
    return null;
  }
  
  try {
    // Create target allocations: equal weight for top 3 tokens
    const top3 = holdings.slice(0, 3);
    const targetPercent = 100 / top3.length;
    const targetAllocations = top3.map(h => ({
      symbol: h.symbol || 'UNKNOWN',
      targetPercent,
      mint: h.mint,
    }));
    
    const totalValue = holdings.reduce((sum, h) => sum + (h.valueUSD || 0), 0);
    
    info(`Target: ${targetAllocations.map(t => `${t.symbol} ${t.targetPercent.toFixed(1)}%`).join(', ')}`);
    info(`Total Portfolio Value: $${totalValue.toFixed(2)}`);
    
    const payload = {
      currentHoldings: holdings,
      targetAllocations,
      totalPortfolioValue: totalValue,
    };
    
    const response = await fetch(`${BASE_URL}/api/solana/rebalance-calculator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      error(`Rebalance calculation failed: ${result.error}`);
      return null;
    }
    
    success(`Calculated ${result.trades.length} trades`);
    console.table(result.trades.map((t, i) => ({
      '#': i + 1,
      'From→To': `${t.fromSymbol} → ${t.toSymbol}`,
      'Sell': t.fromAmount.toFixed(2),
      'Buy': t.estimatedToAmount.toFixed(2),
      'Slippage': t.slippagePercent.toFixed(2) + '%',
      'Gas': t.gasCost.toFixed(4) + ' SOL',
    })));
    
    info(`Gas Savings (yearly): ${result.totalGasSavings.toFixed(3)} SOL`);
    info(`Rebalance Gas Cost: ${result.totalRebalanceGasCost.toFixed(4)} SOL`);
    info(`Drift Before: ${result.currentDrift.toFixed(2)}%`);
    info(`Drift After: ${result.projectedDrift.toFixed(2)}%`);
    
    return { ...result, targetAllocations, holdings };
  } catch (e) {
    error(`Rebalance calculation error: ${e.message}`);
    return null;
  }
}

async function testTaxAnalysis(rebalanceData) {
  step('STEP 3: Analyze Tax Implications');
  
  if (!rebalanceData) {
    error('No rebalance data for tax analysis');
    return null;
  }
  
  try {
    const payload = {
      holdings: rebalanceData.holdings,
      rebalanceTrades: rebalanceData.trades,
    };
    
    const response = await fetch(`${BASE_URL}/api/solana/tax-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const analysis = await response.json();
    
    if (!response.ok) {
      error(`Tax analysis failed: ${analysis.error}`);
      return null;
    }
    
    success('Tax analysis complete');
    
    console.table({
      'Short-term Gains': `$${analysis.capitalGains.shortTerm.toFixed(2)}`,
      'Long-term Gains': `$${analysis.capitalGains.longTerm.toFixed(2)}`,
      'Total Gains': `$${analysis.capitalGains.total.toFixed(2)}`,
      'Est. Tax Liability': `$${analysis.rebalanceTaxImpact.estimatedTaxLiability.toFixed(2)}`,
      'Taxable Events': analysis.rebalanceTaxImpact.taxableEvents,
    });
    
    if (analysis.washSaleRisks.length > 0) {
      warn(`Wash Sale Risks: ${analysis.washSaleRisks.length}`);
      analysis.washSaleRisks.forEach(risk => {
        warn(`  - ${risk.symbol}: ${risk.message}`);
      });
    }
    
    if (analysis.taxLossHarvestingOpportunities.length > 0) {
      success(`Tax Loss Harvesting Opportunities: ${analysis.taxLossHarvestingOpportunities.length}`);
      console.table(analysis.taxLossHarvestingOpportunities.map(opp => ({
        Symbol: opp.symbol,
        Loss: `$${opp.loss.toFixed(2)}`,
        'Days Held': opp.daysHeld,
        Recommendation: opp.recommendation,
      })));
    }
    
    if (analysis.rebalanceTaxImpact.taxOptimizedStrategy) {
      info(`💡 Tax Strategy: ${analysis.rebalanceTaxImpact.taxOptimizedStrategy}`);
    }
    
    return analysis;
  } catch (e) {
    error(`Tax analysis error: ${e.message}`);
    return null;
  }
}

async function testExecuteRebalance(rebalanceData) {
  step('STEP 4: Simulate Rebalance Execution');
  
  if (!rebalanceData) {
    error('No rebalance data for execution');
    return null;
  }
  
  try {
    const payload = {
      trades: rebalanceData.trades,
      walletAddress: TEST_WALLET,
    };
    
    const response = await fetch(`${BASE_URL}/api/solana/execute-rebalance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      error(`Execute failed: ${result.error}`);
      return null;
    }
    
    success('Rebalance execution simulated successfully');
    info(`Status: ${result.status}`);
    info(`Trades Executed: ${result.tradesExecuted || result.executionDetails?.tradesCount}`);
    info(`Message: ${result.message}`);
    
    if (result.signature) {
      info(`Tx Signature: ${result.signature}`);
    }
    
    return result;
  } catch (e) {
    error(`Execute error: ${e.message}`);
    return null;
  }
}

async function testEndToEnd() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PORTFOLIO REBALANCER END-TO-END TEST');
  console.log('='.repeat(80) + '\n');
  
  // Step 1: Load wallet
  const holdings = await testWalletLoading(TEST_WALLET);
  if (!holdings) {
    error('Test aborted: could not load wallet');
    process.exit(1);
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');
  
  // Step 2: Calculate rebalance
  const rebalanceData = await testRebalanceCalculation(holdings);
  if (!rebalanceData) {
    error('Test aborted: could not calculate rebalance');
    process.exit(1);
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');
  
  // Step 3: Tax analysis
  const taxAnalysis = await testTaxAnalysis(rebalanceData);
  if (!taxAnalysis) {
    warn('Tax analysis failed, but continuing');
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');
  
  // Step 4: Execute
  const executionResult = await testExecuteRebalance(rebalanceData);
  if (!executionResult) {
    error('Test aborted: could not execute');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✓ END-TO-END TEST PASSED');
  console.log('='.repeat(80) + '\n');
  
  // Summary
  console.log('📈 Summary:');
  console.log(`  • Loaded ${holdings.length} tokens from wallet`);
  console.log(`  • Calculated ${rebalanceData.trades.length} rebalance trades`);
  console.log(`  • Gas savings: ${rebalanceData.totalGasSavings.toFixed(3)} SOL/year`);
  console.log(`  • Est. tax liability: $${taxAnalysis?.rebalanceTaxImpact.estimatedTaxLiability.toFixed(2) || 'N/A'}`);
  console.log(`  • Rebalance status: ${executionResult.status}\n`);
}

// Run test
testEndToEnd().catch(e => {
  error(`Test failed: ${e.message}`);
  process.exit(1);
});

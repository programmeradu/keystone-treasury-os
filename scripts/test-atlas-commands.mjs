// scripts/test-atlas-commands.mjs
import fetch from 'node-fetch';

const API_ENDPOINT = 'http://localhost:3000/api/ai/parse-atlas-command';

// A comprehensive list of commands to test the AI parser's capabilities
const testCommands = [
  // 1. Tool: navigate_to_tab (lab)
  "go to the lab",
  // 2. Tool: navigate_to_tab (quests)
  "show me the quests",
  // 3. Tool: swap_tokens
  "swap 1.5 SOL for USDC",
  // 4. Tool: stake_sol
  "stake 10 sol with marinade",
  // 5. Tool: scan_airdrops
  "are there any airdrops for my wallet?",
  // 6. Tool: view_holder_insights
  "show me the holders for the JUP token", // JUP Mint: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbCoEk2MksGv
  // 7. Tool: scan_mev
  "scan for recent MEV activity",
  // 8. Tool: create_dca_bot
  "I want to DCA into wBTC with 5 USDC every day",
  // 9. Tool: rug_pull_detector
  "check if token 7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx is a rug pull",
  // 10. Tool: transaction_time_machine
  "analyze transaction 5h4iA2y123abcdeFGH1jklmnoPQRStuvwxYZ",
  // 11. Tool: fee_saver_insights
  "how can I save money on my transaction fees?",
  // 12. Tool: copy_trader
  "copy the trades of wallet 3L1bA2y123abcdeFGH1jklmnoPQRStuv",
  // --- Strategy Lab & Conversational Tests ---
  "I want to provide liquidity with 20 SOL",
  "what can you do?",
  "what are the trending tokens right now?",
  "is it a good time to buy solana?",
];

// ANSI colors for better readability in the terminal
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

async function runTests() {
  console.log(`${colors.cyan}--- Starting Atlas Command Layer Test ---${colors.reset}\n`);

  for (const command of testCommands) {
    console.log(`${colors.yellow}Testing command:${colors.reset} "${command}"`);
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: command }),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const jsonResponse = await response.json();
      console.log(`${colors.green}Response:${colors.reset}`, JSON.stringify(jsonResponse, null, 2));
      console.log('---');

    } catch (error) {
      console.error(`${colors.red}Error testing command "${command}":${colors.reset}`, error.message);
      console.log('---');
    }
    // Wait a moment between requests to avoid rate limiting or overwhelming the service
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n${colors.cyan}--- Test Complete ---${colors.reset}`);
}

runTests();

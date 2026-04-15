/** Home page FAQ — single source for UI and FAQPage JSON-LD. */
export const HOME_FAQ_ITEMS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "Who is dreyv for?",
    answer:
      "Teams that run real money on Solana — DAOs, protocol foundations, startups with on-chain treasuries, and operators who live in Squads, Jupiter, and a dozen other tabs. If you need approvers to see what a transaction does before they sign, dreyv is built for you.",
  },
  {
    question: "What is dreyv?",
    answer:
      "dreyv is an AI-powered, non-custodial treasury workspace for teams on Solana. You describe intent in plain language; dreyv turns that into a structured plan, runs fork simulation so approvers see balances, routes, and risk in human-readable form (not blind hex), and fits into your existing multisig flow (e.g. Squads). We do not custody assets — you keep the keys.",
  },
  {
    question: "How is dreyv different from Squads (or another multisig)?",
    answer:
      "Multisig tools are where approvals happen. dreyv is where you compose complex treasury intent, compare routes, and preview outcomes before a proposal is ready to sign. Use both: plan and simulate in dreyv, execute with the policies and signers you already trust.",
  },
  {
    question: "What does treasury-by-intent mean?",
    answer:
      "It is how you work in dreyv: describe strategic intent in plain language (for example “rebalance to target weights” or “swap and route surplus to stables”), review the structured plan and simulation, then approve with your wallet when you are ready — instead of clicking through many disconnected tools.",
  },
  {
    question: "Is dreyv custodial?",
    answer:
      "No. dreyv is a coordination and intelligence layer. You connect your wallet and multisig; proposals and transactions are signed with your keys. dreyv does not take custody of assets.",
  },
  {
    question: "Does dreyv work with Squads multisig?",
    answer:
      "Yes. dreyv is designed to sit on top of Squads and similar multisig workflows so treasury policies and signatures stay where your team already operates.",
  },
  {
    question: "Which networks does dreyv support?",
    answer:
      "Today the product is focused on Solana-native treasuries, routing, and tooling (including Jupiter and ecosystem integrations). Support for additional chains may expand over time.",
  },
  {
    question: "What does simulation mean in dreyv?",
    answer:
      "Before you sign, dreyv can model the proposed transaction: balances, routes, slippage assumptions, and risk signals so approvers see human-readable outcomes instead of blind hex.",
  },
];

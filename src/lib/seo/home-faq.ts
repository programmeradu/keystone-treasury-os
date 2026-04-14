/** Home page FAQ — single source for UI and FAQPage JSON-LD. */
export const HOME_FAQ_ITEMS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What is dreyv?",
    answer:
      "dreyv is a non-custodial treasury operating system for teams on Solana. You describe what you want in plain language; dreyv plans routes, runs execution previews, and coordinates signing on top of your existing multisig (for example Squads) — without holding your keys.",
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

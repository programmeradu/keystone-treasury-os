import * as fs from "node:fs";
import * as path from "node:path";

const STARTER_APP = `import { useVault, useFetch } from '@keystone-os/sdk';

export default function App() {
  const { tokens, balances } = useVault();

  return (
    <div className="p-6 bg-zinc-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold text-emerald-400 mb-4">My Mini-App</h1>
      <div className="space-y-2 font-mono">
        {tokens.map((t) => (
          <div key={t.symbol} className="flex justify-between border-b border-zinc-800 py-2">
            <span>{t.symbol}</span>
            <span>{t.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

const LOCKFILE = {
  version: "1.0.0",
  packages: {
    react: {
      url: "https://esm.sh/react@19.0.0",
      types: "https://esm.sh/v135/@types/react@19.0.0/index.d.ts",
      external: true,
    },
    "react-dom": {
      url: "https://esm.sh/react-dom@19.0.0",
      types: "https://esm.sh/v135/@types/react-dom@19.0.0/index.d.ts",
      external: true,
    },
    "@keystone-os/sdk": {
      url: "https://esm.sh/@keystone-os/sdk",
      types: "https://esm.sh/@keystone-os/sdk",
      external: false,
    },
  },
};

export function runInit(dir: string): void {
  const targetDir = path.resolve(process.cwd(), dir || ".");
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    throw new Error(`Directory ${targetDir} is not empty.`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "App.tsx"), STARTER_APP);
  fs.writeFileSync(
    path.join(targetDir, "keystone.lock.json"),
    JSON.stringify(LOCKFILE, null, 2)
  );
  fs.writeFileSync(
    path.join(targetDir, "README.md"),
    `# Keystone Mini-App

Built with \`@keystone-os/sdk\`. Open in Keystone Studio to run.
`
  );

  console.log(`Created Mini-App in ${targetDir}`);
  console.log("  - App.tsx");
  console.log("  - keystone.lock.json");
  console.log("  - README.md");
}

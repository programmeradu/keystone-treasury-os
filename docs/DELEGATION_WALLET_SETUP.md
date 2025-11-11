# Delegation Wallet Setup Guide

## Quick Setup (15 minutes)

This guide will help you create and configure the delegation wallet needed for automated DCA bot execution.

## Prerequisites

- Solana CLI installed on your machine
- Access to Netlify dashboard for environment variables
- ~0.1 SOL to fund the delegation wallet for transaction fees

## Step 1: Install Solana CLI (if not already installed)

### Windows (PowerShell):
```powershell
cmd /c "curl https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"
C:\solana-install-tmp\solana-install-init.exe v1.18.22
```

### macOS/Linux:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### Verify Installation:
```bash
solana --version
# Should output: solana-cli 1.18.x
```

## Step 2: Generate Delegation Wallet

```bash
# Generate new keypair
solana-keygen new --outfile delegation-wallet.json --no-bip39-passphrase

# Output will show:
# pubkey: <PUBLIC_KEY>
# Save this somewhere safe!
```

**Important:** Save the public key that's displayed. You'll need it for environment variables.

## Step 3: Convert Private Key to Base64

The private key needs to be in base64 format for the environment variable.

### Using Node.js:
```javascript
// In Node.js REPL or script
const fs = require('fs');
const keypairJson = JSON.parse(fs.readFileSync('delegation-wallet.json', 'utf-8'));
const privateKeyBase64 = Buffer.from(keypairJson).toString('base64');
console.log(privateKeyBase64);
```

### Using PowerShell (Windows):
```powershell
$json = Get-Content delegation-wallet.json | ConvertFrom-Json
$bytes = [byte[]]$json
$base64 = [Convert]::ToBase64String($bytes)
Write-Output $base64
```

### Using Python:
```python
import json
import base64

with open('delegation-wallet.json', 'r') as f:
    keypair = json.load(f)

private_key_base64 = base64.b64encode(bytes(keypair)).decode('utf-8')
print(private_key_base64)
```

## Step 4: Fund the Delegation Wallet

The delegation wallet needs SOL to pay for transaction fees (gas).

```bash
# Check the public key again if you forgot it
solana-keygen pubkey delegation-wallet.json

# Transfer SOL from your main wallet
# You can use Phantom, Solflare, or CLI:
solana transfer <DELEGATION_WALLET_PUBLIC_KEY> 0.1 --url mainnet-beta

# Verify balance
solana balance <DELEGATION_WALLET_PUBLIC_KEY> --url mainnet-beta
```

**Recommended amount:** 0.1 SOL (~$15-20)
- Each transaction costs ~0.00001 SOL
- 0.1 SOL = ~10,000 transactions
- Should last for months

## Step 5: Add to Netlify Environment Variables

1. Go to your Netlify dashboard
2. Select your site: `keystone-treasury-os`
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**

### Add these variables:

**Variable 1:**
- **Key:** `DELEGATION_WALLET_PUBLIC_KEY`
- **Value:** `<PUBLIC_KEY_FROM_STEP_2>`
- **Scopes:** All scopes

**Variable 2:**
- **Key:** `DELEGATION_WALLET_PRIVATE_KEY`
- **Value:** `<BASE64_STRING_FROM_STEP_3>`
- **Scopes:** All scopes
- **⚠️ Mark as SECRET** (hide from logs)

**Variable 3 (if not already added):**
- **Key:** `SOLANA_RPC_URL`
- **Value:** `https://api.mainnet-beta.solana.com` (or your Helius URL)
- **Scopes:** All scopes

## Step 6: Verify Setup

### Test Balance Check Endpoint:

After deployment, test that RPC is working:

```bash
# Replace YOUR_WALLET with a real Solana address
curl "https://keystone-treasury-os.netlify.app/api/test/balance?wallet=YOUR_WALLET"
```

Expected response:
```json
{
  "success": true,
  "wallet": "...",
  "rpc": {
    "healthy": true,
    "slot": 123456789,
    "version": "1.18.x"
  },
  "balances": {
    "SOL": { "amount": 1.5, "symbol": "SOL" },
    "USDC": { "amount": 100.0, "symbol": "USDC" }
  }
}
```

## Step 7: Test Delegation Request

Test the delegation API:

```bash
curl -X POST "https://keystone-treasury-os.netlify.app/api/delegation/request" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 100,
    "expiryDays": 30
  }'
```

Expected response:
```json
{
  "success": true,
  "delegation": {
    "userWallet": "...",
    "delegateWallet": "...",
    "amount": 100,
    "expiryDays": 30
  },
  "transaction": { ... }
}
```

## Security Best Practices

### ✅ DO:
- Store private key only in environment variables
- Use Netlify's "secret" marking for sensitive vars
- Regularly monitor delegation wallet balance
- Keep backup of keypair file in secure location (encrypted)
- Rotate delegation wallet every 6-12 months

### ❌ DON'T:
- Commit delegation-wallet.json to git
- Share private key with anyone
- Use the same wallet for other purposes
- Fund with more than 0.5 SOL
- Store private key in code or client-side

## Monitoring

### Check Delegation Wallet Balance:
```bash
solana balance <DELEGATION_WALLET_PUBLIC_KEY> --url mainnet-beta
```

### View Recent Transactions:
```bash
solana transaction-history <DELEGATION_WALLET_PUBLIC_KEY> --limit 10 --url mainnet-beta
```

### Or use Solscan:
https://solscan.io/account/<DELEGATION_WALLET_PUBLIC_KEY>

## When to Refill

**Monitor your delegation wallet balance:**
- ✅ Above 0.05 SOL: Good
- ⚠️ Below 0.02 SOL: Refill soon
- ❌ Below 0.01 SOL: Urgent - may fail transactions

**Set up alerts:**
- Check balance weekly
- Get notifications when < 0.02 SOL
- Refill with 0.1 SOL when low

## Troubleshooting

### Error: "Delegation wallet not configured"
- Check that `DELEGATION_WALLET_PUBLIC_KEY` is set in Netlify
- Verify the variable name is exactly as shown above
- Redeploy after adding variables

### Error: "Failed to get RPC health"
- Check `SOLANA_RPC_URL` is set correctly
- Test RPC endpoint manually
- Consider using Helius instead of public RPC

### Error: "Insufficient funds"
- Check delegation wallet balance
- Ensure wallet has at least 0.01 SOL
- Transfer more SOL if needed

### Error: "Invalid private key format"
- Ensure private key is base64 encoded
- Re-run conversion script from Step 3
- Update environment variable

## Next Steps

Once delegation wallet is set up:

1. ✅ Test balance endpoint works
2. ✅ Test delegation request API
3. ⏳ Build delegation UI components
4. ⏳ Update scheduled function to use delegation
5. ⏳ Test on devnet
6. ⏳ Deploy to mainnet

## Support

If you encounter issues:
1. Check Netlify function logs
2. Verify all environment variables are set
3. Test RPC connection manually
4. Review error messages in console

**Commit this file to git (it contains no secrets)**

## Quick Reference

**Public Key Location:** delegation-wallet.json → pubkey field
**Private Key Format:** Base64 encoded array of bytes
**Funding Required:** ~0.1 SOL for transaction fees
**Variables Needed:** 
- `DELEGATION_WALLET_PUBLIC_KEY`
- `DELEGATION_WALLET_PRIVATE_KEY` (secret)
- `SOLANA_RPC_URL`

---

**Setup Complete! 🎉**

Your delegation wallet is ready for automated DCA bot execution.

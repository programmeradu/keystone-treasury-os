# KeystoneMarket Devnet Deployment Script
# Prerequisites: Solana CLI in PATH, funded devnet wallet at ~/.config/solana/id.json

$ErrorActionPreference = "Stop"
$SOLANA_BIN = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
if (Test-Path $SOLANA_BIN) { $env:PATH = "$SOLANA_BIN;$env:PATH" }
# cargo-build-sbf requires HOME on Windows
if (-not $env:HOME) { $env:HOME = $env:USERPROFILE }

Write-Host "=== Step 1: Verify Wallet ===" -ForegroundColor Cyan
$balance = solana balance --url devnet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Solana CLI not found. Install via: agave-install init 2.1.15" -ForegroundColor Red
    Write-Host "Or download from https://github.com/anza-xyz/agave/releases" -ForegroundColor Red
    exit 1
}
Write-Host "Balance: $balance"
$balanceNum = [double]($balance -replace ' SOL','')
if ($balanceNum -lt 1.5) {
    Write-Host "Airdropping 2 SOL..." -ForegroundColor Yellow
    solana airdrop 2 --url devnet
}

Write-Host "`n=== Step 2: Deploy to Devnet ===" -ForegroundColor Cyan
Push-Location $PSScriptRoot\..
anchor deploy --provider.cluster devnet
$deployExit = $LASTEXITCODE
Pop-Location

if ($deployExit -ne 0) { exit $deployExit }

Write-Host "`n=== Step 3: Verify Registry Sync ===" -ForegroundColor Cyan
$programId = (Get-Content "programs\keystone_marketplace\src\lib.rs" | Select-String 'declare_id!\("([^"]+)"\)').Matches.Groups[1].Value
$tomlId = (Select-String -Path "Anchor.toml" -Pattern 'keystone_marketplace = "([^"]+)"' | Select-Object -First 1).Matches.Groups[1].Value
Write-Host "Program ID (lib.rs): $programId"
Write-Host "Program ID (Anchor.toml): $tomlId"
if ($programId -eq $tomlId) {
    Write-Host "Registry synced." -ForegroundColor Green
} else {
    Write-Host "Mismatch. Run: anchor keys sync" -ForegroundColor Yellow
}

Write-Host "`nDeployment complete. Program ID: $programId" -ForegroundColor Green

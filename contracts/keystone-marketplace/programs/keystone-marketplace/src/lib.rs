use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("5SAPF43roehD9uHGWyTMCpQhT1eUJXAB8Lc2wiETm3UL");

/// Revenue split: 80% developer, 20% protocol (in basis points)
const DEVELOPER_FEE_BPS: u16 = 8000;
const PROTOCOL_FEE_BPS: u16 = 2000;

/// Escrow confirmation period: 3 days (in seconds)
const ESCROW_CONFIRMATION_SECONDS: i64 = 259200;

/// Keystone Treasury wallet (protocol fee recipient)
const TREASURY: &str = "FkEYbxAV8cNbfHPw6zBGLPnRnGiQoTFJnqYqAfJgphqo";

#[program]
pub mod keystone_marketplace {
    use super::*;

    /// Register a new app in the marketplace.
    pub fn register_app(
        ctx: Context<RegisterApp>,
        app_id: [u8; 32],
        price_usdc: u64,
        ipfs_cid: [u8; 46],
    ) -> Result<()> {
        require!(price_usdc > 0 || price_usdc == 0, MarketplaceError::InvalidPrice);

        let registry = &mut ctx.accounts.app_registry;
        registry.developer = ctx.accounts.developer.key();
        registry.price_usdc = price_usdc;
        registry.developer_fee_bps = DEVELOPER_FEE_BPS;
        registry.ipfs_cid = ipfs_cid;
        registry.is_listed = true;
        registry.total_purchases = 0;
        registry.total_revenue = 0;
        registry.escrow_balance = 0;
        registry.created_at = Clock::get()?.unix_timestamp;
        registry.updated_at = Clock::get()?.unix_timestamp;

        msg!("App registered: {:?}", app_id);
        emit!(AppRegistered {
            app_id,
            developer: ctx.accounts.developer.key(),
            price_usdc,
        });

        Ok(())
    }

    /// Purchase an app. Splits payment 80/20 between developer and treasury.
    pub fn purchase_app(ctx: Context<PurchaseApp>) -> Result<()> {
        let registry = &ctx.accounts.app_registry;
        require!(registry.is_listed, MarketplaceError::AppNotListed);

        let price = registry.price_usdc;
        if price > 0 {
            let developer_share = (price as u128 * DEVELOPER_FEE_BPS as u128 / 10000) as u64;
            let protocol_share = price - developer_share;

            // Transfer developer share
            if developer_share > 0 {
                let transfer_to_dev = Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.developer_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                };
                token::transfer(
                    CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_to_dev),
                    developer_share,
                )?;
            }

            // Transfer protocol share to treasury
            if protocol_share > 0 {
                let transfer_to_treasury = Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                };
                token::transfer(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        transfer_to_treasury,
                    ),
                    protocol_share,
                )?;
            }

            emit!(PurchaseEvent {
                buyer: ctx.accounts.buyer.key(),
                developer: registry.developer,
                price,
                developer_share,
                protocol_share,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        // Update registry stats
        let registry = &mut ctx.accounts.app_registry;
        registry.total_purchases += 1;
        registry.total_revenue += price;
        registry.updated_at = Clock::get()?.unix_timestamp;

        msg!("App purchased. Dev: {}, Protocol: {}", 
            (price as u128 * DEVELOPER_FEE_BPS as u128 / 10000) as u64,
            price - (price as u128 * DEVELOPER_FEE_BPS as u128 / 10000) as u64
        );

        Ok(())
    }

    /// Update the price of an app. Only the developer can call this.
    pub fn update_price(ctx: Context<UpdatePrice>, new_price_usdc: u64) -> Result<()> {
        let registry = &mut ctx.accounts.app_registry;
        require!(
            registry.developer == ctx.accounts.developer.key(),
            MarketplaceError::Unauthorized
        );

        registry.price_usdc = new_price_usdc;
        registry.updated_at = Clock::get()?.unix_timestamp;

        msg!("Price updated to: {}", new_price_usdc);
        Ok(())
    }

    /// Delist an app from the marketplace.
    pub fn delist_app(ctx: Context<DelistApp>) -> Result<()> {
        let registry = &mut ctx.accounts.app_registry;
        require!(
            registry.developer == ctx.accounts.developer.key(),
            MarketplaceError::Unauthorized
        );

        registry.is_listed = false;
        registry.updated_at = Clock::get()?.unix_timestamp;

        msg!("App delisted");
        Ok(())
    }

    /// Withdraw accumulated escrow funds after confirmation period.
    pub fn withdraw_escrow(ctx: Context<WithdrawEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_vault;
        let now = Clock::get()?.unix_timestamp;

        require!(
            now - escrow.last_withdrawal >= ESCROW_CONFIRMATION_SECONDS,
            MarketplaceError::EscrowLocked
        );
        require!(escrow.balance > 0, MarketplaceError::InsufficientFunds);

        // Transfer from escrow to developer
        let seeds = &[
            b"escrow".as_ref(),
            ctx.accounts.app_registry.to_account_info().key.as_ref(),
            &[ctx.bumps.escrow_vault],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.developer_token_account.to_account_info(),
            authority: ctx.accounts.escrow_vault.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_ctx,
                signer_seeds,
            ),
            escrow.balance,
        )?;

        // Update escrow state
        let escrow = &mut ctx.accounts.escrow_vault;
        escrow.balance = 0;
        escrow.last_withdrawal = now;

        msg!("Escrow withdrawn");
        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(app_id: [u8; 32])]
pub struct RegisterApp<'info> {
    #[account(mut)]
    pub developer: Signer<'info>,

    #[account(
        init,
        payer = developer,
        space = 8 + AppRegistry::INIT_SPACE,
        seeds = [b"app_registry", app_id.as_ref()],
        bump
    )]
    pub app_registry: Account<'info, AppRegistry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseApp<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub app_registry: Account<'info, AppRegistry>,

    /// CHECK: developer wallet, validated against registry
    #[account(mut, constraint = developer.key() == app_registry.developer)]
    pub developer: AccountInfo<'info>,

    /// CHECK: treasury wallet
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub developer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    pub developer: Signer<'info>,

    #[account(mut)]
    pub app_registry: Account<'info, AppRegistry>,
}

#[derive(Accounts)]
pub struct DelistApp<'info> {
    pub developer: Signer<'info>,

    #[account(mut)]
    pub app_registry: Account<'info, AppRegistry>,
}

#[derive(Accounts)]
pub struct WithdrawEscrow<'info> {
    #[account(mut)]
    pub developer: Signer<'info>,

    pub app_registry: Account<'info, AppRegistry>,

    #[account(
        mut,
        seeds = [b"escrow", app_registry.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub developer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ─── State ──────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct AppRegistry {
    pub developer: Pubkey,         // 32
    pub price_usdc: u64,           // 8
    pub developer_fee_bps: u16,    // 2
    pub ipfs_cid: [u8; 46],        // 46
    pub is_listed: bool,           // 1
    pub total_purchases: u64,      // 8
    pub total_revenue: u64,        // 8
    pub escrow_balance: u64,       // 8
    pub created_at: i64,           // 8
    pub updated_at: i64,           // 8
}                                  // Total: 129 bytes + 8 discriminator

#[account]
#[derive(InitSpace)]
pub struct EscrowVault {
    pub app_registry: Pubkey,      // 32
    pub balance: u64,              // 8
    pub last_withdrawal: i64,      // 8
    pub confirmation_period: i64,  // 8
}                                  // Total: 56 bytes + 8 discriminator

// ─── Events ─────────────────────────────────────────────────────────

#[event]
pub struct AppRegistered {
    pub app_id: [u8; 32],
    pub developer: Pubkey,
    pub price_usdc: u64,
}

#[event]
pub struct PurchaseEvent {
    pub buyer: Pubkey,
    pub developer: Pubkey,
    pub price: u64,
    pub developer_share: u64,
    pub protocol_share: u64,
    pub timestamp: i64,
}

// ─── Errors ─────────────────────────────────────────────────────────

#[error_code]
pub enum MarketplaceError {
    #[msg("Only the developer can perform this action")]
    Unauthorized,
    #[msg("This app is not listed for sale")]
    AppNotListed,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Escrow funds are still within confirmation period")]
    EscrowLocked,
    #[msg("Price must be greater than 0")]
    InvalidPrice,
}

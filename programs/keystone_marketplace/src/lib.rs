//! Keystone App Registry — Decentralized purchase flow with 80/20 revenue split and License NFT.
//!
//! KIMI_MARKETPLACE_SPEC: Atomic USDC → License NFT swap with protocol fee.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Run `anchor build` then `anchor keys sync` to set program ID
declare_id!("F8kN2gs4kqHtz2bkJZLbtNm6j8e7EUSarYDQcXff8iQY");

#[program]
pub mod keystone_marketplace {
    use super::*;

    /// Initialize an app listing for sale.
    pub fn initialize_app(
        ctx: Context<InitializeApp>,
        app_id: [u8; 32],
        price_usdc: u64,
        developer_fee_bps: u16,
        ipfs_cid: [u8; 64],
    ) -> Result<()> {
        let app_registry = &mut ctx.accounts.app_registry;
        app_registry.developer = ctx.accounts.developer.key();
        app_registry.price_usdc = price_usdc;
        app_registry.developer_fee_bps = developer_fee_bps; // default 8000 = 80%
        app_registry.ipfs_cid = ipfs_cid;
        app_registry.is_listed = true;
        app_registry.bump = ctx.bumps.app_registry;
        Ok(())
    }

    /// Purchase app: split USDC 80/20, mint License NFT to buyer.
    pub fn purchase_app(ctx: Context<PurchaseApp>, app_id: [u8; 32]) -> Result<()> {
        let app_registry = &ctx.accounts.app_registry;
        require!(app_registry.is_listed, MarketplaceError::AppNotListed);

        let price = app_registry.price_usdc;
        let developer_share = price
            .checked_mul(app_registry.developer_fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let protocol_share = price.checked_sub(developer_share).unwrap();

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.buyer_usdc_account.to_account_info(),
                to: ctx.accounts.developer_usdc_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, developer_share)?;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.buyer_usdc_account.to_account_info(),
                to: ctx.accounts.treasury_usdc_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, protocol_share)?;

        let app_registry_key = ctx.accounts.app_registry.key();
        let (license_authority_pda, _) = Pubkey::find_program_address(
            &[
                b"license_authority",
                app_registry_key.as_ref(),
            ],
            ctx.program_id,
        );
        require_keys_eq!(
            ctx.accounts.license_authority.key(),
            license_authority_pda,
            MarketplaceError::InvalidLicenseAuthority
        );

        let seeds = &[
            b"license_authority" as &[u8],
            app_registry_key.as_ref(),
            &[ctx.bumps.license_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.license_mint.to_account_info(),
                to: ctx.accounts.buyer_license_account.to_account_info(),
                authority: ctx.accounts.license_authority.to_account_info(),
            },
            signer,
        );
        token::mint_to(cpi_ctx, 1)?;

        emit!(PurchaseEvent {
            app_id,
            buyer: ctx.accounts.buyer.key(),
            developer: app_registry.developer,
            price,
            developer_share,
            protocol_share,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[account]
pub struct AppRegistry {
    pub developer: Pubkey,
    pub price_usdc: u64,
    pub developer_fee_bps: u16, // 8000 = 80%
    pub ipfs_cid: [u8; 64],
    pub is_listed: bool,
    pub bump: u8,
}

impl Default for AppRegistry {
    fn default() -> Self {
        Self {
            developer: Pubkey::default(),
            price_usdc: 0,
            developer_fee_bps: 0,
            ipfs_cid: [0u8; 64],
            is_listed: false,
            bump: 0,
        }
    }
}

#[event]
pub struct PurchaseEvent {
    pub app_id: [u8; 32],
    pub buyer: Pubkey,
    pub developer: Pubkey,
    pub price: u64,
    pub developer_share: u64,
    pub protocol_share: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("App is not listed for sale")]
    AppNotListed,
    #[msg("Invalid license authority PDA")]
    InvalidLicenseAuthority,
}

#[derive(Accounts)]
#[instruction(app_id: [u8; 32])]
pub struct InitializeApp<'info> {
    #[account(
        init,
        payer = developer,
        space = 8 + 32 + 8 + 2 + 64 + 1 + 1, // discriminator + developer + price + fee_bps + ipfs_cid + is_listed + bump
        seeds = [b"app_registry", app_id.as_ref()],
        bump
    )]
    pub app_registry: Account<'info, AppRegistry>,

    #[account(mut)]
    pub developer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(app_id: [u8; 32])]
pub struct PurchaseApp<'info> {
    #[account(
        mut,
        seeds = [b"app_registry", app_id.as_ref()],
        bump = app_registry.bump,
        has_one = developer
    )]
    pub app_registry: Box<Account<'info, AppRegistry>>,

    /// Developer wallet (must match app_registry.developer)
    /// CHECK: Used only for has_one verification
    pub developer: UncheckedAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = buyer_usdc_account.owner == buyer.key(),
        constraint = buyer_usdc_account.mint == usdc_mint.key()
    )]
    pub buyer_usdc_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = developer_usdc_account.mint == usdc_mint.key()
    )]
    pub developer_usdc_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = treasury_usdc_account.mint == usdc_mint.key()
    )]
    pub treasury_usdc_account: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        mint::decimals = 0
    )]
    pub license_mint: Box<Account<'info, Mint>>,

    /// PDA: seeds = [b"license_authority", app_registry.key()]
    /// Must be the mint_authority of license_mint
    /// CHECK: PDA used for signing mint_to CPI
    #[account(
        seeds = [b"license_authority", app_registry.key().as_ref()],
        bump
    )]
    pub license_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = buyer_license_account.owner == buyer.key(),
        constraint = buyer_license_account.mint == license_mint.key()
    )]
    pub buyer_license_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

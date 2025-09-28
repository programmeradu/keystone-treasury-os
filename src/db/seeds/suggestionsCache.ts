import { db } from '@/db';
import { suggestionsCache } from '@/db/schema';

async function main() {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    const sampleSuggestions = [
        {
            text: 'Check my DeFi portfolio balance',
            weight: 0.45,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Set up automated yield farming',
            weight: 0.52,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Track my liquidity pool rewards',
            weight: 0.41,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Monitor staking rewards across protocols',
            weight: 0.58,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Review my DeFi transaction history',
            weight: 0.47,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Find best lending rates for my tokens',
            weight: 0.54,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Calculate impermanent loss on my positions',
            weight: 0.43,
            source: 'seed',
            createdAt: currentTimestamp,
        },
        {
            text: 'Set price alerts for my crypto holdings',
            weight: 0.59,
            source: 'seed',
            createdAt: currentTimestamp,
        }
    ];

    await db.insert(suggestionsCache).values(sampleSuggestions);
    
    console.log('✅ Suggestions cache seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
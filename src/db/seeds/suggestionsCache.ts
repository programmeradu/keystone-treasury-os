import { db } from '@/db';
import { learnSuggestions } from '@/db/schema';

async function main() {
    const sampleSuggestions = [
        {
            text: 'Check my DeFi portfolio balance',
            weight: '0.45',
            source: 'seed',
        },
        {
            text: 'Set up automated yield farming',
            weight: '0.52',
            source: 'seed',
        },
        {
            text: 'Track my liquidity pool rewards',
            weight: '0.41',
            source: 'seed',
        },
        {
            text: 'Monitor staking rewards across protocols',
            weight: '0.58',
            source: 'seed',
        },
        {
            text: 'Review my DeFi transaction history',
            weight: '0.47',
            source: 'seed',
        },
        {
            text: 'Find best lending rates for my tokens',
            weight: '0.54',
            source: 'seed',
        },
        {
            text: 'Calculate impermanent loss on my positions',
            weight: '0.43',
            source: 'seed',
        },
        {
            text: 'Set price alerts for my crypto holdings',
            weight: '0.59',
            source: 'seed',
        }
    ];

    await db!.insert(learnSuggestions).values(sampleSuggestions);

    console.log(' Suggestions cache seeder completed successfully');
}

main().catch((error) => {
    console.error(' Seeder failed:', error);
});
import { db } from '@/db';
import { learnSuggestions } from '@/db/schema';

async function main() {
    const sampleSuggestions = [
        {
            text: 'Check your wallet balance across different chains',
            weight: '0.55',
            source: 'seed',
        },
        {
            text: 'Find the best yield farming opportunities for your tokens',
            weight: '0.48',
            source: 'seed',
        },
        {
            text: 'Bridge your ETH to Polygon for lower transaction fees',
            weight: '0.52',
            source: 'seed',
        },
        {
            text: 'Swap USDC for USDT to get better lending rates',
            weight: '0.45',
            source: 'seed',
        },
        {
            text: 'Check your DeFi portfolio performance this month',
            weight: '0.58',
            source: 'seed',
        },
        {
            text: 'Find staking rewards for your idle cryptocurrency',
            weight: '0.51',
            source: 'seed',
        },
        {
            text: 'Compare lending rates across different DeFi protocols',
            weight: '0.46',
            source: 'seed',
        },
        {
            text: 'Monitor your liquidity pool positions for impermanent loss',
            weight: '0.53',
            source: 'seed',
        },
    ];

    await db!.insert(learnSuggestions).values(sampleSuggestions);

    console.log(' LearnSuggestions seeder completed successfully');
}

main().catch((error) => {
    console.error(' Seeder failed:', error);
});
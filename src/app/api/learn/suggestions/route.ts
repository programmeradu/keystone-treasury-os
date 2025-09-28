import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learnInputs, learnClicks, learnSuggestions } from '@/db/schema';
import { gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);
    
    // Extract bearer token (MVP - just extract, don't validate)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    // Calculate date thresholds (in milliseconds for consistency)
    const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Fetch recent user inputs and suggestion clicks (with error handling)
    let recentInputs: Array<{ text: string, createdAt: number }> = [];
    let recentClicks: Array<{ text: string, createdAt: number }> = [];
    
    try {
      recentInputs = await db.select({
        text: learnInputs.text,
        createdAt: learnInputs.createdAt
      })
      .from(learnInputs)
      .where(gte(learnInputs.createdAt, fourteenDaysAgo));
    } catch (error) {
      console.log('No learn_inputs table or no data:', error);
      recentInputs = [];
    }
    
    try {
      recentClicks = await db.select({
        text: learnClicks.text,
        createdAt: learnClicks.createdAt
      })
      .from(learnClicks)
      .where(gte(learnClicks.createdAt, fourteenDaysAgo));
    } catch (error) {
      console.log('No learn_clicks table or no data:', error);
      recentClicks = [];
    }
    
    // Fetch cached suggestions from last 30 days
    let cachedSuggestions: Array<{ text: string, weight: number }> = [];
    try {
      cachedSuggestions = await db.select({
        text: learnSuggestions.text,
        weight: learnSuggestions.weight
      })
      .from(learnSuggestions)
      .where(gte(learnSuggestions.createdAt, thirtyDaysAgo));
    } catch (error) {
      console.log('No learn_suggestions table or no data:', error);
      cachedSuggestions = [];
    }
    
    // Compute frequency maps
    const inputFreq = new Map<string, number>();
    const clickFreq = new Map<string, number>();
    
    // Process user inputs
    recentInputs.forEach(input => {
      const normalizedText = input.text.toLowerCase().trim();
      inputFreq.set(normalizedText, (inputFreq.get(normalizedText) || 0) + 1);
    });
    
    // Process suggestion clicks
    recentClicks.forEach(click => {
      const normalizedText = click.text.toLowerCase().trim();
      clickFreq.set(normalizedText, (clickFreq.get(normalizedText) || 0) + 1);
    });
    
    // Extract bigrams and compute frequencies
    const bigramFreq = new Map<string, number>();
    
    const extractBigrams = (text: string) => {
      const tokens = text.split(/\W+/)
        .filter(token => token.length >= 2)
        .map(token => token.toLowerCase());
      
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        bigramFreq.set(bigram, (bigramFreq.get(bigram) || 0) + 1);
      }
      
      return tokens;
    };
    
    // Extract bigrams from all texts
    [...recentInputs, ...recentClicks].forEach(item => {
      extractBigrams(item.text);
    });
    
    // Generate suggestions from top bigrams
    const generatedSuggestions = new Set<string>();
    const sortedBigrams = Array.from(bigramFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20 bigrams
    
    sortedBigrams.forEach(([bigram, freq]) => {
      const tokens = bigram.split(' ');
      
      // Pattern matching for common suggestions
      if (tokens.includes('bridge') && tokens.includes('usdc')) {
        generatedSuggestions.add('Bridge small amount of USDC to Base cheaply');
      }
      if (tokens.includes('swap') && tokens.includes('eth')) {
        generatedSuggestions.add('Swap a small amount of ETH to USDC on Base');
      }
      if (tokens.includes('check') && tokens.includes('wallet')) {
        generatedSuggestions.add('Check my wallet balances on Base');
      }
      if (tokens.includes('best') && tokens.includes('apy')) {
        generatedSuggestions.add('Find best APY for USDC on Base');
      }
      if (tokens.includes('bridge') && tokens.includes('eth')) {
        generatedSuggestions.add('Bridge ETH from mainnet to Base');
      }
      if (tokens.includes('swap') && tokens.includes('token')) {
        generatedSuggestions.add('Swap tokens on Base network');
      }
      if (tokens.includes('stake') || tokens.includes('staking')) {
        generatedSuggestions.add('Find staking opportunities on Base');
      }
      if (tokens.includes('price') || tokens.includes('prices')) {
        generatedSuggestions.add('Check current token prices on Base');
      }
      if (tokens.includes('liquidity')) {
        generatedSuggestions.add('Add liquidity to Base pools');
      }
      if (tokens.includes('yield') || tokens.includes('farming')) {
        generatedSuggestions.add('Find yield farming opportunities on Base');
      }
    });
    
    // Combine all suggestions
    const allSuggestions = new Map<string, { clickFreq: number, inputFreq: number, cacheWeight: number }>();
    
    // Add generated suggestions
    generatedSuggestions.forEach(suggestion => {
      const lowerSuggestion = suggestion.toLowerCase();
      const clickCount = clickFreq.get(lowerSuggestion) || 0;
      const inputCount = inputFreq.get(lowerSuggestion) || 0;
      
      allSuggestions.set(suggestion, {
        clickFreq: clickCount,
        inputFreq: inputCount,
        cacheWeight: 0
      });
    });
    
    // Add cached suggestions
    cachedSuggestions.forEach(cached => {
      const lowerText = cached.text.toLowerCase();
      const clickCount = clickFreq.get(lowerText) || 0;
      const inputCount = inputFreq.get(lowerText) || 0;
      
      if (allSuggestions.has(cached.text)) {
        const existing = allSuggestions.get(cached.text)!;
        existing.cacheWeight = Math.max(existing.cacheWeight, cached.weight);
      } else {
        allSuggestions.set(cached.text, {
          clickFreq: clickCount,
          inputFreq: inputCount,
          cacheWeight: cached.weight
        });
      }
    });
    
    // Add frequent inputs and clicks as suggestions
    inputFreq.forEach((freq, text) => {
      if (freq >= 2 && !allSuggestions.has(text)) {
        const clickCount = clickFreq.get(text) || 0;
        allSuggestions.set(text, {
          clickFreq: clickCount,
          inputFreq: freq,
          cacheWeight: 0
        });
      }
    });
    
    clickFreq.forEach((freq, text) => {
      if (freq >= 2 && !allSuggestions.has(text)) {
        const inputCount = inputFreq.get(text) || 0;
        allSuggestions.set(text, {
          clickFreq: freq,
          inputFreq: inputCount,
          cacheWeight: 0
        });
      }
    });
    
    // Apply banned regex filter
    const bannedRegex = /(treasury|dao|multi-?sig|governance|payroll|corporate|board|investor|foundation)/i;
    const filteredSuggestions = Array.from(allSuggestions.entries())
      .filter(([text]) => !bannedRegex.test(text))
      .filter(([text]) => text.trim().length > 0);
    
    // Sort by priority: click frequency > input frequency > cache weight
    const sortedSuggestions = filteredSuggestions.sort((a, b) => {
      const [, aStats] = a;
      const [, bStats] = b;
      
      // Primary sort: click frequency
      if (aStats.clickFreq !== bStats.clickFreq) {
        return bStats.clickFreq - aStats.clickFreq;
      }
      
      // Secondary sort: input frequency
      if (aStats.inputFreq !== bStats.inputFreq) {
        return bStats.inputFreq - aStats.inputFreq;
      }
      
      // Tertiary sort: cache weight
      return bStats.cacheWeight - aStats.cacheWeight;
    });
    
    // Extract final suggestions list
    const finalSuggestions = sortedSuggestions
      .slice(0, limit)
      .map(([text]) => text);
    
    return NextResponse.json({
      ok: true,
      suggestions: finalSuggestions
    });
    
  } catch (error) {
    console.error('GET suggestions error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}
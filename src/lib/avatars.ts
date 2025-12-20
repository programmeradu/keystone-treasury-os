/**
 * Deterministic Avatar Generation Utility
 * Uses DiceBear's initials style for premium, unique avatars.
 */

export const getAvatarUrl = (seed: string) => {
    // Using 'micah' style for a more visual, premium person avatar
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/micah/svg?seed=${encodedSeed}&backgroundColor=36e27b,0f1115,1c2e24`;
};

export const getBotAvatarUrl = (seed: string) => {
    // Specifically for agents/bots
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9&primaryColor=36e27b`;
};

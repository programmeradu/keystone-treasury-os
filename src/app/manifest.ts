import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Keystone Treasury OS',
        short_name: 'Keystone',
        description: 'The Command Layer for Treasury Management',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0C10',
        theme_color: '#36e27b',
        icons: [
            {
                src: '/icon.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
            },
            {
                src: '/icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
            },
        ],
    };
}

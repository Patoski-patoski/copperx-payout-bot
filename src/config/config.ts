import dotenv from 'dotenv';

dotenv.config();

export const config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    },
    copperx: {
        apiBaseUrl: process.env.COPPERX_API_BASE_URL || 'https://income-api.copperx.io',
        pusherKey: process.env.COPPERX_PUSHER_KEY || 'e089376087cac1a62785',
        pusherCluster: process.env.COPPERX_PUSHER_CLUSTER || 'ap1',
    },
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
} as const;

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
} 
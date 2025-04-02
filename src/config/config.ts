// src/config/config.ts - Updated with webhook URL config
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    },
    copperx: {
        apiBaseUrl: process.env.COPPERX_API_BASE_URL as string,
        pusherKey: process.env.COPPERX_PUSHER_KEY as string,
        pusherCluster: process.env.COPPERX_PUSHER_CLUSTER as string,
    },
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        webhookUrl: process.env.WEBHOOK_URL || '', // Add this for the webhook URL
    },
} as const;

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
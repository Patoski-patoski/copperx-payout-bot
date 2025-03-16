"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    },
    copperx: {
        apiBaseUrl: process.env.COPPERX_API_BASE_URL,
        pusherKey: process.env.COPPERX_PUSHER_KEY,
        pusherCluster: process.env.COPPERX_PUSHER_CLUSTER,
    },
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
};
// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
//# sourceMappingURL=config.js.map
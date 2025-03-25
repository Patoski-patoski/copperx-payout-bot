import express from 'express';
import { BotHandler } from './handlers/botHandler';
import { config } from './config/config';
import dotenv from 'dotenv';

dotenv.config();

class App {
    private bot: BotHandler;
    private app: express.Application;

    constructor() {
        this.bot = new BotHandler();
        this.app = express();
        this.setupExpress();
    }

    private setupExpress() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
        });

        // Start express server
        this.app.listen(config.app.port, () => {
            console.log(`Health check server running on port ${config.app.port}`);
        });
    }

    start() {
        console.log('Copperx Telegram Bot is running...');
        console.log(`Environment: ${config.app.nodeEnv}`);

        // Add error handling for bot polling
        this.setupBotErrorHandling();
    }
    private setupBotErrorHandling() {
        const bot = this.bot.getBot(); // You'll need to add a getter in BotHandler

        bot.on('polling_error', (error: Error) => {
            console.error('Polling error:', error);
            // Attempt to restart polling after error
            this.restartBot();
        });

        bot.on('error', (error: Error) => {
            console.error('Bot error:', error);
            this.restartBot();
        });
    }

    private async restartBot() {
        try {
            const bot = this.bot.getBot();
            console.log('Attempting to restart bot...');

            // Stop polling
            await bot.stopPolling();

            // Wait a bit before restarting
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Start polling again
            await bot.startPolling();

            console.log('Bot successfully restarted');
        } catch (error) {
            console.error('Failed to restart bot:', error);
        }
    }
}

const app = new App();
app.start();

export default App;
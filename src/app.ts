import express from 'express';
import { BotHandler } from './handlers/botHandler';
import { config } from './config/config';

class App {
    private bot: BotHandler;
    private app: express.Application;
    private readonly port: number;

    constructor() {
        this.bot = new BotHandler();
        this.app = express();
        // Render sets PORT environment variable, fallback to 3000 if not set
        this.port = parseInt(process.env.PORT || '3000', 10);
        this.setupExpress();
    }

    private setupExpress() {
        // Health check endpoint
        this.app.get('/', (req, res) => {
            res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
        });

        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
        });
    }

    start() {
        // Start express server first
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`Server is running on port ${this.port}`);
        });

        console.log('Copperx Telegram Bot is running...');
        console.log(`Environment: ${config.app.nodeEnv}`);

        this.setupBotErrorHandling();
    }

    private setupBotErrorHandling() {
        const bot = this.bot.getBot();

        bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
            this.restartBot();
        });

        bot.on('error', (error) => {
            console.error('Bot error:', error);
            this.restartBot();
        });
    }

    private async restartBot() {
        try {
            const bot = this.bot.getBot();
            console.log('Attempting to restart bot...');
            await bot.stopPolling();
            await new Promise(resolve => setTimeout(resolve, 5000));
            await bot.startPolling();
            console.log('Bot successfully restarted');
        } catch (error) {
            console.error('Failed to restart bot:', error);
        }
    }
}

// Create and start the application
const app = new App();
app.start();

export default App;
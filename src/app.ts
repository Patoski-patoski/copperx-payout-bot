import { BotHandler } from './handlers/botHandler';
import { config } from './config/config';
import dotenv from 'dotenv';

dotenv.config();

class App {
    private bot: BotHandler;

    constructor() {
        this.bot = new BotHandler();
    }

    start() {
        console.log('Copperx Telegram Bot is running...');
        console.log(`Environment: ${config.app.nodeEnv}`);
    }
}

const app = new App();
app.start();

export default App;
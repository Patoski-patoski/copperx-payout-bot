"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const botHandler_1 = require("./handlers/botHandler");
const config_1 = require("./config/config");
class App {
    constructor() {
        this.bot = new botHandler_1.BotHandler();
    }
    start() {
        console.log('Copperx Telegram Bot is running...');
        console.log(`Environment: ${config_1.config.app.nodeEnv}`);
    }
}
const app = new App();
app.start();
//# sourceMappingURL=app.js.map
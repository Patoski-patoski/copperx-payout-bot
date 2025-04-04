// src/handlers/baseHandler.ts

import TelegramBot from 'node-telegram-bot-api';
import { CopperxApiService } from '../services/copperxApi';
import { SessionManager } from '../utils/sessionManager';
import { BOT_MESSAGES } from '../utils/messageTemplates';

export class BaseHandler {
    protected readonly bot: TelegramBot;
    protected readonly api: CopperxApiService;
    protected readonly sessions: SessionManager;
    protected readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    protected readonly BOT_MESSAGES = BOT_MESSAGES;

    constructor(bot: TelegramBot, api: CopperxApiService, sessions: SessionManager) {
        this.bot = bot;
        this.api = api;
        this.sessions = sessions;
        this.setupBotCommands(); 
    }

    // Shared utility methods
    protected formatStatus(status: string | undefined): string {
        if (!status) return '❓ Unknown';

        const statusMap: Record<string, string> = {
            'active': '✅ Active',
            'pending': '⏳ Pending',
            'suspended': '🚫 Suspended',
        };

        return statusMap[status.toLowerCase()] || `❓ ${status}`;
    }

    protected async setupBotCommands() {
        try {
            await this.bot.setMyCommands([
                { command: 'start', description: 'Initialize the bot' },
                { command: 'login', description: 'Start authentication process' },
                { command: 'logout', description: 'End current session' },
                { command: 'profile', description: 'View user profile' },
                { command: 'wallets', description: 'List all wallets' },
                { command: 'balance', description: 'Check wallet balance' },
                { command: 'default', description: 'View default wallet' },
                { command: 'send', description: 'Initiate a transfer' },
                { command: 'withdraw', description: 'Start bank withdrawal' },
                { command: 'bulk', description: 'Start bulk transfer' },
                { command: 'add_recipent', description: 'Add recipient to bulk transfer' },
                { command: 'review', description: 'Review bulk recipient' },
                { command: 'history', description: 'View transaction history' },
                { command: 'kyc', description: 'Check KYC status' },
                { command: 'help', description: 'Get commands and info' }
            ]);
        } catch (error) {
            console.error('Error setting up bot commands:', error);
        }
    }
}
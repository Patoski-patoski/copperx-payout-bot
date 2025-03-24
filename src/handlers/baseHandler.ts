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
}

// src/handlers/notificationHandler.ts
import TelegramBot from 'node-telegram-bot-api';
import { CopperxApiService } from '../services/copperxApi';
import { SessionManager } from '../utils/sessionManager';
import { BaseHandler } from './baseHandler';
import { NotificationService } from '../services/notificationService';
import { BOT_MESSAGES } from '../utils/messageTemplates';

export class NotificationHandler extends BaseHandler {
    constructor(bot: TelegramBot, api: CopperxApiService, sessions: SessionManager) {
        super(bot, api, sessions);
    }

    async handleNotifications(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
        const token = this.sessions.getToken(chatId);

        if (!token) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.NOT_LOGGED_IN);
            return;
        }

        const notificationService = this.sessions.getNotificationService(chatId);
        if (notificationService) {
            this.sessions.removeNotificationService(chatId);
            await this.bot.sendMessage(chatId, "🔕 Deposit notifications turned off");
        } else {
            const orgId = this.sessions.getOrganizationId(chatId);
            if (orgId && token) {
                const newNotificationService = new NotificationService(
                    this.bot,
                    chatId,
                    orgId,
                    token
                );
                this.sessions.setNotificationService(chatId, newNotificationService);
                newNotificationService.connect();
            } else {
                await this.bot.sendMessage(chatId, "Unable to set up notifications. Please try again later.");
            }
        }
    }
}
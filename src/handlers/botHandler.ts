// src/handlers/botHandler.ts
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config';
import { CopperxApiService } from '../services/copperxApi';
import { SessionManager } from '../utils/sessionManager';
import { AuthHandler } from './authHandler';
import { WalletHandler } from './walletHandler';
import { TransferHandler } from './transferHandler';
import { ProfileHandler } from './profileHandler';
import { HistoryHandler } from './historyHandler';
import { BOT_MESSAGES } from '../utils/messageTemplates';

export class BotHandler {
    private readonly bot: TelegramBot;
    private readonly api: CopperxApiService;
    private readonly sessions: SessionManager;

    // Handler instances
    private authHandler: AuthHandler;
    private walletHandler: WalletHandler;
    private transferHandler: TransferHandler;
    private profileHandler: ProfileHandler;
    private historyHandler: HistoryHandler;

    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, {
            polling: {
                interval: 3000,
                autoStart: true,
            }
        });
        this.api = new CopperxApiService();
        this.sessions = new SessionManager();

        // Initialize handlers
        this.authHandler = new AuthHandler(this.bot, this.api, this.sessions);
        this.walletHandler = new WalletHandler(this.bot, this.api, this.sessions);
        this.transferHandler = new TransferHandler(this.bot, this.api, this.sessions);
        this.profileHandler = new ProfileHandler(this.bot, this.api, this.sessions);
        this.historyHandler = new HistoryHandler(this.bot, this.api, this.sessions);

        this.setupCommands();
        this.setupMessageHandlers();
        this.setupCallbackHandlers();
    }

    private setupCommands() {
        const commands = [
            { command: /\/start/, handler: this.handleStart.bind(this) },
            { command: /\/login/, handler: this.authHandler.handleLogin.bind(this.authHandler) },
            { command: /\/logout/, handler: this.authHandler.handleLogout.bind(this.authHandler) },
            { command: /\/profile/, handler: this.profileHandler.handleProfile.bind(this.profileHandler) },
            { command: /\/kyc/, handler: this.profileHandler.handleKyc.bind(this.profileHandler) },
            { command: /\/wallets/, handler: this.walletHandler.handleWallets.bind(this.walletHandler) },
            { command: /\/history/, handler: this.historyHandler.handleHistory.bind(this.historyHandler) },
            { command: /\/balance/, handler: this.walletHandler.handleBalance.bind(this.walletHandler) },
            { command: /\/default/, handler: this.walletHandler.handleDefault.bind(this.walletHandler) },
            { command: /\/send/, handler: this.transferHandler.handleSend.bind(this.transferHandler) },
            { command: /\/transfer/, handler: this.transferHandler.handleSend.bind(this.transferHandler) },
        ];

        commands.forEach(({ command, handler }) => {
            this.bot.onText(command, handler);
        });
    }

    private async handleStart(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        await this.bot.sendMessage(
            chatId,
            BOT_MESSAGES.WELCOME,
            { parse_mode: 'Markdown' }
        );
    }

    private setupMessageHandlers() {
        this.bot.on('message', async (msg) => {
            const { chat: { id: chatId }, text } = msg;

            if (!text || text.startsWith('/')) return;

            const currentState = this.sessions.getState(chatId);

            // Route to the appropriate handler based on state
            switch (currentState) {
                case 'WAITING_EMAIL':
                    await this.authHandler.handleEmailInput(chatId, text);
                    break;
                case 'WAITING_OTP':
                    await this.authHandler.handleOtpInput(chatId, text);
                    break;
                case 'WAITING_TRANSFER_EMAIL':
                    await this.transferHandler.handleTransferEmail(chatId, text);
                    break;
                case 'WAITING_TRANSFER_AMOUNT':
                    await this.transferHandler.handleTransferAmount(chatId, text);
                    break;
                case 'WAITING_TRANSFER_NOTE':
                    await this.transferHandler.handleTransferNote(chatId, text);
                    break;
                default:
                    await this.bot.sendMessage(
                        chatId,
                        'Invalid state. Please try again.'
                    );
                    break;
            }
        });
    }

    private setupCallbackHandlers() {
        // Add your callback handlers or delegate to specific handler classes
        this.bot.on('callback_query', async (callbackQuery) => {
            if (!callbackQuery.message) return;

            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data || '';

            try {
                await this.bot.answerCallbackQuery(callbackQuery.id);

                // Route callbacks to appropriate handlers
                if (data.startsWith('transfer_')) {
                    // Handle transfer-related callbacks
                    // You can implement a routing mechanism here
                } else if (data.startsWith('set_default:')) {
                    // Handle wallet-related callbacks
                } else if (data === 'refresh_profile') {
                    // Handle profile-related callbacks
                }
                // ... add more routing logic

            } catch (error) {
                console.error('Error handling callback:', error);
                try {
                    await this.bot.sendMessage(
                        chatId,
                        '❌ An error occurred while processing your request.'
                    );
                } catch (msgError) {
                    console.error('Failed to send error message:', msgError);
                }
            }
        });
    }
}
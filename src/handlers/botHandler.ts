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
            const messageId = callbackQuery.message.message_id;
            const data = callbackQuery.data || '';

            try {
                await this.bot.answerCallbackQuery(callbackQuery.id);

                // Handle transfer purpose selection
                if (callbackQuery.data?.startsWith('transfer_purpose:')) {
                    await this.bot.answerCallbackQuery(callbackQuery.id);
                    const purpose = callbackQuery.data.replace('transfer_purpose:', '');
                    this.sessions.setTransferPurpose(chatId, purpose);
                    // Ask for optional note
                    await this.bot.sendMessage(
                        chatId,
                        BOT_MESSAGES.TRANSFER_ENTER_NOTE
                    );

                    // Update session state
                    this.sessions.setState(chatId, 'WAITING_TRANSFER_NOTE');
                    return;
                }

                // Handle transfer confirmation
                if (callbackQuery.data === 'transfer_confirm') {
                    await this.bot.answerCallbackQuery(callbackQuery.id);
                    await this.transferHandler.processTransfer(chatId);
                    return;
                }

                // Handle transfer cancellation
                if (callbackQuery.data === 'transfer_cancel') {
                    await this.bot.answerCallbackQuery(callbackQuery.id);
                    await this.bot.sendMessage(chatId, 'Transfer cancelled.');
                    this.sessions.clearTransferData(chatId);
                    this.sessions.setState(chatId, 'AUTHENTICATED');
                    return;
                }

                // Handle set_default callback
                if (callbackQuery.data?.startsWith('set_default:')) {
                    const walletId = callbackQuery.data.replace('set_default:', '');

                    try {
                        // Show loading state in the button
                        await this.bot.editMessageReplyMarkup({
                            inline_keyboard: [[{
                                text: '⏳ Setting as default...',
                                callback_data: 'in_progress'
                            }]]
                        }, {
                            chat_id: chatId,
                            message_id: messageId
                        });

                        // Call API to set default wallet
                        await this.api.setDefaultWallet(walletId);

                        // Update button to show success
                        await this.bot.editMessageReplyMarkup({
                            inline_keyboard: [[{
                                text: '✅ Default wallet set!',
                                callback_data: 'already_default'
                            }]]
                        }, {
                            chat_id: chatId,
                            message_id: messageId
                        });

                        // Show success message
                        await this.bot.sendMessage(chatId,
                            '✅ Default wallet updated successfully!');
                        // Refresh all wallets to show updated default status
                        await this.walletHandler.handleWallets(callbackQuery.message);
                    } catch (error: any) {
                        console.error('Error setting default wallet:', error);

                        // Update button to show error
                        await this.bot.editMessageReplyMarkup({
                            inline_keyboard: [[{
                                text: '❌ Error setting default',
                                callback_data: 'error'
                            }]]
                        }, {
                            chat_id: chatId,
                            message_id: messageId
                        });

                        await this.bot.sendMessage(chatId,
                            `❌ Error: ${error.message || 'Failed to set default wallet'}`);
                    }
                    return;
                }

                // Handle already_default callback (prevent duplicate actions)
                if (callbackQuery.data === 'already_default') {
                    await this.bot.answerCallbackQuery(callbackQuery.id, {
                        text: 'This is already your default wallet',
                        show_alert: true
                    });
                    return;
                }
                if (callbackQuery.data === 'refresh_wallets') {
                    const loadingMsg = await this.bot.sendMessage(
                        chatId,
                        '🔄 Refreshing wallet list...'
                    );

                    await this.bot.deleteMessage(chatId, loadingMsg.message_id);

                    await this.walletHandler.handleWallets(callbackQuery.message);
                }

                

                // Handle other callback queries...
                if (callbackQuery.data === 'check_kyc_status') {
                    await this.bot.sendMessage(chatId, '🔄 Checking KYC status...');
                    await this.profileHandler.handleKyc(callbackQuery.message);
                }

                if (callbackQuery.data && ['refresh_balance', 'view_balance'].includes(callbackQuery.data)) {
                    await this.bot.sendMessage(chatId, '🔄 Refreshing balance...');
                    await this.walletHandler.handleBalance(callbackQuery.message);
                }


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
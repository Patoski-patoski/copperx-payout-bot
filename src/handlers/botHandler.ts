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
import { BankWithdrawalHandler } from './bankWithdrawalHandler';
import { BulkTransferHandler } from './bulkTransferHandler';
import { BOT_MESSAGES } from '../utils/messageTemplates';
import { TransferType } from '@/types/copperx';
import { clearErrorMessage, keyboard } from '../utils/copperxUtils';

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
    private bankWithdrawalHandler: BankWithdrawalHandler;
    private bulkTransferHandler: BulkTransferHandler;
    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, {
            polling: {
                interval: 3000,
                autoStart: true,
                params: {
                    timeout: 30
                }
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
        this.bankWithdrawalHandler = new BankWithdrawalHandler(this.bot, this.api, this.sessions);
        this.bulkTransferHandler = new BulkTransferHandler(this.bot, this.api, this.sessions);

        this.setupCommands();
        this.setupMessageHandlers();
        this.setupCallbackHandlers();

    
    }
    getBot(): TelegramBot {
        return this.bot;
    }

    private setupCommands() {
        const commands = [
            { command: /\/start/, handler: this.handleStart.bind(this) },
            { command: /\/help/, handler: this.handleHelp.bind(this) },
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
            { command: /\/withdraw/, handler: this.bankWithdrawalHandler.handleWithdraw.bind(this.bankWithdrawalHandler) },
            { command: /\/bulk/, handler: this.bulkTransferHandler.handleBulkTransfer.bind(this.bulkTransferHandler) },
            { command: /\/add_recipient/, handler: this.bulkTransferHandler.handleAddRecipient.bind(this.bulkTransferHandler) },
            { command: /\/review/, handler: this.bulkTransferHandler.handleReview.bind(this.bulkTransferHandler) }
        ];


        commands.forEach(({ command, handler }) => {
            this.bot.onText(command, handler);
        });
    }

    private async handleStart(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        const keyboard = [
            [
                { text: 'Login', callback_data: 'login' },
                { text: 'Exit', callback_data: 'exit' }
            ]
        ]
        await this.bot.sendMessage(
            chatId,
            BOT_MESSAGES.WELCOME,
            { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
        );
    }

    private async handleHelp(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        const keyboard = [
            [{ text: 'Login', callback_data: 'login' },
            ]
        ]
        await this.bot.sendMessage(chatId,
            BOT_MESSAGES.COMMANDS_MESSAGE,
            {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard } 
            }
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
                case 'WAITING_TRANSFER_WALLET':
                    await this.transferHandler.handleTransferWallet(chatId, text);
                    break;
                case 'WAITING_BULK_TRANSFER_MENU':
                    await this.bulkTransferHandler.handleBulkTransfer(msg);
                    break;
                case 'WAITING_TRANSFER_AMOUNT':
                    await this.transferHandler.handleTransferAmount(chatId, text);
                    break;
                case 'WAITING_BULK_RECIPIENT':
                    await this.bulkTransferHandler.handleRecipientInput(chatId, text);
                    break;
                case 'WAITING_BULK_AMOUNT':
                    await this.bulkTransferHandler.handleBulkAmount(chatId, text);
                    break;
                case 'WAITING_TRANSFER_NOTE':
                    await this.transferHandler.handleTransferNote(chatId, text);
                    break;
                case 'WAITING_WITHDRAWAL_AMOUNT':
                    await this.bankWithdrawalHandler.handleWithdrawalAmount(chatId, text);
                    break;
                default:
                    await this.bot.sendMessage(
                        chatId,
                        '⚠ Invalid message. I can not process the command\n' +
                        'Reasons may include:\n\n' +
                        '1. You are offline\n' +
                        '2. Query is too Old \n' +
                        '3. Response timeout expired\n' +
                        '4. Query ID is invalid\n' +
                        '5. You are not using the right command\n\n' +
                        'Please try again or check commands using /help',
                        { parse_mode: 'Markdown' }
                    );
                    break;
            }
        });
    }

    private setupCallbackHandlers() {
        this.bot.on('callback_query', async (callbackQuery) => {
            if (!callbackQuery.message) return;

            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            const data = callbackQuery.data || '';

            try {
                await this.bot.answerCallbackQuery(callbackQuery.id);

                // Handle history pagination
                // Handle pagination for transaction history
                if (data.startsWith('history_page_')) {
                    const page = parseInt(data.replace('history_page_', ''));
                    if (!isNaN(page)) {
                        const loadingMsg = await this.bot.sendMessage(
                            chatId,
                            '🔄 Loading more transactions...'
                        );

                        try {
                            const transactions = await this.api.getTransactionsHistory(page, 10);
                            await this.bot.deleteMessage(chatId, loadingMsg.message_id);

                            if (!transactions.data || transactions.data.length === 0) {
                                await this.bot.sendMessage(chatId,
                                    '📪 No more transactions found.');
                                return;
                            }

                            // Format transactions
                            const formattedTransactions = transactions.data.map((tx: any, index: number) => {
                                const date = new Date(tx.createdAt).toLocaleString();
                                const amount = new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: tx.currency || 'USDC'
                                }).format(Number(tx.amount));

                                return `${((page - 1) * 10) + index + 1}. ${tx.type || 'Transfer'} - ${tx.status}\n` +
                                    `   💰 Amount: ${amount}\n` +
                                    `   📅 Date: ${date}\n` +
                                    `   🆔 ID: ${tx.id}\n` +
                                    (tx.recipientEmail ? `   📧 To: ${tx.recipientEmail}\n` : '') +
                                    (tx.note ? `   📝 Note: ${tx.note}\n` : '') +
                                    '───────────────';
                            }).join('\n');

                            // Navigation buttons
                            const keyboard = [
                                [
                                    page > 1 ? {
                                        text: '⬅️ Previous',
                                        callback_data: `history_page_${page - 1}`
                                    } : null,
                                    {
                                        text: '🔄 Refresh',
                                        callback_data: `history_page_${page}`
                                    },
                                    transactions.data.length === 10 ? {
                                        text: 'Next ➡️',
                                        callback_data: `history_page_${page + 1}`
                                    } : null
                                ].filter(Boolean) 
                            ];

                            await this.bot.sendMessage(chatId,
                                `📜 *Transactions (Page ${page})*\n\n${formattedTransactions}`, {
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: keyboard as TelegramBot.InlineKeyboardButton[][]
                                }
                            });
                        } catch (error) {
                            console.error('Error fetching transactions:', error);
                            await this.bot.deleteMessage(chatId, loadingMsg.message_id);
                            await this.bot.sendMessage(chatId,
                                '❌ Failed to load transactions. Please try again.');
                        }
                    }
                    return;
                }

                if (callbackQuery.data === 'start') {
                    await this.handleStart(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'login') {
                    await this.authHandler.handleLogin(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'exit') {
                    await this.authHandler.handleExit(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'help'
                    || callbackQuery.data === 'commands'
                    || callbackQuery.data === 'back')
                {

                    await this.bot.sendMessage(chatId, BOT_MESSAGES.COMMANDS_MESSAGE, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    });
                    return;
                }

                if (callbackQuery.data === 'history') {
                    await this.historyHandler.handleHistory(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'profile'
                    || callbackQuery.data === 'refresh_profile') {
                    await this.profileHandler.handleProfile(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'kyc') {
                    await this.profileHandler.handleKyc(callbackQuery.message);
                    return;
                }


                if (callbackQuery.data === 'balance') {
                    await this.walletHandler.handleBalance(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'wallets') {
                    await this.walletHandler.handleWallets(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'withdraw'
                    || callbackQuery.data === 'retry_withdrawal'
                ) {
                    await this.bankWithdrawalHandler.handleWithdraw(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'default') {
                    await this.walletHandler.handleDefault(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'send'
                    || callbackQuery.data === 'send_funds') {
                    
                    await this.transferHandler.handleSend(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'bulk') {
                    await this.bulkTransferHandler.handleBulkTransfer(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === 'review') {
                    await this.bulkTransferHandler.handleReview(callbackQuery.message);
                    return;
                }

                if (callbackQuery.data === "add_recipient") { 
                    await this.bulkTransferHandler.handleAddRecipient(callbackQuery.message);
                    return;
                }

                // Original refresh_history handler
                if (data === 'refresh_history') {
                    await this.historyHandler.handleHistory(
                        { chat: { id: chatId } } as TelegramBot.Message);
                    return;
                }

                if (data.startsWith('bank_purpose_')) {
                    const purpose = data.replace('bank_purpose_', '');
                    await this.bankWithdrawalHandler.handlePurposeSelection(chatId, purpose);
                    return;
                }

                if (data.startsWith('bulk_purpose_')) {
                    const purpose = data.replace('bulk_purpose_', '');
                    await this.bulkTransferHandler.handleBulkPurposeSelection(chatId, purpose);
                    return;
                }

                if (data === 'bulk_confirm') {
                    await this.bulkTransferHandler.processBulkTransfer(chatId);
                    return;
                }

                if (data === 'bulk_cancel') {
                    this.sessions.clearBulkTransferData(chatId);
                    await this.bot.sendMessage(chatId, '❌ Bulk transfer cancelled');
                    this.sessions.setState(chatId, 'AUTHENTICATED');
                    return;
                }

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

                // Handle withdrawal purpose selection
                if (data.startsWith('withdraw_purpose_')) {
                    const purpose = data.replace('withdraw_purpose_', '');
                    await this.bankWithdrawalHandler.handlePurposeSelection(chatId, purpose);
                    return;
                }

                // Handle withdrawal cancellation
                if (data === 'withdraw_cancel') {
                    await this.bot.sendMessage(chatId, '❌ Withdrawal cancelled.');
                    this.sessions.clearWithdrawalData(chatId);
                    this.sessions.setState(chatId, 'AUTHENTICATED');
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

                if (callbackQuery.data === 'change_default_wallet') {
                    await this.bot.answerCallbackQuery(callbackQuery.id);
                    await this.walletHandler.handleWallets(callbackQuery.message);
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
                        

                        await this.walletHandler.handleSetDefaultWallet(walletId, chatId);
                        // Update session state
                        this.sessions.setState(chatId, 'AUTHENTICATED');

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

                        const errorMessage = await this.bot.sendMessage(
                            chatId,
                            `Opps... Failed to set default Wallet`);
                        
                        clearErrorMessage(this.bot, chatId, errorMessage.message_id)
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


                if (data.startsWith('transfer_type_')) {
                    const type = data.replace('transfer_type_', '') as TransferType;
                    await this.transferHandler.handleTransferTypeSelection(chatId, type);
                }

                if (callbackQuery.data === 'sendotp') {
                    const email = this.sessions.getEmail(chatId); // Retrieve email from session

                    if (!email) {
                        await this.bot.sendMessage(
                            chatId,
                            "⚠️ No email found. Please enter your email again."
                        );
                        this.sessions.setState(chatId, 'WAITING_EMAIL'); // Prompt user to re-enter email
                        return;
                    }

                    setTimeout(async () => {
                        await this.bot.sendMessage(chatId, '🔄 Requesting new OTP...');
                    }, 35000);

                    try {
                        await this.api.requestEmailOtp(email);
                        await this.bot.sendMessage(
                            chatId,
                            `✅ OTP sent again to *${email}*`,
                            { parse_mode: "Markdown" }
                        );
                    } catch (error) {
                        console.error("Error resending OTP:", error);
                        await this.bot.sendMessage(
                            chatId,
                            "⚠️ Failed to resend OTP. Please try again later."
                        );
                    }
                }



                // Handle other callback queries...
                if (callbackQuery.data === 'check_kyc_status') {
                    await this.bot.sendMessage(chatId, '🔄 Checking KYC status...');
                    await this.profileHandler.handleKyc(callbackQuery.message);
                }

                if (callbackQuery.data
                    && ['refresh_balance', 'view_balance']
                        .includes(callbackQuery.data)) {
                    const loadingMsg = await this.bot.sendMessage(chatId,
                        '🔄 Refreshing balance...'
                    );
                    await this.bot.deleteMessage(chatId, loadingMsg.message_id);
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
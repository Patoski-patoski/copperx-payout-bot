import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';

export class HistoryHandler extends BaseHandler {

    async handleHistory(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.WALLET_NOT_AUTHENTICATED
            );
            return;
        }

        try {
            const loadingMessage = await this.bot.sendMessage(
                chatId,
                ' 🔄 Fetching your transaction history...'
            );
            const transactions = await this.api.getTransactionsHistory();
            console.log('Transactions:', transactions);

            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            // Send last 10 transactions
            const last10Transactions = transactions.data.slice(0, 10);
            if (last10Transactions.length === 0) {
                await this.bot.sendMessage(chatId,
                    '📪 No transactions found.\n\n' +
                    'Please make a transaction to see your history.');
                return;
            }

            await this.bot.sendMessage(chatId,
                `🔄 *Your Transaction History*\n\n ${last10Transactions}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: '🔄 Refresh History',
                            callback_data: 'refresh_history'
                        }]
                    ]
                }
            }
            );
        } catch (error: any) {
            console.error('Error in fetching transaction history:', error);
            await this.bot.sendMessage(
                chatId,
                `Oops.. Failed to fetch transaction history. Please try again`
            );
        }
    }

} 
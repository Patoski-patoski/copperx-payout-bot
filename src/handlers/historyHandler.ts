import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { convertFromBaseUnit } from '../utils/copperxUtils';

export class HistoryHandler extends BaseHandler {
    // Default page size
    private readonly DEFAULT_PAGE_SIZE = 5;

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
                '🔄 Fetching your transaction history...'
            );

            // Get first page with 10 items
            const transactions = await this.api.getTransactionsHistory(1, 10);

            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            if (!transactions.data || transactions.data.length === 0) {
                await this.bot.sendMessage(chatId,
                    '📪 No transactions found.\n\n' +
                    'Please make a transaction to see your history.');
                return;
            }

            // Format the transactions for display
            const formattedTransactions = transactions.data.map((tx: any, index: number) => {
                const date = new Date(tx.createdAt).toLocaleString();
                const amount = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: tx.currency || 'USDC'
                }).format(Number(tx.amount));

                return `${index + 1}. ${tx.type || 'Transfer'} - ${tx.status}\n` +
                    `   💰 Amount: ${amount}\n` +
                    `   📅 Date: ${date}\n` +
                    `   🆔 ID: ${tx.id}\n` +
                    (tx.recipientEmail ? `   📧 To: ${tx.recipientEmail}\n` : '') +
                    (tx.note ? `   📝 Note: ${tx.note}\n` : '') +
                    '───────────────';
            }).join('\n');

            await this.bot.sendMessage(chatId,
                `📜 *Recent Transactions*\n\n${formattedTransactions}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '🔄 Refresh',
                                callback_data: 'refresh_history'
                            },
                            {
                                text: '📄 View More',
                                callback_data: 'history_page_2'
                            }
                        ]
                    ]
                }
            });

        } catch (error: any) {
            console.error('Error in fetching transaction history:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to fetch transaction history. Please try again.'
            );
        }
    }
}
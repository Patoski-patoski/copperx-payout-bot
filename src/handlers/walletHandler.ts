import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { CopperxWallet } from '@/types/copperx';
import { networkEmoji, networkNames, symbolEmojis } from '../utils/copperxUtils';

export class WalletHandler extends BaseHandler {
    async handleWallets(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.WALLET_NOT_AUTHENTICATED,
            );
            return;
        }

        try {
            const loadingMessage = await this.bot.sendMessage(
                chatId,
                ' 🔄 Fetching your wallets...'
            );
            let wallets: CopperxWallet[] = [];
            try {
                wallets = await this.api.getWallets();
            } catch (error: any) {
                console.error('Error in fetching wallets:', error);
                await this.bot.deleteMessage(chatId, loadingMessage.message_id);
                await this.bot.sendMessage(
                    chatId,
                    `Error: ${error.message
                    || 'Failed to fetch wallets. Please try again later.'}`
                );
            }

            // Map network IDs to readable name
            // const walletList = wallets.map((wallet: CopperxWallet, index: number) => {
            //     const networkName = networkNames[wallet.network]
            //         || `Network ${wallet.network}`;
                
            //     const defaultStatus = `*${wallet.isDefault ? '✅ Default  Wallet\n\n' : ''}*`;

            //     return `${defaultStatus}\n\n` +
            //         `${networkEmoji} ${networkName}\n\n` +
            //         `💰 *Wallet ID: ${wallet.id}\n\n` +
            //         `💼 Type: \`${wallet.walletType}\`\n\n` +
            //         `📝 Address: \`${wallet.walletAddress}\``;

            // }).join('\n\n───────────────\n\n');

            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            // Send a header message
            await this.bot.sendMessage(chatId,
                '👛 *Your Wallets*',
                { parse_mode: 'Markdown' });

            // Send each wallet as a separate message with its own action button
            for (const wallet of wallets) {
                const networkName = networkNames[wallet.network]
                    || `Network ${wallet.network}`;
                
                const defaultStatus = `*${wallet.isDefault ? '✅ Default  Wallet\n\n' : ''}*`;
                const walletMessage = `${defaultStatus}` +
                    `${networkEmoji} ${networkName}\n\n` +
                    `📝 *Address*: \`${wallet.walletAddress}\`\n\n` +
                    `💼 *Type*: \`${wallet.walletType}\``;

                // Create different button based on default status
                const buttonText = wallet.isDefault ?
                    '✓ Default Wallet' :
                    '⭐ Set Wallet as Default';

                const buttonCallbackData = wallet.isDefault ?
                    'already_default' :
                    `set_default:${wallet.id}`;

                await this.bot.sendMessage(chatId, walletMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{
                            text: buttonText,
                            callback_data: buttonCallbackData
                        }]]
                    }
                });
            }

            // Add action buttons at the end
            await this.bot.sendMessage(chatId,
                '', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh Wallets', callback_data: 'refresh_wallets' },
                            { text: '💰 View Balances', callback_data: 'view_balances' },
                        ],
                        [{ text: '🔒 Back', callback_data: 'commands' }]
                    ]
                }
            });

        } catch (error: any) {
            console.error('Error in fetching wallets:', error);
            await this.bot.sendMessage(
                chatId,
                `Opps: Failed to fetch wallets. Please try again`
            );
        }
    }


    // Handle balance command
    async handleBalance(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;

        // Check if user is authenticated
        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.WALLET_NOT_AUTHENTICATED
            );
            return;
        }
        try {
            const loadingMessage = await this.bot.sendMessage(chatId,
                '🔄 Fetching balances...');

            const balances = await this.api.getWalletBalances()

            if (!balances || balances.length === 0) {

                await this.bot.editMessageText('No balances found for your wallets.', {
                    chat_id: chatId,
                    message_id: loadingMessage.message_id
                });
                return;
            }

           

            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            // Send a header message
            await this.bot.sendMessage(chatId, '💰 Wallet Balances', {
                parse_mode: 'Markdown'
            });

            for (const wallet of balances) {
                const networkName = networkNames[wallet.network]
                    || `Network ${wallet.network}`;

                // Format wallet address for display
                const walletAddress = wallet.balances[0]?.address || '';
                // Create balance items display
                const balanceItems = wallet.balances.map(b => {
                    const emoji = symbolEmojis[b.symbol] || '🪙';
                    return `${emoji} *${b.symbol}*: ${b.balance}`;
                }).join('\n');

                const walletMessage =
                    `🆔 *ID*: \`${wallet.walletId}\`\n` +
                    `${networkEmoji} *Network*: \`${networkName}\`\n` +
                    `📝 *Address*: \`${walletAddress}\`\n\n` +
                    `*Balances*\n${balanceItems || '(No tokens found)'}`;

                await this.bot.sendMessage(chatId, walletMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{
                            text: '🔄 Refresh Balances',
                            callback_data: 'refresh_balance'
                        }]]
                    }
                });
            }

            await this.bot.sendMessage(chatId, '🔄 Balances refreshed successfully!', {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{
                        text: '🔄 Refresh Balances',
                        callback_data: 'refresh_balance'
                    }]]
                }
            });
        } catch (error: any) {
            console.error('Error fetching balances:', error);
            await this.bot.sendMessage(
                chatId, `OOps: Failed to fetch balances. Please try again.`);
        }

    }

    async handleDefault(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        const defaultWallet = await this.api.getDefaultWallet();
        const networkEmoji = {
            'Ethereum': '⧫',
            'Polygon': '⬡',
            'Arbitrum': '🔵',
            'Base': '🟢',
            'Test Network': '🔧'
        }[defaultWallet.network] || '🌐';

        const networkNames = {
            '1': 'Ethereum',
            '137': 'Polygon',
            '42161': 'Arbitrum',
            '8453': 'Base',
            '23434': 'Test Network'
        }[defaultWallet.network] || 'Unknown Network';

        const defaultWalletMessage = `* 👛 Default Wallet*\n` +
            `*Wallet ID*: ${defaultWallet.id}\n` +
            `${networkEmoji} *Network*: ${networkNames}\n` +
            `*Wallet Type*: ${defaultWallet.walletType}\n` +
            `*Wallet Address*: ${defaultWallet.walletAddress}\n`;
        await this.bot.sendMessage(chatId, defaultWalletMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: 'Change Default Wallet',
                        callback_data: 'change_default_wallet'
                    }]
                ]
            }
        });
    }

} 
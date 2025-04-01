import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { CopperxWallet } from '@/types/copperx';
import {
    networkEmoji,
    networkNames,
    symbolEmojis,
    offlineKeyBoardAndBack,
    clearErrorMessage,
    getNetworkEmoji,
    getNetworkName
} from '../utils/copperxUtils';

export class WalletHandler extends BaseHandler {
    async handleWallets(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.WALLET_NOT_AUTHENTICATED,
                {
                    parse_mode: 'Markdown',
                    reply_markup: offlineKeyBoardAndBack('🔓Login', 'login')
                }
            );
            setTimeout(async () => {
                await this.bot.deleteMessage(chatId, errorMessage.message_id);
            }, 15000);
            return;
        }

        try {
            const loadingMessage = await this.bot.sendMessage(
                chatId,
                '🔄 Fetching your wallets...'
            );

            let wallets: CopperxWallet[] = [];

            try {
                wallets = await this.api.getWallets();

                // Add this: Check and fix default wallets for each network
                const networks = new Set(wallets.map(w => w.network));
                for (const network of networks) {
                    await this.api.ensureSingleDefaultWallet(network);
                }
            } catch (error: any) {
                console.error('Error fetching wallets:', error);
                await this.bot.deleteMessage(chatId, loadingMessage.message_id);
                const errorMessage = await this.bot.sendMessage(
                    chatId,
                    `⚠️ OOps.. Failed to fetch wallets. Please try again later.`
                );
                clearErrorMessage(this.bot, chatId, errorMessage.message_id);
                return; // Exit early if fetching wallets fails
            }

            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            // Check if wallets exist
            if (!wallets || wallets.length === 0) {
                await this.bot.sendMessage(
                    chatId,
                    `⚠️ *You have no wallets yet.*\n\nCreate one or try again later.`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                // Send a header message
                await this.bot.sendMessage(
                    chatId,
                    '👛 *Your Wallets: *',
                    { parse_mode: 'Markdown' }
                );

                // Process each wallet
                for (const wallet of wallets) {
                    try {
                        const networkName = getNetworkName(wallet.network)
                            || `Network ${wallet.network}`;
                        
                        const networkEmoji = getNetworkEmoji(networkName);

                        const walletMessage = `*Network*: ${networkEmoji} ${networkName.toUpperCase()}\n\n` +
                            `*📝Wallet Address*:\n\`\`\`\n${wallet.walletAddress}\n\`\`\`\n\n` +
                            `💼 *Type*: \`${wallet.walletType.toUpperCase()}\``;

                        // Create different button based on default status
                        const buttonText = wallet.isDefault ?
                            '✓ Your Default Wallet' :'⭐ Set Wallet as Default';
                        const buttonCallbackData = wallet.isDefault ?
                            'already_default' : `set_default:${wallet.id}`;

                        await this.bot.sendMessage(chatId, walletMessage, {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                force_reply: true,
                                inline_keyboard: [[{
                                    text: buttonText,
                                    callback_data: buttonCallbackData
                                }]]
                            }
                        });
                    } catch (error: any) {
                        console.error(`Error sending wallet ${wallet.id}:`, error);
                        await this.bot.sendMessage(chatId, `⚠️ Failed to load wallet ${wallet.id}.`);
                    }
                }
                // Add action buttons at the end
                await this.bot.sendMessage(chatId, 'More Options...', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '💸 Send Funds', callback_data: 'send_funds' },
                                { text: '💰 View Balances', callback_data: 'view_balance' },
                            ],
                            [
                                { text: '🤖 Commands', callback_data: 'commands' },
                            ]
                        ]
                    }
                });
            }

        } catch (error: any) {
            console.error('Unexpected error in handleWallets:', error);
            const errorMessage = await this.bot.sendMessage(
                chatId,
                `⚠️ Oops.. Something went wrong. Please try again.`
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id, 5000);
        }
    }

    async handleSetDefaultWallet(walletId: string, chatId: number) {
        try {
            const walletToSet = await this.api.getWallets()
                .then(wallets => wallets.find(w => w.id === walletId));

            if (!walletToSet) {
                await this.bot.sendMessage(chatId, '❌ Wallet not found');
                return;
            }

            // Check if this wallet address is already default on another ID
            const existingWallet = await this.api.getWalletByAddress(
                walletToSet.walletAddress,
                walletToSet.network
            );

            if (existingWallet && existingWallet.id !== walletId && existingWallet.isDefault) {
                await this.bot.sendMessage(
                    chatId,
                    '⚠️ This wallet address is already set as default with a different ID.\nRemoving duplicate...'
                );
            }

            // Ensure single default before setting new one
            await this.api.ensureSingleDefaultWallet(walletToSet.network);

            // Set new default wallet
            const result = await this.api.setDefaultWallet(walletId);

            await this.bot.sendMessage(
                chatId,
                `✅ Successfully set as default wallet for ${getNetworkName(result.network)}`
            );
        } catch (error: any) {
            console.error('Error setting default wallet:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to set default wallet. Please try again.'
            );
        }
    }



    // Handle balance command
    async handleBalance(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;

        // Check if user is authenticated
        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.WALLET_NOT_AUTHENTICATED,
                {
                    parse_mode: 'Markdown',
                    reply_markup: offlineKeyBoardAndBack('🔓Login', 'login')
                }
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id, 5000);
            return;
        }
        try {
            const loadingMessage = await this.bot.sendMessage(chatId,
                '🔄 Fetching balances...');

            const balances = await this.api.getWalletBalances()
            console.log("balances", balances);
            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            // Send a header message
            await this.bot.sendMessage(chatId, '💰 Wallet Balances', {
                parse_mode: 'Markdown'
            });

            for (const wallet of balances) {

                const networkName = getNetworkName(wallet.network);
                const networkEmoji = getNetworkEmoji(networkName);

                // Format wallet address for display
                const walletAddress = wallet.balances[0]?.address || '';
                // Create balance items display
                const balanceItems = wallet.balances.map(b => {
                    const emoji = symbolEmojis[b.symbol] || '🪙';
                    return `${emoji} *${b.symbol}*: ${b.balance}`;
                }).join('\n');

                const walletMessage =
                    `* Wallet ID*: \`${wallet.walletId}\`\n\n` +
                    `*Network*: ${networkEmoji} \`${networkName}\`\n\n` +
                    `*Wallet Address*:\n\`\`\`\n${walletAddress}\n\`\`\`\n\n` +
                    `*Balances*\n${balanceItems || '(No tokens found)'}`;

                await this.bot.sendMessage(chatId, walletMessage, {
                    parse_mode: 'Markdown',
                });
            }

            await this.bot.sendMessage(chatId, 'More Options:', {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Refresh Balances', callback_data: 'refresh_balance'},
                        { text: '💸 Send funds', callback_data: 'send_funds'}
                    ],
                        [
                            { text: '👛 View Wallets', callback_data: 'wallets' },
                            { text: '❓ Help ', callback_data: 'back' }
                        ]
                    ]
                }
            });
        } catch (error: any) {
            console.error('Error fetching balances:', error);
            const errorMessage = await this.bot.sendMessage(
                chatId,
                `OOps.. Failed to fetch balances. Please try again.`);
            clearErrorMessage(this.bot, chatId, errorMessage.message_id)
        }
    }

    async handleDefault(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        // Check if user is authenticated
        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.NOT_LOGGED_IN,
                {
                    parse_mode: 'Markdown',
                    reply_markup: offlineKeyBoardAndBack('🔓Login', 'login')
                }
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id, 5000);
            return;
        }
        const defaultWallet = await this.api.getDefaultWallet();
        // Get Emoji and Network Name
        const networkName = getNetworkName(defaultWallet.network);
        const networkEmoji = getNetworkEmoji(networkName);

        const defaultWalletMessage = `*Default Wallet:*\n\n` +
            `*Wallet ID*: ${defaultWallet.id}\n\n` +
            `*Network*: ${networkEmoji} \`${networkName}\`\n\n` +
            `*Wallet Address*:\n\`\`\`\n${defaultWallet.walletAddress}\n\`\`\`\n` +
            `*Wallet Type*: ${defaultWallet.walletType}\n`;

        await this.bot.sendMessage(chatId, defaultWalletMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                force_reply: true,
                inline_keyboard: [
                    [
                        { text:'Change Default Wallet', callback_data: 'change_default_wallet' },
                        { text:'View Balance', callback_data: 'view_balance' }
                    ],
                    [
                        { text: '🤖 Commands', callback_data: 'help' }
                    ]
                ],

            }
        });
    }

} 
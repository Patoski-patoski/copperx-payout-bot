// src/handlers/profileHandler.ts

import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';

export class ProfileHandler extends BaseHandler {
    async handleProfile(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.PROFILE_NOT_AUTHENTICATED
            );
            return;
        }
        try {
            const loadingMessage = await this.bot.sendMessage(
                chatId,
                ' 🔄 Fetching your profile...'
            );
            const profile = await this.api.getUserProfile();

            // cREATE profile message
            const profileMessage = this.BOT_MESSAGES.PROFILE_TEMPLATE
                .replace('%id%', profile.id || 'N/A')
                .replace('%email%', profile.email || 'Not provided')
                .replace('%status%', this.formatStatus(profile.status).toUpperCase())
                .replace('%role%', profile.role.toUpperCase() || 'Not assigned')
                .replace('%relayerAddress%', profile.relayerAddress || 'Not assigned')
                .replace('%walletAddress%', profile.walletAddress || 'Not set')
                .replace('%walletAccountType%', profile.walletAccountType.toUpperCase() || 'Not set');

            await this.bot.deleteMessage(chatId, loadingMessage.message_id);
            await this.bot.sendMessage(chatId, profileMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh Profile', callback_data: 'refresh_profile' },
                            { text: '🔒 KYC', callback_data: 'kyc' },
                        ],
                        [
                            { text: '🔒 Back', callback_data: 'commands' },
                        ]
                    ]
                }
            });


        } catch (error: any) {
            console.error('Error in handleProfile:', error);
            await this.bot.sendMessage(
                chatId,
                `Oops.. Failed to fetch profile. Please try again`
            );
        }
    }
    // Handle KYC command
    async handleKyc(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.KYC_NOT_AUTHENTICATED
            );
            return;
        }

        try {
            const loadingMessage = await this.bot.sendMessage(
                chatId,
                ' 🔄 Checking your KYC status...'
            );

            const userId = this.sessions.getUserId(chatId);
            if (!userId) {
                throw new Error(
                    'User ID not found in session. Please login again.');
            }

            const kycResponse = await this.api.getKycStatus();
            await this.bot.deleteMessage(chatId, loadingMessage.message_id);

            // If KYC is not approved, send redirect message
            if (!kycResponse || !kycResponse.data[0]) {
                await this.bot.sendMessage(
                    chatId,
                    this.BOT_MESSAGES.KYC_REDIRECT_PLATFROM,
                    {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: '🔗 Start/Complete KYC on Copperx Platform',
                                    url: 'https://payout.copperx.io/app/kyc'
                                }],
                            ]
                        }
                    }
                );
                return;
            }

            const kycStatus = kycResponse.data[0];
            const isApproved = kycStatus.status.toLowerCase() === 'approved';

            if (isApproved) {
                await this.bot.sendMessage(
                    chatId,
                    '🎉 Your KYC verification has been approved!',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            const kycMessage = this.BOT_MESSAGES.KYC_STATUS_TEMPLATE
                .replace('%status%', `${kycStatus.status.toUpperCase()}`)
                .replace('%type%', kycStatus.type === 'approved'
                    ? '✅ Approved'
                    : `Your KYC is not approved yet, It's ${kycStatus.status}`);

            await this.bot.sendMessage(chatId, kycMessage, {
                parse_mode: 'Markdown',
            });

            await this.bot.sendMessage(
                chatId,
                '⚠️ Your access is currently limited.' +
                'Complete KYC verification to unlock all features.'
            );

            // Handle non-approved status
            if (!isApproved) {
                await this.bot.sendMessage(
                    chatId,
                    this.BOT_MESSAGES.KYC_REDIRECT_PLATFROM,
                    {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: '🔗 Complete KYC on Copperx Platform',
                                    url: 'https://payout.copperx.io/app/kyc'
                                }],
                                [{
                                    text: '🔄 Check KYC Status Again',
                                    callback_data: 'check_kyc_status'
                                }],
                                [{ text: '🔒 Back', callback_data: 'help' }]
                            ]
                        }
                    }
                );

               
                return;
            } else {
                // Handle approved status
                await this.bot.sendMessage(
                    chatId,
                    '✅ Your KYC is approved. You have full access to all features.'
                );
            }

        } catch (error: any) {
            console.error('KYC status check error:', error);
            await this.bot.sendMessage(
                chatId,
                `Oops.. Failed to fetch KYC status. Please try again`
            );
        }
    }

} 
import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { BulkTransferPayload, BulkTransferRequest } from '@/types/copperx';
import { v4 as uuidv4 } from 'uuid'; // Add uuid package for requestId generation
import { convertToBaseUnit, convertFromBaseUnit } from '../utils/copperxUtils';

export class BulkTransferHandler extends BaseHandler {
    async handleBulkTransfer(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_NOT_AUTHENTICATED
            );
            return;
        }

        // Initialize bulk transfer session
        this.sessions.initBulkTransfer(chatId);

        await this.bot.sendMessage(
            chatId,
            '📤 *Bulk Transfer*\n\n' +
            'Please upload a CSV file with the following columns:\n' +
            '- email or walletAddress\n' +
            '- amount\n' +
            '- purpose (optional, defaults to "payment")\n' +
            '- currency (optional, defaults to "USDC")\n\n' +

            'Or send recipients one by one using these commands:\n' +
            
            '/add_recipient - Add a new recipient\n' +
            '/review - Review current recipients\n' +
            '/clear - Clear all recipients\n' +
            '/send_bulk - Process the bulk transfer\n' +
            '/cancel - Cancel bulk transfer',
            { parse_mode: 'Markdown' }
        );
    }

    async handleAddRecipient(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        await this.bot.sendMessage(
            chatId,
            '📧 Enter recipient (email or wallet address):',
            {
                reply_markup: {
                    force_reply: true
                }
            }
        );
        this.sessions.setState(chatId, 'WAITING_BULK_RECIPIENT');
    }

    async handleRecipientInput(chatId: number, text: string) {
        const isEmail = this.EMAIL_REGEX.test(text);
        const isWallet = /^0x[a-fA-F0-9]{40}$/.test(text);

        if (!isEmail && !isWallet) {
            await this.bot.sendMessage(
                chatId,
                '❌ Invalid input. Please enter a valid email or wallet address.'
            );
            return;
        }

        // Store recipient
        this.sessions.setBulkRecipient(chatId, {
            type: isEmail ? 'email' : 'wallet',
            value: text
        });

        // Ask for amount
        await this.bot.sendMessage(
            chatId,
            '💰 Enter amount to send:'
        );
        this.sessions.setState(chatId, 'WAITING_BULK_AMOUNT');
    }
  

    async handleBulkAmount(chatId: number, text: string) {
        const amount = text.trim();
        if (!/^[0-9]+(\.[0-9]+)?$/.test(amount) || parseFloat(amount) <= 0) {
            await this.bot.sendMessage(
                chatId,
                '❌ Invalid amount. Please enter a valid number greater than 0.'
            );
            return;
        }

        // Convert to base unit
        const baseAmount = convertToBaseUnit(parseFloat(amount));
        this.sessions.setBulkAmount(chatId, baseAmount);

        // Show purpose selection
        await this.showPurposeSelection(chatId);
    }

    private async showPurposeSelection(chatId: number) {
        await this.bot.sendMessage(
            chatId,
            '🎯 Select transfer purpose:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💸 Payment', callback_data: 'bulk_purpose_payment' },
                            { text: '🎁 Gift', callback_data: 'bulk_purpose_gift' }
                        ],
                        [
                            { text: '💼 Business', callback_data: 'bulk_purpose_business' },
                            { text: '👨‍👩‍👧‍👦 Family', callback_data: 'bulk_purpose_family' }
                        ]
                    ]
                }
            }
        );
    }

    async handlePurposeSelection(chatId: number, purpose: string) {
        const recipient = this.sessions.getCurrentBulkRecipient(chatId);
        if (!recipient) {
            await this.bot.sendMessage(chatId, '❌ Error: Recipient data not found');
            return;
        }

        // Create transfer request
        const request: BulkTransferRequest = {
            requestId: uuidv4(),
            request: {
                [recipient.type === 'email' ? 'email' : 'walletAddress']: recipient.value,
                amount: this.sessions.getBulkAmount(chatId) || '0',
                purposeCode: purpose,
                currency: 'USDC'
            }
        };

        // Add to bulk transfer list
        this.sessions.addBulkTransferRequest(chatId, request);

        // Show confirmation and options
        await this.bot.sendMessage(
            chatId,
            '✅ Recipient added to bulk transfer list!\n\n' +
            'Choose an action:\n' +
            '/add_recipient - Add another recipient\n' +
            '/review - Review current recipients\n' +
            '/send_bulk - Process the bulk transfer',
            { parse_mode: 'Markdown' }
        );

        this.sessions.setState(chatId, 'BULK_TRANSFER_MENU');
    }

    async handleReview(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        const requests = this.sessions.getBulkTransferRequests(chatId);

        if (!requests || requests.length === 0) {
            await this.bot.sendMessage(
                chatId,
                '📝 No recipients added yet.\n\nUse /add_recipient to add recipients.'
            );
            return;
        }

        let message = '📋 *Bulk Transfer Review*\n\n';
        let totalAmount = 0;

        requests.forEach((req, index) => {
            const recipient = req.request.email || req.request.walletAddress;
            const amount = convertFromBaseUnit(Number(req.request.amount) || 0);
            totalAmount += amount;

            message += `${index + 1}. ${recipient}\n` +
                `   Amount: ${amount} ${req.request.currency}\n` +
                `   Purpose: ${req.request.purposeCode}\n\n`;
        });

        message += `\nTotal Amount: ${totalAmount} USDC\n` +
            `Total Recipients: ${requests.length}`;

        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Confirm & Send', callback_data: 'bulk_confirm' },
                        { text: '❌ Cancel', callback_data: 'bulk_cancel' }
                    ]
                ]
            }
        });
    }

    async processBulkTransfer(chatId: number) {
        const requests = this.sessions.getBulkTransferRequests(chatId);
        if (!requests || requests.length === 0) {
            await this.bot.sendMessage(
                chatId,
                '❌ No recipients to process'
            );
            return;
        }

        try {
            const loadingMsg = await this.bot.sendMessage(
                chatId,
                '🔄 Processing bulk transfer...'
            );

            const response = await this.api.sendBulkTransfer({ requests });
            await this.bot.deleteMessage(chatId, loadingMsg.message_id);

            await this.bot.sendMessage(
                chatId,
                '✅ Bulk transfer processed successfully!\n\n' +
                `Total recipients: ${requests.length}\n` +
                `Transaction ID: ${response.transactionId}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{
                                text: '📜 View Transaction History',
                                callback_data: 'refresh_history'
                            }]
                        ]
                    }
                }
            );

            // Clear bulk transfer data
            this.sessions.clearBulkTransferData(chatId);
            this.sessions.setState(chatId, 'AUTHENTICATED');

        } catch (error: any) {
            console.error('Bulk transfer error:', error);
            await this.bot.sendMessage(
                chatId,
                `❌ Failed to process bulk transfer: ${error.message}`
            );
        }
    }
} 
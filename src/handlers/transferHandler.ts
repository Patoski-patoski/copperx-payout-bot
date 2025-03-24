// src/handlers/transferHandler.ts
import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { EmailTransferRequest } from '@/types/copperx';


export class TransferHandler extends BaseHandler {

    async handleSend(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.TRANSFER_NOT_AUTHENTICATED);
            return;
        }

        // Start the transfer flow
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.TRANSFER_EMAIL_INTRO,
            { parse_mode: 'Markdown' }
        );

        // Ask for recipient email
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.TRANSFER_ENTER_EMAIL
        );

        // Set session state
        this.sessions.setState(chatId, 'WAITING_TRANSFER_EMAIL');

        // Initialize transfer state in session
        this.sessions.clearTransferData(chatId);

    }


    // Handle email input for transfer
    async handleTransferEmail(chatId: number, email: string) {
        // Validate email
        if (!email.match(this.EMAIL_REGEX)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_INVALID_EMAIL
            );
            return;
        }

        // Store email in session
        this.sessions.setTransferEmail(chatId, email);

        // Ask for amount
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.TRANSFER_ENTER_AMOUNT
        );

        // Update session state
        this.sessions.setState(chatId, 'WAITING_TRANSFER_AMOUNT');
    }

    // Handle amount input for transfer
    async handleTransferAmount(chatId: number, amountText: string) {
        // Validate amount
        const amount = amountText.trim();
        if (!/^[0-9]+(\.[0-9]+)?$/.test(amount) || parseFloat(amount) <= 0) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_INVALID_AMOUNT
            );
            return;
        }

        // Store amount in session
        this.sessions.setTransferAmount(chatId, amount);
        this.sessions.setTransferCurrency(chatId, 'USD'); // Default currency

        // Ask for purpose
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.TRANSFER_SELECT_PURPOSE,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👤 Self', callback_data: 'transfer_purpose:self' },
                            { text: '👨‍👩‍👧‍👦 Family', callback_data: 'transfer_purpose:family' }
                        ],
                        [
                            { text: '🎁 Gift', callback_data: 'transfer_purpose:gift' },
                            { text: '💼 Business', callback_data: 'transfer_purpose:business' }
                        ],
                        [
                            { text: '💸 Payment', callback_data: 'transfer_purpose:payment' }
                        ]
                    ]
                }
            }
        );
    }

    // Handle note input for transfer
    async handleTransferNote(chatId: number, note: string) {
        if (note.toLowerCase() !== 'skip') {
            this.sessions.setTransferNote(chatId, note);
        }

        // Show transfer confirmation
        await this.showTransferConfirmation(chatId);
    }

    // Show transfer confirmation
    async showTransferConfirmation(chatId: number) {
        try {

            const transferData = this.sessions.getTransferData(chatId);

            // Get purpose display text
            const purposeDisplay = this.getPurposeDisplayText(transferData.purposeCode);

            // Format note if exists
            const noteDisplay = transferData.note ?
                `*Note:* ${transferData.note}` : '';

            // Create confirmation message
            const confirmMessage = this.BOT_MESSAGES.TRANSFER_CONFIRM_TEMPLATE
                .replace('%amount%', transferData.amount)
                .replace('%currency%', transferData.currency)
                .replace('%purpose%', purposeDisplay)
                .replace('%note%', noteDisplay);

            // Send confirmation message with buttons
            await this.bot.sendMessage(
                chatId,
                confirmMessage,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Confirm', callback_data: 'transfer_confirm' },
                                { text: '❌ Cancel', callback_data: 'transfer_cancel' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            console.error('Error showing transfer confirmation:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ An error occurred while preparing your transfer. Please try again.'
            );
        }
    }


    // Process the transfer
    async processTransfer(chatId: number) {
        try {
            // Show loading message
            const loadingMsg = await this.bot.sendMessage(
                chatId,
                '🔄 Processing your transfer...'
            );

            // Get transfer data from session
            const transferData = this.sessions.getTransferData(chatId);

            // Prepare request payload
            const transferRequest: EmailTransferRequest = {
                email: transferData.email,
                amount: transferData.amount,
                purposeCode: transferData.purposeCode,
                currency: transferData.currency
            };

            // Add note if exists
            if (transferData.note) {
                transferRequest.note = transferData.note;
            }

            // Send transfer request to API
            const response = await this.api.sendEmailTransfer(transferRequest);

            // Delete loading message
            await this.bot.deleteMessage(chatId, loadingMsg.message_id);

            // Show success message
            const successMessage = this.BOT_MESSAGES.TRANSFER_SUCCESS
                .replace('%id%', response.id)
                .replace('%status%', response.status)
                .replace('%amount%', response.amount)
                .replace('%currency%', response.currency)
                .replace('%recipient%', transferData.email);

            await this.bot.sendMessage(
                chatId,
                successMessage,
                { parse_mode: 'Markdown' }
            );

            // Clear transfer data and reset state
            this.sessions.clearTransferData(chatId);
            this.sessions.setState(chatId, 'AUTHENTICATED');

        } catch (error: any) {
            console.error('Error processing transfer:', error);
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_ERROR.replace(
                    '%message%',
                    error.message || 'An unexpected error occurred'
                )
            );
        }
    }

    // Helper method to get display text for purpose code
    getPurposeDisplayText(purposeCode: string): string {
        const purposeMap = {
            'self': '👤 Self',
            'family': '👨‍👩‍👧‍👦 Family',
            'gift': '🎁 Gift',
            'business': '💼 Business',
            'payment': '💸 Payment'
        };

        return purposeMap[purposeCode as keyof typeof purposeMap] || purposeCode;
    }
} 
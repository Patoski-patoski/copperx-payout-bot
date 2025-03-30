import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { BulkTransferPayload, BulkTransferRequest } from '@/types/copperx';
import { v4 as uuidv4 } from 'uuid'; // Add uuid package for requestId generation
import { convertToBaseUnit, convertFromBaseUnit, clearErrorMessage } from '../utils/copperxUtils';

export class BulkTransferHandler extends BaseHandler {
    async handleBulkTransfer(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_NOT_AUTHENTICATED
            );

            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
            return;
        }

        // Initialize bulk transfer session
        this.sessions.initBulkTransfer(chatId);

        await this.bot.sendMessage(
            chatId,
            '📤 *Bulk Transfer*\n\n' +
            'Welcome to the bulk transfer feature!\n\n' +
            'You can send funds to multiple recipients at once.\n\n' +
            'Please choose an option:\n\n' +

            '/add\\_recipient - Add a new recipient\n' + 
            '/review - Review current recipients\n' +
            '/clear - Clear all recipients\n' +
            '/send\\_bulk - Process the bulk transfer\n' +
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
          const errorMessage = await this.bot.sendMessage(
                chatId,
                '❌ Invalid input. Please enter a valid email or wallet address.'
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
            return;
        }

        // Store recipient
        this.sessions.setCurrentBulkRecipient(chatId, {
            type: isEmail ? 'email' : 'wallet',
            value: text
        });
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

    async validateBulkTransfer(chatId: number): Promise<boolean> {
        const requests = this.sessions.getBulkTransferRequests(chatId);

        // Check for duplicate recipients
        const recipients = new Set();
        for (const req of requests) {
            const recipient = req.request.email || req.request.walletAddress;
            if (recipients.has(recipient)) {
                await this.bot.sendMessage(
                    chatId,
                    `⚠️ Duplicate recipient found: ${recipient}`
                );
                return false;
            }
            recipients.add(recipient);
        }

        // Calculate total amount
        const totalAmount = requests.reduce((sum, req) =>
            sum + Number(req.request.amount), 0);

        // Check wallet balance
        try {
            const balances = await this.api.getWalletBalances();
            const usdcBalance = balances[0]?.balances.find(b => b.symbol === 'USDC');

            if (!usdcBalance || Number(usdcBalance.balance) < totalAmount) {
                await this.bot.sendMessage(
                    chatId,
                    '❌ Insufficient balance for bulk transfer'
                );
                return false;
            }
        } catch (error) {
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to verify wallet balance'
            );
            return false;
        }

        return true;
    }

    async handleReview(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        const requests = this.sessions.getBulkTransferRequests(chatId);

        if (!requests || requests.length === 0) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                '📝 No recipients added yet.\n\nUse /add_recipient to add recipients.'
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id, 20000);
            return;
        }

        let message = '⚡️ *Confirm Bulk Transfer:*\n\n';
        let totalAmount = 0;

        requests.forEach((req, index) => {
            const recipient = req.request.email || req.request.walletAddress;
            const amount = convertFromBaseUnit(Number(req.request.amount) || 0);
            totalAmount += amount;

            message += `🔹 *Recipient ${index + 1}:*\n` +
                `  - ${req.request.email ? 'Email' : 'Wallet'}: \`${recipient}\`\n` +
                `  - Amount: ${amount} ${req.request.currency}\n` +
                `  - Purpose: ${req.request.purposeCode}\n\n`;
        });

        message += `*Total Amount: ${totalAmount} USDC*\n\n` +
            'Reply with:\n' +
            '`YES` - to proceed\n' +
            '`NO` - to cancel\n' +
            '`cancel` - to return to transfer menu';

        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
        });

        this.sessions.setState(chatId, 'WAITING_BULK_CONFIRMATION');
    }

    // Add new method to handle confirmation response
    async handleBulkConfirmation(msg: TelegramBot.Message) {
        const { chat: { id: chatId }, text } = msg;
        const response = text?.toLowerCase();

        switch (response) {
            case 'yes':
                await this.processBulkTransfer(chatId);
                break;
            case 'no':
                await this.bot.sendMessage(
                    chatId,
                    '❌ Bulk transfer cancelled.'
                );
                this.sessions.setState(chatId, 'BULK_TRANSFER_MENU');
                break;
            case 'cancel':
                await this.bot.sendMessage(
                    chatId,
                    '🔙 Returned to transfer menu'
                );
                this.sessions.setState(chatId, 'AUTHENTICATED');
                break;
            default:
                await this.bot.sendMessage(
                    chatId,
                    '❌ Invalid response. Please reply with YES, NO, or cancel'
                );
                return;
        }
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
                            { text: '👤 Self', callback_data: 'bulk_purpose_self' },
                            { text: '🎁 Gift', callback_data: 'bulk_purpose_gift' },
                            { text: '💰 Salary', callback_data: 'bulk_purpose_salary' },
                        ],
                        [
                            { text: '👨‍👩‍👧‍👦 Family', callback_data: 'bulk_purpose_family' },
                            { text: '💰 Saving', callback_data: 'bulk_purpose_saving' },
                            { text: '💰 Income', callback_data: 'bulk_purpose_income' },
                        ],
                        [
                            { text: '💸 reimbursement', callback_data: 'bulk_purpose_reimbursement' },
                            { text: '🏠 Home Improvement', callback_data: 'bulk_purpose_home_improvement' },
                        ],
                        [
                            { text: '🎓 Education Support', callback_data: 'bulk_purpose_education_support' },
                            { text: '❌ Cancel', callback_data: 'bulk_cancel' }
                        ],
                    ]
                }
            }
        );        
    }

    async handlePurposeSelection(chatId: number, purpose: string) {
        console.log('Chat ID:', chatId);
        console.log('Purpose:', purpose);

        const recipient = this.sessions.getCurrentBulkRecipient(chatId);
        console.log('recipient:', recipient);
        
        
        if (!recipient) {
            console.log('Session state:', this.sessions.getState(chatId));
            await this.bot.sendMessage(chatId, '❌ Error: Recipient data not found');
            return;
        }

        // Create transfer request
        const request: BulkTransferPayload = {
            requests: [{
                requestId: uuidv4(), // Generate a unique request ID
                request: {
                    walletAddress: recipient.type === 'email' ? '' : recipient.value,
                    email: recipient.type === 'email' ? recipient.value : '', 
                    amount: this.sessions.getBulkAmount(chatId) || '0',
                    payeeId: '',
                    purposeCode: purpose, 
                    currency: 'USDC'
                }
            }]
        };

        // Add to bulk transfer list
        this.sessions.addBulkTransferRequest(chatId, request.requests[0]);

        // Show confirmation and options
        await this.bot.sendMessage(
            chatId,
            '✅ Recipient added to bulk transfer list\\!\n\n' +
            'Choose an action:\n\n' +
            '/add\\_recipient \\- Add another recipient\n' +
            '/review \\- Review current recipients\n' +
            '/send\\_bulk \\- Process the bulk transfer',
            {
                parse_mode: 'MarkdownV2'
            }
        );

        this.sessions.setState(chatId, 'BULK_TRANSFER_MENU');
    }

    // async handleReview(msg: TelegramBot.Message) {
    //     const { chat: { id: chatId } } = msg;
    //     const requests = this.sessions.getBulkTransferRequests(chatId);

    //     if (!requests || requests.length === 0) {
    //         await this.bot.sendMessage(
    //             chatId,
    //             '📝 No recipients added yet.\n\nUse /add_recipient to add recipients.'
    //         );
    //         return;
    //     }

    //     let message = '📋 *Bulk Transfer Review*\n\n';
    //     let totalAmount = 0;

    //     requests.forEach((req, index) => {
    //         const recipient = req.request.email || req.request.walletAddress;
    //         const amount = convertFromBaseUnit(Number(req.request.amount) || 0);
    //         totalAmount += amount;

    //         message += `${index + 1}. ${recipient}\n` +
    //             `   Amount: ${amount} ${req.request.currency}\n` +
    //             `   Purpose: ${req.request.purposeCode}\n\n`;
    //     });

    //     message += `\nTotal Amount: ${totalAmount} USDC\n` +
    //         `Total Recipients: ${requests.length}`;

    //     await this.bot.sendMessage(chatId, message, {
    //         parse_mode: 'Markdown',
    //         reply_markup: {
    //             inline_keyboard: [
    //                 [
    //                     { text: '✅ Confirm & Send', callback_data: 'bulk_confirm' },
    //                     { text: '❌ Cancel', callback_data: 'bulk_cancel' }
    //                 ]
    //             ]
    //         }
    //     });
    // }

    async processBulkTransfer(chatId: number) {
        
        if (!await this.validateBulkTransfer(chatId)) {
            return;
        }
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
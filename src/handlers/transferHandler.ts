// src/handlers/transferHandler.ts
import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import {
    BaseTransferRequest,
    TransferType,
    EmailTransferRequest,
    WalletWithdrawalRequest
} from '@/types/copperx';


export class TransferHandler extends BaseHandler {

    async handleSend(msg: TelegramBot.Message) {

        const { chat: { id: chatId } } = msg;
        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.TRANSFER_NOT_AUTHENTICATED);
            return;
        }

        await this.bot.sendMessage(
            chatId,
            '📤 *Select Transfer Type*\n\nHow would you like to send funds?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📧 Send to Email', callback_data: 'transfer_type_email' },
                            { text: '💼 Send to Wallet', callback_data: 'transfer_type_wallet' }
                        ]
                    ]
                }
            }
        );

    }

    // Add this method to handle transfer type selection
    async handleTransferTypeSelection(chatId: number, type: TransferType) {
        this.sessions.setTransferType(chatId, type);

        if (type === 'email') {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_EMAIL_INTRO,
                { parse_mode: 'Markdown' }
            );
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_ENTER_EMAIL
            );
            this.sessions.setState(chatId, 'WAITING_TRANSFER_EMAIL');
        } else {
            await this.bot.sendMessage(
                chatId,
                '📤 *Send to Wallet*\n\nPlease enter the recipient\'s wallet address:',
                { parse_mode: 'Markdown' }
            );
            this.sessions.setState(chatId, 'WAITING_TRANSFER_WALLET');
        }
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

    // Add handler for wallet address input
    async handleTransferWallet(chatId: number, walletAddress: string) {
        // Validate wallet address (add your validation logic)
        if (walletAddress.length !== 42
            && !walletAddress.startsWith('0x')) {
            await this.bot.sendMessage(
                chatId,
                '❌ Invalid wallet address. Please enter a valid address.'
            );
            return;
        }

        this.sessions.setTransferWallet(chatId, walletAddress);
        await this.requestAmount(chatId);
    }

    // Unified method to request amount
    private async requestAmount(chatId: number) {
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.TRANSFER_ENTER_AMOUNT
        );
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

        try {
            // Convert amount to base unit
            const baseAmount = this.convertToBaseUnit(parseFloat(amount));

            // Store amount in session
            this.sessions.setTransferAmount(chatId, baseAmount);
            this.sessions.setTransferCurrency(chatId, 'USDC'); // Default currency

            // Show confirmation of amount
            const formattedAmount = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(parseFloat(amount));

            await this.bot.sendMessage(
                chatId,
                `\n💰 Amount to send: ${formattedAmount}\n`
            );

            // Asking for purpose with inline keyboard
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_SELECT_PURPOSE,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '👤 Self', callback_data: 'transfer_purpose:self' },
                                { text: '� Salary', callback_data: 'transfer_purpose:salary' }
                            ],
                            [
                                { text: '🎁 Gift', callback_data: 'transfer_purpose:gift' },
                                { text: '💰 Income', callback_data: 'transfer_purpose:income' }
                            ],
                            [
                                { text: '💰 Saving', callback_data: 'transfer_purpose:saving' },
                                { text: '🎓 Education Support', callback_data: 'transfer_purpose:education_support' }

                            ],
                            [
                                {text: '👨‍👩‍👧‍👦 Family', callback_data: 'transfer_purpose:family'},
                                { text: '🏠 Home Improvement', callback_data: 'transfer_purpose:home_improvement' },
                            ],
                            [
                                { text: '💸 Reimbursement', callback_data: 'transfer_purpose:reimbursement' }
                            ]
                        ]
                    }
                }
            );

        } catch (error) {
            console.error('Error converting amount:', error);
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_ERROR
            );
        }
       
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
                .replace('%amount%', this.convertFromBaseUnit(Number(transferData.amount)).toString())
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
            const transferType = this.sessions.getTransferType(chatId);

            console.log('Processing transfer:', {
                transferData,
                transferType
            });

            const baseRequest: BaseTransferRequest = {
                amount: transferData.amount,
                purposeCode: transferData.purposeCode,
                currency: transferData.currency
            };

            // Add note if exists
            if (transferData.note) {
                baseRequest.note = transferData.note;
            }

            let request;
            if (transferType === 'wallet') {
                // For wallet withdrawals,
                request = {
                    ...baseRequest,
                    walletAddress: transferData.walletAddress
                } as WalletWithdrawalRequest;
            } else {
                // For email transfers,
                request = {
                    ...baseRequest,
                    email: transferData.email,
                    payeeId: transferData.payeeId,
                    walletAddress: transferData.walletAddress
                } as EmailTransferRequest;
            }

            console.log('Sending request:', request);

            // Send transfer request to API
            const response = await this.api.sendTransfer(request, transferType);
            await this.bot.deleteMessage(chatId, loadingMsg.message_id);

            // if (response && response.error) {
            //     await this.bot.sendMessage(
            //         chatId,
            //         this.BOT_MESSAGES.TRANSFER_ERROR.replace(
            //             '%message%', response.error
            //         )
            //     );
            //     return;
            // }          

            await this.showTransferSuccess(chatId, response);
            console.log('Transfer response: ', response);
          
            // Show success message
            // const successMessage = this.BOT_MESSAGES.TRANSFER_SUCCESS
            //     .replace('%id%', response.id)
            //     .replace('%status%', response.status)
            //     .replace('%amount%', response.amount)
            //     .replace('%currency%', response.currency)
            //     .replace('%recipient%', response.customer.name)
            //     .replace('%recipient_email%', response.customer.email);

            // console.log('Success message: ', successMessage);

            // await this.bot.sendMessage(
            //     chatId,
            //     successMessage,
            //     { parse_mode: 'Markdown' }
            // );

            // Clear transfer data and reset state
            this.sessions.clearTransferData(chatId);
            this.sessions.setState(chatId, 'AUTHENTICATED');

        } catch (error: any) {
            console.error('Error processing transfer:', error);
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_ERROR.replace(
                    '%message%',
                    error.message && 'Please try again'
                )
            );
        }
    }
    // Helper method to format wallet address
    private formatWalletAddress(address?: string): string {
        if (!address) return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    private convertToBaseUnit(amount: number, decimals: number = 8)
        : string {
        return (amount * Math.pow(10, decimals)).toString();
    }

    private convertFromBaseUnit(amount: number, decimals: number = 8)
        : number {
        return Number(amount) / Math.pow(10, decimals);
    }

    // Helper method to get display text for purpose code
    getPurposeDisplayText(purposeCode: string): string {
        const purposeMap = {
            'self': '👤 Self',
            'salary': '💰 Salary',
            'gift': '🎁 Gift',
            'income': '💰 Income',
            'saving': '💰 Saving',
            'education_support': '🎓 Education Support',
            'family': '👨‍👩‍👧‍👦 Family',
            'home_improvement': '🏠 Home Improvement',
            'reimbursement': '💸 Reimbursement',
        };

        return purposeMap[purposeCode as keyof typeof purposeMap] || purposeCode;
    }

    private async showTransferSuccess(chatId: number, response: any) {
        const transferData = this.sessions.getTransferData(chatId);
        const transferType = this.sessions.getTransferType(chatId);

        // Convert base unit amount back to display format
        const amount = this.convertFromBaseUnit(transferData?.amount || '0');
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: transferData?.currency || 'USDC'
        }).format(amount);

        let successMessage = `✅ *Transfer Successful!*\n\n`;
        successMessage += `Amount: ${formattedAmount}\n`;

        // Add recipient details based on transfer type
        if (transferType === 'email') {
            successMessage += `Recipient Email: ${transferData?.email}\n`;
        } else {
            successMessage += `Recipient Wallet: ${this.formatWalletAddress(transferData?.walletAddress)}\n`;
        }

        // Add transaction details
        successMessage += `Purpose: ${this.getPurposeDisplayText(transferData?.purposeCode)}\n`;
        if (transferData?.note) {
            successMessage += `Note: ${transferData.note}\n`;
        }
        successMessage += `\nTransaction ID: \`${response.transactionId}\``;

        // Add view transaction button if you have a transaction explorer
        const keyboard = [
            [{
                text: '📜 View Transaction History',
                callback_data: 'refresh_history'
            }],
            [{
                text: '📤 New Transfer',
                callback_data: 'transfer_new'
            }]
        ];

        await this.bot.sendMessage(chatId, successMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }
} 
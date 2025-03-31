import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { OffRampQuoteRequest, BankWithdrawalRequest } from '../types/copperx';
import {
    clearErrorMessage,
    convertFromBaseUnit,
    convertToBaseUnit
} from '../utils/copperxUtils';

export class BankWithdrawalHandler extends BaseHandler {
    async handleWithdraw(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.TRANSFER_NOT_AUTHENTICATED
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
            return;
        }

        try {

            // First check if user has a default wallet
            const defaultWallet = await this.api.getDefaultWallet();
            console.log("Default wallet", defaultWallet);
            
            if (!defaultWallet) {
                const errorMessage = await this.bot.sendMessage(
                    chatId,
                    '❌ No default wallet found.' +
                    'Please set a default wallet first using /default '
                );
                clearErrorMessage(this.bot, chatId, errorMessage.message_id);
                return;
            }
            const defaultAccount = await this.api.getDefaultBankAccount();

            if (!defaultAccount) {
                await this.bot.sendMessage(
                    chatId,
                    '❌ No default bank account found.\n\n' +
                    'Please set up a bank account on the Copperx platform first.',
                    {
                        reply_markup: {
                            inline_keyboard: [[{
                                text: '🏦 Set Up Bank Account',
                                url: 'https://payout.copperx.io/app/'
                            }]]
                        }
                    }
                );
                return;
            }

            // Store bank account info in session
            this.sessions.setWithdrawalBankAccount(chatId, {
                id: defaultAccount.id,
                country: defaultAccount.country,
                bankName: defaultAccount.bankAccount.bankName,
                accountNumber: defaultAccount.bankAccount.bankAccountNumber,
                beneficiaryName: defaultAccount.bankAccount.bankBeneficiaryName
            });

            // Start withdrawal process
            await this.requestWithdrawalAmount(chatId);

        } catch (error: any) {
            console.error('Error fetching bank account:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to fetch your bank account information.\n\n' +
                'Please try again.'
            );
        }
    }

    private async requestWithdrawalAmount(chatId: number) {
        await this.bot.sendMessage(
            chatId,
            '💰 Please enter the amount you want to withdraw:',
            { parse_mode: 'Markdown' }
        );
        this.sessions.setState(chatId, 'WAITING_WITHDRAWAL_AMOUNT');
    }

    async handleWithdrawalAmount(chatId: number, amountText: string) {
        const amount = amountText.trim();
        if (!/^[0-9]+(\.[0-9]+)?$/.test(amount)
            || parseFloat(amount) <= 0) {
            
            await this.bot.sendMessage(
                chatId,
                '❌ Invalid amount. Please enter a valid number greater than 0.'
            );
            return;
        }

        // Convert to base unit
        const baseAmount = convertToBaseUnit(parseFloat(amount));
        this.sessions.setWithdrawalAmount(chatId, baseAmount);

        // Get quote
        try {
            const bankAccount = this.sessions.getWithdrawalBankAccount(chatId);
            if (!bankAccount) {
                throw new Error('Bank account information not found');
            }

            const quoteRequest: OffRampQuoteRequest = {
                sourceCountry: 'none',
                destinationCountry: bankAccount.country.toLowerCase(),
                amount: baseAmount,
                currency: 'USDC',
                onlyRemittance: true,
                preferredBankAccountId: bankAccount.id
            };

            const quote = await this.api.getOffRampQuote(quoteRequest);
            this.sessions.setWithdrawalQuote(chatId, quote);

            // Show withdrawal summary before purpose selection
            await this.showWithdrawalSummary(chatId, {
                amount: amountText,
                bankName: bankAccount.bankName,
                accountNumber: bankAccount.accountNumber
            });

            // Show purpose selection
            await this.showPurposeSelection(chatId);

        } catch (error: any) {
            console.error('Error getting withdrawal quote:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to get withdrawal quote.\n\n' +
                'Please try again.'
            );
        }
    }

    private async showWithdrawalSummary(chatId: number, details: {
        amount: string,
        bankName: string,
        accountNumber: string
    }) {
        const message = `💳 *Withdrawal Summary*\n\n` +
            `Amount: ${details.amount}\n` +
            `Bank: ${details.bankName}\n` +
            `Account: ****${details.accountNumber.slice(-4)}\n\n` +
            `Please select the purpose of this withdrawal:`;

        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
        });
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
                            { text: '❌ Cancel', callback_data: 'transfer_cancel' }
                        ],
                    ]
                }
            }
        );
    }

    async handlePurposeSelection(chatId: number, purpose: string) {
        const quote = this.sessions.getWithdrawalQuote(chatId);
        const bankAccount = this.sessions.getWithdrawalBankAccount(chatId);
        if (!quote) {
            await this.bot.sendMessage(
                chatId,
                '❌ Withdrawal quote expired. Please start over.'
            );
            return;
        }

        try {
            const withdrawalRequest: BankWithdrawalRequest = {
                purposeCode: purpose,
                quotePayload: quote.quotePayload || '',
                quoteSignature: quote.quoteSignature || '',
                preferredWalletId: this.sessions.getPreferredBankAccountId(chatId) || '',
            };

            const response = await this.api.sendBankWithdrawal(withdrawalRequest);
            await this.showWithdrawalSuccess(chatId, response);

        } catch (error: any) {
            console.error('Error processing withdrawal:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to process withdrawal. Please try again.'
            );
        }
    }

    private async showWithdrawalSuccess(chatId: number, response: any) {
        const amount = convertFromBaseUnit(Number(this.sessions.getWithdrawalAmount(chatId) || '0'));
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USDC'
        }).format(amount);

        const message = `✅ *Bank Withdrawal Initiated!*\n\n` +
            `Amount: ${formattedAmount}\n` +
            `Status: ${response.status}\n` +
            `Currency: ${response.currency}\n` +
            `PurposeCOde: ${response.purposeCode}\n` +
            `Currency: ${response.currency}\n` +
            `RecipientBank: ${response.destinationAccount.bankName}\n` +
            `Transaction ID: \`${response.id}\`\n\n` +
            `Your withdrawal is being processed. You will receive a confirmation once completed.`;

        await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: '📜 View Transaction History',
                        callback_data: 'refresh_history'
                    }]
                ]
            }
        });

        // Clear withdrawal data
        this.sessions.clearWithdrawalData(chatId);
        this.sessions.setState(chatId, 'AUTHENTICATED');
    }
} 
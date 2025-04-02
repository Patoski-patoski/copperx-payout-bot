import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import {
    OffRampQuoteRequest,
    BankWithdrawalRequest,
    QuoteBreakdown,
} from '../types/copperx';
import {
    clearErrorMessage,
    convertFromBaseUnit,
    convertToBaseUnit,
    offlineKeyBoardAndBack
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
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Enter amount in USD: ',
                }
             }
        );
        this.sessions.setState(chatId, 'WAITING_WITHDRAWAL_AMOUNT');
    }


    async handleWithdrawalAmount(chatId: number, amountText: string) {
        const amount = amountText.trim();
        const parsedAmount: number = parseInt(amountText, 10);
        const min = convertFromBaseUnit(5000000000);
        const max = convertFromBaseUnit(5000000000000);
        if (!/^[0-9]+(\.[0-9]+)?$/.test(amount)
            || parsedAmount < min
            || parsedAmount > max) {
            
            await this.bot.sendMessage(
                chatId,
                '❌ Invalid amount. Please enter a valid amount in USD.\n\n' +
                `*Note*: Minimum withdrawal amount is ${min} USDC and maximum is ${max} USDC.`,
                { parse_mode: 'Markdown' }
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
                await this.bot.sendMessage(
                    chatId,
                    '❌ Bank account information not found. Please try again.'
                );
                return;
            }
            if (!bankAccount) {
                throw new Error('Bank account information not found');
            }

            const defaultAccount = await this.api.getDefaultBankAccount();

            const quoteRequest: OffRampQuoteRequest = {
                sourceCountry: 'none',
                destinationCountry: 'usa',
                amount: baseAmount,
                currency: 'USD',
                onlyRemittance: true,
                preferredBankAccountId: bankAccount.id
            };

            const quote = await this.api.getOffRampQuote(quoteRequest);
            if (!quote) {
                await this.bot.sendMessage(chatId,
                    '❌ Failed to get withdrawal quote.',
                    {
                       parse_mode: "Markdown",
                       reply_markup: offlineKeyBoardAndBack("🔙 Back", "back") 
                    }
                )
                return;
            }
            this.sessions.setWithdrawalQuote(chatId, quote);

            let parsedQuotePayload, amount, toAmount, totalFee;

            try {
                parsedQuotePayload = typeof quote.quotePayload === 'string'
                    ? JSON.parse(quote.quotePayload)
                    : quote.quotePayload;
                
                amount = convertFromBaseUnit(parseInt(parsedQuotePayload.amount));
                toAmount = convertFromBaseUnit(parseInt(parsedQuotePayload.toAmount));
                totalFee = convertFromBaseUnit(parseInt(parsedQuotePayload.totalFee));

            } catch (parseError) {
                console.error('Error parsing quote payload:', parseError);
                throw new Error('Invalid quote payload format');
            }

            console.log(parsedQuotePayload);
            // Show withdrawal summary before purpose selection
            await this.showWithdrawalSummary(chatId, {
                amount: amount.toString(),
                toCurrency: parsedQuotePayload.toCurrency,
                feePercentage: parsedQuotePayload.feePercentage,
                fixedFee: parsedQuotePayload.fixedFee,
                totalFee: totalFee.toString(),
                transferMethod: parsedQuotePayload.destinationMethod,
                bankName: defaultAccount?.bankAccount.bankName,
                accountNumber: defaultAccount?.bankAccount.bankAccountNumber,
                arrivalTime: quote.arrivalTime || '2-4 Business days',
                toAmount: toAmount.toString()
            });

            // Show purpose selection
            await this.showPurposeSelection(chatId);

        } catch (error: any) {
            console.error('Error getting withdrawal quote:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to set up withdrawal\n',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        input_field_placeholder: 'Enter amount in USD: ',
                        inline_keyboard: [
                            [
                                { text: '🔄 Retry', callback_data: 'retry_withdrawal' },
                                { text: '❌ Cancel', callback_data: 'back' }
                            ]
                        ]
                    }
                 }
            );
        }
    }

    private async showWithdrawalSummary(chatId: number,
        QuoteBreakdown: QuoteBreakdown) {
        const details = QuoteBreakdown;

        const withdrawalMessage = this.BOT_MESSAGES.WITHDRAWAL_MESSAGE
            .replace('%amount%', `\`${details.amount}\``)
            .replace('%toAmount%', `\`${details.toAmount}\``)
            .replace('%currency%', `\`${details.toCurrency}\``)
            .replace('%feePercentage%', `\`${details.feePercentage}\``)
            .replace('%totalFee%', `\`${details.totalFee}\``)
            .replace('%transferMethod%', `\`${details.transferMethod}\``)
            .replace('%bankName%', `\`${details.bankName}\``)
            .replace('%accountNumber%', `\`${details.accountNumber}\``)
            .replace('%arrivalTime%', `\`${details.arrivalTime}\``)

        await this.bot.sendMessage(chatId, withdrawalMessage, {
            parse_mode: 'MarkdownV2',
        });

    }

    async handlePurposeSelection(chatId: number, purpose: string) {
        const quote = this.sessions.getWithdrawalQuote(chatId);
        console.log("Quote", quote);
        if (!quote) {
            await this.bot.sendMessage(
                chatId,
                '❌ Withdrawal quote expired. Please start over.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🔄 Retry', callback_data: 'retry_withdrawal' },
                                { text: '❌ Cancel', callback_data: 'back' }
                            ]
                        ]
                    }
                }
            );
            return;
        }

        try {
            const withdrawalRequest: BankWithdrawalRequest = {
                purposeCode: purpose,
                quotePayload: quote.quotePayload || '',
                quoteSignature: quote.quoteSignature || '',
                // preferredWalletId: this.sessions.getPreferredBankAccountId(chatId) || '',
            };

            console.log("Withdrawal Request", withdrawalRequest);

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

    async showPurposeSelection(chatId: number) {
        await this.bot.sendMessage(
            chatId,
            '🎯 Select transfer purpose:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👤 Self', callback_data: 'bank_purpose_self' },
                            { text: '🎁 Gift', callback_data: 'bank_purpose_gift' },
                            { text: '💰 Salary', callback_data: 'bank_purpose_salary' },
                        ],
                        [
                            { text: '👨‍👩‍👧‍👦 Family', callback_data: 'bank_purpose_family' },
                            { text: '💰 Saving', callback_data: 'bank_purpose_saving' },
                            { text: '💰 Income', callback_data: 'bank_purpose_income' },
                        ],
                        [
                            { text: '💸 reimbursement', callback_data: 'bank_purpose_reimbursement' },
                            { text: '🏠 Home Improvement', callback_data: 'bank_purpose_home_improvement' },
                        ],
                        [
                            { text: '🎓 Education Support', callback_data: 'bank_purpose_education_support' },
                            { text: '❌ Cancel', callback_data: 'transfer_cancel' }
                        ],
                    ]
                }
            }
        );
    }

   

    private async showWithdrawalSuccess(chatId: number, response: any) {
        const amount = convertFromBaseUnit(Number(this.sessions.getWithdrawalAmount(chatId) || '0'));
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);

        const message = `✅ *Bank Withdrawal Initiated!*
            Amount: ${formattedAmount}

            Status: ${response.status}

            Currency: ${response.currency}

            PurposeCOde: ${response.purposeCode}

            Currency: ${response.currency}

            RecipientBank: ${response.destinationAccount.bankName}

            Transaction ID: \`${response.id}\`
            
            Your withdrawal is being processed. You will receive a confirmation once completed.`;
        
        console.log("Bank withdrawal Initiated", message);

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
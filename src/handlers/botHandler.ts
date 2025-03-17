import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config';
import { CopperxApiService } from '../services/copperxApi';
import { SessionManager } from '../utils/sessionManager';
import { CopperxAuthResponse } from '@/types/copperx';

export class BotHandler {
    private readonly bot: TelegramBot;
    private readonly api: CopperxApiService;
    private readonly sessions: SessionManager;
    private readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    private readonly BOT_MESSAGES = {
        WELCOME: `
Welcome to Copperx Payout Bot! ©🚀

Here are the available commands:
/login - Login to your Copperx account
/balance - Check your wallet balances
/send - Send funds
/history - View your transaction history
/help - Show this help message

Need support? Visit https://t.me/copperxcommunity/2183`,

        ALREADY_LOGGED_IN: '🔐 You are already logged in!\n\nUse /logout to logout from your Copperx account.',
        NOT_LOGGED_IN: 'You are not logged in. Please use /login to login.',
        ENTER_EMAIL: '📧 Please enter your Copperx email address:',
        INVALID_EMAIL: '❌ Invalid email address. Please enter a valid email.',
        ENTER_OTP: '✉️ We\'ve sent an OTP to your email.\n\nPlease enter the 6-digit code:',
        INVALID_OTP: '❌ Invalid OTP. Please enter a valid 6-digit code.',
        SESSION_EXPIRED: 'Session expired. Please start over with /login',
        PROFILE_NOT_AUTHENTICATED: '❌ Please login first using /login to view your profile',
        PROFILE_TEMPLATE: `👤 *User Profile*

id: \`%id%\`
firstName: %firstName%
lastName: %lastName%
email: \`%email%\`
profileImage: %profileImage%
organizationId: %organizationId%
role: \`%role%\`
status: %status%
type: %type%
relayerAddress: %relayerAddress%
flags: [%flags%]
walletAddress: \`%walletAddress%\`
walletId: %walletId%
walletAccountType: \`%walletAccountType%\``,
        LOGOUT_SUCCESS: '👋 Logged out successfully!\n\nUse /login to login again.',
        LOGIN_SUCCESS: `✅ Login successful!

You can now: 
- Use /balance to check your wallet balance.
- Use /send to send funds.
- Use /profile to view your Copperx information
- Use /history to view your transaction history.
- Use /logout to logout from your account.

Need support? Visit https://t.me/copperxcommunity/2183`,
        KYC_NOT_AUTHENTICATED: '❌ Please login first using /login to view your KYC status',
        KYC_STATUS_TEMPLATE: `🔒 *KYC Verification Status*
status: %status%
type: %type%`,
        KYC_REDIRECT_PLATFROM: `🔒 *KYC Verification Required*

To complete your KYC verification:
1. Click the button below to go to the Copperx platform
2. Complete the verification process
3. Return here and check your status with /kyc

Need help? Contact support: https://t.me/copperxcommunity/2183`,

    };

    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, {
            polling: {
                interval: 3000,
                autoStart: true,
            }
        });
        this.api = new CopperxApiService();
        this.sessions = new SessionManager();
        this.setupCommands();
        this.setupMessageHandlers();
        this.setupCallbackHandlers();
    }

    private setupCommands() {
        const commands = [
            { command: /\/start/, handler: this.handleStart },
            { command: /\/login/, handler: this.handleLogin },
            { command: /\/logout/, handler: this.handleLogout },
            { command: /\/profile/, handler: this.handleProfile },
            { command: /\/kyc/, handler: this.handleKyc },
            // { command: /\/balance/, handler: this.handleBalance },
            // { command: /\/send/, handler: this.handleSend },
            // { command: /\/history/, handler: this.handleHistory },
            // { command: /\/help/, handler: this.handleHelp },
        ];

        commands.forEach(({ command, handler }) => {
            this.bot.onText(command, handler.bind(this));
        });
    }

    // Handle KYC command
    private async handleKyc(msg: TelegramBot.Message) {
        const {chat: {id: chatId}} = msg;

        if(!this.sessions.isAuthenticated(chatId)) {
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
            console.log('KYC status:', kycStatus);
            const isApproved = kycStatus.status.toLowerCase() === 'approved';
            console.log('Is approved:', isApproved);

            if(isApproved) {
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
                                    url:  'https://payout.copperx.io/app/kyc'
                                }],
                                [{
                                    text: '🔄 Check KYC Status Again',
                                    callback_data: 'check_kyc_status'
                                }]
                            ]
                        }
                    }
                );

                await this.bot.sendMessage(
                    chatId,
                    '⚠️ Your access is currently limited.' +
                    'Complete KYC verification to unlock all features.'
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
                `❌ Error: ${error.message
                || 'Failed to fetch KYC status. Please try again later.'}`
            );
        }
    }

    private async handleProfile(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        if(!this.sessions.isAuthenticated(chatId)) {
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
            console.log('Profile response:', profile);

            // cREATE profile message
            const profileMessage = this.BOT_MESSAGES.PROFILE_TEMPLATE
                .replace('%id%', profile.id || 'N/A')
                .replace('%email%', profile.email || 'Not provided')
                .replace('%status%', this.formatStatus(profile.status))
                .replace('%firstName%', profile.firstName || 'Not provided')
                .replace('%lastName%', profile.lastName || 'Not provided')
                .replace('%profileImage%', profile.profileImage || 'Not provided')
                .replace('%organizationId%', profile.organizationId || 'Not assigned')
                .replace('%role%', profile.role || 'Not assigned')
                .replace('%type%', profile.type || 'Not provided')
                .replace('%relayerAddress%', profile.relayerAddress || 'Not assigned')
                .replace('%flags%', profile.flags?.join(', ') || 'None')
                .replace('%walletAddress%', profile.walletAddress || 'Not set')
                .replace('%walletId%', profile.walletId || 'Not set')
                .replace('%walletAccountType%', profile.walletAccountType || 'Not set');
            
            await this.bot.deleteMessage(chatId, loadingMessage.message_id);
            await this.bot.sendMessage(chatId, profileMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: '🔄 Refresh Profile',
                            callback_data: 'refresh_profile'
                        }]
                    ]
                }
            });

                
        } catch (error: any) {
            console.error('Error in handleProfile:', error);
            await this.bot.sendMessage(
                chatId,
                `❌ Error: ${error.message
                || 'Failed to fetch profile. Please try again later.'}`
            );
        }
    }

    private formatStatus(status: string | undefined): string {
        if (!status) return '❓ Unknown';

        const statusMap: Record<string, string> = {
            'active': '✅ Active',
            'pending': '⏳ Pending',
            'suspended': '🚫 Suspended',
        };

        return statusMap[status.toLowerCase()] || `❓ ${status}`;
    }

    // Callback query handler for refresh profile button
    private setupCallbackHandlers() {
        this.bot.on('callback_query', async (callbackQuery) => {
            if (!callbackQuery.message) return;

            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;

            if(callbackQuery.data === 'check_kyc_status') {
                await this.bot.answerCallbackQuery(callbackQuery.id);
                await this.handleKyc(callbackQuery.message);
                return;
            }

            if (callbackQuery.data === 'refresh_profile') {
                // Acknwoledge the callback
                await this.bot.answerCallbackQuery(callbackQuery.id);
                try {
                    await this.bot.editMessageText(`🔄 Refresh Profile...`, {
                        chat_id: chatId,
                        message_id: messageId,
                    });

                    const profile = await this.api.getUserProfile();
                    // Update message with new profile data
                    const kycStatus = profile.status?.toUpperCase() || 'NOT SUBMITTED';

                    const profileMessage = this.BOT_MESSAGES.PROFILE_TEMPLATE
                        .replace('%id%', profile.id || 'N/A')
                        .replace('%email%', profile.email || 'Not provided')
                        .replace('%status%', this.formatStatus(profile.status))
                        .replace('%firstName%', profile.firstName || 'Not provided')
                        .replace('%lastName%', profile.lastName || 'Not provided')
                        .replace('%profileImage%', profile.profileImage || 'Not provided')
                        .replace('%organizationId%', profile.organizationId || 'Not assigned')
                        .replace('%role%', profile.role || 'Not assigned')
                        .replace('%type%', profile.type || 'Not provided')
                        .replace('%relayerAddress%', profile.relayerAddress || 'Not assigned')
                        .replace('%flags%', profile.flags?.join(', ') || 'None')
                        .replace('%walletAddress%', profile.walletAddress || 'Not set')
                        .replace('%walletId%', profile.walletId || 'Not set')
                        .replace('%walletAccountType%', profile.walletAccountType || 'Not set');
                    
                    await this.bot.editMessageText(profileMessage, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                            [{
                                text: '🔄 Refresh Profile',
                                callback_data: 'refresh_profile'
                                }]
                            ]
                        }
                    });

                } catch (error: any) {
                    console.error('Error in refresh profile:', error);
                    await this.bot.editMessageText(`❌ Error: ${error.message
                        || 'Failed to refresh profile. Please try again later.'}`, {
                        chat_id: chatId,
                        message_id: messageId,
                    });
                }
            }
        });
    }


    // Handle message handlers

    private setupMessageHandlers() {
        this.bot.on('message', async (msg) => {
            const { chat: { id: chatId }, text } = msg;

            if (!text || text.startsWith('/')) return;

            const currentState = this.sessions.getState(chatId);
            switch (currentState) {
                case 'WAITING_EMAIL':
                    await this.handleEmailInput(chatId, text);
                    break;
                case 'WAITING_OTP':
                    await this.handleOtpInput(chatId, text);
                    break;
                default:
                    await this.bot.sendMessage(
                        chatId,
                        'Invalid state. Please try again.'
                    );
                    break;
            }
        });
    }

    // Handle start command

    private async handleStart(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.WELCOME,
            { parse_mode: 'Markdown' }
        );
    }

    // Handle login command
    private async handleLogin(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        
        // Check if user is already logged in
        if (this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.ALREADY_LOGGED_IN
            );
            return;
        }

        await this.bot.sendMessage(chatId, this.BOT_MESSAGES.ENTER_EMAIL);
        // Set user state to waiting for email
        this.sessions.setState(chatId, 'WAITING_EMAIL');
    }

    private async handleLogout(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.NOT_LOGGED_IN
            );
            return;
        }
        this.sessions.clearSession(chatId);
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.LOGOUT_SUCCESS
        );
        }

    // Handle email input
    private async handleEmailInput(chatId: number, email: string) {
        if (!email.match(this.EMAIL_REGEX)) {
            await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.INVALID_EMAIL
            );
            return;
        }
        try {
            const response = await this.api.requestEmailOtp(email);

            this.sessions.setEmail(chatId, email);
            this.sessions.setState(chatId, 'WAITING_OTP');
            this.sessions.setSid(chatId, response.sid);

            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.ENTER_OTP);

        } catch (error: any) {
            console.error('Error in handleEmailInput:', error);
            await this.bot.sendMessage(
                chatId,
                `❌ Error: ${error.message
                || 'Failed to send OTP. Please try again later.'}`
            );
            this.sessions.setState(chatId, 'WAITING_EMAIL');
        }
    }

    // Handle OTP input

    private async handleOtpInput(chatId: number, otp: string) {
        if (otp.length !== 6) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.INVALID_OTP);
            return;
        }
        try {
            const [email, sid] = this.getSessionData(chatId);
            const authResponse = await this.api.verifyEmailOtp(email, otp, sid);

            this.updateSessinAfterLogin(chatId, authResponse);
            await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.LOGIN_SUCCESS
            );

        } catch (error: any) {
            console.error('OTP verification error:', error);
            await this.bot.sendMessage(
                chatId,
                `❌ Error: ${error.message || 'Failed to verify OTP. Please try again.'}`
            );
        }
    }

    // Get session data
    private getSessionData(chatId: number): [string, string] {
        const email = this.sessions.getEmail(chatId);
        const sid = this.sessions.getSid(chatId);

        if (!email || !sid) {
            throw new Error(this.BOT_MESSAGES.SESSION_EXPIRED);
        }
        return [email, sid];
    }

    // Update session after login
    private updateSessinAfterLogin(chatId: number,
        authResponse: CopperxAuthResponse) {
        
        this.sessions.setToken(chatId, authResponse.accessToken);
        this.sessions.setState(chatId, 'AUTHENTICATED');
        this.sessions.setOrganizationId(chatId, authResponse.user.organizationId);
        this.sessions.setUserId(chatId, authResponse.user.id);
    }

    // Handle balance command
    private async handleBalance(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
   
    }
   
    // private async handleBalance(msg: TelegramBot.Message) {
    //     const chatId = msg.chat.id;

    //     // Check if user is authenticated
    //     if (!this.sessions.isAuthenticated(chatId)) {
    //         await this.bot.sendMessage(chatId, 'Please login first using /login command.');
    //         return;
    //     }

    //     // Fetch balance from API
    //     const balance = await this.api.getBalance(this.sessions.getSession(chatId).token);

    //     await this.bot.sendMessage(chatId, `Your balance is: ${balance}`);
    // }

    // Add more handler methods...
} 
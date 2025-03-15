import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config';
import { CopperxApiService } from '../services/copperxApi';
import { SessionManager } from '../utils/sessionManager';

export class BotHandler {
    private bot: TelegramBot;
    private api: CopperxApiService;
    private sessions: SessionManager;
    private EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
        this.api = new CopperxApiService();
        this.sessions = new SessionManager();
        this.setupCommands();
        this.setupMessageHandlers();
    }

    private setupCommands() {
        // Start command
        this.bot.onText(/\/start/, this.handleStart.bind(this));

        // Login command
        this.bot.onText(/\/login/, this.handleLogin.bind(this));

        // Logout command
        this.bot.onText(/\/logout/, this.handleLogout.bind(this));


        // Balance command
        // this.bot.onText(/\/balance/, this.handleBalance.bind(this));

        // Send command
        // this.bot.onText(/\/send/, this.handleSend.bind(this));

        // History command
        // this.bot.onText(/\/history/, this.handleHistory.bind(this));

        // Help command
        // this.bot.onText(/\/help/, this.handleHelp.bind(this));
    }

    private setupMessageHandlers() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;

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
                    await this.bot.sendMessage(chatId, 'Invalid state. Please try again.');
                    break;
            }
        });
    }

    private async handleStart(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
        const message = `
                Welcome to Copperx Payout Bot! 🚀

                Here are the available commands:
                /login - Login to your Copperx account
                /balance - Check your wallet balances
                /send - Send funds
                /history - View your transaction history
                /help - Show this help message

                Need support? Visit https://t.me/copperxcommunity/2183`
            .replace(/                /g, '');

        await this.bot.sendMessage(
            chatId,
            message,
            { parse_mode: 'Markdown' }
        );
    }

    private async handleLogin(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
        // Check if user is already logged in
        if (this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                'You are already logged in!\n\n ' +
                'Use /logout to logout from your Copperx account.'
            );
            return;
        }

        await this.bot.sendMessage(
            chatId, '📧 Please enter your Copperx email address:'
        );

        // Set user state to waiting for email
        this.sessions.setState(chatId, 'WAITING_EMAIL');
    }

    private async handleEmailInput(chatId: number, email: string) {
        if (!email.match(this.EMAIL_REGEX)) {
            await this.bot.sendMessage(
                chatId, '❌ Invalid email address. Please enter a valid email.'
            );
            return;
        }
        try {
            const response = await this.api.requestEmailOtp(email);
            this.sessions.setEmail(chatId, email);
            this.sessions.setState(chatId, 'WAITING_OTP');

            // store the sid in the session
            this.sessions.setSid(chatId, response.sid);

            await this.bot.sendMessage(
                chatId,
                '✉️ We\'ve sent an OTP to your email.\n\n' +
                'Please enter the 6-digit code:'
            );
        } catch (error: any) {
            console.error('Error in handleEmailInput:', error.message);
            await this.bot.sendMessage(
                chatId,
                `❌ Error: ${error.message
                || 'Failed to send OTP. Please try again later.'}`
            );
            this.sessions.setState(chatId, 'WAITING_EMAIL');
        }
    }

    private async handleOtpInput(chatId: number, otp: string) {
        if (otp.length !== 6) {
            await this.bot.sendMessage(
                chatId, '❌ Invalid OTP. Please enter a valid 6-digit code.'
            );
            return;
        }
        try {
            const email = this.sessions.getEmail(chatId);
            const sid = this.sessions.getSid(chatId);

            if (!email || !sid) {
                throw new Error('Session expired. Please start over with /login');
            }

            const authResponse = await this.api.verifyEmailOtp(email, otp, sid);

            this.sessions.setToken(chatId, authResponse.accessToken);
            this.sessions.setState(chatId, 'AUTHENTICATED');
            this.sessions.setOrganizationId(chatId, authResponse.user.organizationId);

            await this.bot.sendMessage(
                chatId,
                '✅ Login successful!\n\n' +
                'You can now: \n' +
                '- Use /balance to check your wallet balance.\n' +
                '- Use /send to send funds.\n' +
                '- Use /history to view your transaction history.\n' +
                '- Use /logout to logout from your account.'
            );

        } catch (error: any) {
            console.error('OTP verification error:', error);

            await this.bot.sendMessage(
                chatId,
                `❌ Error: ${error.message || 'Failed to verify OTP. Please try again.'}`
            );
        }
    }

    private async handleLogout(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;

        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(
                chatId,
                'You are not logged in. Please use /login to login.'
            );
            return;
        }
        this.sessions.clearSession(chatId);
        await this.bot.sendMessage(chatId,
            '👋 Logged out successfully!\n\n' +
            'Use /login to login again.'
        );
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
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotHandler = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const config_1 = require("../config/config");
const copperxApi_1 = require("../services/copperxApi");
const sessionManager_1 = require("../utils/sessionManager");
class BotHandler {
    constructor() {
        this.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.BOT_MESSAGES = {
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
organizationId: \`%organizationId%\`
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
        };
        this.bot = new node_telegram_bot_api_1.default(config_1.config.telegram.botToken, {
            polling: {
                interval: 3000,
                autoStart: true,
            }
        });
        this.api = new copperxApi_1.CopperxApiService();
        this.sessions = new sessionManager_1.SessionManager();
        this.setupCommands();
        this.setupMessageHandlers();
        this.setupCallbackHandlers();
    }
    setupCommands() {
        const commands = [
            { command: /\/start/, handler: this.handleStart },
            { command: /\/login/, handler: this.handleLogin },
            { command: /\/logout/, handler: this.handleLogout },
            { command: /\/profile/, handler: this.handleProfile },
            // { command: /\/balance/, handler: this.handleBalance },
            // { command: /\/send/, handler: this.handleSend },
            // { command: /\/history/, handler: this.handleHistory },
            // { command: /\/help/, handler: this.handleHelp },
        ];
        commands.forEach(({ command, handler }) => {
            this.bot.onText(command, handler.bind(this));
        });
    }
    async handleProfile(msg) {
        const { chat: { id: chatId } } = msg;
        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.PROFILE_NOT_AUTHENTICATED);
            return;
        }
        try {
            const loadingMessage = await this.bot.sendMessage(chatId, ' 🔄 Fetching your profile...');
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
        }
        catch (error) {
            console.error('Error in handleProfile:', error);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message
                || 'Failed to fetch profile. Please try again later.'}`);
        }
    }
    formatStatus(status) {
        if (!status)
            return '❓ Unknown';
        const statusMap = {
            'active': '✅ Active',
            'pending': '⏳ Pending',
            'suspended': '🚫 Suspended',
        };
        return statusMap[status.toLowerCase()] || `❓ ${status}`;
    }
    // Callback query handler for refresh profile button
    setupCallbackHandlers() {
        this.bot.on('callback_query', async (callbackQuery) => {
            if (!callbackQuery.message)
                return;
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
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
                    const statusEmoji = {
                        'APPROVED': '✅',
                        'PENDING': '⏳',
                        'REJECTED': '❌',
                        'NOT SUBMITTED': '📝'
                    }[kycStatus] || '❓';
                    const profileMessage = this.BOT_MESSAGES.PROFILE_TEMPLATE
                        .replace('%id%', profile.id || 'N/A')
                        .replace('%email%', profile.email || 'Not provided')
                        .replace('%status%', statusEmoji + ' ' + profile.status)
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
                    console.log("Status: ", statusEmoji);
                    console.log("Organization ID: ", profile.organizationId);
                    console.log("Role: ", profile.role);
                    console.log("Type: ", profile.type);
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
                }
                catch (error) {
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
    setupMessageHandlers() {
        this.bot.on('message', async (msg) => {
            const { chat: { id: chatId }, text } = msg;
            if (!text || text.startsWith('/'))
                return;
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
    async handleStart(msg) {
        const { chat: { id: chatId } } = msg;
        await this.bot.sendMessage(chatId, this.BOT_MESSAGES.WELCOME, { parse_mode: 'Markdown' });
    }
    async handleLogin(msg) {
        const { chat: { id: chatId } } = msg;
        // Check if user is already logged in
        if (this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.ALREADY_LOGGED_IN);
            return;
        }
        await this.bot.sendMessage(chatId, this.BOT_MESSAGES.ENTER_EMAIL);
        // Set user state to waiting for email
        this.sessions.setState(chatId, 'WAITING_EMAIL');
    }
    async handleLogout(msg) {
        const { chat: { id: chatId } } = msg;
        if (!this.sessions.isAuthenticated(chatId)) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.NOT_LOGGED_IN);
            return;
        }
        this.sessions.clearSession(chatId);
        await this.bot.sendMessage(chatId, this.BOT_MESSAGES.LOGOUT_SUCCESS);
    }
    async handleEmailInput(chatId, email) {
        if (!email.match(this.EMAIL_REGEX)) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.INVALID_EMAIL);
            return;
        }
        try {
            const response = await this.api.requestEmailOtp(email);
            this.sessions.setEmail(chatId, email);
            this.sessions.setState(chatId, 'WAITING_OTP');
            this.sessions.setSid(chatId, response.sid);
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.ENTER_OTP);
        }
        catch (error) {
            console.error('Error in handleEmailInput:', error);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message
                || 'Failed to send OTP. Please try again later.'}`);
            this.sessions.setState(chatId, 'WAITING_EMAIL');
        }
    }
    async handleOtpInput(chatId, otp) {
        if (otp.length !== 6) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.INVALID_OTP);
            return;
        }
        try {
            const [email, sid] = this.getSessionData(chatId);
            const authResponse = await this.api.verifyEmailOtp(email, otp, sid);
            this.updateSessinAfterLogin(chatId, authResponse);
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.LOGIN_SUCCESS);
        }
        catch (error) {
            console.error('OTP verification error:', error);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message || 'Failed to verify OTP. Please try again.'}`);
        }
    }
    getSessionData(chatId) {
        const email = this.sessions.getEmail(chatId);
        const sid = this.sessions.getSid(chatId);
        if (!email || !sid) {
            throw new Error(this.BOT_MESSAGES.SESSION_EXPIRED);
        }
        return [email, sid];
    }
    updateSessinAfterLogin(chatId, authResponse) {
        this.sessions.setToken(chatId, authResponse.accessToken);
        this.sessions.setState(chatId, 'AUTHENTICATED');
        this.sessions.setOrganizationId(chatId, authResponse.user.organizationId);
    }
    async handleBalance(msg) {
        const chatId = msg.chat.id;
    }
}
exports.BotHandler = BotHandler;
//# sourceMappingURL=botHandler.js.map
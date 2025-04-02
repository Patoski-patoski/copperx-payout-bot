// src/handlers/authHandler.ts

import TelegramBot from 'node-telegram-bot-api';
import { BaseHandler } from './baseHandler';
import { CopperxAuthResponse } from '@/types/copperx';
import {
    keyboard,
    offlineKeyBoardAndBack,
    clearErrorMessage
} from '../utils/copperxUtils';

export class AuthHandler extends BaseHandler {
    async handleLogin(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        // Check if user is already logged in
        if (this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.ALREADY_LOGGED_IN,
                {
                    parse_mode: 'Markdown',
                    reply_markup: offlineKeyBoardAndBack('📤 Logout', 'logout')
                }
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id, 5000);
            return;
        }

        const keyboard = [[{ text: 'Back', callback_data: 'start' }]]
        
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.ENTER_EMAIL, {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Enter your Email: ',
                },
            }
        );
        // Set user state to waiting for email
        this.sessions.setState(chatId, 'WAITING_EMAIL');
    }

    async handleLogout(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;

        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.NOT_LOGGED_IN,
                {
                    parse_mode: 'Markdown',
                    reply_markup: offlineKeyBoardAndBack('🔓Login', 'login')
                }
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
            return;
        }
        this.sessions.clearSession(chatId);
        await this.bot.sendMessage(
            chatId,
            this.BOT_MESSAGES.LOGOUT_SUCCESS
        );
    }

    async handleExit(msg: TelegramBot.Message) {
        const { chat: { id: chatId } } = msg;
        if (!this.sessions.isAuthenticated(chatId)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.NOT_LOGGED_IN
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
            return;
        }
        this.sessions.clearSession(chatId);
        await this.bot.deleteMessage(chatId, msg.message_id);
        await this.bot.sendMessage(chatId, this.BOT_MESSAGES.EXIT);
    }

    // Handle email input
    async handleEmailInput(chatId: number, email: string) {
        if (!email.match(this.EMAIL_REGEX)) {
            const errorMessage = await this.bot.sendMessage(
                chatId,
                this.BOT_MESSAGES.INVALID_EMAIL
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id, 5000);
            return;
        }
        try {
            const response = await this.api.requestEmailOtp(email); 
            this.sessions.setEmail(chatId, email);
            this.sessions.setState(chatId, 'WAITING_OTP');
            this.sessions.setSid(chatId, response.sid);

            await this.bot.sendMessage(
                chatId,
                `✉️ We\'ve sent an OTP to your email.\n\nPlease enter the 6-digit code:`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        force_reply: true,
                        input_field_placeholder: 'Enter OTP: ',
                    }
                }
            );
            // Wait 50 seconds before showing "Send OTP again" button
            setTimeout(async () => {
            const otpMessage =  await this.bot.sendMessage(
                    chatId,
                    "Didn't receive OTP??",
                    { reply_markup: offlineKeyBoardAndBack("↪ Send OTP again", "sendotp")}
                );
                clearErrorMessage(this.bot, chatId, otpMessage.message_id, 5000);
            }, 25000);
            return;

        } catch (error: any) {
            console.error('Error in handleEmailInput:', error);
            const errorMessage = await this.bot.sendMessage(
                chatId,
                `OOps.. Failed to send OTP. Please enter your email again:.`
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
            this.sessions.setState(chatId, 'WAITING_EMAIL');
        }
    }

    // Handle OTP input
    async handleOtpInput(chatId: number, otp: string) {
        if (otp.length !== 6) {
            await this.bot.sendMessage(chatId, this.BOT_MESSAGES.INVALID_OTP);
            return;
        }
        try {
            const [email, sid] = this.getSessionData(chatId);
            const authResponse = await this.api.verifyEmailOtp(email, otp, sid);
            if (!authResponse) {
                const errorMessage = await this.bot.sendMessage(
                    chatId,
                    this.BOT_MESSAGES.INVALID_OTP
                );
                clearErrorMessage(this.bot, chatId, errorMessage.message_id);
                return;
            }

            this.updateSessionAfterLogin(chatId, authResponse);
            await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.LOGIN_SUCCESS
            );

            await this.bot.sendMessage(chatId,
                this.BOT_MESSAGES.COMMANDS_MESSAGE,
                {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                }
            );

        } catch (error: any) {
            console.error('OTP verification error:', error);
            const errorMessage = await this.bot.sendMessage(
                chatId,
                `Opps.. ${error.message} ` +
                `Please check OTP and try again.`
            );
            clearErrorMessage(this.bot, chatId, errorMessage.message_id);
        }
    }

    // Get session data
    getSessionData(chatId: number): [string, string] {
        const email = this.sessions.getEmail(chatId);
        const sid = this.sessions.getSid(chatId);

        if (!email || !sid) {
            throw new Error(this.BOT_MESSAGES.SESSION_EXPIRED);
        }
        return [email, sid];
    }

    // Update session after login
    updateSessionAfterLogin(chatId: number,
        authResponse: CopperxAuthResponse) {

        this.sessions.setToken(chatId, authResponse.accessToken);
        this.sessions.setState(chatId, 'AUTHENTICATED');
        this.sessions.setOrganizationId(chatId, authResponse.user.organizationId);
        this.sessions.setUserId(chatId, authResponse.user.id);
    }
} 
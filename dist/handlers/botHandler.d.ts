export declare class BotHandler {
    private readonly bot;
    private readonly api;
    private readonly sessions;
    private readonly EMAIL_REGEX;
    private readonly BOT_MESSAGES;
    constructor();
    private setupCommands;
    private handleProfile;
    private formatStatus;
    private setupCallbackHandlers;
    private setupMessageHandlers;
    private handleStart;
    private handleLogin;
    private handleLogout;
    private handleEmailInput;
    private handleOtpInput;
    private getSessionData;
    private updateSessinAfterLogin;
    private handleBalance;
}

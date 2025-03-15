export declare class BotHandler {
    private bot;
    private api;
    private sessions;
    private EMAIL_REGEX;
    constructor();
    private setupCommands;
    private setupMessageHandlers;
    private handleStart;
    private handleLogin;
    private handleEmailInput;
    private handleOtpInput;
    private handleLogout;
}

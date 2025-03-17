export declare class SessionManager {
    private sessions;
    constructor();
    setState(chatId: number, state: string): void;
    getState(chatId: number): string | null;
    setEmail(chatId: number, email: string): void;
    getEmail(chatId: number): string | null;
    setSid(chatId: number, sid: string): void;
    getSid(chatId: number): string | null;
    setToken(chatId: number, token: string): void;
    getToken(chatId: number): string | null;
    isAuthenticated(chatId: number): boolean;
    setOrganizationId(chatId: number, organizationId: string): void;
    getOrganizationId(chatId: number): string | null;
    setUserId(chatId: number, userId: string): void;
    getUserId(chatId: number): string | null;
    clearSession(chatId: number): void;
}

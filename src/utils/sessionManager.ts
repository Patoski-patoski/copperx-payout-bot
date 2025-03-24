// src/utils/sessionManager.ts

interface UserSession {
    chatId: number;
    state: string;
    email?: string;
    sid?: string;
    token?: string;
    organizationId?: string;
    userId?: string;
    transferData?: {
        type?: 'email' | 'walletAddress';
        email?: string;
        amount?: string;
        purposeCode?: string;
        currency?: string;
        note?: string;
        walletAddress?: string;
    }
}

export class SessionManager {
    private sessions: Map<number, UserSession>;

    constructor() {
        this.sessions = new Map();
    }

    // set the state of the session
    setState(chatId: number, state: string) {
        const session = this.sessions.get(chatId) || { chatId, state };
        session.state = state;
        this.sessions.set(chatId, session);
    }

    // get the state of the session
    getState(chatId: number): string | null {
        return this.sessions.get(chatId)?.state || null;
    }

    // set the email of the session
    setEmail(chatId: number, email: string) { 
        const session = this.sessions.get(chatId) || { chatId, state: 'WAITING_OTP' };
        session.email = email;
        this.sessions.set(chatId, session);
    }

    // get the email of the session
    getEmail(chatId: number): string | null {
        return this.sessions.get(chatId)?.email || null;
    }

    // set the sid of the session
    setSid(chatId: number, sid: string) {
        const session = this.sessions.get(chatId) || { chatId, state: 'WAITING_OTP' };
        session.sid = sid;
        this.sessions.set(chatId, session);
    }

    // get the sid of the session
    getSid(chatId: number): string | null {
        return this.sessions.get(chatId)?.sid || null;
    }

    setToken(chatId: number, token: string) {
        const session = this.sessions.get(chatId) || { chatId, state: 'AUTHENTICATED' };
        session.token = token;
        this.sessions.set(chatId, session);
    }

    // get the token of the session
    getToken(chatId: number): string | null {
        return this.sessions.get(chatId)?.token || null;
    }

    // check if the user is authenticated
    isAuthenticated(chatId: number): boolean {
        const session = this.sessions.get(chatId);
        return !!session?.token;
    }

    // set the organization id of the session
    setOrganizationId(chatId: number, organizationId: string) {
        const session = this.sessions.get(chatId);
        if (session) {
            session.organizationId = organizationId;
            this.sessions.set(chatId, session);
        }
    }

    // get the organization id of the session
    getOrganizationId(chatId: number): string | null {
        return this.sessions.get(chatId)?.organizationId || null;
    }

    // set the user id of the session
    setUserId(chatId: number, userId: string) {
        const session = this.sessions.get(chatId)
            || { chatId, state: 'AUTHENTICATED' };
        if (session) {
            session.userId = userId;
            this.sessions.set(chatId, session);
        }
    }

    // get the user id of the session
    getUserId(chatId: number): string | null {
        return this.sessions.get(chatId)?.userId || null;
    }

    setTransferType(chatId: number, type: 'email' | 'walletAddress') {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
                session.transferData = {};
            }
            session.transferData.type = type;
            this.sessions.set(chatId, session);
        }
    }
    clearTransferState(chatId: number): void {
        const session = this.sessions.get(chatId);
        if (session) {
            session.transferData = {};
            this.sessions.set(chatId, session);
        }
    }
    getTransferType(chatId: number): 'email' | 'walletAddress' {
        return this.sessions.get(chatId)?.transferData?.type as 'email' | 'walletAddress';
    }

    setTransferWallet(chatId: number, walletAddress: string) {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
                session.transferData = {};
            }
            session.transferData.walletAddress = walletAddress;
            this.sessions.set(chatId, session);
        }
    }

    clearTransferData(chatId: number): void {
        const session = this.sessions.get(chatId);
        if (session) {
            session.transferData = {};
            this.sessions.set(chatId, session);
        }
    }

    setTransferEmail(chatId: number, email: string): void {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
                session.transferData = {};
            }
            session.transferData.email = email;
            this.sessions.set(chatId, session);
        }
    }

    setTransferAmount(chatId: number, amount: string): void {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
                session.transferData = {};
            }
            session.transferData.amount = amount;
            this.sessions.set(chatId, session);
        }
    }

    setTransferCurrency(chatId: number, currency: string): void {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
                session.transferData = {};
            }
            session.transferData.currency = currency;
            this.sessions.set(chatId, session);
        }
    }

    setTransferPurpose(chatId: number, purpose: string): void {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
            session.transferData = {};
            }
            session.transferData.purposeCode = purpose;
            this.sessions.set(chatId, session);
        }
    }

    setTransferNote(chatId: number, note: string): void {
        const session = this.sessions.get(chatId);
        if (session) {
            if (!session.transferData) {
                session.transferData = {};
            }
            session.transferData.note = note;
            this.sessions.set(chatId, session);
        }
    }

    getTransferData(chatId: number): any {
        const session = this.sessions.get(chatId);
        
        return session?.transferData || {};
    }
   
    // clear the session
    clearSession(chatId: number) {
        this.sessions.delete(chatId);
    }
} 
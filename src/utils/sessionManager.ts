// src/utils/sessionManager.ts

import { BulkTransferRequest, TransferType } from "@/types/copperx";

interface BankAccountInfo {
    id: string;
    country: string;
    bankName: string;
    accountNumber: string;
    beneficiaryName: string;
}

interface BulkTransferSession {
    currentRecipient?: {
        type: 'email' | 'wallet';
        value: string;
    };
    currentAmount?: string;
    requests: BulkTransferRequest[];
}

interface UserSession {
    chatId: number;
    state: string;
    email?: string;
    sid?: string;
    token?: string;
    organizationId?: string;
    userId?: string;
    transferData?: {
        type?: TransferType;
        email?: string;
        amount?: string;
        purposeCode?: string;
        currency?: string;
        note?: string;
        walletAddress?: string;
    },
    withdrawalData?: {
        amount?: string;
        purposeCode?: string;
        currency?: string;
        note?: string;
        walletAddress?: string;
        quote?: {
            quotePayload?: string;
            quoteSignature?: string;
        },
        preferredBankAccountId?: string;
    },
    bulkTransfer?: BulkTransferSession;
    historyPageSize?: number;
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

    setTransferType(chatId: number, type: TransferType) {
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
    getTransferType(chatId: number): TransferType {
        return this.sessions.get(chatId)?.transferData?.type as TransferType;
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

    setWithdrawalAmount(chatId: number, amount: string): void {
        this.ensureWithdrawalData(chatId);
        const session = this.sessions.get(chatId);
        if (session && session.withdrawalData) {
            session.withdrawalData.amount = amount;
            this.sessions.set(chatId, session);
        }
    }

    getWithdrawalAmount(chatId: number): string | undefined {
        return this.sessions.get(chatId)?.withdrawalData?.amount;
    }

    setWithdrawalQuote(chatId: number, quote: any) {
        this.ensureWithdrawalData(chatId);
        const session = this.sessions.get(chatId);
        if (session && session.withdrawalData) {
            session.withdrawalData.quote = quote;
            this.sessions.set(chatId, session);
        }
    }

    getWithdrawalQuote(chatId: number) {
        return this.sessions.get(chatId)?.withdrawalData?.quote;
    }

    clearWithdrawalData(chatId: number) {
        const session = this.sessions.get(chatId);
        if (session) {
            session.withdrawalData = undefined;
            this.sessions.set(chatId, session);
        }
    }

    setWithdrawalBankAccount(chatId: number, bankAccount: BankAccountInfo) {
        this.ensureWithdrawalData(chatId);
        const session = this.sessions.get(chatId);
        if (session && session.withdrawalData) {
            session.withdrawalData.preferredBankAccountId = bankAccount.id;
            this.sessions.set(chatId, session);
        }
    }
    getWithdrawalBankAccount(chatId: number): BankAccountInfo | undefined {
        const bankAccountId = this.sessions.get(chatId)?.withdrawalData?.preferredBankAccountId;
        if (!bankAccountId) return undefined;
        
        // Find and return the bank account info based on the ID
        // This assumes you have a method to retrieve the full BankAccountInfo object
        // You might need to adjust this implementation based on your actual data structure
        return { id: bankAccountId } as BankAccountInfo;
    }


    setPreferredBankAccountId(chatId: number, bankAccountId: string) {
        this.ensureWithdrawalData(chatId);
        const session = this.sessions.get(chatId);
        if (session && session.withdrawalData) {
            session.withdrawalData.preferredBankAccountId = bankAccountId;
            this.sessions.set(chatId, session);
        }
    }

    getPreferredBankAccountId(chatId: number): string | undefined {
        return this.sessions.get(chatId)?.withdrawalData?.preferredBankAccountId;
    }

    private ensureWithdrawalData(chatId: number) {
        if (!this.sessions.get(chatId)) {
            this.sessions.set(chatId, { chatId } as UserSession);
        }
        const session = this.sessions.get(chatId);
        if (session && !session.withdrawalData) {
            session.withdrawalData = {};
            this.sessions.set(chatId, session);
        }
    }

    initBulkTransfer(chatId: number) {
        if (!this.sessions.get(chatId)) {
            this.sessions.set(chatId, { chatId } as UserSession);
        }
        const session = this.sessions.get(chatId);
        if (session) {
            session.bulkTransfer = {
                requests: []
            };
            this.sessions.set(chatId, session);
        }
    }

    setBulkRecipient(chatId: number, recipient: { type: 'email' | 'wallet', value: string }) {
        if (!this.sessions.get(chatId)?.bulkTransfer) {
            this.initBulkTransfer(chatId);
        }
        const session = this.sessions.get(chatId);
        if (session) {
            session.bulkTransfer!.currentRecipient = recipient;
            this.sessions.set(chatId, session);
        }
    }

    getCurrentBulkRecipient(chatId: number) {
        return this.sessions.get(chatId)?.bulkTransfer?.currentRecipient;
    }

    setBulkAmount(chatId: number, amount: string) { 
        if (!this.sessions.get(chatId)?.bulkTransfer) {
            this.initBulkTransfer(chatId);
        }
        const session = this.sessions.get(chatId);
        if (session) {
            session.bulkTransfer!.currentAmount = amount;
            this.sessions.set(chatId, session);
        }
    }

    getBulkAmount(chatId: number) {
        return this.sessions.get(chatId)?.bulkTransfer?.currentAmount;
    }

    addBulkTransferRequest(chatId: number, request: BulkTransferRequest) {
        if (!this.sessions.get(chatId)?.bulkTransfer) {
            this.initBulkTransfer(chatId);
        }
        const session = this.sessions.get(chatId);
        if (session) {
            session.bulkTransfer!.requests.push(request);
            // Clear current recipient data
            session.bulkTransfer!.currentRecipient = undefined;
            session.bulkTransfer!.currentAmount = undefined;
            this.sessions.set(chatId, session);
        }
    }

    getBulkTransferRequests(chatId: number): BulkTransferRequest[] {
        return this.sessions.get(chatId)?.bulkTransfer?.requests || [];
    }

    clearBulkTransferData(chatId: number) {
        const session = this.sessions.get(chatId);
        if (session) {
            session.bulkTransfer = undefined;
            this.sessions.set(chatId, session);
        }
    }

    setHistoryPageSize(chatId: number, pageSize: number) {
        const session = this.sessions.get(chatId);
        if (session) {
            session.historyPageSize = pageSize;
            this.sessions.set(chatId, session);
        }
    }

    getHistoryPageSize(chatId: number): number | undefined {
        return this.sessions.get(chatId)?.historyPageSize;
    }
    // clear the session
    clearSession(chatId: number) {
        this.sessions.delete(chatId);
    }
} 
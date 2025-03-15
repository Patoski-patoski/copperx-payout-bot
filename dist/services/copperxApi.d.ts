import { CopperxAuthResponse, CopperxUser, CopperxWallet, CopperxTransaction } from '../types/copperx';
import { EmailOtpResponse } from '../types/index';
export declare class CopperxApiService {
    private api;
    private token;
    private sessionId;
    constructor();
    setToken(token: string): void;
    setSessionId(sessionId: string): void;
    requestEmailOtp(email: string): Promise<EmailOtpResponse>;
    verifyEmailOtp(email: string, otp: string, sid: string): Promise<CopperxAuthResponse>;
    getUserProfile(): Promise<CopperxUser>;
    getWallets(): Promise<CopperxWallet[]>;
    getWalletBalances(): Promise<CopperxWallet[]>;
    setDefaultWallet(walletId: string): Promise<{
        success: boolean;
    }>;
    getTransactions(page?: number, limit?: number): Promise<CopperxTransaction[]>;
    sendFunds(params: {
        recipient: string;
        amount: string;
        currency: string;
        type: 'email' | 'wallet';
    }): Promise<{
        success: boolean;
        transactionId: string;
    }>;
}

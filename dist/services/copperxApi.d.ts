import { CopperxAuthResponse, CopperxUser, CopperxWallet, CopperxTransaction } from '../types/copperx';
import { EmailOtpResponse } from '../types/index';
export declare class CopperxApiService {
    private api;
    private token;
    private readonly MAX_RETRIES;
    private readonly RETRY_DELAY;
    constructor();
    private retry;
    private isRetryableError;
    private setToken;
    requestEmailOtp(email: string): Promise<EmailOtpResponse>;
    private formatError;
    verifyEmailOtp(email: string, otp: string, sid: string): Promise<CopperxAuthResponse>;
    getUserProfile(): Promise<CopperxUser>;
    getKycStatus(): Promise<any>;
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

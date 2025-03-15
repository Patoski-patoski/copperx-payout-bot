export interface CopperxAuthResponse {
    scheme: string;
    accessToken: string;
    accessTokenId: string;
    expireAt: string;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        status: string;
        role: string;
        relayerAddress: string;
        organizationId: string;
        walletAddress: string;
        walletAccountType: string;
        walletId: string;
        flags: string[];
    };
}
export interface CopperxUser {
    id: string;
    email: string;
    organizationId: string;
    kycStatus: 'pending' | 'approved' | 'rejected';
}
export interface CopperxWallet {
    id: string;
    address: string;
    network: string;
    isDefault: boolean;
    balance: string;
    currency: string;
}
export interface CopperxTransaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'transfer';
    amount: string;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    timestamp: string;
    fromAddress?: string;
    toAddress?: string;
    network: string;
}
export interface CopperxApiError {
    message: {};
    statusCode: number;
    error?: string;
}
export interface PusherDepositEvent {
    amount: string;
    currency: string;
    network: string;
    timestamp: string;
    transactionId: string;
}

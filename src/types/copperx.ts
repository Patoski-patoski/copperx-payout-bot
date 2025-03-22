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
        status: 'pending' | 'approved' | 'suspended';
        type: 'individual' | 'business';
        role: 'owner' | 'user' | 'admin' | 'member';
        relayerAddress: string;
        organizationId: string;
        walletAddress: string;
        walletAccountType: string;
        walletId: string;
        flags: string[];
    };
}

export interface CopperxUser {
    id: string | null;
    status: 'pending' | 'active' | 'suspended';
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImage: string | null;
    organizationId: string | null;
    role: 'owner' | 'user' | 'admin' | 'member';
    type: 'individual' | 'business';
    relayerAddress: string,
    flags: string[],
    walletAddress: string,
    walletId: string,
    walletAccountType: string
}

export interface CopperxWallet {
    id: string,
    createdAt: string,
    updatedAt: string,
    organizationId: string,
    walletType: string,
    network: string,
    walletAddress: string,
    isDefault: boolean
}

export interface CopperxWalletBalance {
    walletId: string,
    isDefault: boolean,
    network: string,
    balances: [
        {
            symbol: string,
            balance: string,
            decimals: number,
            address: string
        }
    ],
}

export interface CopperxWalletDefault {
    walletId: string
}


export interface CopperxApiError {
    message: Record<string, any> | string;
    statusCode: number;
    error?: string;
}

// export interface KycStatus {
//     id: string;
//     createdAt: string;
//     updatedAt: string;
//     providerCode: 0x0 | 0x1 | 0x2 | 0x11 | 0x21 | 0x22 | 0x31 | 0x41 | 0x23 |
//     0x24 | 0xffff;
//     organizationId: string;
//     status: 'pending' | 'approved' | 'rejected' | 'initiated' | 'inprogress' |
//     'review_pending' | 'review' | 'provider_manual_review' | 'manual_review' |
//     'provider_on_hold' | 'on_hold' | 'expired';
//     type: 'individual' | 'business';
//     country: string;
//     kycDetailId: string;
//     kybDetailId: string;
//     statusUpdates: Record<string, any>[];
//     kycDetail: Record<string, any>;
//     kybDetail: Record<string, any>;
// }

// export interface KycResponse {
//     data: KycStatus;
// }


export interface EmailTransferRequest {
    walletAddress?: string;
    email?: string;
    payeeId?: string;
    amount: string;
    purposeCode: string;
    currency: string;
    note?: string;
}

export interface WalletWithdrawalRequest {
    walletAddress: string;
    amount: string;
    purposeCode: string;
    currency: string;
}

export interface BankWithdrawalRequest {
    amount: string;
    asset: string;
    bankAccountId: string;
    memo?: string;
}

export interface BulkTransferRequest {
    asset: string;
    transfers: {
        recipientEmail: string;
        amount: string;
        memo?: string;
    }[];
}

export interface TransferResponse {
    id: string;
    status: string;
    amount: string;
    asset: string;
    fee: string;
    network?: string;
    recipientEmail?: string;
    recipientAddress?: string;
    txHash?: string;
    createdAt: string;
}

export interface TransferFeeResponse {
    amount: string;
    fee: string;
    total: string;
    asset: string;
}

export interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    isDefault: boolean;
}


export interface PusherDepositEvent {
    amount: string;
    currency: string;
    network: string;
    timestamp: string;
    transactionId: string;
} 
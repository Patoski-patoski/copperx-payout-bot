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



export interface BaseTransferRequest {
    amount: string;
    purposeCode: string;
    currency: string;
    note?: string;
}

// api/transfers/send
export interface EmailTransferRequest extends BaseTransferRequest {
    walletAddress?: string;
    email?: string;
    payeeId?: string;
}

export type TransferType = 'email' | 'wallet';

// api/transfers/wallet-withdraw
export interface WalletWithdrawalRequest extends BaseTransferRequest {
    walletAddress: string;
}

// api/quotes/offramp
export interface OffRampQuoteRequest{
    sourceCountry: string;
    destinationCountry: string;
    amount: string;
    currency: string;
    onlyRemittance: boolean;
    preferredBankAccountId?: string;
    // Optional fields
    preferredDestinationPaymentMethods?: string[];
    preferredProviderId?: string;
    thirdPartyPayment?: boolean;
    destinationCurrency?: string;
    payeeId?: string;

}

// api/transfers/offramp
export interface BankWithdrawalRequest {
    purposeCode: string;
    quotePayload: string;
    quoteSignature: string;
    preferredWalletId: string;
    // Optional fields
    invoiceNumber?: string;
    note?: string;
    invoiceUrl?: string;
    sourceOfFundsFile?: string;
    recipientRelationship?: string;
    customerData?: {
        name?: string;
        businessName?: string;
        email?: string;
        country?: string;
    };
}
export interface BankAccountDetails {
    bankName: string;
    bankAddress: string;
    method: string;
    bankAccountType: string;
    bankRoutingNumber: string;
    bankAccountNumber: string;
    bankBeneficiaryName: string;
    swiftCode: string;
}

export interface AccountKyc {
    id: string;
    status: string;
    supportRemittance: boolean;
    providerCode: string;
}

export interface CopperxAccount {
    id: string;
    type: string;
    walletAccountType: string;
    method: string;
    country: string;
    network: string;
    walletAddress: string;
    isDefault: boolean;
    bankAccount: BankAccountDetails;
    accountKycs: AccountKyc[];
    status: string;
}

export interface AccountsResponse {
    data: CopperxAccount[];
}

export interface BulkTransferRequest {
    requestId: string,
    request: {
        walletAddress: string,
        email: string,
        amount: string,
        payeeId: string,
        purposeCode: string,
        currency: string
    }
}


export interface BulkTransferPayload {
    requests: BulkTransferRequest[];
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
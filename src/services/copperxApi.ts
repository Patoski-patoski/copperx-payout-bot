// src/services/copperxApi

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import {
  CopperxAuthResponse,
  CopperxUser,
  CopperxWallet,
  CopperxApiError,
  CopperxWalletBalance,
  EmailTransferRequest,
  WalletWithdrawalRequest,
  OffRampQuoteRequest,
  BankWithdrawalRequest,
  CopperxAccount,
  AccountsResponse,
  BulkTransferPayload,
} from '../types/copperx';

import {
  EmailOtpResponse,
} from '../types/index';

export class CopperxApiService {
  private api: AxiosInstance;
  private token: string | null = null;  
  private readonly MAX_RETRIES = 3;
  private readonly RATE_LIMIT = 30;
  private readonly TIME_WINDOW = 60 * 1000; // 1 minute
  private readonly RETRY_DELAY = 2000;
  private rateLimit: Map<string, number[]>;

  /**
   * Constructor for the CopperxApiService
   */
  constructor() {
    this.api = axios.create({
      baseURL: config.copperx.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
      validateStatus: (status) => status < 500 // Handle 4xx errors in catch block
    });
    this.rateLimit = new Map();

    // Add request interceptor for rate limiting
    this.api.interceptors.request.use(async (config) => {
      await this.checkRateLimit(config.url || '');
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status >= 400 && error.response?.status < 500) {
          const apiError: CopperxApiError = error.response.data;
          // Format the error message based on whether message is an object or string
          const errorMessage = typeof apiError.message === 'object'
            ? JSON.stringify(apiError.message)
            : apiError.message;

          throw {
            message: errorMessage,
            statusCode: apiError.statusCode,
            error: apiError.error
          };
        }

        // For other errors (network, 500s, etc)
        throw {
          message: 'An unexpected error occurred',
          statusCode: error.response?.status || 500,
          error: error.message
        };
      }
    );
  }

  // Update retry method to handle rate limit errors
  /**
   * Retry an operation
   * @param operation - The operation to retry
   * @param fn - The function to retry
   * @returns A promise that resolves to the result of the function
   */
  async retry(operation: string, fn: () => Promise<any>) {
    let lastError;
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`${operation}: Attempt ${attempt}/${this.MAX_RETRIES}`);
        return await fn();
      } catch (error: any) {
        lastError = error;

        // If it's a rate limit error, wait for the specified time
        if (error.message?.includes('Rate limit exceeded')) {
          const waitTime = parseInt(error.message.match(/\d+/)[0]) * 1000;
          console.log(`${operation}: Rate limit hit, waiting ${waitTime / 1000}s`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (this.isRetryableError(error) && attempt < this.MAX_RETRIES) {
          console.log(`${operation}: Retrying after error:`, {
            code: error.code,
            message: error.message
          });
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
          continue;
        }
        break;
      }
    }
    console.error(`${operation}: All retry attempts failed:`, lastError);
    throw lastError;
  }

  /**
   * Check if an error is retryable
   * @param error - The error to check
   * @returns A boolean indicating if the error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['ETIMEDOUT', 'ECONNABORTED', 'ECONNREFUSED'];
    const retryableMessages = ['timeout', 'Network Error'];

    return (
      retryableCodes.includes(error.code) ||
      retryableMessages.some(msg => error.message?.includes(msg))
    );
  }

  private setToken(token: string) {
    this.token = token;
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Format an error
   * @param error - The error to format
   * @returns A formatted error
   */
  private formatError(error: any): Error {
    if (error.code === 'ETIMEDOUT') {
      return new Error('Connection timed out. Please try again.');
    }

    if (error.response?.status === 401) {
      return new Error('Authentication failed. Please login again.');
    }

    if (error.response?.status === 404) {
      return new Error('Resource not found or session expired.');
    }

    return new Error(
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    );
  }

  /**
   * Check the rate limit for a given endpoint
   * @param endpoint - The endpoint to check the rate limit for
   * @returns A promise that resolves to void
   */
  private async checkRateLimit(endpoint: string): Promise<void> {
    const now = Date.now();
    const key = endpoint;
    const requests = this.rateLimit.get(key) || [];

    // Remove requests outside the time window
    const validRequests = requests.filter(time => time > now - this.TIME_WINDOW);

    if (validRequests.length >= this.RATE_LIMIT) {
      const oldestRequest = validRequests[0];
      const timeToWait = oldestRequest + this.TIME_WINDOW - now;
      throw new Error(
        `Rate limit exceeded. Please try again in ${Math.ceil(timeToWait / 1000)} seconds.`);
    }

    validRequests.push(now);
    this.rateLimit.set(key, validRequests);
  }

  // Authentication methods
  /**
   * Request an email OTP
   * @param email - The email to request the OTP for
   * @returns A promise that resolves to the email OTP response
   */
  async requestEmailOtp(email: string): Promise<EmailOtpResponse> {
    return this.retry('Request Email OTP', async () => {
      try {
        const response = await this.api.post<EmailOtpResponse>(
          '/api/auth/email-otp/request',
          { email: email.trim() }
        );
        return response.data;

      } catch (error: any) {
        console.error('Email OTP request failed:', error);
        throw this.formatError(error);
      }
    });
  }

  /**
   * Verify an email OTP
   * @param email - The email to verify
   * @param otp - The OTP to verify
   * @param sid - The session ID
   * @returns A promise that resolves to the authentication response
   */
  async verifyEmailOtp(email: string, otp: string, sid: string)
    : Promise<CopperxAuthResponse> {
    return this.retry('Verify Email OTP', async () => {
      try {
        const response = await this.api.post('/api/auth/email-otp/authenticate', {
          email: email.trim(),
          otp: otp.trim(),
          sid
        });

        if (response.data.accessToken) {
          this.setToken(response.data.accessToken);
          return response.data;
        }

        throw new Error('Invalid or expired OTP');
      } catch (error: any) {
        console.error('OTP verification failed:', error.message);
        throw this.formatError(error);
      }
    });
  }

  /**
   * Get the user profile
   * @returns A promise that resolves to the user profile
   */
  async getUserProfile(): Promise<CopperxUser> {
    return this.retry('Get User Profile', async () => {
      try {
        const response = await this.api.get('/api/auth/me');
        return response.data;
      } catch (error: any) {
        console.error("Failed to get user profile:", {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });

        throw new Error(
          error.message ||
          'Failed to get user profile. Please try again later.'
        );
      }
    });
  }

  /**
   * Get the KYC status
   * @returns A promise that resolves to the KYC status
   */
  async getKycStatus(): Promise<any> {
    return this.retry('Get KYC Status', async () => {
      try {
        const response = await this.api.get(`/api/kycs`);

        if (!response.data) throw new Error('No KYC data received');
        return response.data;
      } catch (error: any) {
        console.error("Failed to get KYC status:", {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });

        // Handle specific error cases
        if (error.response?.status === 404) {
          throw new Error('KYC information not found. Please complete KYC verification.');
        }

        if (error.response?.status === 401) {
          throw new Error('Authentication expired. Please login again.');
        }
        throw this.formatError(error);
      }
    });
  }


  // Wallets
  /**
   * Get all wallets
   * @returns A promise that resolves to the wallets
   */
  async getWallets(): Promise<CopperxWallet[]> {
    return this.retry('Get Wallets', async () => {
      try {
        const response = await this.api.get('/api/wallets');
        return response.data;
      } catch (error: any) {
        console.error("Failed to get wallets:", {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });

        throw new Error(
          error.message ||
          'Failed to get wallets. Please try again later.'
        );
      }
    });
  }

  /**
   * Get the balances of all wallets
   * @returns A promise that resolves to the wallet balances
   */
  async getWalletBalances(): Promise<CopperxWalletBalance[]> {
    return this.retry('Get Wallet Balances', async () => {
    try {
      const response = await this.api.get('/api/wallets/balances');
      return response.data;
    } catch (error: any) {
      console.error("Failed to get wallet balances:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });

      throw new Error(
        error.message ||
        'Failed to get wallet balances. Please try again later.'
      );
    }
  });
  }

  /**
   * Set the default wallet
   * @param walletId - The ID of the wallet to set as default
   * @returns A promise that resolves to the default wallet
   */
  async setDefaultWallet(walletId: string): Promise<CopperxWallet> {
    return this.retry('Set Default Wallet', async () => {
      try {
        // Get all wallets first
        const wallets = await this.getWallets();
        const walletToSet = wallets.find(w => w.id === walletId);
        if (!walletToSet) {
          throw new Error('Wallet not found');
        }
        // Check for existing default wallet with same network
        const existingDefault = wallets.find(w =>
          w.isDefault &&
          w.network === walletToSet.network &&
          w.id !== walletId
        );

        if (existingDefault) {
          console.warn(`Found existing default wallet for network ${walletToSet.network}:`,
            existingDefault.id);
        }

        const response = await this.api.post(
          `/api/wallets/default`,
          { walletId });
        
        return response.data;

      } catch (error: any) {
        console.error("Failed to set default wallet:", {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });
        throw new Error(
          error.message ||
          'Failed to set default wallet. Please try again later.'
        );
      }
    });
  }

  /**
   * Ensure a single default wallet
   * @param network - The network of the wallet to ensure
   * @returns A promise that resolves to void
   */
  async ensureSingleDefaultWallet(network: string): Promise<void> {
    return this.retry('Ensure Single Default Wallet', async () => {
      try {
        const wallets = await this.getWallets();
        const defaultWallets = wallets.filter(w =>
          w.isDefault && w.network === network
        );

        if (defaultWallets.length > 1) {
          console.warn(`Found multiple default wallets for network ${network}:`,
            defaultWallets.map(w => w.id));

          // Keep the most recently updated wallet as default
          const sortedWallets = defaultWallets.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          // Update all except the most recent to non-default
          for (let i = 1; i < sortedWallets.length; i++) {
            console.log(`Removing default status from wallet: ${sortedWallets[i].id}`);
            await this.api.post(`/api/wallets/${sortedWallets[i].id}`, {
              isDefault: false
            });
          }
        }
      } catch (error: any) {
        console.error("Failed to ensure single default wallet:", error);
      }
    });
  }

  /**
   * Get a wallet by address
   * @param walletAddress - The address of the wallet to get
   * @param network - The network of the wallet to get
   * @returns A promise that resolves to the wallet or null if not found
   */
  async getWalletByAddress(walletAddress: string, network: string):
    Promise<CopperxWallet | null> {
    return this.retry('Get Wallet by Address', async () => {
    try {
      const wallets = await this.getWallets();
      return wallets.find(w =>
        w.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
        w.network === network
      ) || null;
    } catch (error: any) {
      console.error("Failed to get wallet by address:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      return null;
    }
  });
  }

  /**
   * Get the default wallet
   * @returns A promise that resolves to the default wallet
   */
  async getDefaultWallet(): Promise<CopperxWallet> {
    return this.retry('Get Default Wallet', async () => {
      try {
        const response = await this.getWallets();
        const defaultWallet = response.find((wallet: CopperxWallet) => wallet.isDefault);
        if (!defaultWallet) throw new Error('No default wallet found');
      
        return defaultWallet;
      } catch (error: any) {
        console.error("Failed to get default wallet:", {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });
        throw new Error(
          error.message ||
          'Failed to get default wallet. Please try again later.'
        );
      }
    });
  }

  // Transactions

  /**
   * Get all transactions
   * @param page - The page number to fetch
   * @param limit - The number of transactions per page
   * @returns A promise that resolves to the transactions history
   */
  async getTransactionsHistory(page: number = 1, limit: number = 10) {
    return this.retry('Get Transactions History', async () => {
      try {
        const response = await this.api.get('/api/transfers', {
          params: { page, limit }
        });
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch transaction history:', {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });
        throw new Error(
          error.message ||
          'Failed to fetch transaction history. Please try again later.'
        );
      }
    });
  }

  /**
   * Get all accounts
   * @returns A promise that resolves to the accounts
   */
  async getAccounts(): Promise<AccountsResponse> {
    return this.retry('Get Accounts', async () => {
      try {
        const response = await this.api.get(`/api/accounts/`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch accounts:", {
          statusCode: error.statusCode,
          error: error.error,
          message: error.message,
        });
        throw new Error(
          error.message ||
          'Failed to fetch accounts. Please try again later.'
        );
      }
    });
  }

  /**
   * Get the default bank account
   * @returns A promise that resolves to the default bank account
   */
  async getDefaultBankAccount(): Promise<CopperxAccount | null> {
    try {
      const response = await this.getAccounts();
      const defaultAccount = response.data[0];
      
      return defaultAccount || null;
    } catch (error) {
      console.error("Failed to get default bank account:", error);
      throw error;
    }
  }

  /**
   * Send a transfer
   * @param request - The request to send
   * @param type - The type of transfer to send
   * @returns A promise that resolves to the transfer response
   */
  async sendTransfer(request: EmailTransferRequest | WalletWithdrawalRequest,
    type: 'email' | 'wallet') {
    try {
      const endpoint = '/api/transfers/send';

      const payload = type === 'wallet'
        ? {
          walletAddress: request.walletAddress,
          amount: request.amount,
          purposeCode: request.purposeCode,
          currency: request.currency,
          note: request.note
        } as WalletWithdrawalRequest
        : request;

      const response = await this.api.post(endpoint, payload);
      return response.data;
    } catch (error: any) {
      console.error("Failed to send transfer:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      throw new Error(error.message
        || 'Failed to send transfer. Please try again later.');
    }
  }

  /**
   * Get an offramp quote
   * @param request - The request to get the quote
   * @returns A promise that resolves to the quote
   */
  async getOffRampQuote(request: OffRampQuoteRequest): Promise<any> {
    try {
      const response = await this.api.post('/api/quotes/offramp', request);
      return response.data;
    } catch (error: any) {
      console.error("Failed to get offramp quote:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      throw new Error(error.message
        || 'Failed to get withdrawal quote. Please try again later.');
    }
  }

  /**
   * Send a bank withdrawal
   * @param request - The request to send
   * @returns A promise that resolves to the withdrawal response
   */
  async sendBankWithdrawal(request: BankWithdrawalRequest): Promise<any> {
    try {
      const response = await this.api.post('/api/transfers/offramp', request);
      console.log("Bank withdrawal response:", response);

      
      return response.data;
    } catch (error: any) {
      console.error("Failed to send bank withdrawal:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      throw new Error(error.message
        || 'Failed to send bank withdrawal. Please try again later.');
    }
  }

  /**
   * Send a bulk transfer
   * @param payload - The payload to send
   * @returns A promise that resolves to the bulk transfer response
   */
  async sendBulkTransfer(payload: BulkTransferPayload): Promise<any> {
    try {
      const response = await this.api.post('/api/transfers/send-batch', payload);
  
      return response.data;
    } catch (error: any) {
      console.error("Failed to send bulk transfer:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      throw new Error(error.message || 'Failed to process bulk transfer. Please try again later.');
    }
  }

} 
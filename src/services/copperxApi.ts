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
} from '../types/copperx';

import {
  EmailOtpResponse,
} from '../types/index';

export class CopperxApiService {
  private api: AxiosInstance;
  private token: string | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000

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

  private async retry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`${operation}: Attempt ${attempt}/${this.MAX_RETRIES}`);
        return await fn();
      } catch (error: any) {
        lastError = error;

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

  // Authentication methods
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


  async verifyEmailOtp(email: string, otp: string, sid: string): Promise<CopperxAuthResponse> {
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
  // Get all wallets
  async getWallets(): Promise<CopperxWallet[]> {
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
  }

  async getWalletBalances(): Promise<CopperxWalletBalance[]> {
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
  }

  // Set default wallet
  async setDefaultWallet(walletId: string): Promise<CopperxWallet> {
    try { 
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
  }

  // Get default walletAddress
  async getDefaultWallet(): Promise<CopperxWallet > {
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
  }

  // Transactions
  // Get all transactions
  async getTransactionsHistory(page: number = 1, limit: number = 10) {
    try {
      const response = await this.api.get(`/api/transfers`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error("Failed to get transactions:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });

      throw new Error(
        error.message ||
        'Failed to get transactions. Please try again later.'
      );
    }
  }


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
      console.log("Transfer response:", response.data);
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

  
  async sendEmailTransfer(request: EmailTransferRequest) {
    try {
      const response = await this.api.post('/api/transfers/send', request);
      console.log("Email transfer response:", response.data);
      return response.data;
      
    } catch (error: any) {
      console.error("Failed to send email transfer:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      throw new Error(
        error.message ||
        'Failed to send email transfer. Please try again later.'
      );
    }
  }

  async sendWalletWithdrawal(request: WalletWithdrawalRequest): Promise<any> {
    try {
      const response = await this.api.post('/api/transfers/wallet-withdraw', request);
      // console.log("Wallet withdrawal response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Failed to send wallet withdrawal:", {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
      });
      throw new Error(
        error.message ||
        'Failed to send wallet withdrawal. Please try again later.'
      );
    }
  }

//   // Send funds
//   async sendFunds(params: {
//     recipient: string;
//     amount: string;
//     currency: string;
//     type: 'email' | 'walletAddress';
//   }): Promise<{ success: boolean; transactionId: string }> {
//     try {
//       const endpoint = params.type === 'email'
//         ? '/api/transfers/send'
//       : '/api/transfers/wallet-withdraw';

//       const response = await this.api.post(endpoint, params);
//       return response.data;
//     } catch (error: any) {
//       console.error("Failed to send funds:", {
//         statusCode: error.statusCode,
//         error: error.error,
//         message: error.message,
//       });

//       throw new Error(
//         error.message ||
//         `Failed to send via ${params.type}. Please try again later.`
//       );
//     }
//   }
} 
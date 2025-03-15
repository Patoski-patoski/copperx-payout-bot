import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/config';
import {
  CopperxAuthResponse,
  CopperxUser,
  CopperxWallet,
  CopperxTransaction,
  CopperxApiError,
} from '../types/copperx';

import {
  EmailOtpResponse,
  ApiError
} from '../types/index';

export class CopperxApiService {
  private api: AxiosInstance;
  private token: string | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: config.copperx.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 'Authorization': `Bearer ${this.token}`
      },
      timeout: 10000,
      // validateStatus: function (status) {
      //   return status >= 200 && status < 303; // Accept redirects
      // }
      validateStatus: (status) => status < 500 // Handle 4xx errors in catch block
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorResponse: CopperxApiError = {
          message: error.response?.data?.message
            || 'An unknown error occurred',
          statusCode: error.response?.status || 500,
        };
        throw errorResponse;
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  async requestEmailOtp(email: string): Promise<EmailOtpResponse> {
    try {
      console.log('Requesting email OTP', email);
    
      const response = await this.api.post<EmailOtpResponse>(
        '/api/auth/email-otp/request',
        { email: email.trim() }
      );

      console.log('OTP request response:', response.data); // Debug log

      if (response.status === 200 && response.data) {
        return response.data;
      }
      // Store sid in service for OTP verification
      // this.setSessionId(response.data.sid);
      // return response.data;

      throw new Error(response.data?.message || 'Failed to request OTP');

    } catch (error) {
      console.error('OTP request error:', {
        isAxiosError: axios.isAxiosError(error),
        status: (error as AxiosError)?.response?.status,
        data: (error as AxiosError)?.response?.data,
        message: (error as Error).message
      });

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`API Error: ${errorMessage}`);
      }

      throw new Error('Network error occurred while requesting OTP');
    }
  }

  async verifyEmailOtp(email: string, otp: string, sid: string): Promise<CopperxAuthResponse> {
    try {
      console.log('Verifying OTP:', { email, otp, sid }); // Debug log

      const response = await this.api.post('/api/auth/email-otp/authenticate', {
        email: email.trim(),
        otp: otp.trim(),
        sid
      });

      console.log('OTP verification response:', response.data); // Debug log

      if (response.status === 200 && response.data) {
        if (response.data.token) {
          this.setToken(response.data.token);
        }
        return response.data;
      }

      throw new Error(response.data?.message || 'Failed to verify OTP');
    } catch (error) {
      console.error('OTP verification error:', {
        isAxiosError: axios.isAxiosError(error),
        status: (error as AxiosError)?.response?.status,
        data: (error as AxiosError)?.response?.data,
        message: (error as Error).message
      });

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`API Error: ${errorMessage}`);
      }

      throw new Error('Failed to connect to Copperx service');
    }
  }

  async getUserProfile(): Promise<CopperxUser> {
    const response = await this.api.get('/api/auth/me');
    return response.data;
  }

  async getWallets(): Promise<CopperxWallet[]> {
    const response = await this.api.get('/api/wallets');
    return response.data;
  }

  async getWalletBalances(): Promise<CopperxWallet[]> {
    const response = await this.api.get('/api/wallets/balances');
    return response.data;
  }

  async setDefaultWallet(walletId: string): Promise<{ success: boolean }> {
    const response = await this.api.post(`/api/wallets/default`, { walletId });
    return response.data;
  }

  async getTransactions(page: number = 1, limit: number = 10):
    Promise<CopperxTransaction[]> {

    const response = await this.api.get(`/api/transfers`, {
      params: { page, limit }
    });
    return response.data;
  }

  async sendFunds(params: {
    recipient: string;
    amount: string;
    currency: string;
    type: 'email' | 'wallet';
  }): Promise<{ success: boolean; transactionId: string }> {
    const endpoint = params.type === 'email'
      ? '/api/transfers/send'
      : '/api/transfers/wallet-withdraw';

    const response = await this.api.post(endpoint, params);
    return response.data;
  }
} 
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopperxApiService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config/config");
class CopperxApiService {
    constructor() {
        this.token = null;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000;
        this.api = axios_1.default.create({
            baseURL: config_1.config.copperx.apiBaseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 15000,
            validateStatus: (status) => status < 500 // Handle 4xx errors in catch block
        });
        // Response interceptor for error handling
        this.api.interceptors.response.use(response => response, error => {
            if (error.response?.status >= 400 && error.response?.status < 500) {
                const apiError = error.response.data;
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
        });
    }
    async retry(operation, fn) {
        let lastError;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                console.log(`${operation}: Attempt ${attempt}/${this.MAX_RETRIES}`);
                return await fn();
            }
            catch (error) {
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
    isRetryableError(error) {
        const retryableCodes = ['ETIMEDOUT', 'ECONNABORTED', 'ECONNREFUSED'];
        const retryableMessages = ['timeout', 'Network Error'];
        return (retryableCodes.includes(error.code) ||
            retryableMessages.some(msg => error.message?.includes(msg)));
    }
    setToken(token) {
        this.token = token;
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    // Authentication methods
    async requestEmailOtp(email) {
        return this.retry('Request Email OTP', async () => {
            try {
                const response = await this.api.post('/api/auth/email-otp/request', { email: email.trim() });
                return response.data;
            }
            catch (error) {
                console.error('Email OTP request failed:', error);
                throw this.formatError(error);
            }
        });
    }
    formatError(error) {
        if (error.code === 'ETIMEDOUT') {
            return new Error('Connection timed out. Please try again.');
        }
        if (error.response?.status === 401) {
            return new Error('Authentication failed. Please login again.');
        }
        if (error.response?.status === 404) {
            return new Error('Resource not found or session expired.');
        }
        return new Error(error.response?.data?.message ||
            error.message ||
            'An unexpected error occurred');
    }
    async verifyEmailOtp(email, otp, sid) {
        return this.retry('Verify Email OTP', async () => {
            try {
                console.log('Attempting OTP verification...', { email, sid });
                const response = await this.api.post('/api/auth/email-otp/authenticate', {
                    email: email.trim(),
                    otp: otp.trim(),
                    sid
                });
                console.log('OTP verification response:', response.data);
                if (response.data.accessToken) {
                    this.setToken(response.data.accessToken);
                    return response.data;
                }
                throw new Error('Invalid or expired OTP');
            }
            catch (error) {
                console.error('OTP verification failed:', error);
                throw this.formatError(error);
            }
        });
    }
    async getUserProfile() {
        return this.retry('Get User Profile', async () => {
            try {
                const response = await this.api.get('/api/auth/me');
                return response.data;
            }
            catch (error) {
                console.error("Failed to get user profile:", {
                    statusCode: error.statusCode,
                    error: error.error,
                    message: error.message,
                });
                throw new Error(error.message ||
                    'Failed to get user profile. Please try again later.');
            }
        });
    }
    async getWallets() {
        try {
            const response = await this.api.get('/api/wallets');
            return response.data;
        }
        catch (error) {
            console.error("Failed to get wallets:", {
                statusCode: error.statusCode,
                error: error.error,
                message: error.message,
            });
            throw new Error(error.message ||
                'Failed to get wallets. Please try again later.');
        }
    }
    async getWalletBalances() {
        try {
            const response = await this.api.get('/api/wallets/balances');
            return response.data;
        }
        catch (error) {
            console.error("Failed to get wallet balances:", {
                statusCode: error.statusCode,
                error: error.error,
                message: error.message,
            });
            throw new Error(error.message ||
                'Failed to get wallet balances. Please try again later.');
        }
    }
    async setDefaultWallet(walletId) {
        const response = await this.api.post(`/api/wallets/default`, { walletId });
        return response.data;
    }
    async getTransactions(page = 1, limit = 10) {
        try {
            const response = await this.api.get(`/api/transfers`, {
                params: { page, limit }
            });
            return response.data;
        }
        catch (error) {
            console.error("Failed to get transactions:", {
                statusCode: error.statusCode,
                error: error.error,
                message: error.message,
            });
            throw new Error(error.message ||
                'Failed to get transactions. Please try again later.');
        }
    }
    async sendFunds(params) {
        try {
            const endpoint = params.type === 'email'
                ? '/api/transfers/send'
                : '/api/transfers/wallet-withdraw';
            const response = await this.api.post(endpoint, params);
            return response.data;
        }
        catch (error) {
            console.error("Failed to send funds:", {
                statusCode: error.statusCode,
                error: error.error,
                message: error.message,
            });
            throw new Error(error.message ||
                'Failed to send funds. Please try again later.');
        }
    }
}
exports.CopperxApiService = CopperxApiService;
//# sourceMappingURL=copperxApi.js.map
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
        this.sessionId = null;
        this.api = axios_1.default.create({
            baseURL: config_1.config.copperx.apiBaseUrl,
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
        this.api.interceptors.response.use((response) => response, (error) => {
            const errorResponse = {
                message: error.response?.data?.message
                    || 'An unknown error occurred',
                statusCode: error.response?.status || 500,
            };
            throw errorResponse;
        });
    }
    setToken(token) {
        this.token = token;
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    async requestEmailOtp(email) {
        try {
            console.log('Requesting email OTP', email);
            const response = await this.api.post('/api/auth/email-otp/request', { email: email.trim() });
            console.log('OTP request response:', response.data); // Debug log
            if (response.status === 200 && response.data) {
                return response.data;
            }
            // Store sid in service for OTP verification
            // this.setSessionId(response.data.sid);
            // return response.data;
            throw new Error(response.data?.message || 'Failed to request OTP');
        }
        catch (error) {
            console.error('OTP request error:', {
                isAxiosError: axios_1.default.isAxiosError(error),
                status: error?.response?.status,
                data: error?.response?.data,
                message: error.message
            });
            if (axios_1.default.isAxiosError(error)) {
                const errorMessage = error.response?.data?.message || error.message;
                throw new Error(`API Error: ${errorMessage}`);
            }
            throw new Error('Network error occurred while requesting OTP');
        }
    }
    async verifyEmailOtp(email, otp, sid) {
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
        }
        catch (error) {
            console.error('OTP verification error:', {
                isAxiosError: axios_1.default.isAxiosError(error),
                status: error?.response?.status,
                data: error?.response?.data,
                message: error.message
            });
            if (axios_1.default.isAxiosError(error)) {
                const errorMessage = error.response?.data?.message || error.message;
                throw new Error(`API Error: ${errorMessage}`);
            }
            throw new Error('Failed to connect to Copperx service');
        }
    }
    async getUserProfile() {
        const response = await this.api.get('/api/auth/me');
        return response.data;
    }
    async getWallets() {
        const response = await this.api.get('/api/wallets');
        return response.data;
    }
    async getWalletBalances() {
        const response = await this.api.get('/api/wallets/balances');
        return response.data;
    }
    async setDefaultWallet(walletId) {
        const response = await this.api.post(`/api/wallets/default`, { walletId });
        return response.data;
    }
    async getTransactions(page = 1, limit = 10) {
        const response = await this.api.get(`/api/transfers`, {
            params: { page, limit }
        });
        return response.data;
    }
    async sendFunds(params) {
        const endpoint = params.type === 'email'
            ? '/api/transfers/send'
            : '/api/transfers/wallet-withdraw';
        const response = await this.api.post(endpoint, params);
        return response.data;
    }
}
exports.CopperxApiService = CopperxApiService;
//# sourceMappingURL=copperxApi.js.map
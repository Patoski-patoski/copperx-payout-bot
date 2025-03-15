export interface EmailOtpRequest {
    email: string;
}
export interface EmailOtpResponse {
    email: string;
    sid: string;
    message?: string;
}
export interface ApiError {
    message: any;
    statusCode: number;
    error: string;
}

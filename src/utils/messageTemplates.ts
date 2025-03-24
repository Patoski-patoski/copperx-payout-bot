
export const BOT_MESSAGES = {
        WELCOME: `
Welcome to Copperx Payout Bot! ©🚀

Here are the available commands:
/login - Login to your Copperx account
/balance - Check your wallet balances
/send - Send funds
/history - View your transaction history
/help - Show this help message

Need support? Visit https://t.me/copperxcommunity/2183`,

        ALREADY_LOGGED_IN: '🔐 You are already logged in!\n\nUse /logout to logout from your Copperx account.',
        NOT_LOGGED_IN: 'You are not logged in. Please use /login to login.',
        ENTER_EMAIL: '📧 Please enter your Copperx email address:',
        INVALID_EMAIL: '❌ Invalid email address. Please enter a valid email.',
        ENTER_OTP: '✉️ We\'ve sent an OTP to your email.\n\nPlease enter the 6-digit code:',
        INVALID_OTP: '❌ Invalid OTP. Please enter a valid 6-digit code.',
        SESSION_EXPIRED: 'Session expired. Please start over with /login',
        PROFILE_NOT_AUTHENTICATED: '❌ Please login first using /login to view your profile',
        PROFILE_TEMPLATE: `👤 *User Profile*

id: \`%id%\`
firstName: %firstName%
lastName: %lastName%
email: \`%email%\`
profileImage: %profileImage%
organizationId: %organizationId%
role: \`%role%\`
status: %status%
type: %type%
relayerAddress: %relayerAddress%
flags: [%flags%]
walletAddress: \`%walletAddress%\`
walletId: %walletId%
walletAccountType: \`%walletAccountType%\``,
        LOGOUT_SUCCESS: '👋 Logged out successfully!\n\nUse /login to login again.',
        LOGIN_SUCCESS: `✅ Login successful!

You can now: 
- Use /balance to check your wallet balances.
- Use /wallets to view your wallets.
- Use /default to view your default wallet.
- Use /kyc to check your KYC status.
- Use /send to send funds.
- Use /profile to view your Copperx information
- Use /history to view your transaction history.
- Use /help to show this help message.
- Use /logout to logout from your account.

Need support? Visit https://t.me/copperxcommunity/2183`,
        KYC_NOT_AUTHENTICATED: '❌ Please login first using /login to view your KYC status',
        KYC_STATUS_TEMPLATE: `🔒 *KYC Verification Status*
status: %status%
type: %type%`,
        KYC_REDIRECT_PLATFROM: `🔒 *KYC Verification Required*

To complete your KYC verification:
1. Click the button below to go to the Copperx platform
2. Complete the verification process
3. Return here and check your status with /kyc


Need help? Contact support: https://t.me/copperxcommunity/2183`,
        WALLET_NOT_AUTHENTICATED: '❌ Please login first using /login to access wallet features',
        WALLET_BALANCE_TEMPLATE: `💰 *Wallet Balances*
%balances%
WalletId: %walletId%
Network: %network%
Walletaddress: %walletAddress%
Balance: %balance%
Symbol: %symbol%`,
        TRANSFER_NOT_AUTHENTICATED: '❌ Please login first using /login to use the transfer feature',

        TRANSFER_EMAIL_INTRO: `📤 *Send Funds by Email*

Send funds to any email address. The recipient will be notified to claim the funds.

Please follow these steps:
1. Enter recipient email
2. Enter amount to send
3. Select purpose
4. Review and confirm`,

        TRANSFER_ENTER_EMAIL: '📧 Please enter the recipient\'s email address:',
        TRANSFER_INVALID_EMAIL: '❌ Invalid email address. Please enter a valid email.',

        TRANSFER_ENTER_AMOUNT: '💰 Please enter the amount to send:',
        TRANSFER_INVALID_AMOUNT: '❌ Invalid amount. Please enter a positive number (e.g., 10.50).',

        TRANSFER_SELECT_PURPOSE: `🏷️ Please select the purpose of this transfer:`,

        TRANSFER_ENTER_NOTE: '📝 Add an optional note to the recipient (or type "skip"):',

        TRANSFER_CONFIRM_TEMPLATE: `📋 *Transfer Confirmation*

*Amount:* %amount%
*Currency:* %currency%

*To:* %email%
*Purpose:* %purposeCode%
%note%

Please confirm this transfer.`,

        TRANSFER_SUCCESS: `✅ *Transfer Successful!*

*Transaction ID:* %id%
*Status:* %status%
*Amount:* %amount% %currency%
*Recipient:* %recipient%
*Recipient Email:* %recipient_email%
The recipient will be notified via email.`,

        TRANSFER_ERROR: 'Transfer failed: %message%',
    };
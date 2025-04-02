export const BOT_MESSAGES = {
        WELCOME: `
🚀 Welcome to Copperx Payout Bot!

A Telegram bot for managing Copperx Payout wallets, transfers, and account services.

🚀 *Features*

- ✅ *User Authentication*: Secure login with email OTP verification

- 👛 *Wallet Management*: View wallets across multiple networks, set default wallet

- 💰 *Balance Tracking*: Check balances for all assets across wallets

- 🏧 *Withdraw*: Withdraw offramp transactions

- 💸 *Fund Transfers*: Send funds to email addresses with various purpose codes

- 📄 *Transaction History*: View recent transaction history

- 🔒 *KYC Verification*: Check KYC status and complete verification process

- 📝 *Profile Management*: View and manage your Copperx account details

🏁 *Get Started*:
1. Use /login to connect your account
2. Check /help for all commands

🔐 *Security Note*:
• Never share your OTP
• Always verify transaction details
• Logout when done using /logout

Need support? Visit https://t.me/copperxcommunity/2183`,

        ALREADY_LOGGED_IN: '🔐 You are already logged in!\n\nUse /logout to logout from your Copperx account.',
        NOT_LOGGED_IN: 'You are offline. Please use /login to login.',
        ENTER_EMAIL: '📧 To Login, please enter your Copperx email address:',
        INVALID_EMAIL: '❌ Invalid email address. Please enter a valid email.',
        ENTER_OTP: '✉️ We\'ve sent an OTP to your email.\n\nPlease enter the 6-digit code:',
        INVALID_OTP: '❌ Invalid OTP. Please enter a valid 6-digit code.',
        SESSION_EXPIRED: 'Session expired. Please start over with /login',
        PROFILE_NOT_AUTHENTICATED: '❌ Please login first using /login to view your profile',
        PROFILE_TEMPLATE: `👤 *User Profile*

*🆔 Copperx ID:* %id%

*💌 Email:* %email%

*👤 Role:* %role%

*🔒 Status:* %status%

*🏦 Relayer Address:* %relayerAddress%

*💳 Wallet Address:* %walletAddress%

*💳 Wallet Account Type:* %walletAccountType%`,
        LOGOUT_SUCCESS: '👋 Logged out successfully!\n\nUse /login to login again.',
        LOGIN_SUCCESS: `✅ Login Successful\n\n🎉 Welcome to Copperx Payout Bot!`,
        EXIT: `👋 Thank you for using Copperx Payout Bot!. Goodbye and have a great day!`,
        COMMANDS_MESSAGE: `

🚀 *Quick Start Guide:*

1️⃣ Use /login to connect your account.
2️⃣ Use /logout — Logout of your account
3️⃣ Check /help for all available commands.  

🛠️ *Available Commands:*

🎯 *Wallet Management:*
- 💰 /balance — Check wallet balances
- 🏦 /wallets — View all wallets
- ⭐ /default — View default wallet


🎯 *Transactions:*
- ✈️ /send — Send funds
- 🏧 /withdraw — Create Offramp transfer
- 📦 /bulk — Bulk transfer funds
- ➕ /add\\_recipient — Add recipient to bulk transfer
- 🔍 /review — Review bulk transfer list

🎯 *Account Information:*
- 🆔 /profile — View Copperx profile
- 🏷️ /kyc — Check KYC status
- 📜 /history — View transaction history
- ❓ /help — Show help message



📣 Contact Support: https://t.me/copperxcommunity/2183`,

        KYC_STATUS_TEMPLATE: `🔒 *KYC Verification Status*
status: %status%
type: %type%`,
        KYC_REDIRECT_PLATFROM: `🔒 *KYC Verification Required*

To complete your KYC verification:
1. Click the button below to go to the Copperx platform
2. Complete the verification process
3. Return here and check your status with /kyc


Need help? Contact support: https://t.me/copperxcommunity/2183`,
        WALLET_BALANCE_TEMPLATE: `💰 *Wallet Balances*
%balances%
WalletId: %walletId%
Network: %network%
Walletaddress: %walletAddress%
Balance: %balance%
Symbol: %symbol%`,
        TRANSFER_NOT_AUTHENTICATED: '❌ You\'re offline. Please login first using /login to use the transfer feature',
        HISTORY_NOT_AUTHENTICATED: '❌ You\'re offline. Please login first using /login to view your transaction history',
        HISTORY_NO_TRANSACTIONS: '📪 No transactions found.\n\n Send some funds to see your history.',
        WALLET_NOT_AUTHENTICATED: '❌ You\'re offline. Please login first using /login to access wallet features',
        KYC_NOT_AUTHENTICATED: '❌ You\'re offline. Please login first using /login to view your KYC status',
        ADD_RECIPIENT_NOT_AUTHENTICATED: '❌ You\'re offline. Please login first using /login to add a recipient',



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
*Amount:* %amount%
*Currency:* %currency%
*Recipient wallet:* %destinationAccount.walletAddress%`,

        TRANSFER_ERROR: 'Transfer failed: %message%',
        WITHDRAWAL_MESSAGE: `💳 * Confirm Withdrawal Summary*

*🏧 Amount to Withdraw:* %amount%

*💲 Currency:* %currency%

*🚕 Fee Percentage:* %feePercentage%

*✅ Total Fee:* %totalFee%

*🏦 Transfer Method:* %transferMethod%

*🏦 Withdraw from Bank:* %bankName%

*📤 Withdrawer Account Number:* %accountNumber%

*⏳ ArrivalTime:* %arrivalTime%


* ⚠ Total amount to withdraw \\+ Fee/Charges Applied:*

* %toAmount% *


*Note*: Please ensure that the details are correct before proceeding with the withdrawal`

};
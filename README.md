# Copperx Telegram Bot

![Copperx Logo](https://payout.copperx.io/logo.png)

A Telegram bot for managing Copperx Payout wallets, transfers, and account services.

## 🚀 Features

- **User Authentication**: Secure login with email OTP verification
- **Wallet Management**: View wallets across multiple networks, set default wallet
- **Balance Tracking**: Check balances for all assets across wallets
- **Fund Transfers**: Send funds to email addresses with various purpose codes
- **Transaction History**: View recent transaction history
- **KYC Verification**: Check KYC status and complete verification process
- **Profile Management**: View and manage your Copperx account details

## 🤖 Available Commands

| Command | Description |
|---------|-------------|
| /start | Initialize the bot |
| /login | Start authentication process |
| /logout | End current session |
| /profile | View user profile |
| /wallets | List all wallets |
| /balance | Check wallet balance |
| /send | Initiate a transfer |
| /withdraw | Start bank withdrawal |
| /bulk | Start bulk transfer |
| /history | View transaction history |
| /kyc | Check KYC status |

## 🛠️ Technical Architecture

The bot is built with Node.js and TypeScript with a modular architecture:

- **Handlers**: Separate modules for different functionality domains
- **Services**: API communication layer with the Copperx backend
- **Session Management**: Secure user session handling
- **Type Safety**: Comprehensive TypeScript interfaces for all data models

## 📦 Project Structure

```bash
src/
├── handlers/                    # Command and event handlers
│   ├── authHandler.ts           # Authentication functionality
│   ├── botHandler.ts            # Main bot orchestration
│   ├── profileHandler.ts        # Profile and KYC handling
│   ├── baseHandler.ts           # Base file
│   ├── bankWithdrawalHandler.ts # Transfer payment functionality
│   ├── bulkWithdrawalHandler.ts # Bulk Transfer payment
│   ├── transferHandler.ts       # Transfer payment functionality
│   ├── historyHandler.ts        # Transaction history
│   └── walletHandler.ts         # Wallet management
├── services/
│   └── copperxApi.ts            # API communication service
├── types/
│   └── copperx.ts               # TypeScript interfaces
│   └── index.ts                 # TypeScript interfaces
├── utils/
│   ├── messageTemplates.ts      # Message templates
│   └── sessionManager.ts        # User session handling
│   └── copperxUtils.ts          # Utility handling
├── config/
│   └── config.ts                # Configuration management
└── app.ts                       # Application entry point
```

## 🔐 Security Features

- OTP-based authentication
- Secure token management
- Transaction confirmation dialogs
- Session timeouts for inactive users
- Data validation for all user inputs

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Telegram Bot Token (from @BotFather)
- Copperx API credentials

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/patoski-patoski/copperx-payout-bot
   cd copperx-telegram-bot
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file with the required environment variables

   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token
   API_BASE_URL=https://api.copperx.io
   NODE_ENV=development
   ```

4. Start the bot

   ```bash
   npm run dev    # Development mode
   npm run serve  # Development mode + build
   npm run build  # Build production version
   npm start      # Run production version
   ```

## 🧪 Testing

```bash
npm test         # Run all tests
npm run test:ci  # Run tests in CI environment
```

## 🚀 Deployment on Render

### Prerequisites_

- Node.js 16+
- npm or yarn
- A Render account
- Telegram Bot Token

### Deployment Steps

1. Fork/clone this repository
2. Sign up on [Render](https://render.com)
3. Create a new Web Service
4. Connect your repository
5. Add environment variables:
   - `BOT_TOKEN`: Your Telegram bot token
   - `NODE_ENV`: Set to `production`
   - `API_BASE_URL`: Your API URL
6. Deploy!

### Monitoring

- Check the health endpoint: `https://your-app.onrender.com/health`
- View logs in Render dashboard
- Monitor bot status in Telegram

### Troubleshooting

If the bot stops responding:

1. Check Render logs
2. Verify environment variables
3. Ensure bot token is valid
4. Check API endpoint status

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support, reach out to our community at [Telegram Community](https://t.me/copperxcommunity/2183) or email <support@copperx.io>.

---

### Built with ❤️ by the Copperx Team

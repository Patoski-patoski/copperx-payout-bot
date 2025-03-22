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

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `/start` | Get started with the bot |
| `/login` | Login to your Copperx account |
| `/logout` | Logout from your account |
| `/wallets` | View your wallets |
| `/balance` | Check wallet balances |
| `/default` | View and set default wallet |
| `/send` | Send funds to email or wallet address |
| `/history` | View transaction history |
| `/kyc` | Check KYC verification status |
| `/profile` | View your account profile |

## 🛠️ Technical Architecture

The bot is built with Node.js and TypeScript with a modular architecture:

- **Handlers**: Separate modules for different functionality domains
- **Services**: API communication layer with the Copperx backend
- **Session Management**: Secure user session handling
- **Type Safety**: Comprehensive TypeScript interfaces for all data models

## 📦 Project Structure

```bash
src/
├── handlers/                # Command and event handlers
│   ├── authHandler.ts       # Authentication functionality
│   ├── botHandler.ts        # Main bot orchestration
│   ├── profileHandler.ts    # Profile and KYC handling
│   ├── transferHandler.ts   # Transfer functionality
│   └── walletHandler.ts     # Wallet management
├── services/
│   └── copperxApi.ts        # API communication service
├── types/
│   └── copperx.ts           # TypeScript interfaces
├── utils/
│   ├── messageTemplates.ts  # Message templates
│   └── sessionManager.ts    # User session handling
├── config/
│   └── config.ts            # Configuration management
└── app.ts                   # Application entry point
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

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support, reach out to our community at [Telegram Community](https://t.me/copperxcommunity/2183) or email <support@copperx.io>.

---

### Built with ❤️ by the Copperx Team

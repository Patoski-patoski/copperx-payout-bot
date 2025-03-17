import TelegramBot from 'node-telegram-bot-api';

import dotenv from 'dotenv';
dotenv.config();


// Replace with your bot's token from BotFather
// const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// // Create a bot that uses polling to fetch new updates
// const bot = new TelegramBot(TOKEN, { polling: true });
// bot.pa
// // Listen for any message
// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;

//   console.log("msg", msg);

//   const text = msg.text;

//   if (text === '/Jesus') {
//     bot.sendMessage(chatId, 'Welcome! Type /help to see available commands.');
//   } else if (text === '/help') {
//     bot.sendMessage(chatId, 'Available commands:\n/start - Start the bot\n/help - Get help info');
//   } else if (['Jesus', 'God', 'Lord'].includes(text)) {
//     bot.sendMessage(chatId, `God is good all the time and Christ is King!`);
//   } else {
//     console.log(typeof text);
//     bot.sendMessage(chatId, `You said: ${text}`);
//   }
// });

// bot.onText(/\/echo (.+)/, (msg, match) => {
//   const resp = match ? match[1] : '';
//   bot.sendMessage(msg.chat.id, resp);
// });

// console.log('Bot is running...');


const KYC_RESPONSE = {
  page: 1,
  limit: 10,
  count: 1,
  hasMore: false,
  data: [
     {
       id: '1344b767-70d0-4a88-95e4-2eaa0925490f',
       createdAt: '2025-03-15T06:11:01.441Z',
       updatedAt: '2025-03-16T04:19:36.431Z',
       providerCode: '0x21',
       kycProviderCode: 'persona',
       organizationId: 'cc279cb4-87a2-4938-8137-3e44e93a8f76',
       status: 'initiated',
       type: 'individual',
       country: 'nga',
       kycDetailId: '9aa6c0d1-eb7b-4978-ade5-d3a0459260eb', 
       kybDetailId: null,
       statusUpdates: [Object],
       kycDetail: [Object],
       kybDetail: null,
       kycAdditionalDocuments: []
     }
   ]
 }
 
 console.log(KYC_RESPONSE.data[0]);
 
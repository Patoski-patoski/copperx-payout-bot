import TelegramBot from 'node-telegram-bot-api';

import dotenv from 'dotenv';
dotenv.config();


// Replace with your bot's token from BotFather
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
  || "7666006531:AAEE1yhYGKHdda6Yr_rYc48ZwazFGGFmKpo";

// Create a bot that uses polling to fetch new updates
const bot = new TelegramBot(TOKEN, { polling: true });
bot.pa
// Listen for any message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  console.log("msg", msg);

  const text = msg.text;

  if (text === '/Jesus') {
    bot.sendMessage(chatId, 'Welcome! Type /help to see available commands.');
  } else if (text === '/help') {
    bot.sendMessage(chatId, 'Available commands:\n/start - Start the bot\n/help - Get help info');
  } else if (['Jesus', 'God', 'Lord'].includes(text)) {
    bot.sendMessage(chatId, `God is good all the time and Christ is King!`);
  } else {
    console.log(typeof text);
    bot.sendMessage(chatId, `You said: ${text}`);
  }
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  const resp = match ? match[1] : '';
  bot.sendMessage(msg.chat.id, resp);
});

console.log('Bot is running...');
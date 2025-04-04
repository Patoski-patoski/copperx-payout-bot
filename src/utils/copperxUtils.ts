// src/utils/copperxUtils.ts

import TelegramBot from "node-telegram-bot-api";
import { QuoteBreakdown } from "../types/copperx";


export function convertToBaseUnit(amount: number, decimals: number = 8)
    : string {
    return (amount * Math.pow(10, decimals)).toString();
}

export function convertFromBaseUnit(amount: number, decimals: number = 8)
    : number {
    return Number(amount) / Math.pow(10, decimals);
}

export const keyboard = [
    [
        { text: '💰 Check Balance', callback_data: 'balance' },
        { text: '👛 View Wallets', callback_data: 'wallets' },
    ],
    [
        { text: '✈️ Send Funds', callback_data: 'send' },
        { text: '🏧 Offramp Transfer', callback_data: 'withdraw' },
    ],
    [
        { text: '📦 Bulk Transfer', callback_data: 'bulk' },
        { text: '➕ Add Recipient', callback_data: 'add_recipient' },
        { text: '🔍 Review Bulk', callback_data: 'review' },
    ],
    [
        { text: '✨profile', callback_data: 'profile' },
        { text: '🔒 kyc', callback_data: 'kyc' },
        { text: '📝 history', callback_data: 'history' },
    ],
    [
        { text: '❓ Help', callback_data: 'help' },
        { text: '🚪 Exit', callback_data: 'exit' }
    ]
]

// Helper method to get display text for purpose code
export function getPurposeDisplayText(purposeCode: string): string {
    const purposeMap = {
        'self': '👤 Self',
        'salary': '💰 Salary',
        'gift': '🎁 Gift',
        'income': '💰 Income',
        'saving': '💰 Saving',
        'education_support': '🎓 Education Support',
        'family': '👨‍👩‍👧‍👦 Family',
        'home_improvement': '🏠 Home Improvement',
        'reimbursement': '💸 Reimbursement',
    };

    return purposeMap[purposeCode as keyof typeof purposeMap] || purposeCode;
}



// Emoji Mapping for Networks
export const networkEmoji: { [key: string]: string } = {
    'Ethereum': '⧫',
    'Polygon': '⬡',
    'Arbitrum': '🔵',
    'Base': '🟢',
    'Test Network': '🔧'
};

// Network Names Mapping
export const networkNames: { [key: string]: string } = {
    '1': 'Ethereum',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '8453': 'Base',
    '23434': 'Test Network'
};

// Utility Function to Get Emoji or Name
export function getNetworkEmoji(network: string): string {
    return networkEmoji[network] || '🌐';
}

export function getNetworkName(networkId: string): string {
    return networkNames[networkId] || 'Unknown Network';
}


export const symbolEmojis: { [key: string]: string } = {
    'USDC': '💵',
    'ETH': '⧫',
    'MATIC': '⬡',
};

export const offlineKeyBoardAndBack = (text: string, callback: string,
    force_reply: boolean = false) => {
    return {
        force_reply: force_reply,
        inline_keyboard: [
            [
                { text: text, callback_data: callback },
                { text: '🔙 Back', callback_data: 'commands' }
            ]
        ]
    }
}

export const offlineKeyBoardAndSend = () => {
    return {
        inline_keyboard: [
            [
                { text: '💰 Send funds', callback_data: 'send' },
                { text: '🔙 Back', callback_data: 'commands' }
            ]
        ]
    }
}

export const clearErrorMessage = (bot: TelegramBot,
    chatId: number,
    messageId: number,
    time: number = 15000) => {
    
    setTimeout(async () => {
        await bot.deleteMessage(chatId, messageId);
    }, time);
}

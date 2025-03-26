// src/utils/copperxUtils.ts

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
        { text: '📦 Bulk Transfer', callback_data: 'bulk' },
    ],
    [
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
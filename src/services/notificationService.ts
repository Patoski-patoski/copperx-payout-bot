// src/services/notificationService.ts
import Pusher from 'pusher-js';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config';

export class NotificationService {
    private pusherClient: Pusher | null = null;
    private bot: TelegramBot;
    private chatId: number;
    private organizationId: string;
    private token: string;

    constructor(bot: TelegramBot, chatId: number, organizationId: string, token: string) {
        this.bot = bot;
        this.chatId = chatId;
        this.organizationId = organizationId;
        this.token = token;
    }

    public connect(): void {
        if (this.pusherClient) {
            // Already connected
            return;
        }

        this.pusherClient = new Pusher('e089376087cac1a62785', {
            cluster: 'ap1',
            authorizer: (channel) => ({
                authorize: async (socketId, callback) => {
                    try {
                        const response = await axios.post(
                            `${config.copperx.apiBaseUrl}/api/notifications/auth`,
                            {
                                socket_id: socketId,
                                channel_name: channel.name
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${this.token}`
                                }
                            }
                        );

                        if (response.data) {
                            callback(null, response.data);
                        } else {
                            callback(new Error('Pusher authentication failed'), null);
                        }
                    } catch (error: any) {
                        console.error('Pusher authorization error:', error);
                        callback(error, null);
                    }
                }
            })
        });

        // Subscribe to organization's private channel
        const channelName = `private-org-${this.organizationId}`;
        const channel = this.pusherClient.subscribe(channelName);

        channel.bind('pusher:subscription_succeeded', () => {
            console.log(`Successfully subscribed to channel: ${channelName}`);
            // Notify the user that they're connected to notifications
            this.bot.sendMessage(this.chatId,
                '🔔 You are now subscribed to deposit notifications!'
            );
        });

        channel.bind('pusher:subscription_error', (error: any) => {
            console.error('Subscription error:', error);
            this.bot.sendMessage(this.chatId,
                '❌ Failed to subscribe to deposit notifications. Please try again later.'
            );
        });

        // Bind to the deposit event
        channel.bind('deposit', (data: any) => {
            console.log('Deposit notification received:', data);
            this.bot.sendMessage(this.chatId,
                `💰 *New Deposit Received*\n\n` +
                `Amount: ${data.amount} ${data.currency || 'USDC'}\n` +
                `Network: ${data.network || 'Solana'}\n` +
                `Wallet: ${data.walletAddress ? `...${data.walletAddress.slice(-6)}` : 'Default wallet'}\n` +
                `Transaction ID: ${data.txId ? `...${data.txId.slice(-10)}` : 'N/A'}`,
                { parse_mode: 'Markdown' }
            );
        });
    }

    public disconnect(): void {
        if (this.pusherClient) {
            this.pusherClient.disconnect();
            this.pusherClient = null;
            console.log('Disconnected from Pusher notifications');
        }
    }

    
}
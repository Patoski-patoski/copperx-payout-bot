#!/bin/bash

# Write "Hello World" to cron.txt
echo "Hello World!! Keep running" >> /mnt/c/Users/USER/copperx-telegram-bot/cron.txt

# Add a new line to the file
echo "" >> /mnt/c/Users/USER/copperx-telegram-bot/cron.txt

# Execute the curl command and store its response in cron.txt
curl -H "Content-Type: application/json" https://copperx-payout-bot-jufl.onrender.com/ >> /mnt/c/Users/USER/copperx-telegram-bot/cron.txt

# Add another new line to the file
echo "" >> /mnt/c/Users/USER/copperx-telegram-bot/cron.txt

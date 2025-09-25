# Telegram Notifications Setup

This guide explains how to set up Telegram notifications for order webhooks in your e-commerce management system.

## 📱 Step 1: Create a Telegram Bot

1. **Start a chat with BotFather**
   - Open Telegram and search for `@BotFather`
   - Start a conversation and send `/start`

2. **Create a new bot**
   - Send `/newbot` to BotFather
   - Choose a name for your bot (e.g., "My Store Order Bot")
   - Choose a unique username ending in "bot" (e.g., "mystoreorder_bot")

3. **Get your Bot Token**
   - BotFather will provide you with a token like: `123456789:ABCdefGHIjklMNOpqrSTUVwxYZ`
   - **Keep this token secure and never share it publicly**

## 🔧 Step 2: Configure Environment Variables

Add your Telegram Bot Token to your environment variables:

```env
# Add this to your .env.local file
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUVwxYZ
```

## 💬 Step 3: Get Your Chat ID

You have several options to get your Chat ID:

### Option A: Using @userinfobot
1. Search for `@userinfobot` on Telegram
2. Send `/start` to the bot
3. The bot will reply with your user information including your Chat ID

### Option B: Using @get_id_bot
1. Search for `@get_id_bot` on Telegram
2. Send `/start` to the bot
3. The bot will provide your Chat ID

### Option C: Manual Method
1. Start a chat with your newly created bot
2. Send any message to your bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the "chat" object in the response and note the "id" value

## ⚙️ Step 4: Configure in Settings

1. **Navigate to Settings**
   - Go to `/settings` in your application
   - Find the "Telegram Notifications" section

2. **Enter Chat ID**
   - Input your Chat ID in the provided field
   - Chat IDs can be positive (for direct messages) or negative (for groups)

3. **Test Connection**
   - Click the "Test" button to send a test message
   - Check your Telegram to confirm you received the test message

4. **Save Settings**
   - Click "Save Settings" to store your configuration

## 🛒 How It Works

Once configured, you'll receive automatic Telegram notifications when:

- **New WooCommerce orders** are received via webhook
- **New Shopify orders** are received via webhook

### Notification Format

```
🛍️ New Order Received!

📦 Order #: 12345
👤 Customer: John Doe
📧 Email: john@example.com
💰 Total: $99.99 USD
📊 Status: paid
🔗 From: WooCommerce

Items:
• Product Name (x2) - $49.99
• Another Product (x1) - $29.99

Order processed successfully via webhook
```

## 🔒 Security Notes

- **Keep your Bot Token secure** - never commit it to version control
- **Use environment variables** for sensitive configuration
- **Telegram Chat IDs are unique** to each user/group
- **Bot notifications are only sent for new orders** (not updates to existing orders)

## 🛠️ Troubleshooting

### "Failed to send test message"
- Verify your Bot Token is correct in `.env.local`
- Ensure you've started a chat with your bot first
- Check that your Chat ID is correct (positive for users, negative for groups)

### "Test passes but no webhook notifications"
- Verify your webhook endpoints are properly configured
- Check that your user has the correct Chat ID saved in user settings
- Review server logs for any Telegram API errors

### Bot not responding
- Confirm the Bot Token is correctly set in environment variables
- Make sure you've sent `/start` to your bot at least once
- Check if the bot is active (hasn't been deleted by BotFather)

## 📋 Environment Variables Summary

Required environment variables for Telegram notifications:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## 🚀 Features

- **Real-time notifications** for new orders
- **Rich formatting** with emojis and structured layout
- **Order details** including customer info, items, and totals
- **Platform identification** (WooCommerce vs Shopify)
- **Error handling** that doesn't break webhook processing
- **Test functionality** to verify setup

The Telegram notification system is now fully integrated and ready to alert you whenever new orders are placed through your e-commerce integrations!
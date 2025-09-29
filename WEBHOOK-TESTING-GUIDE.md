# 🧪 WooCommerce Webhook Testing Guide

This guide helps you test your WooCommerce webhook integration **safely** before connecting real data.

## 📋 Prerequisites

1. ✅ **Integration Setup**: You must have created a WooCommerce integration in your dashboard
2. ✅ **Webhook Secret**: You need your webhook secret from the integration dashboard
3. ✅ **Test Environment**: Recommended to test on development/staging first

## 🎯 Your Webhook Endpoint

Your WooCommerce webhook endpoint is:
```
https://astra-n.vercel.app/api/webhook/woocommerce-order-integration
```

## 🔐 Authentication Methods Supported

Your integration supports **4 different** authentication methods:

1. **Header Authentication** (Recommended)
   ```
   x-webhook-secret: wh_your_secret_here
   ```

2. **WooCommerce Signature** (Standard WooCommerce)
   ```
   x-wc-webhook-signature: base64_hmac_signature
   ```

3. **Query Parameter**
   ```
   ?webhook_secret=wh_your_secret_here
   ```

4. **Request Body**
   ```json
   {
     "webhook_secret": "wh_your_secret_here",
     "id": 12345,
     ...
   }
   ```

## 🚀 Quick Testing Methods

### Method 1: Automated Testing Script (Easiest)

1. **Get your webhook secret** from the Integration Dashboard
2. **Run the test script**:
   ```bash
   node test-webhook.js wh_your_actual_secret_here
   ```

3. **Check results**:
   - ✅ All tests should show SUCCESS
   - 📧 Check your database for new orders
   - 📱 Check Telegram notifications (if configured)

### Method 2: Manual cURL Testing

```bash
# Test with header authentication
curl -X POST https://astra-n.vercel.app/api/webhook/woocommerce-order-integration \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: wh_your_secret_here" \
  -d '{
    "id": 12345,
    "status": "processing",
    "currency": "USD",
    "date_created": "2024-01-15T10:30:00",
    "total": "159.99",
    "customer_id": 67890,
    "billing": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "test.customer@example.com",
      "phone": "+1234567890",
      "address_1": "123 Test St",
      "city": "Test City",
      "state": "CA",
      "postcode": "90210",
      "country": "US"
    },
    "shipping": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Test St",
      "city": "Test City",
      "state": "CA",
      "postcode": "90210",
      "country": "US"
    },
    "line_items": [
      {
        "id": 1,
        "name": "Test Product",
        "product_id": 100,
        "quantity": 2,
        "sku": "TEST-001",
        "price": 79.99,
        "total": "159.98"
      }
    ]
  }'
```

### Method 3: Postman/API Client

1. Import the `webhook-test-payloads.json` file
2. Set your webhook secret in environment variables
3. Send test requests

## 📊 What to Expect

### ✅ Successful Response
```json
{
  "success": true,
  "message": "WooCommerce order processed successfully",
  "data": {
    "orderId": 123,
    "customerId": 456,
    "externalOrderId": "12345",
    "status": "processing",
    "totalAmount": 159.99,
    "itemsCount": 1
  }
}
```

### ❌ Common Errors

| Error | Cause | Solution |
|-------|--------|----------|
| `Missing webhook secret` | No authentication provided | Add webhook secret via header, query, or body |
| `Invalid webhook secret` | Wrong secret or integration not found | Check your secret in Integration Dashboard |
| `Invalid content type` | Missing JSON header | Add `Content-Type: application/json` |
| `Invalid JSON` | Malformed request body | Validate your JSON payload |

## 🔍 Database Verification

After successful testing, check your database:

### Orders Table
```sql
SELECT * FROM orders
WHERE external_order_id = '12345'
ORDER BY created_at DESC;
```

### Customers Table
```sql
SELECT * FROM customers
WHERE email = 'test.customer@example.com'
ORDER BY created_at DESC;
```

### Order Items Table
```sql
SELECT oi.* FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.external_order_id = '12345';
```

## 📱 Telegram Notifications

If you have Telegram configured, test orders will send notifications. Look for:
- 🆕 **New Order** notifications for first-time orders
- 🔄 **Order Update** notifications for status changes

## 🧹 Test Data Cleanup

After testing, you may want to clean up test data:

```sql
-- Delete test order items
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE external_order_id IN ('12345', '12346', '12347')
);

-- Delete test orders
DELETE FROM orders
WHERE external_order_id IN ('12345', '12346', '12347');

-- Delete test customers (optional)
DELETE FROM customers
WHERE email LIKE '%.test@example.com';
```

## 🔧 Troubleshooting

### 1. Check Integration Status
- Go to Integration Dashboard
- Verify your WooCommerce integration is **Active**
- Copy the exact webhook secret

### 2. Check Network Logs
```bash
# Check if endpoint is reachable
curl -X GET https://astra-n.vercel.app/api/webhook/woocommerce-order-integration
# Should return 405 Method Not Allowed (expected)
```

### 3. Check Server Logs
- Monitor your application logs during testing
- Look for `[WOOCOMMERCE_WEBHOOK]` log entries

### 4. Validate JSON Payload
```bash
# Test your JSON is valid
echo '{"your": "json"}' | jq .
```

## 🎯 Real WooCommerce Setup

Once testing is successful, set up real WooCommerce webhooks:

### 1. In WooCommerce Admin
1. Go to **WooCommerce → Settings → Advanced → Webhooks**
2. Click **Add webhook**
3. Configure:
   - **Name**: `Astra CRM Orders`
   - **Status**: `Active`
   - **Topic**: `Order created` (and/or `Order updated`)
   - **Delivery URL**: `https://astra-n.vercel.app/api/webhook/woocommerce-order-integration`
   - **Secret**: `wh_your_secret_here` (from Integration Dashboard)

### 2. Authentication Method
Choose one of these methods:

**Option A: Header Authentication (Recommended)**
- WooCommerce will send your secret as `x-wc-webhook-signature`
- Your integration automatically handles this

**Option B: Query Parameter**
- Use delivery URL: `https://astra-n.vercel.app/api/webhook/woocommerce-order-integration?webhook_secret=wh_your_secret`

**Option C: Custom Header**
- Some WooCommerce plugins support custom headers
- Use `x-webhook-secret: wh_your_secret_here`

## 📈 Monitoring Production

After going live:

1. **Monitor Integration Dashboard** for new orders
2. **Check Telegram notifications**
3. **Review webhook delivery logs** in WooCommerce
4. **Monitor error rates** in your application logs

## 🆘 Support

If you encounter issues:

1. **Check this guide** first
2. **Review server logs** for error details
3. **Test with the automated script**
4. **Verify your integration setup**

## 📚 Files Reference

- `test-webhook.js` - Automated testing script
- `webhook-test-payloads.json` - Test data and examples
- `WEBHOOK-TESTING-GUIDE.md` - This guide

## ⚠️ Important Notes

- **Test data**: The testing creates real data in your database
- **Email addresses**: Use `.test@example.com` domains to avoid confusion
- **Order IDs**: Test payloads use IDs 12345-12347
- **Cleanup**: Consider cleaning up test data after verification
- **Production**: Always test thoroughly before going live with real orders

---

✅ **Ready to test?** Run `node test-webhook.js wh_your_secret_here` to get started!
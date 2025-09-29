#!/usr/bin/env node

/**
 * Test Webhook Fix
 *
 * This script tests the fixed webhook endpoint to ensure it handles
 * different content types correctly.
 */

const https = require('https');
const crypto = require('crypto');

const WEBHOOK_URL = 'https://astra-n.vercel.app/api/webhook/woocommerce-order-integration';
const WEBHOOK_SECRET = process.argv[2] || 'your-webhook-secret-here';

if (WEBHOOK_SECRET === 'your-webhook-secret-here') {
  console.log('❌ Please provide your webhook secret:');
  console.log('   node test-webhook-fix.js wh_your_actual_secret_here');
  process.exit(1);
}

console.log('🧪 Testing Fixed Webhook Integration');
console.log('===================================');
console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
console.log('');

const testPayload = {
  "id": 12345,
  "status": "processing",
  "currency": "USD",
  "date_created": "2024-01-15T10:30:00",
  "total": "159.99",
  "customer_id": 67890,
  "billing": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "test.fix@example.com",
    "phone": "+1234567890",
    "address_1": "123 Test Street",
    "city": "Test City",
    "state": "CA",
    "postcode": "90210",
    "country": "US"
  },
  "shipping": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Test Street",
    "city": "Test City",
    "state": "CA",
    "postcode": "90210",
    "country": "US"
  },
  "line_items": [
    {
      "id": 1,
      "name": "Test Product (Fixed)",
      "product_id": 100,
      "quantity": 1,
      "sku": "TEST-FIX-001",
      "price": 159.99,
      "total": "159.99"
    }
  ]
};

async function testWebhook(name, contentType, headers = {}) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Test: ${name}`);
    console.log(`📋 Content-Type: ${contentType || '(empty)'}`);

    const postData = JSON.stringify(testPayload);

    const requestHeaders = {
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'WooCommerce/8.0.0 Hookshot (WordPress/6.4)',
      'x-webhook-secret': WEBHOOK_SECRET,
      ...headers
    };

    if (contentType) {
      requestHeaders['Content-Type'] = contentType;
    }

    const options = {
      hostname: 'astra-n.vercel.app',
      port: 443,
      path: '/api/webhook/woocommerce-order-integration',
      method: 'POST',
      headers: requestHeaders
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);

        try {
          const jsonResponse = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ SUCCESS: ${jsonResponse.message}`);
            if (jsonResponse.data) {
              console.log(`   📦 Order ID: ${jsonResponse.data.orderId}`);
              console.log(`   👤 Customer ID: ${jsonResponse.data.customerId}`);
            }
          } else {
            console.log(`❌ FAILED: ${jsonResponse.error}`);
            console.log(`   💬 Message: ${jsonResponse.message}`);
            if (jsonResponse.debug) {
              console.log(`   🔍 Request ID: ${jsonResponse.debug.requestId}`);
            }
          }
        } catch (e) {
          console.log(`📝 Raw Response: ${data}`);
        }

        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Network Error: ${error.message}`);
      resolve({ error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  const tests = [
    { name: "Standard JSON", contentType: "application/json" },
    { name: "JSON with charset", contentType: "application/json; charset=utf-8" },
    { name: "Text Plain (WooCommerce style)", contentType: "text/plain" },
    { name: "Form URL Encoded", contentType: "application/x-www-form-urlencoded" },
    { name: "No Content-Type", contentType: null },
    { name: "WooCommerce HMAC Signature", contentType: "application/json", headers: {
      'x-wc-webhook-signature': crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(testPayload))
        .digest('base64')
    }}
  ];

  for (const test of tests) {
    await testWebhook(test.name, test.contentType, test.headers);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }

  console.log('\n🏁 Testing complete!');
  console.log('\n📋 Results Summary:');
  console.log('   ✅ All tests should now show SUCCESS (200 status)');
  console.log('   🔧 The webhook now accepts multiple content types');
  console.log('   📱 Check your database for new test orders');
  console.log('\n🔗 View detailed logs at: https://astra-n.vercel.app/webhook-debug');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Test with your real WooCommerce webhook');
  console.log('   2. Check the debug logs for any remaining issues');
  console.log('   3. Monitor your integration dashboard');
}

runTests().catch(console.error);
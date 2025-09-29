#!/usr/bin/env node

/**
 * Debug 400 Error Script
 *
 * This script helps debug the 400 error you're getting from WooCommerce
 * by testing different request formats and showing detailed responses.
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

const WEBHOOK_URL = 'https://astra-n.vercel.app/api/webhook/woocommerce-order-integration';
const LOCAL_URL = 'http://localhost:3000/api/webhook/woocommerce-order-integration';

// Get webhook secret from command line
const WEBHOOK_SECRET = process.argv[2] || 'your-webhook-secret-here';

if (WEBHOOK_SECRET === 'your-webhook-secret-here') {
  console.log('❌ Please provide your webhook secret:');
  console.log('   node debug-400-error.js wh_your_actual_secret_here');
  process.exit(1);
}

console.log('🔍 Debugging WooCommerce Webhook 400 Error');
console.log('==========================================');
console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
console.log('');

// Minimal test payload (exactly what WooCommerce might send)
const minimalPayload = {
  "id": 123,
  "status": "processing",
  "currency": "USD",
  "date_created": "2024-01-15T10:30:00",
  "total": "50.00",
  "customer_id": 456,
  "billing": {
    "first_name": "Test",
    "last_name": "Customer",
    "email": "test@example.com",
    "phone": "",
    "address_1": "123 Test St",
    "address_2": "",
    "city": "Test City",
    "state": "CA",
    "postcode": "90210",
    "country": "US"
  },
  "shipping": {
    "first_name": "Test",
    "last_name": "Customer",
    "address_1": "123 Test St",
    "address_2": "",
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
      "quantity": 1,
      "sku": "TEST-001",
      "price": 50.00,
      "total": "50.00"
    }
  ]
};

// Empty payload test
const emptyPayload = {};

// WooCommerce-style test
const woocommerceStylePayload = {
  ...minimalPayload,
  "number": "123",
  "order_key": "wc_order_test123",
  "created_via": "admin",
  "version": "8.0.0",
  "status": "processing",
  "currency": "USD",
  "date_created": "2024-01-15T10:30:00",
  "date_created_gmt": "2024-01-15T10:30:00",
  "date_modified": "2024-01-15T10:30:00",
  "date_modified_gmt": "2024-01-15T10:30:00",
  "discount_total": "0.00",
  "discount_tax": "0.00",
  "shipping_total": "0.00",
  "shipping_tax": "0.00",
  "cart_tax": "0.00",
  "total": "50.00",
  "total_tax": "0.00",
  "prices_include_tax": false,
  "customer_id": 456,
  "customer_ip_address": "",
  "customer_user_agent": "",
  "customer_note": "",
  "payment_method": "",
  "payment_method_title": "",
  "transaction_id": "",
  "date_paid": null,
  "date_completed": null,
  "cart_hash": "",
  "meta_data": [],
  "coupon_lines": [],
  "refunds": [],
  "fee_lines": [],
  "tax_lines": []
};

async function testWebhookCall(name, url, payload, headers = {}) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Test: ${name}`);
    console.log(`📡 URL: ${url}`);
    console.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);
    console.log(`📦 Payload size: ${JSON.stringify(payload).length} characters`);

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    const postData = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WooCommerce/8.0.0 Hookshot (WordPress/6.4)',
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📄 Response Headers:`, res.headers);

        try {
          const jsonResponse = JSON.parse(data);
          console.log(`✅ Response JSON:`, JSON.stringify(jsonResponse, null, 2));
        } catch (e) {
          console.log(`📝 Raw Response:`, data);
        }

        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Network Error: ${error.message}`);
      resolve({
        error: error.message
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runDebugTests() {
  const tests = [
    // Test 1: Basic header authentication
    {
      name: "Header Auth (x-webhook-secret)",
      url: WEBHOOK_URL,
      payload: minimalPayload,
      headers: { 'x-webhook-secret': WEBHOOK_SECRET }
    },

    // Test 2: Query parameter authentication
    {
      name: "Query Parameter Auth",
      url: `${WEBHOOK_URL}?webhook_secret=${WEBHOOK_SECRET}`,
      payload: minimalPayload,
      headers: {}
    },

    // Test 3: Body authentication
    {
      name: "Body Auth",
      url: WEBHOOK_URL,
      payload: { ...minimalPayload, webhook_secret: WEBHOOK_SECRET },
      headers: {}
    },

    // Test 4: WooCommerce signature
    {
      name: "WooCommerce HMAC Signature",
      url: WEBHOOK_URL,
      payload: minimalPayload,
      headers: {
        'x-wc-webhook-signature': crypto
          .createHmac('sha256', WEBHOOK_SECRET)
          .update(JSON.stringify(minimalPayload))
          .digest('base64')
      }
    },

    // Test 5: Empty payload
    {
      name: "Empty Payload Test",
      url: WEBHOOK_URL,
      payload: emptyPayload,
      headers: { 'x-webhook-secret': WEBHOOK_SECRET }
    },

    // Test 6: Full WooCommerce-style payload
    {
      name: "Full WooCommerce Payload",
      url: WEBHOOK_URL,
      payload: woocommerceStylePayload,
      headers: { 'x-webhook-secret': WEBHOOK_SECRET }
    },

    // Test 7: No authentication (should fail with 401)
    {
      name: "No Authentication (Expected 401)",
      url: WEBHOOK_URL,
      payload: minimalPayload,
      headers: {}
    },

    // Test 8: Wrong content type
    {
      name: "Wrong Content-Type (Expected 400)",
      url: WEBHOOK_URL,
      payload: minimalPayload,
      headers: {
        'Content-Type': 'text/plain',
        'x-webhook-secret': WEBHOOK_SECRET
      }
    }
  ];

  for (const test of tests) {
    await testWebhookCall(test.name, test.url, test.payload, test.headers);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🏁 Debug testing complete!');
  console.log('\n📋 What to look for:');
  console.log('   ✅ Status 200 = Success');
  console.log('   ❌ Status 400 = Bad Request (check the error message)');
  console.log('   ❌ Status 401 = Unauthorized (webhook secret issue)');
  console.log('   ❌ Status 500 = Server Error');
  console.log('\n🔗 Check the debug logs at: https://astra-n.vercel.app/webhook-debug');
  console.log('   This will show you the exact request WooCommerce is sending');
}

// Run the tests
runDebugTests().catch(console.error);
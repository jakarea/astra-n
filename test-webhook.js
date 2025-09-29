#!/usr/bin/env node

/**
 * WooCommerce Webhook Tester
 *
 * This script helps you test your WooCommerce webhook integration safely
 * without needing real WooCommerce data.
 *
 * Usage:
 * node test-webhook.js [your-webhook-secret]
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = 'https://astra-n.vercel.app/api/webhook/woocommerce-order-integration';
const LOCAL_URL = 'http://localhost:3000/api/webhook/woocommerce-order-integration';

// Get webhook secret from command line argument or use placeholder
const WEBHOOK_SECRET = process.argv[2] || 'your-webhook-secret-here';

if (WEBHOOK_SECRET === 'your-webhook-secret-here') {
  console.log('❌ Please provide your actual webhook secret as an argument:');
  console.log('   node test-webhook.js wh_your_actual_secret_here');
  console.log('');
  console.log('You can find your webhook secret in the Integration Dashboard');
  process.exit(1);
}

// Test payloads - these simulate real WooCommerce order data
const testPayloads = {
  newOrder: {
    id: 12345,
    status: "processing",
    currency: "USD",
    date_created: "2024-01-15T10:30:00",
    total: "159.99",
    customer_id: 67890,
    billing: {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe.test@example.com",
      phone: "+1234567890",
      address_1: "123 Test Street",
      address_2: "Apt 4B",
      city: "Test City",
      state: "CA",
      postcode: "90210",
      country: "US",
      company: "Test Company LLC"
    },
    shipping: {
      first_name: "John",
      last_name: "Doe",
      address_1: "123 Test Street",
      address_2: "Apt 4B",
      city: "Test City",
      state: "CA",
      postcode: "90210",
      country: "US",
      company: "Test Company LLC"
    },
    line_items: [
      {
        id: 1,
        name: "Premium Test Product",
        product_id: 100,
        quantity: 2,
        sku: "TEST-PROD-001",
        price: 79.99,
        total: "159.98"
      },
      {
        id: 2,
        name: "Test Shipping",
        product_id: 0,
        quantity: 1,
        sku: "",
        price: 0.01,
        total: "0.01"
      }
    ]
  },

  orderUpdate: {
    id: 12345,
    status: "completed",
    currency: "USD",
    date_created: "2024-01-15T10:30:00",
    total: "159.99",
    customer_id: 67890,
    billing: {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe.test@example.com",
      phone: "+1234567890",
      address_1: "123 Test Street",
      address_2: "Apt 4B",
      city: "Test City",
      state: "CA",
      postcode: "90210",
      country: "US",
      company: "Test Company LLC"
    },
    shipping: {
      first_name: "John",
      last_name: "Doe",
      address_1: "123 Test Street",
      address_2: "Apt 4B",
      city: "Test City",
      state: "CA",
      postcode: "90210",
      country: "US",
      company: "Test Company LLC"
    },
    line_items: [
      {
        id: 1,
        name: "Premium Test Product",
        product_id: 100,
        quantity: 2,
        sku: "TEST-PROD-001",
        price: 79.99,
        total: "159.98"
      },
      {
        id: 2,
        name: "Test Shipping",
        product_id: 0,
        quantity: 1,
        sku: "",
        price: 0.01,
        total: "0.01"
      }
    ]
  }
};

// Function to send webhook test
async function sendWebhookTest(url, payload, method = 'header') {
  return new Promise((resolve) => {
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
        'User-Agent': 'WooCommerce-Webhook-Tester/1.0'
      }
    };

    // Add webhook secret based on method
    switch (method) {
      case 'header':
        options.headers['x-webhook-secret'] = WEBHOOK_SECRET;
        break;
      case 'query':
        options.path += (options.path.includes('?') ? '&' : '?') + `webhook_secret=${WEBHOOK_SECRET}`;
        break;
      case 'body':
        payload.webhook_secret = WEBHOOK_SECRET;
        postData = JSON.stringify(payload);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
        break;
      case 'wc-signature':
        // Generate WooCommerce-style HMAC signature
        const crypto = require('crypto');
        const signature = crypto
          .createHmac('sha256', WEBHOOK_SECRET)
          .update(postData, 'utf8')
          .digest('base64');
        options.headers['x-wc-webhook-signature'] = signature;
        break;
    }

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            response: jsonResponse,
            method: method
          });
        } catch (e) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            response: data,
            method: method,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        method: method
      });
    });

    req.write(postData);
    req.end();
  });
}

// Function to run all tests
async function runTests() {
  console.log('🧪 WooCommerce Webhook Integration Tester');
  console.log('==========================================');
  console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  console.log('');

  const tests = [
    { name: '📝 New Order (Header Auth)', url: WEBHOOK_URL, payload: testPayloads.newOrder, method: 'header' },
    { name: '🔄 Order Update (Header Auth)', url: WEBHOOK_URL, payload: testPayloads.orderUpdate, method: 'header' },
    { name: '📝 New Order (Query Auth)', url: WEBHOOK_URL, payload: testPayloads.newOrder, method: 'query' },
    { name: '📝 New Order (Body Auth)', url: WEBHOOK_URL, payload: testPayloads.newOrder, method: 'body' },
    { name: '📝 New Order (WC Signature)', url: WEBHOOK_URL, payload: testPayloads.newOrder, method: 'wc-signature' }
  ];

  // Test if local development server is running
  console.log('🔍 Checking if local development server is running...');
  const localTest = await sendWebhookTest(LOCAL_URL, { test: true }, 'header');

  if (localTest.success || localTest.statusCode) {
    console.log('✅ Local server detected, adding local tests');
    tests.push(
      { name: '🏠 Local New Order (Header)', url: LOCAL_URL, payload: testPayloads.newOrder, method: 'header' },
      { name: '🏠 Local Order Update (Header)', url: LOCAL_URL, payload: testPayloads.orderUpdate, method: 'header' }
    );
  } else {
    console.log('ℹ️  Local server not running (this is fine for production testing)');
  }

  console.log('');
  console.log('🚀 Starting webhook tests...');
  console.log('');

  for (const test of tests) {
    console.log(`${test.name}:`);
    console.log(`   URL: ${test.url}`);
    console.log(`   Method: ${test.method}`);

    const result = await sendWebhookTest(test.url, test.payload, test.method);

    if (result.success) {
      console.log(`   ✅ SUCCESS (${result.statusCode})`);
      console.log(`   📊 Response: ${result.response.message || 'Success'}`);
      if (result.response.data) {
        console.log(`   📦 Order ID: ${result.response.data.orderId}`);
        console.log(`   👤 Customer ID: ${result.response.data.customerId}`);
        console.log(`   💰 Amount: $${result.response.data.totalAmount}`);
      }
    } else {
      console.log(`   ❌ FAILED (${result.statusCode || 'Network Error'})`);
      console.log(`   🔍 Error: ${result.response?.error || result.error || 'Unknown error'}`);
      console.log(`   💬 Message: ${result.response?.message || result.statusMessage || 'No message'}`);
    }
    console.log('');
  }

  console.log('🏁 Testing complete!');
  console.log('');
  console.log('📋 What to check:');
  console.log('   1. ✅ All tests should return success (200 status)');
  console.log('   2. 📧 Check your database for test orders');
  console.log('   3. 📱 Check Telegram notifications (if configured)');
  console.log('   4. 🔍 Check server logs for any errors');
  console.log('');
  console.log('⚠️  Note: These tests create real data in your database.');
  console.log('   You may want to clean up test orders afterward.');
}

// Run the tests
runTests().catch(console.error);
#!/usr/bin/env node

/**
 * Test Production Webhook
 *
 * This script tests the production webhook to see if it's working
 * and logs detailed information about the responses
 */

const https = require('https');

const WEBHOOK_SECRET = process.argv[2] || 'your-webhook-secret-here';

if (WEBHOOK_SECRET === 'your-webhook-secret-here') {
  console.log('❌ Please provide your webhook secret:');
  console.log('   node test-production-webhook.js wh_your_actual_secret_here');
  process.exit(1);
}

console.log('🧪 Testing Production Webhook');
console.log('============================');
console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
console.log('');

const testPayload = {
  "id": 99999,
  "status": "processing",
  "currency": "USD",
  "date_created": "2024-01-15T10:30:00",
  "total": "99.99",
  "customer_id": 55555,
  "billing": {
    "first_name": "Production",
    "last_name": "Test",
    "email": "production.test@example.com",
    "phone": "+1111111111",
    "address_1": "999 Production St",
    "city": "Test City",
    "state": "CA",
    "postcode": "90210",
    "country": "US"
  },
  "shipping": {
    "first_name": "Production",
    "last_name": "Test",
    "address_1": "999 Production St",
    "city": "Test City",
    "state": "CA",
    "postcode": "90210",
    "country": "US"
  },
  "line_items": [
    {
      "id": 1,
      "name": "Production Test Product",
      "product_id": 999,
      "quantity": 1,
      "sku": "PROD-TEST-001",
      "price": 99.99,
      "total": "99.99"
    }
  ]
};

async function testWebhook(name, contentType) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Test: ${name}`);
    console.log(`📋 Content-Type: ${contentType || '(empty)'}`);

    const postData = JSON.stringify(testPayload);

    const requestHeaders = {
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'ProductionWebhookTest/1.0',
      'x-webhook-secret': WEBHOOK_SECRET
    };

    if (contentType) {
      requestHeaders['Content-Type'] = contentType;
    }

    console.log(`📤 Sending request to production...`);

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
        console.log(`📄 Response Headers:`, JSON.stringify(res.headers, null, 2));

        try {
          const jsonResponse = JSON.parse(data);
          console.log(`📝 Response Body:`, JSON.stringify(jsonResponse, null, 2));

          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ SUCCESS!`);
          } else {
            console.log(`❌ FAILED!`);
            if (jsonResponse.debug) {
              console.log(`🔍 Debug Info:`, JSON.stringify(jsonResponse.debug, null, 2));
            }
          }
        } catch (e) {
          console.log(`📝 Raw Response:`, data);
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

async function runProductionTest() {
  console.log('🚀 Testing current production deployment...');

  // First test with standard JSON (should work)
  await testWebhook('Standard JSON (should work)', 'application/json');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Then test with text/plain (this will show if the fix is deployed)
  await testWebhook('Text Plain (shows if fix is deployed)', 'text/plain');

  console.log('\n🏁 Production test complete!');
  console.log('\n📋 Analysis:');
  console.log('   ✅ If both tests show SUCCESS = Fix is deployed');
  console.log('   ❌ If text/plain fails = Old version still deployed');
  console.log('\n🔧 If fix not deployed:');
  console.log('   1. Check Vercel deployment logs');
  console.log('   2. Make a small commit to trigger new deployment');
  console.log('   3. Wait for deployment to complete');
}

runProductionTest().catch(console.error);
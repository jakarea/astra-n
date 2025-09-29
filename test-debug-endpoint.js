#!/usr/bin/env node

/**
 * Test Debug Endpoint
 *
 * Quick test to verify the debug capture endpoint is working
 */

const https = require('https');

console.log('🧪 Testing Debug Capture Endpoint');
console.log('=================================');

const testPayload = {
  test: true,
  message: 'Debug endpoint test'
};

const postData = JSON.stringify(testPayload);

const options = {
  hostname: 'astra-n.vercel.app',
  port: 443,
  path: '/api/webhook/debug-capture',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'DebugEndpointTest/1.0'
  }
};

console.log('📤 Sending test request to debug endpoint...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);

    try {
      const jsonResponse = JSON.parse(data);
      console.log(`📝 Response:`, JSON.stringify(jsonResponse, null, 2));

      if (res.statusCode === 200) {
        console.log('✅ Debug endpoint is working!');
        console.log('\n🎯 Next step: Update your WooCommerce webhook URL to:');
        console.log('   https://astra-n.vercel.app/api/webhook/debug-capture');
        console.log('\n📋 After triggering a real webhook:');
        console.log('   1. Check Vercel function logs for detailed output');
        console.log('   2. Look for [WEBHOOK_DEBUG_CAPTURE] entries');
        console.log('   3. Analyze the real WooCommerce request format');
      } else {
        console.log('❌ Debug endpoint issue');
      }
    } catch (e) {
      console.log(`📝 Raw response: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Network Error: ${error.message}`);
});

req.write(postData);
req.end();
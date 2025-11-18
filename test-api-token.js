#!/usr/bin/env node

/**
 * 🧪 Test API Token - svag v1.2.0
 * 
 * Tento skript testuje, jestli je váš JWT token funkční proti API.
 * 
 * Použití:
 *   node test-api-token.js <YOUR_JWT_TOKEN>
 * 
 * Nebo:
 *   node test-api-token.js
 *   (skript se zeptá na token interaktivně)
 */

const https = require('https');

// Testovací SVG data
const TEST_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#000000" d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
</svg>`;

const API_URL = 'https://svag.pro/api/gallery';

function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Nevalidní JWT formát');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const exp = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = exp < now;
    const timeLeft = ((exp - now) / 1000 / 60).toFixed(1);
    
    return {
      payload,
      exp,
      isExpired,
      timeLeft
    };
  } catch (error) {
    console.error('❌ Chyba při dekódování tokenu:', error.message);
    return null;
  }
}

function testApiToken(token) {
  return new Promise((resolve, reject) => {
    console.log('\n🧪 TEST API TOKEN - svag v1.2.0\n');
    console.log('═'.repeat(60));
    
    // Dekóduj token
    const tokenInfo = decodeToken(token);
    if (!tokenInfo) {
      reject(new Error('Nelze dekódovat token'));
      return;
    }
    
    console.log('\n📋 TOKEN INFO:');
    console.log('─'.repeat(60));
    console.log(`User ID:    ${tokenInfo.payload.userId || 'N/A'}`);
    console.log(`Email:      ${tokenInfo.payload.email || 'N/A'}`);
    console.log(`Expirace:   ${tokenInfo.exp.toLocaleString()}`);
    console.log(`Status:     ${tokenInfo.isExpired ? '❌ VYPRŠEL' : `✅ Platný (${tokenInfo.timeLeft} min)`}`);
    console.log(`Length:     ${token.length} chars`);
    console.log(`Preview:    ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
    
    if (tokenInfo.isExpired) {
      console.log('\n⚠️  VAROVÁNÍ: Token je vypršelý!');
    }
    
    // Připrav request data
    const requestData = JSON.stringify({
      svg: TEST_SVG,
      name: 'test-icon-' + Date.now()
    });
    
    console.log('\n📤 REQUEST:');
    console.log('─'.repeat(60));
    console.log(`URL:        ${API_URL}`);
    console.log(`Method:     POST`);
    console.log(`Body size:  ${requestData.length} bytes`);
    
    // Parsuj URL
    const url = new URL(API_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'Authorization': `Bearer ${token}`
      }
    };
    
    console.log('\n🚀 Odesílám request...\n');
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 RESPONSE:');
        console.log('─'.repeat(60));
        console.log(`Status:     ${res.statusCode} ${res.statusMessage}`);
        console.log(`Headers:    ${JSON.stringify(res.headers, null, 2)}`);
        
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
          console.log(`Body:       ${JSON.stringify(parsedData, null, 2)}`);
        } catch {
          console.log(`Body:       ${responseData}`);
          parsedData = responseData;
        }
        
        console.log('\n' + '═'.repeat(60));
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('\n✅ SUCCESS! API call byl úspěšný.');
          resolve({ status: res.statusCode, data: parsedData });
        } else {
          console.log(`\n❌ ERROR! API vrátil ${res.statusCode}`);
          
          if (res.statusCode === 401) {
            console.log('\n💡 TIP: Token je neplatný nebo vypršel.');
            console.log('   → Zkuste se odhlásit a znovu přihlásit v extension popup.');
            console.log('   → Zkontrolujte, jestli je token správně zkopírovaný.');
          } else if (res.statusCode === 400) {
            console.log('\n💡 TIP: Špatný formát requestu.');
            console.log('   → Zkontrolujte, jestli SVG data jsou validní.');
          }
          
          reject(new Error(`API error: ${res.statusCode} - ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('\n❌ FETCH ERROR:', error.message);
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Main
(async () => {
  let token = process.argv[2];
  
  if (!token) {
    console.log('💡 Token nebyl poskytnut jako argument.');
    console.log('   Použití: node test-api-token.js <YOUR_JWT_TOKEN>');
    console.log('\n   Nebo zkopírujte token a stiskněte Enter...');
    
    // Pokud běží interaktivně, čekej na vstup
    if (process.stdin.isTTY) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      token = await new Promise((resolve) => {
        rl.question('🔑 Vložte token: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
    } else {
      console.error('❌ Token není poskytnut a nelze číst z stdin.');
      process.exit(1);
    }
  }
  
  if (!token) {
    console.error('❌ Token je prázdný.');
    process.exit(1);
  }
  
  try {
    await testApiToken(token);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test selhal:', error.message);
    process.exit(1);
  }
})();


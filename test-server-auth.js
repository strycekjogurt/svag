// Test server authentication
// Použití: node test-server-auth.js YOUR_TOKEN

const token = process.argv[2];

if (!token) {
  console.log('❌ Usage: node test-server-auth.js YOUR_TOKEN');
  console.log('');
  console.log('💡 Token můžete získat z extension popup console:');
  console.log('   1. Otevřete extension popup');
  console.log('   2. Pravý klik → Inspect');
  console.log('   3. V console najděte: "Token length: XXX"');
  console.log('   4. Zkopírujte token ze storage pomocí:');
  console.log('      chrome.storage.sync.get(["apiToken"], r => console.log(r.apiToken))');
  process.exit(1);
}

const apiUrl = 'https://svag.pro';

console.log('🧪 Testing server authentication...');
console.log('📍 API URL:', apiUrl);
console.log('🔑 Token length:', token.length);
console.log('🔑 Token preview:', token.substring(0, 30) + '...');
console.log('');

async function testEndpoint(endpoint, method = 'GET') {
  console.log(`\n📤 Testing: ${method} ${endpoint}`);
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Status:', response.status, response.statusText);
    console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));
    
    const body = await response.text();
    console.log('📥 Body:', body);
    
    if (response.ok) {
      console.log('✅ SUCCESS');
    } else {
      console.log('❌ FAILED');
    }
    
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    console.error('❌ FETCH ERROR:', error.message);
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🏁 Starting tests...\n');
  
  // Test 1: Gallery endpoint
  const test1 = await testEndpoint('/api/gallery');
  
  // Test 2: Stats endpoint
  const test2 = await testEndpoint('/api/gallery/stats');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log('Gallery:', test1.ok ? '✅ PASS' : '❌ FAIL');
  console.log('Stats:', test2.ok ? '✅ PASS' : '❌ FAIL');
  
  if (!test1.ok || !test2.ok) {
    console.log('\n🔍 TROUBLESHOOTING:');
    console.log('1. Je server spuštěný? (npm run dev)');
    console.log('2. Je token validní? (zkontrolujte expiraci)');
    console.log('3. Server logy - co ukazují?');
    console.log('4. CORS config - povoluje Authorization header?');
  }
}

runTests().catch(console.error);


// Test Birdeye API key
const apiKey = 'e5a640c62e4e40ff857da103551f1806';

async function testBirdeyeAPI() {
  console.log('Testing Birdeye API key...\n');

  const options = {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'x-chain': 'solana',
      'content-type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({
      list_address: 'So11111111111111111111111111111111111111112,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    })
  };

  try {
    const response = await fetch('https://public-api.birdeye.so/defi/multi_price?ui_amount_mode=raw', options);
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! API key is valid and working.');
    } else {
      console.log('\n❌ FAILED! API returned error.');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testBirdeyeAPI();

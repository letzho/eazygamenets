const fetch = require('node-fetch');

async function testCheckInAPI() {
  try {
    console.log('Testing check-in API...');
    
    // Test with a valid user ID (we know user ID 8 exists)
    const testData = {
      userId: 8
    };
    
    console.log('Sending request to:', 'http://localhost:3002/api/check-in');
    console.log('Request data:', testData);
    
    const response = await fetch('http://localhost:3002/api/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Check-in successful!');
      console.log('Coins earned:', data.coinsEarned);
      console.log('Check-in data:', data.checkInData);
    } else {
      console.log('❌ Check-in failed:');
      console.log('Message:', data.message);
      console.log('Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testCheckInAPI();




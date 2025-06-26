const fetch = require('node-fetch');

async function testGenerateShader() {
  try {
    const response = await fetch('http://localhost:3000/api/shader/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A red circle that pulses'
      }),
    });

    const data = await response.json();
    console.log('Generate response:', data);
    return data.id;
  } catch (error) {
    console.error('Generate error:', error.message);
    return null;
  }
}

async function testEvaluateShader(id) {
  try {
    const response = await fetch('http://localhost:3000/api/shader/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
        screenshots: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==']
      }),
    });

    const data = await response.json();
    console.log('Evaluate response:', data);
  } catch (error) {
    console.error('Evaluate error:', error.message);
  }
}

async function main() {
  console.log('Testing API endpoints...');
  
  const shaderId = await testGenerateShader();
  if (shaderId) {
    await testEvaluateShader(shaderId);
  }
}

main(); 
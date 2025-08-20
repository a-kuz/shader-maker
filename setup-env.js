const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('ShaderMaker Environment Setup');
console.log('-----------------------------');
console.log('This script will help you set up your environment variables.');
console.log('You will need an OpenAI API key to use this application.');
console.log('');

rl.question('Enter your OpenAI API key: ', (apiKey) => {
  const envContent = `OPENAI_KEY=${apiKey.trim()}`;
  const envPath = path.join(__dirname, '.env.local');
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('');
  console.log('Environment variables have been set up successfully!');
  console.log(`Created ${envPath}`);
  console.log('');
  console.log('You can now run the application with:');
  console.log('npm run dev');
  
  rl.close();
}); 
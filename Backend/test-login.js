const http = require('http');

const data = JSON.stringify({
  email: 'ansumanaheer8@gmail.com',
  password: 'Kash@5612'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let responseBody = '';
  res.on('data', chunk => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', responseBody);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();

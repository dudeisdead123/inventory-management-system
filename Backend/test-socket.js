const { io } = require('socket.io-client');
const http = require('http');

console.log('Connecting to socket...');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('Socket connected! ID:', socket.id);
    
    // Trigger an add stock query
    const data = JSON.stringify({ email: 'ansumanaheer8@gmail.com', password: 'Kash@5612' });
    const req1 = http.request({
        hostname: 'localhost', port: 3001, path: '/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res1 => {
        let body1 = '';
        res1.on('data', d => body1 += d);
        res1.on('end', () => {
            const token = JSON.parse(body1).authtoken;
            
            // Wait a moment then add stock to trigger emit
            setTimeout(() => {
                const Products = require('./Models/Products');
                const mongoose = require('mongoose');
                mongoose.connect('mongodb://127.0.0.1:27017/IMS').then(async () => {
                    const prod = await Products.findOne({});
                    if(prod) {
                        const payload = JSON.stringify({ location: 'mumbai', quantity: 1, reason: 'Socket test' });
                        const req2 = http.request({
                            hostname: 'localhost', port: 3001, path: `/stock/add/${prod._id}`, method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, 'auth-token': token }
                        }, res2 => {
                            let body2 = ''; res2.on('data', d => body2 += d);
                            res2.on('end', () => {
                                console.log("Add stock returned:", body2);
                            });
                        });
                        req2.write(payload); req2.end();
                    }
                });
            }, 1000);
        });
    });
    req1.write(data); req1.end();
});

socket.on('stockUpdated', (data) => {
    console.log('RECEIVED stockUpdated event!', data);
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.log('Connect error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout waiting for event');
    process.exit(1);
}, 5000);

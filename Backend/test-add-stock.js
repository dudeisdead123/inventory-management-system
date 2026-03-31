const http = require('http');
const mongoose = require('mongoose');
const User = require('./Models/User');
const Products = require('./Models/Products');
const bcrypt = require('bcryptjs');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/IMS');
    
    const admin = await User.findOne({ email: 'ansumanaheer8@gmail.com' });
    const json = JSON.stringify({ email: admin.email, password: 'Kash@5612' });
    
    // Login to get token
    const req1 = http.request({
        hostname: 'localhost', port: 3001, path: '/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': json.length }
    }, res1 => {
        let body1 = '';
        res1.on('data', d => body1 += d);
        res1.on('end', async () => {
            const token = JSON.parse(body1).authtoken;
            
            // Get a product
            const prod = await Products.findOne({});
            if (!prod) {
                console.log("No product found!");
                process.exit();
            }
            
            // Try to add stock
            const payload = JSON.stringify({
                location: 'mumbai',
                quantity: 10,
                reason: 'Testing',
                reference: 'Test'
            });
            
            const req2 = http.request({
                hostname: 'localhost', port: 3001, path: `/stock/add/${prod._id}`, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, 'auth-token': token }
            }, res2 => {
                let body2 = '';
                res2.on('data', d => body2 += d);
                res2.on('end', () => {
                    console.log("Status:", res2.statusCode);
                    console.log("Response:", body2);
                    process.exit();
                });
            });
            req2.write(payload);
            req2.end();
        });
    });
    req1.write(json);
    req1.end();
}
test();

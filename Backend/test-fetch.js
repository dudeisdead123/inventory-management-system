const mongoose = require('mongoose');
const User = require('./Models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret'; // Or whatever it is in backend

async function testFetch() {
    await mongoose.connect('mongodb://127.0.0.1:27017/IMS');
    const user = await User.findOne({ email: 'ansumanaheer8@gmail.com' });
    if (!user) {
        console.log("No user found");
        return process.exit();
    }
    const data = { user: { id: user.id } };
    const authtoken = jwt.sign(data, JWT_SECRET);
    
    console.log("Token generated:", authtoken.substring(0, 15) + "...");
    
    // simulate Express Router
    const products = require('./Models/Products');
    const getProducts = await products.find({});
    console.log("DB returned array length:", getProducts.length);
    process.exit();
}
testFetch().catch(console.error);

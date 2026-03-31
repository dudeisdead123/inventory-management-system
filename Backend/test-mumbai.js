const mongoose = require('mongoose');
const Products = require('./Models/Products');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/IMS');
    const prods = await Products.find({});
    prods.forEach(p => {
        const mumbaiLoc = p.locationStock && p.locationStock.find(l => l.location === 'mumbai');
        console.log(`Product: ${p.ProductName}, Mumbai Stock: ${mumbaiLoc ? mumbaiLoc.quantity : 'Not Found'}`);
    });
    process.exit();
}
test();

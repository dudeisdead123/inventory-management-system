const mongoose = require('mongoose');
const Products = require('./Models/Products');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/IMS');
    const prod = await Products.findOne({});
    if (prod && prod.locationStock) {
        console.log("Locations in product:");
        prod.locationStock.forEach(ls => console.log(ls.location));
    }
    process.exit();
}
test();

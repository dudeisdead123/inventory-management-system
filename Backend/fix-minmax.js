const mongoose = require('mongoose');
const Products = require('./Models/Products.js');

async function fix() {
    await mongoose.connect("mongodb://127.0.0.1:27017/IMS", { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Set min to 0 and max to 1000 everywhere
    const allProducts = await Products.find({});
    
    for (let product of allProducts) {
        if (product.locationStock && product.locationStock.length > 0) {
            for (let loc of product.locationStock) {
                loc.minStockLevel = 0;
                loc.maxStockLevel = 1000;
            }
            // Need to mark modified if it didn't trigger
            product.markModified('locationStock');
            await product.save({ validateBeforeSave: false });
        }
    }
    
    console.log("Updated min/max stock levels!");
    mongoose.disconnect();
}
fix().catch(err => {
    console.error(err);
    mongoose.disconnect();
});

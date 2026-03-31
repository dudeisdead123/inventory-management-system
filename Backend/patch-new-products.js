const mongoose = require('mongoose');
const Products = require('./Models/Products');

async function fixLocations() {
    await mongoose.connect('mongodb://127.0.0.1:27017/IMS');
    
    const allProducts = await Products.find({});
    
    const standardLocationsTemplate = [
        { location: 'mumbai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'delhi', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'bengaluru', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'chennai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'kolkata', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'hyderabad', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 }
    ];
    
    let fixedCount = 0;

    for (let product of allProducts) {
        // If a product has no locations or the locations don't look right
        const validNames = ['mumbai', 'delhi', 'bengaluru', 'chennai', 'kolkata', 'hyderabad'];
        const hasValidLocations = product.locationStock && product.locationStock.length === 6 && 
            product.locationStock.every(loc => validNames.includes(loc.location));

        if (!hasValidLocations) {
            let newLocationStock = JSON.parse(JSON.stringify(standardLocationsTemplate));
            product.locationStock = newLocationStock;
            product.markModified('locationStock');
            await product.save({ validateBeforeSave: false });
            console.log(`Patched completely new/invalid product: ${product.ProductName}`);
            fixedCount++;
        }
    }
    
    console.log(`Patched ${fixedCount} products successfully.`);
    process.exit();
}
fixLocations().catch(err => {
    console.error(err);
    process.exit();
});

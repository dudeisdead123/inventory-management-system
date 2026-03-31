const mongoose = require('mongoose');
const Products = require('./Models/Products');

async function fixLocations() {
    await mongoose.connect('mongodb://127.0.0.1:27017/IMS');
    
    const allProducts = await Products.find({});
    console.log(`Found ${allProducts.length} products to fix.`);
    
    const standardLocations = [
        { location: 'mumbai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'delhi', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'bengaluru', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'chennai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'kolkata', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
        { location: 'hyderabad', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 }
    ];
    
    for (let product of allProducts) {
        // We will sum up existing old stock into a general product total stock if needed, 
        // but it's simpler to just reset locations and let them add what's missing, 
        // or try to preserve existing quantities by moving them to mumbai.
        // Let's just give all products the standard 6 locations.
        let totalOldStock = 0;
        if (product.locationStock) {
            totalOldStock = product.locationStock.reduce((acc, loc) => acc + (loc.quantity || 0), 0);
        }
        
        let newLocationStock = JSON.parse(JSON.stringify(standardLocations));
        
        // Push the old accumulated stock entirely into Mumbai so they don't lose inventory
        if (totalOldStock > 0) {
            newLocationStock[0].quantity = totalOldStock;
        }
        
        product.locationStock = newLocationStock;
        product.markModified('locationStock');
        await product.save({ validateBeforeSave: false });
        console.log(`Updated product ${product.ProductName} locations!`);
    }
    
    process.exit();
}
fixLocations().catch(err => {
    console.error(err);
    process.exit();
});

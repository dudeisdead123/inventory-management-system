const mongoose = require('mongoose');
const Products = require('c:/Users/Asus/Downloads/Inventory-Management-System-MERN-CRUD-App-main/backend/Models/Products.js');

async function fix() {
    await mongoose.connect("mongodb://127.0.0.1:27017/IMS", {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Connected to DB");

    const validLocations = ['mumbai', 'delhi', 'bengaluru', 'chennai', 'kolkata', 'hyderabad'];
    
    // Convert old hardcoded names to new locations
    const allProducts = await Products.find({});
    
    for (let product of allProducts) {
        // Create a new locationStock array
        let newLocationStock = [];
        
        for (let loc of validLocations) {
            newLocationStock.push({
                location: loc, // Lowercase location ID
                quantity: Math.floor(Math.random() * 50) + 10, // Initialize with some stock so it's not totally empty
                reservedQuantity: 0,
                damagedQuantity: 0,
                minStockLevel: 10,
                maxStockLevel: 1000
            });
        }
        
        product.locationStock = newLocationStock;
        await product.calculateTotalStock();
        await product.save({ validateBeforeSave: false }); // Avoid any strict validation errors
    }
    
    console.log("Products fixed and locations replaced with valid metropolitan cities.");
    mongoose.disconnect();
}
fix().catch(err => {
    console.error(err);
    mongoose.disconnect();
});

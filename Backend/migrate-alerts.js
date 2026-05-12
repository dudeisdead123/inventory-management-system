const mongoose = require('mongoose');
const StockAlert = require('./Models/StockAlert');
const Products = require('./Models/Products');

const mongoURI = "mongodb://127.0.0.1:27017/IMS";

async function migrate() {
    try {
        await mongoose.connect(mongoURI);
        const alerts = await StockAlert.find({ userId: { $exists: false } });
        console.log(`Found ${alerts.length} alerts without userId`);
        
        for (const alert of alerts) {
            const p = await Products.findById(alert.product);
            if (p) {
                alert.userId = p.createdBy;
                await alert.save();
            }
        }
        
        console.log('Migration complete. All alerts now associated with their respective users.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();

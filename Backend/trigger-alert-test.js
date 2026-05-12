const mongoose = require('mongoose');
const Products = require('./Models/Products');
const StockAlert = require('./Models/StockAlert');
const { initEmailService, sendLowStockEmail } = require('./services/emailService');

const mongoURI = "mongodb://127.0.0.1:27017/IMS";

async function runTest() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(mongoURI);
        
        console.log('Initializing Email Service...');
        await initEmailService();

        const productName = 'Oreo';
        const location = 'mumbai';

        console.log(`Searching for product: ${productName}...`);
        const product = await Products.findOne({ ProductName: productName });
        if (!product) {
            console.error('Product not found!');
            process.exit(1);
        }

        // 1. Force Resolve any existing alerts to allow new ones
        console.log('Resolving old alerts for this product...');
        await StockAlert.updateMany(
            { product: product._id, location: location, isResolved: false },
            { isResolved: true, isRead: true }
        );

        // 2. Simulate Low Stock Event
        const locStock = product.locationStock.find(l => l.location === location);
        const testQty = 0;
        const testMin = 10;
        
        console.log(`Simulating Low Stock: Qty ${testQty} / Min ${testMin}`);

        // 3. Create a NEW alert record
        console.log('Creating fresh alert record...');
        const newAlert = await StockAlert.create({
            userId: product.createdBy,
            product: product._id,
            alertType: 'out_of_stock',
            location: location,
            currentQuantity: testQty,
            threshold: testMin,
            severity: 'critical',
            message: `TEST ALERT: ${productName} is out of stock at ${location}.`
        });

        console.log('✅ Alert record created in DB:', newAlert._id);

        // 4. Send the real email
        console.log('Sending real email notification...');
        const emailSent = await sendLowStockEmail(
            product,
            location,
            testQty,
            testMin,
            'critical'
        );

        if (emailSent) {
            console.log('✅ Email sent successfully to ansumanaheer8@gmail.com');
        } else {
            console.error('❌ Email failed to send. Check console for errors.');
        }

        console.log('\n--- Test Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

runTest();

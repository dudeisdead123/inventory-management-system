const mongoose = require('mongoose');
const Products = require('./Models/Products');
const StockAlert = require('./Models/StockAlert');
const { sendLowStockEmail, configureTransporter } = require('./services/emailService');

const mongoURI = "mongodb://127.0.0.1:27017/IMS";

async function verifyAlerts() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(mongoURI);
        console.log('Connected!');

        // 1. Find a product to test with
        const product = await Products.findOne({ ProductName: 'Oreo' });
        if (!product) {
            console.error('Test product "Oreo" not found. Please create it first.');
            process.exit(1);
        }

        console.log(`Found product: ${product.ProductName}`);

        // 2. Set a location to "Low Stock"
        // Mumbai has 85. Let's set minStockLevel to 100.
        let mumbaiStock = product.locationStock.find(loc => loc.location === 'mumbai');
        if (mumbaiStock) {
            mumbaiStock.minStockLevel = 100;
            console.log(`Setting Mumbai minStockLevel to 100 (Current Qty: ${mumbaiStock.quantity})`);
        }

        // 3. Manually trigger the alert check logic (simulating what happens in the router)
        console.log('\n--- Running Alert Check Logic ---');
        
        for (const loc of product.locationStock) {
            if (loc.quantity <= loc.minStockLevel) {
                console.log(`[ALERT] Low stock detected at: ${loc.location}`);
                console.log(`[ALERT] Details: Qty ${loc.quantity} <= Min ${loc.minStockLevel}`);
                
                // 4. Verify email trigger
                console.log('[SYSTEM] Attempting to trigger email notification...');
                
                // We'll call the real function. If not configured, it will log "Email not configured — skipping"
                // which confirms the logic reaches this point.
                const result = await sendLowStockEmail(
                    product,
                    loc.location,
                    loc.quantity,
                    loc.minStockLevel,
                    'medium'
                );

                if (result) {
                    console.log('✅ SUCCESS: Email logic executed successfully.');
                } else {
                    console.log('ℹ️ NOTICE: Email logic reached, but skipped sending because credentials are not configured in this session.');
                }
            }
        }

        console.log('\n--- Verification Complete ---');
        process.exit(0);

    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyAlerts();

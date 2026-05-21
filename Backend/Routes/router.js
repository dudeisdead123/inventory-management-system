const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const { configureTransporter, getEmailConfigStatus, sendLowStockEmail, sendTestEmail } = require('../services/emailService');
const { generateChatReply } = require('../services/chatService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Middleware
const fetchuser = require('../middleware/fetchuser');

const JWT_SECRET = require('../config/jwtSecret');

// ====== AUTH ROUTES ======

router.post('/createuser', [
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }
    try {
        const existing = await query('SELECT id FROM users WHERE email = $1', [req.body.email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success, error: "Sorry a user with this email already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        const result = await query(
            'INSERT INTO users (name, email, password, role, location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.body.name, req.body.email, secPass, req.body.role || 'customer', req.body.location || 'All']
        );
        const user = result.rows[0];
        const data = { user: { id: user.id } };
        const authtoken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, authtoken });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }
        const user = result.rows[0];
        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }
        const data = { user: { id: user.id } };
        const authtoken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, authtoken });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


router.post('/getuser', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT id, name, email, role, location, date FROM users WHERE id = $1', [userId]);
        res.send(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


// ====== PRODUCT ROUTES ======

router.post("/insertproduct", fetchuser, async (req, res) => {
    const { ProductName, ProductPrice, ProductBarcode, globalMinStock } = req.body;
    const defaultLocations = ['mumbai', 'delhi', 'bengaluru', 'chennai', 'kolkata', 'hyderabad'];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const pre = await client.query(
            'SELECT id FROM products WHERE "ProductBarcode" = $1',
            [ProductBarcode]
        );
        if (pre.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(422).json("Product is already added.");
        }

        const productResult = await client.query(
            `INSERT INTO products ("ProductName", "ProductPrice", "ProductBarcode", "totalStock", "globalMinStock", "globalMaxStock", "isActive", "createdBy")
             VALUES ($1, $2, $3, 0, $4, 1000, true, $5) RETURNING *`,
            [ProductName, ProductPrice, ProductBarcode, globalMinStock || 10, req.user.id]
        );
        const product = productResult.rows[0];

        // Insert default location stock rows
        for (const loc of defaultLocations) {
            await client.query(
                `INSERT INTO location_stock (product_id, location, quantity, "reservedQuantity", "damagedQuantity", "minStockLevel", "maxStockLevel")
                 VALUES ($1, $2, 0, 0, 0, 1, 1000)`,
                [product.id, loc]
            );
        }

        await client.query('COMMIT');

        const locationStock = await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1',
            [product.id]
        );
        res.status(201).json({ ...product, locationStock: locationStock.rows });
    } catch (err) {
        await client.query('ROLLBACK');
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});


router.get('/products', fetchuser, async (req, res) => {
    try {
        const productsResult = await query('SELECT * FROM products WHERE "isActive" = true ORDER BY "createdAt" DESC', []);
        const products = productsResult.rows;

        // Attach location_stock for each product
        const productIds = products.map(p => p.id);
        if (productIds.length === 0) return res.status(201).json([]);

        const stockResult = await query(
            `SELECT * FROM location_stock WHERE product_id = ANY($1::int[])`,
            [productIds]
        );
        const movementsResult = await query(
            `SELECT * FROM stock_movements WHERE product_id = ANY($1::int[]) ORDER BY date DESC`,
            [productIds]
        );

        const locationStockMap = {};
        const movementsMap = {};
        stockResult.rows.forEach(s => {
            if (!locationStockMap[s.product_id]) locationStockMap[s.product_id] = [];
            locationStockMap[s.product_id].push(s);
        });
        movementsResult.rows.forEach(m => {
            if (!movementsMap[m.product_id]) movementsMap[m.product_id] = [];
            movementsMap[m.product_id].push(m);
        });

        const productsWithStock = products.map(p => {
            const locationStock = locationStockMap[p.id] || [];
            const totalStock = locationStock.reduce((sum, ls) => sum + ls.quantity, 0);
            const isLowStock = totalStock <= p.globalMinStock;
            const isOutOfStock = totalStock === 0;
            return {
                ...p,
                id: p.id,
                _id: p.id,
                locationStock,
                stockMovements: movementsMap[p.id] || [],
                totalStock,
                isLowStock,
                isOutOfStock,
                stockStatus: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'
            };
        });

        res.status(201).json(productsWithStock);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});


router.get('/products/:id', fetchuser, async (req, res) => {
    try {
        const productResult = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or access denied' });
        }
        const product = productResult.rows[0];
        const locationStock = (await query('SELECT * FROM location_stock WHERE product_id = $1', [product.id])).rows;
        const stockMovements = (await query('SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY date DESC', [product.id])).rows;

        const totalStock = locationStock.reduce((sum, ls) => sum + ls.quantity, 0);
        const isLowStock = totalStock < product.globalMinStock;
        const isOutOfStock = totalStock === 0;

        res.status(201).json({
            ...product,
            _id: product.id,
            locationStock,
            stockMovements,
            totalStock,
            isLowStock,
            isOutOfStock,
            stockStatus: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
});


router.put('/updateproduct/:id', fetchuser, async (req, res) => {
    const { ProductName, ProductPrice, ProductBarcode, globalMinStock } = req.body;
    try {
        const productResult = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const p = productResult.rows[0];
        const updatedResult = await query(
            `UPDATE products SET
                "ProductName" = $1,
                "ProductPrice" = $2,
                "ProductBarcode" = $3,
                "globalMinStock" = $4,
                "updatedAt" = NOW()
             WHERE id = $5 RETURNING *`,
            [
                ProductName || p.ProductName,
                ProductPrice || p.ProductPrice,
                ProductBarcode || p.ProductBarcode,
                globalMinStock !== undefined ? Number(globalMinStock) : p.globalMinStock,
                req.params.id
            ]
        );
        console.log("Data Updated");
        res.status(201).json(updatedResult.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
});


router.delete('/deleteproduct/:id', fetchuser, async (req, res) => {
    try {
        const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or access denied' });
        }
        console.log("Data Deleted");
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/initialize-stock', fetchuser, async (req, res) => {
    const defaultLocations = ['mumbai', 'delhi', 'bengaluru', 'chennai', 'kolkata', 'hyderabad'];
    try {
        const productsResult = await query('SELECT * FROM products', []);
        let updatedCount = 0;
        for (const product of productsResult.rows) {
            const existingStock = await query('SELECT id FROM location_stock WHERE product_id = $1', [product.id]);
            if (existingStock.rows.length === 0) {
                for (const loc of defaultLocations) {
                    await query(
                        `INSERT INTO location_stock (product_id, location, quantity, "reservedQuantity", "damagedQuantity", "minStockLevel", "maxStockLevel")
                         VALUES ($1, $2, 0, 0, 0, 0, 1000)`,
                        [product.id, loc]
                    );
                }
                updatedCount++;
            }
        }
        res.status(200).json({ message: `Initialized stock for ${updatedCount} products`, updatedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to initialize stock' });
    }
});


// ====== LOCATION MANAGEMENT ROUTES ======

router.post('/initialize-locations', fetchuser, async (req, res) => {
    try {
        const existingLocations = await query('SELECT id FROM locations', []);
        if (existingLocations.rows.length === 0) {
            const defaultLocations = [
                { locationId: 'mumbai', locationName: 'Mumbai', locationType: 'store', street: 'M G Road', city: 'Mumbai', state: 'MH', zipCode: '400001', country: 'India', phone: '+91-9876543210', email: 'mumbai@company.com', manager: 'Rahul Kumar' },
                { locationId: 'delhi', locationName: 'Delhi', locationType: 'store', street: 'Connaught Place', city: 'Delhi', state: 'DL', zipCode: '110001', country: 'India', phone: '+91-9876543211', email: 'delhi@company.com', manager: 'Priya Singh' },
                { locationId: 'bengaluru', locationName: 'Bengaluru', locationType: 'store', street: 'MG Road', city: 'Bengaluru', state: 'KA', zipCode: '560001', country: 'India', phone: '+91-9876543212', email: 'bengaluru@company.com', manager: 'Amit Patel' },
                { locationId: 'chennai', locationName: 'Chennai', locationType: 'store', street: 'Anna Salai', city: 'Chennai', state: 'TN', zipCode: '600002', country: 'India', phone: '+91-9876543213', email: 'chennai@company.com', manager: 'Karthik N' },
                { locationId: 'kolkata', locationName: 'Kolkata', locationType: 'store', street: 'Park Street', city: 'Kolkata', state: 'WB', zipCode: '700016', country: 'India', phone: '+91-9876543214', email: 'kolkata@company.com', manager: 'Sanjay Das' },
                { locationId: 'hyderabad', locationName: 'Hyderabad', locationType: 'store', street: 'Banjara Hills', city: 'Hyderabad', state: 'TG', zipCode: '500034', country: 'India', phone: '+91-9876543215', email: 'hyderabad@company.com', manager: 'Vikram Reddy' },
            ];
            for (const loc of defaultLocations) {
                await query(
                    `INSERT INTO locations ("locationId", "locationName", "locationType", street, city, state, "zipCode", country, phone, email, manager, "isActive", "currentUtilization", "createdBy")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 0, $12)`,
                    [loc.locationId, loc.locationName, loc.locationType, loc.street, loc.city, loc.state, loc.zipCode, loc.country, loc.phone, loc.email, loc.manager, req.user.id]
                );
            }
            res.status(200).json({ message: 'Default locations initialized successfully', count: defaultLocations.length });
        } else {
            res.status(200).json({ message: 'Locations already exist', count: existingLocations.rows.length });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to initialize locations' });
    }
});


router.get('/locations', fetchuser, async (req, res) => {
    try {
        const result = await query('SELECT * FROM locations WHERE "isActive" = true ORDER BY "locationName"', []);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});


router.post('/locations', fetchuser, async (req, res) => {
    try {
        const { locationId, locationName, locationType, address, contactInfo } = req.body;
        const existing = await query('SELECT id FROM locations WHERE "locationId" = $1', [locationId]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Location ID already exists' });
        }
        const result = await query(
            `INSERT INTO locations ("locationId", "locationName", "locationType", street, city, state, "zipCode", country, phone, email, manager, "isActive", "currentUtilization", "createdBy")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 0, $12) RETURNING *`,
            [
                locationId, locationName, locationType || 'store',
                address?.street, address?.city, address?.state, address?.zipCode, address?.country,
                contactInfo?.phone, contactInfo?.email, contactInfo?.manager,
                req.user.id
            ]
        );

        // Add default stock limits for this location to all existing products
        const allProducts = await query('SELECT id FROM products', []);
        for (const product of allProducts.rows) {
            await query(
                `INSERT INTO location_stock (product_id, location, quantity, "reservedQuantity", "damagedQuantity", "minStockLevel", "maxStockLevel")
                 VALUES ($1, $2, 0, 0, 0, 10, 1000) ON CONFLICT (product_id, location) DO NOTHING`,
                [product.id, locationId]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create location' });
    }
});


// ====== STOCK MANAGEMENT ROUTES ======

// Add stock to a product at a specific location
router.post('/stock/add/:productId', fetchuser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { productId } = req.params;
        const { location, quantity, reason, reference } = req.body;

        if (!location || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Location and valid quantity are required' });
        }

        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];

        const stockResult = await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, location]
        );
        if (stockResult.rows.length === 0) {
            return res.status(400).json({ error: `Location '${location}' not found. Please configure this location in Stock Settings first.` });
        }
        const locationStock = stockResult.rows[0];
        const currentStock = locationStock.quantity;
        const maxStock = locationStock.maxStockLevel;
        const newQuantity = currentStock + parseInt(quantity);

        if (newQuantity > maxStock) {
            return res.status(400).json({
                error: `Cannot add stock. Maximum stock level for ${location} is ${maxStock}. Current: ${currentStock}, Trying to add: ${quantity}, Would result in: ${newQuantity}`,
                type: 'validation_error',
                currentStock,
                maxStock,
                requestedQuantity: parseInt(quantity)
            });
        }

        await client.query('BEGIN');
        // Update location stock
        await client.query(
            'UPDATE location_stock SET quantity = $1 WHERE product_id = $2 AND location = $3',
            [newQuantity, productId, location]
        );
        // Add movement record
        await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, location, reason, reference, "performedBy")
             VALUES ($1, 'inbound', $2, $3, $4, $5, $6)`,
            [productId, parseInt(quantity), location, reason || '', reference || '', req.user.id]
        );

        // Recalculate total stock
        const totalStockRes = await client.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total FROM location_stock WHERE product_id = $1',
            [productId]
        );
        const newTotalStock = parseInt(totalStockRes.rows[0].total);
        const isLowStock = newTotalStock <= product.globalMinStock;
        await client.query(
            'UPDATE products SET "totalStock" = $1, "isLowStock" = $2, "lastStockUpdate" = NOW() WHERE id = $3',
            [newTotalStock, isLowStock, productId]
        );
        await client.query('COMMIT');

        const updatedProduct = { ...product, totalStock: newTotalStock, isLowStock };
        await checkAndCreateStockAlerts(updatedProduct, productId, client);

        const io = req.app.get('socketio');
        if (io) {
            io.emit('stockUpdated', { productId, type: 'add', newStockLevel: newTotalStock, location, newQuantity });
            io.emit('liveActivity', { type: 'add', productName: product.ProductName, quantity: parseInt(quantity), location, user: req.user.name || 'Admin', date: new Date() });
        }

        res.status(200).json({ message: 'Stock added successfully', product: updatedProduct, newStockLevel: newTotalStock, locationStock: newQuantity, maxStock });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// Remove stock from a product at a specific location
router.post('/stock/remove/:productId', fetchuser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { productId } = req.params;
        const { location, quantity, reason, reference } = req.body;

        if (!location || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Location and valid quantity are required' });
        }

        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];

        const stockResult = await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, location]
        );
        if (stockResult.rows.length === 0) {
            return res.status(400).json({ error: 'Location not found: ' + location });
        }
        const locationStock = stockResult.rows[0];
        if (locationStock.quantity < parseInt(quantity)) {
            return res.status(400).json({ error: `Insufficient stock at location: ${location}. Available: ${locationStock.quantity}, Requested: ${quantity}` });
        }

        const newQuantity = locationStock.quantity - parseInt(quantity);

        await client.query('BEGIN');
        await client.query(
            'UPDATE location_stock SET quantity = $1 WHERE product_id = $2 AND location = $3',
            [newQuantity, productId, location]
        );
        await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, location, reason, reference, "performedBy")
             VALUES ($1, 'outbound', $2, $3, $4, $5, $6)`,
            [productId, parseInt(quantity), location, reason || '', reference || '', req.user.id]
        );
        const totalStockRes = await client.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total FROM location_stock WHERE product_id = $1',
            [productId]
        );
        const newTotalStock = parseInt(totalStockRes.rows[0].total);
        const isLowStock = newTotalStock <= product.globalMinStock;
        await client.query(
            'UPDATE products SET "totalStock" = $1, "isLowStock" = $2, "lastStockUpdate" = NOW() WHERE id = $3',
            [newTotalStock, isLowStock, productId]
        );
        await client.query('COMMIT');

        const updatedProduct = { ...product, totalStock: newTotalStock, isLowStock };
        await checkAndCreateStockAlerts(updatedProduct, productId, client);

        const io = req.app.get('socketio');
        if (io) {
            io.emit('stockUpdated', { productId, type: 'remove', newStockLevel: newTotalStock, location, newQuantity });
            io.emit('liveActivity', { type: 'remove', productName: product.ProductName, quantity: parseInt(quantity), location, user: req.user.name || 'Admin', date: new Date() });
        }

        res.status(200).json({ message: 'Stock removed successfully', product: updatedProduct, newStockLevel: newTotalStock });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// Customer Buy action
router.post('/buy/:productId', fetchuser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { productId } = req.params;
        let { location, quantity } = req.body;
        if (location) location = location.toLowerCase();

        if (!location || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Location and valid quantity are required' });
        }

        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];

        const stockResult = await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, location]
        );
        const locationStock = stockResult.rows[0];

        if (!locationStock || locationStock.quantity < parseInt(quantity)) {
            // Create deficiency alert
            const newAlert = await client.query(
                `INSERT INTO stock_alerts ("userId", product, "alertType", location, "currentQuantity", threshold, severity, message)
                 VALUES ($1, $2, 'out_of_stock', $3, $4, $5, 'critical', $6) RETURNING *`,
                [
                    req.user.id, productId, location,
                    locationStock ? locationStock.quantity : 0,
                    locationStock ? locationStock.minStockLevel : 10,
                    `Deficiency at ${location} for ${product.ProductName}. Refill it or transfer stock.`
                ]
            );
            const io = req.app.get('socketio');
            if (io) io.emit('newAlert', newAlert.rows[0]);
            return res.status(400).json({ error: `Out of stock in your location. Admin has been notified.` });
        }

        const newQuantity = locationStock.quantity - parseInt(quantity);

        await client.query('BEGIN');
        await client.query(
            'UPDATE location_stock SET quantity = $1 WHERE product_id = $2 AND location = $3',
            [newQuantity, productId, location]
        );
        await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, location, reason, reference, "performedBy")
             VALUES ($1, 'outbound', $2, $3, 'Customer Purchase', 'Purchase', $4)`,
            [productId, parseInt(quantity), location, req.user.id]
        );
        const totalStockRes = await client.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total FROM location_stock WHERE product_id = $1',
            [productId]
        );
        const newTotalStock = parseInt(totalStockRes.rows[0].total);
        const isLowStock = newTotalStock <= product.globalMinStock;
        await client.query(
            'UPDATE products SET "totalStock" = $1, "isLowStock" = $2, "lastStockUpdate" = NOW() WHERE id = $3',
            [newTotalStock, isLowStock, productId]
        );
        await client.query('COMMIT');

        const updatedProduct = { ...product, totalStock: newTotalStock, isLowStock };
        await checkAndCreateStockAlerts(updatedProduct, productId, client);

        const io = req.app.get('socketio');
        if (io) {
            io.emit('stockUpdated', { productId, type: 'buy', newStockLevel: newTotalStock });
            io.emit('liveActivity', { type: 'purchase', productName: product.ProductName, quantity: parseInt(quantity), location, amount: (product.ProductPrice * quantity).toFixed(2), user: req.user.name || 'A customer', date: new Date() });
        }

        res.status(200).json({ message: 'Purchase successful', product: updatedProduct, newStockLevel: newTotalStock });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// ====== RAZORPAY PAYMENT ENDPOINTS ======

router.get('/payment/config', fetchuser, async (req, res) => {
    res.status(200).json({
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_5N3jXk86D12M5r',
        isSandbox: !process.env.RAZORPAY_KEY_ID
    });
});


router.post('/payment/order', fetchuser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { productId, quantity, location } = req.body;
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Product ID and valid quantity are required' });
        }

        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];

        const normalizedLoc = location ? location.toLowerCase() : '';
        const stockResult = await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, normalizedLoc]
        );
        const locationStock = stockResult.rows[0];

        if (!locationStock || locationStock.quantity < parseInt(quantity)) {
            const newAlert = await client.query(
                `INSERT INTO stock_alerts ("userId", product, "alertType", location, "currentQuantity", threshold, severity, message)
                 VALUES ($1, $2, 'out_of_stock', $3, $4, $5, 'critical', $6) RETURNING *`,
                [
                    req.user.id, productId, location || 'Global',
                    locationStock ? locationStock.quantity : 0,
                    locationStock ? locationStock.minStockLevel : 10,
                    `Deficiency at ${location} for ${product.ProductName}. Refill it or transfer stock.`
                ]
            );
            const io = req.app.get('socketio');
            if (io) io.emit('newAlert', newAlert.rows[0]);
            return res.status(400).json({ error: `Out of stock in your location. Admin has been notified.` });
        }

        const amount = Math.round(product.ProductPrice * parseInt(quantity) * 100);
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (keyId && keySecret) {
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
            const options = {
                amount, currency: "INR",
                receipt: `receipt_order_${Date.now()}`,
                notes: { productId, quantity, location: normalizedLoc, userId: req.user.id }
            };
            const order = await razorpay.orders.create(options);
            return res.status(200).json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency, keyId, isSandbox: false });
        } else {
            const mockOrderId = `order_sandbox_${Math.random().toString(36).substring(2, 15)}`;
            return res.status(200).json({ success: true, orderId: mockOrderId, amount, currency: "INR", keyId: 'rzp_test_5N3jXk86D12M5r', isSandbox: true });
        }
    } catch (error) {
        console.error('Error creating payment order:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


router.post('/payment/verify', fetchuser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, productId, quantity, location, isSandbox } = req.body;

        if (!productId || !quantity || quantity <= 0 || !location) {
            return res.status(400).json({ error: 'Product details, quantity, and location are required' });
        }

        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];
        const normalizedLoc = location.toLowerCase();

        if (!isSandbox && !(razorpay_order_id && razorpay_order_id.startsWith('order_sandbox_'))) {
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!keySecret) return res.status(500).json({ error: 'Payment gateway configuration error' });
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', keySecret);
            hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
            const generatedSignature = hmac.digest('hex');
            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ error: 'Payment signature verification failed' });
            }
        }

        const stockResult = await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, normalizedLoc]
        );
        const locationStock = stockResult.rows[0];
        if (!locationStock || locationStock.quantity < parseInt(quantity)) {
            return res.status(400).json({ error: 'Insufficient stock to complete the purchase' });
        }

        const newQuantity = locationStock.quantity - parseInt(quantity);

        await client.query('BEGIN');
        await client.query(
            'UPDATE location_stock SET quantity = $1 WHERE product_id = $2 AND location = $3',
            [newQuantity, productId, normalizedLoc]
        );
        await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, location, reason, reference, "performedBy")
             VALUES ($1, 'outbound', $2, $3, $4, 'Purchase', $5)`,
            [productId, parseInt(quantity), normalizedLoc, `Customer Purchase (Paid via Razorpay: ${razorpay_payment_id || 'SANDBOX'})`, req.user.id]
        );
        const totalStockRes = await client.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total FROM location_stock WHERE product_id = $1',
            [productId]
        );
        const newTotalStock = parseInt(totalStockRes.rows[0].total);
        const isLowStock = newTotalStock <= product.globalMinStock;
        await client.query(
            'UPDATE products SET "totalStock" = $1, "isLowStock" = $2, "lastStockUpdate" = NOW() WHERE id = $3',
            [newTotalStock, isLowStock, productId]
        );
        await client.query('COMMIT');

        const updatedProduct = { ...product, totalStock: newTotalStock, isLowStock };
        await checkAndCreateStockAlerts(updatedProduct, productId, client);

        const io = req.app.get('socketio');
        if (io) {
            io.emit('stockUpdated', { productId, type: 'buy', newStockLevel: newTotalStock });
            io.emit('liveActivity', { type: 'purchase', productName: product.ProductName, quantity: parseInt(quantity), location: normalizedLoc, amount: (product.ProductPrice * parseInt(quantity)).toFixed(2), user: req.user.name || 'A customer', date: new Date() });
        }

        res.status(200).json({ success: true, message: 'Payment verified and purchase processed successfully', product: updatedProduct, newStockLevel: newTotalStock });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// Get purchase history for a specific customer
router.get('/customer/purchases', fetchuser, async (req, res) => {
    try {
        const result = await query(
            `SELECT sm.*, p."ProductName", p."ProductPrice"
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             WHERE sm."performedBy" = $1 AND sm.type = 'outbound'
             ORDER BY sm.date DESC`,
            [req.user.id]
        );
        const purchases = result.rows.map(row => ({
            _id: row.id,
            productId: row.product_id,
            productName: row.ProductName,
            productPrice: row.ProductPrice,
            quantity: row.quantity,
            location: row.location,
            date: row.date,
            reason: row.reason,
            reference: row.reference
        }));
        res.status(200).json(purchases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch customer purchase history' });
    }
});


// Transfer stock between locations
router.post('/stock/transfer/:productId', fetchuser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { productId } = req.params;
        const { fromLocation, toLocation, quantity, reason } = req.body;

        if (!fromLocation || !toLocation || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'From/To locations and valid quantity are required' });
        }

        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];

        const fromStock = (await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, fromLocation]
        )).rows[0];

        if (!fromStock || fromStock.quantity < parseInt(quantity)) {
            return res.status(400).json({ error: `Insufficient stock at ${fromLocation}` });
        }

        const toStock = (await client.query(
            'SELECT * FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, toLocation]
        )).rows[0];

        if (!toStock) {
            return res.status(400).json({ error: `Location '${toLocation}' not found.` });
        }

        await client.query('BEGIN');
        await client.query(
            'UPDATE location_stock SET quantity = quantity - $1 WHERE product_id = $2 AND location = $3',
            [parseInt(quantity), productId, fromLocation]
        );
        await client.query(
            'UPDATE location_stock SET quantity = quantity + $1 WHERE product_id = $2 AND location = $3',
            [parseInt(quantity), productId, toLocation]
        );
        await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, location, reason, reference, "performedBy")
             VALUES ($1, 'transfer', $2, $3, $4, 'Transfer Out', $5)`,
            [productId, parseInt(quantity), fromLocation, reason || '', req.user.id]
        );
        await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, location, reason, reference, "performedBy")
             VALUES ($1, 'transfer', $2, $3, $4, 'Transfer In', $5)`,
            [productId, parseInt(quantity), toLocation, reason || '', req.user.id]
        );
        await client.query('COMMIT');

        const io = req.app.get('socketio');
        if (io) {
            io.emit('stockUpdated', { productId, type: 'transfer', newStockLevel: product.totalStock });
            io.emit('liveActivity', { type: 'transfer', productName: product.ProductName, quantity: parseInt(quantity), fromLocation, toLocation, user: req.user.name || 'Admin', date: new Date() });
        }

        res.status(200).json({ message: 'Stock transferred successfully', product });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// Get stock movements for a product
router.get('/stock/movements/:productId', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const productResult = await query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];

        const movementsResult = await query(
            `SELECT sm.*, u.name AS performed_by_name, u.email AS performed_by_email
             FROM stock_movements sm
             LEFT JOIN users u ON sm."performedBy" = u.id
             WHERE sm.product_id = $1
             ORDER BY sm.date DESC
             LIMIT $2 OFFSET $3`,
            [productId, parseInt(limit), parseInt(skip)]
        );

        const totalCount = (await query('SELECT COUNT(*) FROM stock_movements WHERE product_id = $1', [productId])).rows[0].count;

        res.status(200).json({
            movements: movementsResult.rows,
            totalMovements: parseInt(totalCount),
            product: {
                _id: product.id,
                ProductName: product.ProductName,
                totalStock: product.totalStock,
                isLowStock: product.isLowStock
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
});


// ====== STOCK ALERTS ROUTES ======

router.get('/alerts', fetchuser, async (req, res) => {
    try {
        const { unread, severity } = req.query;
        let conditions = [`sa."userId" = $1`];
        let params = [req.user.id];
        let i = 2;

        if (unread === 'true') { conditions.push(`sa."isRead" = false`); }
        if (severity) { conditions.push(`sa.severity = $${i++}`); params.push(severity); }

        const whereClause = conditions.join(' AND ');
        const result = await query(
            `SELECT sa.*, p."ProductName", p."ProductBarcode"
             FROM stock_alerts sa
             LEFT JOIN products p ON sa.product = p.id
             WHERE ${whereClause}
             ORDER BY sa."createdAt" DESC
             LIMIT 100`,
            params
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});


router.put('/alerts/:alertId/read', fetchuser, async (req, res) => {
    try {
        const result = await query(
            `UPDATE stock_alerts SET "isRead" = true WHERE id = $1 RETURNING *`,
            [req.params.alertId]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
});


router.put('/alerts/:alertId/resolve', fetchuser, async (req, res) => {
    try {
        const { resolvedNote } = req.body;
        const result = await query(
            `UPDATE stock_alerts SET "isResolved" = true, "resolvedBy" = $1, "resolvedAt" = NOW(), "resolvedNote" = $2 WHERE id = $3 RETURNING *`,
            [req.user.id, resolvedNote || '', req.params.alertId]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});


// Get dashboard statistics
router.get('/dashboard/stats', fetchuser, async (req, res) => {
    try {
        const totalProducts = parseInt((await query(`SELECT COUNT(*) FROM products WHERE "isActive" = true`, [])).rows[0].count);
        const lowStockProducts = parseInt((await query(`SELECT COUNT(*) FROM products WHERE "isLowStock" = true AND "isActive" = true`, [])).rows[0].count);
        const outOfStockProducts = parseInt((await query(`SELECT COUNT(*) FROM products WHERE "totalStock" = 0 AND "isActive" = true`, [])).rows[0].count);
        const unreadAlerts = parseInt((await query(`SELECT COUNT(*) FROM stock_alerts WHERE "isRead" = false AND "userId" = $1`, [req.user.id])).rows[0].count);
        const locations = parseInt((await query(`SELECT COUNT(*) FROM locations WHERE "isActive" = true`, [])).rows[0].count);

        const recentMovements = (await query(
            `SELECT sm.*, p."ProductName", p."ProductBarcode", u.name AS user_name
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             LEFT JOIN users u ON sm."performedBy" = u.id
             ORDER BY sm.date DESC
             LIMIT 10`,
            []
        )).rows;

        res.status(200).json({ totalProducts, lowStockProducts, outOfStockProducts, unreadAlerts, locations, recentMovements });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});


// ====== HELPER FUNCTIONS ======

async function checkAndCreateStockAlerts(product, productId, client) {
    try {
        const db = client || pool;
        const locationStockRows = (await db.query('SELECT * FROM location_stock WHERE product_id = $1', [productId])).rows;
        const totalStock = locationStockRows.reduce((sum, ls) => sum + ls.quantity, 0);

        // 1. GLOBAL STOCK CHECK
        if (totalStock < product.globalMinStock) {
            const existingGlobal = (await db.query(
                `SELECT id FROM stock_alerts WHERE product = $1 AND location = 'Global' AND "isResolved" = false`,
                [productId]
            )).rows;
            if (existingGlobal.length === 0) {
                const severity = totalStock === 0 ? 'critical' : 'high';
                const message = `GLOBAL ALERT: ${product.ProductName} total stock is low (${totalStock}). Minimum required: ${product.globalMinStock}`;
                await db.query(
                    `INSERT INTO stock_alerts ("userId", product, "alertType", location, "currentQuantity", threshold, severity, message)
                     VALUES ($1, $2, $3, 'Global', $4, $5, $6, $7)`,
                    [product.createdBy, productId, totalStock === 0 ? 'out_of_stock' : 'low_stock', totalStock, product.globalMinStock, severity, message]
                );
                await sendLowStockEmail(product, 'Global Inventory', totalStock, product.globalMinStock, severity);
            }
        } else {
            await db.query(
                `UPDATE stock_alerts SET "isResolved" = true, "isRead" = true WHERE product = $1 AND location = 'Global' AND "isResolved" = false`,
                [productId]
            );
        }

        // 2. LOCATION-SPECIFIC CHECK
        for (const locationStock of locationStockRows) {
            if (locationStock.quantity < locationStock.minStockLevel || locationStock.quantity === 0) {
                const existing = (await db.query(
                    `SELECT id FROM stock_alerts WHERE product = $1 AND location = $2 AND "isResolved" = false`,
                    [productId, locationStock.location]
                )).rows;
                if (existing.length === 0) {
                    const severity = locationStock.quantity === 0 ? 'critical' : locationStock.quantity <= (locationStock.minStockLevel / 2) ? 'high' : 'medium';
                    await db.query(
                        `INSERT INTO stock_alerts ("userId", product, "alertType", location, "currentQuantity", threshold, severity, message)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            product.createdBy, productId,
                            locationStock.quantity === 0 ? 'out_of_stock' : 'low_stock',
                            locationStock.location, locationStock.quantity, locationStock.minStockLevel, severity,
                            `${product.ProductName} is ${locationStock.quantity === 0 ? 'out of stock' : 'running low'} at ${locationStock.location}. Current: ${locationStock.quantity}, Minimum: ${locationStock.minStockLevel}`
                        ]
                    );
                    await sendLowStockEmail(product, locationStock.location, locationStock.quantity, locationStock.minStockLevel, severity);
                }
            } else {
                await db.query(
                    `UPDATE stock_alerts SET "isResolved" = true, "isRead" = true WHERE product = $1 AND location = $2 AND "isResolved" = false`,
                    [productId, locationStock.location]
                );
            }
        }
    } catch (error) {
        console.error('Error creating stock alerts:', error);
    }
}


// Get min/max stock levels for a product location
router.get('/products/:productId/stock-limits', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const productResult = await query('SELECT id FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or access denied' });
        }
        const stockLimitsResult = await query(
            `SELECT location, "minStockLevel", "maxStockLevel", quantity AS "currentStock" FROM location_stock WHERE product_id = $1`,
            [productId]
        );
        res.status(200).json({ stockLimits: stockLimitsResult.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


router.put('/products/:productId/stock-limits', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { location, minStockLevel, maxStockLevel } = req.body;

        if (!location || minStockLevel < 0 || maxStockLevel <= 0 || minStockLevel >= maxStockLevel) {
            return res.status(400).json({ error: 'Valid location, minStockLevel (>=0), and maxStockLevel (>minStockLevel) are required' });
        }

        const existing = await query(
            'SELECT id FROM location_stock WHERE product_id = $1 AND location = $2',
            [productId, location]
        );

        let result;
        if (existing.rows.length === 0) {
            result = await query(
                `INSERT INTO location_stock (product_id, location, quantity, "reservedQuantity", "damagedQuantity", "minStockLevel", "maxStockLevel")
                 VALUES ($1, $2, 0, 0, 0, $3, $4) RETURNING *`,
                [productId, location, minStockLevel, maxStockLevel]
            );
        } else {
            result = await query(
                `UPDATE location_stock SET "minStockLevel" = $1, "maxStockLevel" = $2 WHERE product_id = $3 AND location = $4 RETURNING *`,
                [minStockLevel, maxStockLevel, productId, location]
            );
        }

        res.status(200).json({ message: 'Stock limits updated successfully', location, minStockLevel, maxStockLevel, currentStock: result.rows[0].quantity });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


// ====== ANALYTICS ROUTES ======

router.get('/analytics/data', fetchuser, async (req, res) => {
    try {
        // 1. Category-wise distribution
        const categoryData = (await query(
            `SELECT COALESCE("ProductCategory", 'Uncategorized') AS name, COUNT(*) AS products, COALESCE(SUM("totalStock"), 0) AS stock
             FROM products WHERE "isActive" = true GROUP BY "ProductCategory" ORDER BY products DESC`,
            []
        )).rows;

        // 2. Location-wise stock
        const locationData = (await query(
            `SELECT ls.location AS name, COALESCE(SUM(ls.quantity), 0) AS stock
             FROM location_stock ls
             JOIN products p ON ls.product_id = p.id
             WHERE p."isActive" = true
             GROUP BY ls.location ORDER BY stock DESC`,
            []
        )).rows.map(r => ({ name: r.name.charAt(0).toUpperCase() + r.name.slice(1), stock: parseInt(r.stock) }));

        // 3. Stock movements over last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const movementsByDay = (await query(
            `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date_str, type, COUNT(*) AS count, SUM(quantity) AS totalqty
             FROM stock_movements
             WHERE date >= $1
             GROUP BY TO_CHAR(date, 'YYYY-MM-DD'), type
             ORDER BY date_str ASC`,
            [sevenDaysAgo]
        )).rows;

        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const dayMovements = movementsByDay.filter(m => m.date_str === dateStr);
            const inbound = dayMovements.find(m => m.type === 'inbound');
            const outbound = dayMovements.find(m => m.type === 'outbound');
            dailyData.push({ date: dayLabel, inbound: inbound ? parseInt(inbound.totalqty) : 0, outbound: outbound ? parseInt(outbound.totalqty) : 0 });
        }

        // 4. Movement type breakdown
        const movementTypeData = (await query(
            `SELECT type AS name, COUNT(*) AS value, SUM(quantity) AS qty FROM stock_movements GROUP BY type ORDER BY value DESC`,
            []
        )).rows.map(m => ({ name: m.name.charAt(0).toUpperCase() + m.name.slice(1), value: parseInt(m.value), qty: parseInt(m.qty) }));

        // 5. Top 5 products by stock
        const topProductData = (await query(
            `SELECT "ProductName", "totalStock", "ProductPrice" FROM products WHERE "isActive" = true ORDER BY "totalStock" DESC LIMIT 5`,
            []
        )).rows.map(p => ({
            name: p.ProductName.length > 15 ? p.ProductName.substring(0, 15) + '...' : p.ProductName,
            fullName: p.ProductName,
            stock: p.totalStock,
            value: p.totalStock * p.ProductPrice
        }));

        // 6. Stock health
        const totalCount = parseInt((await query(`SELECT COUNT(*) FROM products WHERE "isActive" = true`, [])).rows[0].count);
        const lowCount = parseInt((await query(`SELECT COUNT(*) FROM products WHERE "isLowStock" = true AND "isActive" = true AND "totalStock" > 0`, [])).rows[0].count);
        const outCount = parseInt((await query(`SELECT COUNT(*) FROM products WHERE "totalStock" = 0 AND "isActive" = true`, [])).rows[0].count);
        const healthyCount = totalCount - lowCount - outCount;

        res.status(200).json({
            categoryData,
            locationData,
            dailyMovements: dailyData,
            movementTypeData,
            topProducts: topProductData,
            stockHealth: { healthy: healthyCount, low: lowCount, out: outCount, total: totalCount }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});


// Get stock forecasting data based on sales velocity in the last 30 days
router.get('/analytics/forecast', fetchuser, async (req, res) => {
    try {
        const queryStr = `
            SELECT p.id, p."ProductName" as name, p."totalStock" as "totalStock",
                   COALESCE(SUM(sm.quantity), 0) AS outbound_qty
            FROM products p
            LEFT JOIN stock_movements sm ON p.id = sm.product_id 
                AND sm.type = 'outbound' 
                AND sm.date >= NOW() - INTERVAL '30 days'
            WHERE p."isActive" = true
            GROUP BY p.id, p."ProductName", p."totalStock"
            ORDER BY "totalStock" ASC
        `;
        const result = await query(queryStr, []);
        const forecastData = result.rows.map(row => {
            const currentStock = parseInt(row.totalStock) || 0;
            const outboundQty = parseInt(row.outbound_qty) || 0;
            const salesVelocity = parseFloat((outboundQty / 30).toFixed(2)); // units per day
            
            let daysRemaining = null;
            let status = 'stable'; // Default if no velocity
            
            if (salesVelocity > 0) {
                daysRemaining = Math.max(0, Math.ceil(currentStock / salesVelocity));
                if (daysRemaining <= 7) {
                    status = 'critical';
                } else if (daysRemaining <= 15) {
                    status = 'warning';
                } else {
                    status = 'healthy';
                }
            }
            
            return {
                productId: row.id,
                productName: row.name,
                currentStock,
                outboundQty,
                salesVelocity,
                daysRemaining,
                status
            };
        });
        
        res.status(200).json(forecastData);
    } catch (error) {
        console.error('Forecasting error:', error);
        res.status(500).json({ error: 'Failed to fetch stock forecasting data' });
    }
});



// ====== EMAIL SETTINGS ROUTES ======

router.post('/email-settings', fetchuser, async (req, res) => {
    try {
        const { adminEmail, appPassword } = req.body;
        if (!adminEmail || !appPassword) {
            return res.status(400).json({ error: 'Email and app password are required' });
        }
        configureTransporter(adminEmail, appPassword);
        res.status(200).json({ message: 'Email configured successfully', status: getEmailConfigStatus() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to configure email' });
    }
});

router.get('/email-settings', fetchuser, async (req, res) => {
    try {
        res.status(200).json(getEmailConfigStatus());
    } catch (error) {
        res.status(500).json({ error: 'Failed to get email settings' });
    }
});

router.post('/email-settings/test', fetchuser, async (req, res) => {
    try {
        const result = await sendTestEmail();
        res.status(200).json({ message: 'Test email sent successfully', ...result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ====== CHAT ASSISTANT ======

router.post('/chat', fetchuser, async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }
        if (message.length > 500) {
            return res.status(400).json({ error: 'Message must be 500 characters or fewer' });
        }

        const result = await generateChatReply({
            userId: Number(req.user.id),
            message: message.trim(),
            history: Array.isArray(history) ? history : [],
        });

        res.status(200).json({
            success: true,
            reply: result.reply,
            poweredBy: result.poweredBy,
            contextSummary: result.contextSummary,
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Assistant is temporarily unavailable' });
    }
});

module.exports = router;
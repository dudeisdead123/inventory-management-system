const express = require('express');
const router = express.Router();
const products = require('../Models/Products');
const User = require('../Models/User');
const Location = require('../Models/Location');
const StockAlert = require('../Models/StockAlert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Middleware
const fetchuser = require('../middleware/fetchuser');

const JWT_SECRET = 'your_jwt_secret_key_here'; 


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
   
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            return res.status(400).json({ success, error: "Sorry a user with this email already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

     
        user = await User.create({
            name: req.body.name,
            password: secPass,
            email: req.body.email,
            role: req.body.role || 'customer',
            location: req.body.location || 'All'
        });
        const data = {
            user: {
                id: user.id
            }
        }
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
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }

        const data = {
            user: {
                id: user.id
            }
        }
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
        const user = await User.findById(userId).select("-password");
        res.send(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


router.post("/insertproduct", fetchuser, async (req, res) => {
    const { ProductName, ProductPrice, ProductBarcode } = req.body;

    try {
       
        const pre = await products.findOne({ 
            ProductBarcode: ProductBarcode,
            createdBy: req.user.id
        })
        console.log(pre);

        if (pre) {
            res.status(422).json("Product is already added.")
        }
        else {
        
            const addProduct = new products({ 
                ProductName, 
                ProductPrice, 
                ProductBarcode,
                totalStock: 0, 
                globalMinStock: 10,
                globalMaxStock: 1000,
                locationStock: [
                    { location: 'mumbai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'delhi', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'bengaluru', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'chennai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'kolkata', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'hyderabad', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 }
                ], 
                createdBy: req.user.id 
            });

            await addProduct.save();
            res.status(201).json(addProduct)
            console.log(addProduct)
        }
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Server error' })
    }
})


router.get('/products', fetchuser, async (req, res) => {

    try {
        const getProducts = await products.find({});

        const productsWithStock = await Promise.all(getProducts.map(async (product) => {
            await product.calculateTotalStock();
            
            const totalStock = product.totalStock || 0;
            const isLowStock = totalStock <= product.globalMinStock;
            const isOutOfStock = totalStock === 0;
            
            return {
                ...product.toJSON(),
                totalStock,
                isLowStock,
                isOutOfStock,
                stockStatus: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'
            };
        }));
        
        console.log('Products with stock data for user:', req.user.id, productsWithStock);
        res.status(201).json(productsWithStock);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
})


router.get('/products/:id', fetchuser, async (req, res) => {

    try {
       
        const getProduct = await products.findOne({
            _id: req.params.id,
            createdBy: req.user.id
        });
        
        if (!getProduct) {
            return res.status(404).json({ error: 'Product not found or access denied' });
        }
        
        await getProduct.calculateTotalStock();
        await getProduct.save();
        
        const totalStock = getProduct.totalStock || 0;
        const isLowStock = totalStock <= getProduct.globalMinStock;
        const isOutOfStock = totalStock === 0;
        
        const productWithStock = {
            ...getProduct.toJSON(),
            totalStock,
            isLowStock,
            isOutOfStock,
            stockStatus: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'
        };
        
        console.log('Product with stock data:', productWithStock);
        res.status(201).json(productWithStock);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
})


router.put('/updateproduct/:id', fetchuser, async (req, res) => {
    const { ProductName, ProductPrice, ProductBarcode } = req.body;

    try {
        const updateProducts = await products.findByIdAndUpdate(req.params.id, { ProductName, ProductPrice, ProductBarcode }, { new: true });
        console.log("Data Updated");
        res.status(201).json(updateProducts);
    }
    catch (err) {
        console.log(err);
    }
})

//Deleting Data: (Protected Route)
router.delete('/deleteproduct/:id', fetchuser, async (req, res) => {

    try {
        // Only allow deletion of products owned by the current user
        const deleteProduct = await products.findOneAndDelete({
            _id: req.params.id
        });
        
        if (!deleteProduct) {
            return res.status(404).json({ error: 'Product not found or access denied' });
        }
        
        console.log("Data Deleted");
        res.status(201).json(deleteProduct);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
})

// Initialize stock for existing products (for demo purposes)
router.post('/initialize-stock', fetchuser, async (req, res) => {
    try {
        const allProducts = await products.find({});
        let updatedCount = 0;
        
        for (let product of allProducts) {
            // Only initialize if the product doesn't have stock data
            if (!product.locationStock || product.locationStock.length === 0) {
                product.totalStock = 0;
                product.globalMinStock = 10;
                product.globalMaxStock = 1000;
                product.locationStock = [
                    { location: 'mumbai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'delhi', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'bengaluru', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'chennai', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'kolkata', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 },
                    { location: 'hyderabad', quantity: 0, reservedQuantity: 0, damagedQuantity: 0, minStockLevel: 0, maxStockLevel: 1000 }
                ];
                
                await product.calculateTotalStock();
                await product.save();
                updatedCount++;
            }
        }
        
        res.status(200).json({ 
            message: `Initialized stock for ${updatedCount} products`,
            updatedCount 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to initialize stock' });
    }
});

// ====== LOCATION MANAGEMENT ROUTES ======

// Initialize default locations (for demo purposes)
router.post('/initialize-locations', fetchuser, async (req, res) => {
    try {
        const existingLocations = await Location.find({});
        
        if (existingLocations.length === 0) {
            const defaultLocations = [
                {
                    locationId: 'mumbai',
                    locationName: 'Mumbai',
                    locationType: 'store',
                    address: {
                        street: 'M G Road',
                        city: 'Mumbai',
                        state: 'MH',
                        zipCode: '400001',
                        country: 'India'
                    },
                    contactInfo: {
                        phone: '+91-9876543210',
                        email: 'mumbai@company.com',
                        manager: 'Rahul Kumar'
                    },
                    currentUtilization: 0,
                    createdBy: req.user.id
                },
                {
                    locationId: 'delhi',
                    locationName: 'Delhi',
                    locationType: 'store',
                    address: {
                        street: 'Connaught Place',
                        city: 'Delhi',
                        state: 'DL',
                        zipCode: '110001',
                        country: 'India'
                    },
                    contactInfo: {
                        phone: '+91-9876543211',
                        email: 'delhi@company.com',
                        manager: 'Priya Singh'
                    },
                    currentUtilization: 0,
                    createdBy: req.user.id
                },
                {
                    locationId: 'bengaluru',
                    locationName: 'Bengaluru',
                    locationType: 'store',
                    address: {
                        street: 'MG Road',
                        city: 'Bengaluru',
                        state: 'KA',
                        zipCode: '560001',
                        country: 'India'
                    },
                    contactInfo: {
                        phone: '+91-9876543212',
                        email: 'bengaluru@company.com',
                        manager: 'Amit Patel'
                    },
                    currentUtilization: 0,
                    createdBy: req.user.id
                },
                {
                    locationId: 'chennai',
                    locationName: 'Chennai',
                    locationType: 'store',
                    address: {
                        street: 'Anna Salai',
                        city: 'Chennai',
                        state: 'TN',
                        zipCode: '600002',
                        country: 'India'
                    },
                    contactInfo: {
                        phone: '+91-9876543213',
                        email: 'chennai@company.com',
                        manager: 'Karthik N'
                    },
                    currentUtilization: 0,
                    createdBy: req.user.id
                },
                {
                    locationId: 'kolkata',
                    locationName: 'Kolkata',
                    locationType: 'store',
                    address: {
                        street: 'Park Street',
                        city: 'Kolkata',
                        state: 'WB',
                        zipCode: '700016',
                        country: 'India'
                    },
                    contactInfo: {
                        phone: '+91-9876543214',
                        email: 'kolkata@company.com',
                        manager: 'Sanjay Das'
                    },
                    currentUtilization: 0,
                    createdBy: req.user.id
                },
                {
                    locationId: 'hyderabad',
                    locationName: 'Hyderabad',
                    locationType: 'store',
                    address: {
                        street: 'Banjara Hills',
                        city: 'Hyderabad',
                        state: 'TG',
                        zipCode: '500034',
                        country: 'India'
                    },
                    contactInfo: {
                        phone: '+91-9876543215',
                        email: 'hyderabad@company.com',
                        manager: 'Vikram Reddy'
                    },
                    currentUtilization: 0,
                    createdBy: req.user.id
                }
            ];

            await Location.insertMany(defaultLocations);
            res.status(200).json({ 
                message: 'Default locations initialized successfully',
                count: defaultLocations.length 
            });
        } else {
            res.status(200).json({ 
                message: 'Locations already exist',
                count: existingLocations.length 
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to initialize locations' });
    }
});

// Get all locations
router.get('/locations', fetchuser, async (req, res) => {
    try {
        const locations = await Location.find({ isActive: true });
        res.status(200).json(locations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// Create new location
router.post('/locations', fetchuser, async (req, res) => {
    try {
        const { locationId, locationName, locationType, address, contactInfo } = req.body;
        
        // Check if location ID already exists
        const existingLocation = await Location.findOne({ locationId });
        if (existingLocation) {
            return res.status(400).json({ error: 'Location ID already exists' });
        }

        const newLocation = new Location({
            locationId,
            locationName,
            locationType,
            address,
            contactInfo,
            createdBy: req.user.id
        });

        await newLocation.save();

        // Add default stock limits for this location to all existing products
        await products.updateMany(
            {},
            {
                $push: {
                    locationStock: {
                        location: locationId,
                        quantity: 0,
                        reservedQuantity: 0,
                        damagedQuantity: 0,
                        minStockLevel: 10,
                        maxStockLevel: 1000
                    }
                }
            }
        );

        res.status(201).json(newLocation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create location' });
    }
});

// ====== STOCK MANAGEMENT ROUTES ======

// Add stock to a product at a specific location
router.post('/stock/add/:productId', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { location, quantity, reason, reference } = req.body;

        if (!location || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Location and valid quantity are required' });
        }

        const product = await products.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get current location stock info for better error messages
        const locationStock = product.locationStock.find(loc => loc.location === location);
        const currentStock = locationStock ? locationStock.quantity : 0;
        const maxStock = locationStock ? locationStock.maxStockLevel : 1000;
        
        try {
            product.addStock(location, parseInt(quantity), req.user.id, reason, reference);
            await product.save();

            // Check for stock alerts after update
            await checkAndCreateStockAlerts(product);

            const io = req.app.get('socketio');
            if (io) {
                const updatedLoc = product.locationStock.find(l => l.location === location);
                io.emit('stockUpdated', { 
                    productId, 
                    type: 'add', 
                    newStockLevel: product.totalStock,
                    location: location,
                    newQuantity: updatedLoc ? updatedLoc.quantity : undefined
                });
            }

            res.status(200).json({ 
                message: 'Stock added successfully', 
                product: product,
                newStockLevel: product.totalStock,
                locationStock: currentStock + parseInt(quantity),
                maxStock: maxStock
            });
        } catch (stockError) {
            // Handle validation errors specifically
            return res.status(400).json({ 
                error: stockError.message,
                type: 'validation_error',
                currentStock: currentStock,
                maxStock: maxStock,
                requestedQuantity: parseInt(quantity)
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Remove stock from a product at a specific location
router.post('/stock/remove/:productId', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { location, quantity, reason, reference } = req.body;

        if (!location || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Location and valid quantity are required' });
        }

        const product = await products.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        product.removeStock(location, parseInt(quantity), req.user.id, reason, reference);
        await product.save();

        // Check for stock alerts after update
        await checkAndCreateStockAlerts(product);

        const io = req.app.get('socketio');
        if (io) {
            const updatedLoc = product.locationStock.find(l => l.location === location);
            io.emit('stockUpdated', { 
                productId, 
                type: 'remove', 
                newStockLevel: product.totalStock,
                location: location,
                newQuantity: updatedLoc ? updatedLoc.quantity : undefined
            });
        }

        res.status(200).json({ 
            message: 'Stock removed successfully', 
            product: product,
            newStockLevel: product.totalStock
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Customer Buy action
router.post('/buy/:productId', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        let { location, quantity } = req.body;
        
        if (location) location = location.toLowerCase();

        if (!location || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Location and valid quantity are required' });
        }

        const product = await products.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const locationStock = product.locationStock.find(loc => loc.location === location.toLowerCase());
        if (!locationStock || locationStock.quantity < quantity) {
            // Trigger deficiency alert to admin
            const newAlert = await StockAlert.create({
                product: product._id,
                alertType: 'out_of_stock',
                location: location,
                currentQuantity: locationStock ? locationStock.quantity : 0,
                threshold: locationStock ? locationStock.minStockLevel : 10,
                severity: 'critical',
                message: `Deficiency at ${location} for ${product.ProductName}. Refill it or transfer stock.`
            });
            const io = req.app.get('socketio');
            if (io) {
                io.emit('newAlert', newAlert);
            }
            return res.status(400).json({ error: `Out of stock in your location. Admin has been notified.` });
        }

        product.removeStock(location, parseInt(quantity), req.user.id, 'Customer Purchase', 'Purchase');
        await product.save();

        const io = req.app.get('socketio');
        if (io) {
            io.emit('stockUpdated', { productId, type: 'buy', newStockLevel: product.totalStock });
        }

        res.status(200).json({ 
            message: 'Purchase successful', 
            product: product,
            newStockLevel: product.totalStock
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Transfer stock between locations
router.post('/stock/transfer/:productId', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { fromLocation, toLocation, quantity, reason } = req.body;

        if (!fromLocation || !toLocation || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'From/To locations and valid quantity are required' });
        }

        const product = await products.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Remove from source location
        product.removeStock(fromLocation, parseInt(quantity), req.user.id, reason, 'Transfer Out');
        
        // Add to destination location
        product.addStock(toLocation, parseInt(quantity), req.user.id, reason, 'Transfer In');
        
        await product.save();

        res.status(200).json({ 
            message: 'Stock transferred successfully', 
            product: product
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Get stock movements for a product
router.get('/stock/movements/:productId', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const product = await products.findById(productId)
            .populate('stockMovements.performedBy', 'name email');
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Sort movements by date (newest first) and apply pagination
        const movements = product.stockMovements
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(parseInt(skip), parseInt(skip) + parseInt(limit));

        res.status(200).json({
            movements,
            totalMovements: product.stockMovements.length,
            product: {
                _id: product._id,
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

// Get all stock alerts
router.get('/alerts', fetchuser, async (req, res) => {
    try {
        const { unread, severity } = req.query;
        
        let filter = {};
        if (unread === 'true') filter.isRead = false;
        if (severity) filter.severity = severity;

        const alerts = await StockAlert.find(filter)
            .populate('product', 'ProductName ProductBarcode')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json(alerts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Mark alert as read
router.put('/alerts/:alertId/read', fetchuser, async (req, res) => {
    try {
        const alert = await StockAlert.findByIdAndUpdate(
            req.params.alertId,
            { isRead: true },
            { new: true }
        );
        
        res.status(200).json(alert);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
});

// Resolve alert
router.put('/alerts/:alertId/resolve', fetchuser, async (req, res) => {
    try {
        const { resolvedNote } = req.body;
        
        const alert = await StockAlert.findByIdAndUpdate(
            req.params.alertId,
            { 
                isResolved: true, 
                resolvedBy: req.user.id,
                resolvedAt: new Date(),
                resolvedNote: resolvedNote || ''
            },
            { new: true }
        );
        
        res.status(200).json(alert);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

// Get dashboard statistics
router.get('/dashboard/stats', fetchuser, async (req, res) => {
    try {
        // Filter all statistics by current user
        const totalProducts = await products.countDocuments({ isActive: true, createdBy: req.user.id });
        const lowStockProducts = await products.countDocuments({ isLowStock: true, isActive: true, createdBy: req.user.id });
        const outOfStockProducts = await products.countDocuments({ totalStock: 0, isActive: true, createdBy: req.user.id });
        const unreadAlerts = await StockAlert.countDocuments({ isRead: false, userId: req.user.id });
        const locations = await Location.countDocuments({ isActive: true, createdBy: req.user.id });
        
        // Get recent stock movements for user's products only
        const recentMovements = await products.aggregate([
            { $match: { createdBy: req.user.id } }, // Filter by user first
            { $unwind: '$stockMovements' },
            { $sort: { 'stockMovements.date': -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'stockMovements.performedBy',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    ProductName: 1,
                    ProductBarcode: 1,
                    movement: '$stockMovements',
                    user: { $arrayElemAt: ['$user.name', 0] }
                }
            }
        ]);

        res.status(200).json({
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            unreadAlerts,
            locations,
            recentMovements
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// ====== HELPER FUNCTIONS ======

// Function to check and create stock alerts
async function checkAndCreateStockAlerts(product) {
    try {
        // Check each location for low stock
        for (const locationStock of product.locationStock) {
            if (locationStock.quantity <= locationStock.minStockLevel) {
                // Check if alert already exists for this product-location combination
                const existingAlert = await StockAlert.findOne({
                    product: product._id,
                    location: locationStock.location,
                    alertType: locationStock.quantity === 0 ? 'out_of_stock' : 'low_stock',
                    isResolved: false
                });

                if (!existingAlert) {
                    const severity = locationStock.quantity === 0 ? 'critical' : 
                                   locationStock.quantity <= (locationStock.minStockLevel / 2) ? 'high' : 'medium';
                    
                    await StockAlert.create({
                        product: product._id,
                        alertType: locationStock.quantity === 0 ? 'out_of_stock' : 'low_stock',
                        location: locationStock.location,
                        currentQuantity: locationStock.quantity,
                        threshold: locationStock.minStockLevel,
                        severity: severity,
                        message: `${product.ProductName} is ${locationStock.quantity === 0 ? 'out of stock' : 'running low'} at ${locationStock.location}. Current: ${locationStock.quantity}, Minimum: ${locationStock.minStockLevel}`
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error creating stock alerts:', error);
    }
}

// Function to create damaged item alert
async function createDamagedItemAlert(product, location, quantity) {
    try {
        await StockAlert.create({
            product: product._id,
            alertType: 'damaged_items',
            location: location,
            currentQuantity: quantity,
            threshold: 0,
            severity: 'medium',
            message: `${quantity} units of ${product.ProductName} marked as damaged at ${location}`
        });
    } catch (error) {
        console.error('Error creating damaged item alert:', error);
    }
}

// Get min/max stock levels for a product location
router.get('/products/:productId/stock-limits', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await products.findOne({
            _id: productId,
            createdBy: req.user.id
        });
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found or access denied' });
        }
        
        const stockLimits = product.locationStock.map(loc => ({
            location: loc.location,
            minStockLevel: loc.minStockLevel,
            maxStockLevel: loc.maxStockLevel,
            currentStock: loc.quantity
        }));
        
        res.status(200).json({ stockLimits });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update min/max stock levels for a product location
router.put('/products/:productId/stock-limits', fetchuser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { location, minStockLevel, maxStockLevel } = req.body;
        
        if (!location || minStockLevel < 0 || maxStockLevel <= 0 || minStockLevel >= maxStockLevel) {
            return res.status(400).json({ 
                error: 'Valid location, minStockLevel (>=0), and maxStockLevel (>minStockLevel) are required' 
            });
        }
        
        const product = await products.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        let locationStock = product.locationStock.find(loc => loc.location === location);
        if (!locationStock) {
            // Create new location stock entry
            locationStock = {
                location: location,
                quantity: 0,
                reservedQuantity: 0,
                damagedQuantity: 0,
                minStockLevel: minStockLevel,
                maxStockLevel: maxStockLevel
            };
            product.locationStock.push(locationStock);
        } else {
            // Update existing location stock limits
            locationStock.minStockLevel = minStockLevel;
            locationStock.maxStockLevel = maxStockLevel;
        }
        
        await product.save();
        
        res.status(200).json({ 
            message: 'Stock limits updated successfully',
            location: location,
            minStockLevel: minStockLevel,
            maxStockLevel: maxStockLevel,
            currentStock: locationStock.quantity
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
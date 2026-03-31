const mongoose = require('mongoose');

const StockAlertSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    alertType: {
        type: String,
        enum: ['low_stock', 'out_of_stock', 'overstock', 'damaged_items', 'expiry_warning'],
        required: true
    },
    location: {
        type: String,
        required: true
    },
    currentQuantity: {
        type: Number,
        required: true
    },
    threshold: {
        type: Number,
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    resolvedAt: {
        type: Date
    },
    resolvedNote: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to update timestamp
StockAlertSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const StockAlert = mongoose.model("StockAlert", StockAlertSchema);
module.exports = StockAlert;
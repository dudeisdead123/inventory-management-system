const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    locationId: {
        type: String,
        required: true,
        unique: true
    },
    locationName: {
        type: String,
        required: true
    },
    locationType: {
        type: String,
        enum: ['warehouse', 'store', 'outlet', 'distribution_center', 'other'],
        default: 'store'
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    contactInfo: {
        phone: String,
        email: String,
        manager: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    currentUtilization: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
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
LocationSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Location = mongoose.model("Location", LocationSchema);
module.exports = Location;
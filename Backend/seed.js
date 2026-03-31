const mongoose = require('mongoose');
const User = require('./Models/User');
const Location = require('./Models/Location');
const bcrypt = require('bcryptjs');

async function seed() {
    await mongoose.connect("mongodb://127.0.0.1:27017/IMS", {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Connected to DB");

    // Clear old locations
    await Location.deleteMany({});
    
    // Insert new locations
    const defaultLocations = [
        { locationId: 'mumbai', locationName: 'Mumbai', locationType: 'store', address: { street: '', city: 'Mumbai', state: 'MH', zipCode: '', country: 'India' }, currentUtilization: 0, createdBy: "000000000000000000000000" },
        { locationId: 'delhi', locationName: 'Delhi', locationType: 'store', address: { street: '', city: 'Delhi', state: 'DL', zipCode: '', country: 'India' }, currentUtilization: 0, createdBy: "000000000000000000000000" },
        { locationId: 'bengaluru', locationName: 'Bengaluru', locationType: 'store', address: { street: '', city: 'Bengaluru', state: 'KA', zipCode: '', country: 'India' }, currentUtilization: 0, createdBy: "000000000000000000000000" },
        { locationId: 'chennai', locationName: 'Chennai', locationType: 'store', address: { street: '', city: 'Chennai', state: 'TN', zipCode: '', country: 'India' }, currentUtilization: 0, createdBy: "000000000000000000000000" },
        { locationId: 'kolkata', locationName: 'Kolkata', locationType: 'store', address: { street: '', city: 'Kolkata', state: 'WB', zipCode: '', country: 'India' }, currentUtilization: 0, createdBy: "000000000000000000000000" },
        { locationId: 'hyderabad', locationName: 'Hyderabad', locationType: 'store', address: { street: '', city: 'Hyderabad', state: 'TG', zipCode: '', country: 'India' }, currentUtilization: 0, createdBy: "000000000000000000000000" }
    ];
    await Location.insertMany(defaultLocations);
    console.log("Inserted Metropolitan Locations");

    // Remove all users
    await User.deleteMany({});
    
    // Add sole Admin
    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash("Kash@5612", salt);
    
    await User.create({
        name: "anshuman",
        email: "ansumanaheer8@gmail.com",
        password: secPass,
        role: "admin",
        location: "All"
    });
    console.log("Admin user anshuman created!");

    mongoose.disconnect();
}

seed();

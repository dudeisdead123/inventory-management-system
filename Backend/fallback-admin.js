const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/IMS').then(async () => {
    const User = require('./Models/User');
    
    // Check if the fallback user exists
    const existing = await User.findOne({ email: 'anshumanaheer8@gmail.com' });
    if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash("Kash@5612", salt);
        
        await User.create({
            name: "anshuman",
            email: "anshumanaheer8@gmail.com", // with an "h"
            password: secPass,
            role: "admin",
            location: "All"
        });
        console.log("Fallback admin (anshumanaheer8@gmail.com) created.");
    } else {
        console.log("Fallback already exists.");
    }
    
    process.exit();
}).catch(console.error);

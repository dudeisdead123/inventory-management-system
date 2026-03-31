const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/IMS').then(async () => {
    const User = require('./Models/User');
    const users = await User.find({});
    console.log("USERS IN DB:");
    users.forEach(u => console.log(u.email, u.role, u.password));

    const specificUser = await User.findOne({ email: 'ansumanaheer8@gmail.com' });
    if(specificUser) {
        console.log("Found anshuman!");
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare("Kash@5612", specificUser.password);
        console.log("Password matches:", isMatch);
    } else {
        console.log("Anshuman NOT found!");
    }
    process.exit();
}).catch(console.error);

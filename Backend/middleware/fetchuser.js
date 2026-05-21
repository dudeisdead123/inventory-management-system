const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret'); 

const fetchuser = (req, res, next) => {
    // Get the user from the jwt token and add id to req object
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
        return;
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        
        // Ensure the user id is a valid integer (relational DB) to reject legacy MongoDB ObjectId hex strings
        const userId = Number(data.user?.id);
        if (isNaN(userId) || !Number.isInteger(userId)) {
            res.status(401).send({ error: "Please authenticate using a valid token" });
            return;
        }
        
        req.user = data.user;
        next();
    } catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
    }
}

module.exports = fetchuser;

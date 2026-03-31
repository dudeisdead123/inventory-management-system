const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key_here';
const data = { user: { id: 'some_id' } }; 
const token = jwt.sign(data, JWT_SECRET);

async function check() {
    try {
        const res = await fetch('http://localhost:3001/products', {
            headers: { 'auth-token': token }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        if (text.length > 500) {
            console.log("Body starts with:", text.substring(0, 500));
            console.log("Is array?", Array.isArray(JSON.parse(text)));
        } else {
            console.log("Body:", text);
            try { console.log("Is array?", Array.isArray(JSON.parse(text))); } catch(e){}
        }
    } catch (e) {
        console.error(e);
    }
}
check();

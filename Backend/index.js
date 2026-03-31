const connectToMongo = require('./db')
connectToMongo();

const express = require('express')
const app = express()
const port = 3001

const cors = require('cors')
const router = require('./Routes/router')

const http = require('http');
const { Server } = require('socket.io');

app.use(cors());
app.use(express.json());
app.use(router);

// Create HTTP server instead of plain express
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Set io instance logically in express so router.js can access it
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('A user connected via socket', socket.id);
    
    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
    });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})




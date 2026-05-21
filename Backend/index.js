const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectToDb } = require('./db');
connectToDb();

const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3001);

const cors = require('cors');
const router = require('./Routes/router');
const { initEmailService } = require('./services/emailService');

const http = require('http');
const { Server } = require('socket.io');

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(router);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ims-backend' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Set a strong secret in production.');
}

server.listen(port, () => {
  console.log(`IMS backend listening on port ${port}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  initEmailService();
});

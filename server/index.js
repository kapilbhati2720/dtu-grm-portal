require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

require('./db');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT"]
  }
});

app.use(cors());
app.use(express.json());

let onlineUsers = {};

// Define Routes and pass dependencies to them
const authRoutes = require('./routes/auth');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin'); // Import admin routes
const grievancesRoutes = require('./routes/grievances')(io, onlineUsers);
const officerRoutes = require('./routes/officer')(io, onlineUsers);

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes); // Use admin routes
app.use('/api/grievances', grievancesRoutes);
app.use('/api/officer', officerRoutes);

io.on('connection', (socket) => {
    socket.on('addUser', (userId) => {
        onlineUsers[userId] = socket.id;
        console.log('Online users updated:', onlineUsers);
    });
    socket.on('disconnect', () => {
        for (let userId in onlineUsers) {
            if (onlineUsers[userId] === socket.id) {
                delete onlineUsers[userId];
                console.log('Online users updated:', onlineUsers);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
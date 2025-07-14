const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const app = express();

const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 8080;

// Session middleware
const sessionMiddleware = session({
    secret: 'luxury-chat-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hour
        sameSite: 'lax',
    }
});
app.use(sessionMiddleware);

// Use middleware in socket.io as well
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// Body parser
app.use(express.json());
app.use(express.static(path.join(__dirname, 'chat')));

// Users store (Set for uniqueness)
const users = new Set();

// Login route
app.get("/",(req,res)=>{ res.sendFlile(__dirname+"/index.html")})
app.post('/login', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.json({ success: false, message: 'Username required' });
    }

    if (users.has(username)) {
        return res.json({ success: false, message: 'Username already in use' });
    }

    req.session.username = username;
    users.add(username);
    res.json({ success: true });
});

// Logout route
app.post('/logout', (req, res) => {
    const username = req.session.username;

    if (username) {
        users.delete(username);
    }

    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// Socket.IO handlers
io.on('connection', (socket) => {
    console.log('🔌 A client connected');

    const session = socket.request.session;
    const username = session?.username;

    if (username) {
        socket.username = username;

        // Notify users
        io.emit('user-connected', { username });
        io.emit('online-count', users.size);
    }

    // Handle incoming messages
    socket.on('send-message', (data) => {
        io.emit('chat-message', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.username);
            io.emit('user-disconnected', {
                username: socket.username
            });
            io.emit('online-count', users.size);
        }
        console.log('❌ Client disconnected');
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

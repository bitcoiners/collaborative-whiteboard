const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // For development; restrict in production
    methods: ['GET', 'POST']
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Track connected users
let connectedUsers = new Map(); // socket.id -> connection info

// Set up Socket.IO connection handler
io.on('connection', (socket) => {
  const userInfo = {
    id: socket.id,
    connectedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  
  connectedUsers.set(socket.id, userInfo);
  
  console.log(`[${userInfo.connectedAt}] User connected: ${socket.id}`);
  console.log(`Total users online: ${connectedUsers.size}`);
  
  // Send current user count to all clients
  io.emit('user-count', connectedUsers.size);
  
  // Send welcome message to this client only
  socket.emit('welcome', {
    message: 'Connected to collaborative whiteboard',
    userId: socket.id,
    onlineUsers: connectedUsers.size
  });
  
  // Handle the 'draw' event from a client
  socket.on('draw', (lineData) => {
    // Update user's last activity
    if (connectedUsers.has(socket.id)) {
      connectedUsers.get(socket.id).lastActivity = new Date().toISOString();
    }
    
    // Validate incoming data
    if (!isValidDrawData(lineData)) {
      console.warn(`[${socket.id}] Invalid draw data received:`, lineData);
      return;
    }
    
    // Add timestamp and sender ID to the data
    const enrichedData = {
      ...lineData,
      senderId: socket.id,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast the drawing data to all OTHER connected clients
    socket.broadcast.emit('draw', enrichedData);
    console.log(`[${socket.id}] Broadcast drawing data`);
  });

  // Handle the 'clear-canvas' event from a client
  socket.on('clear-canvas', () => {
    // Update user's last activity
    if (connectedUsers.has(socket.id)) {
      connectedUsers.get(socket.id).lastActivity = new Date().toISOString();
    }
    
    // Broadcast the clear event to ALL connected clients
    io.emit("clear-canvas");
    console.log(`[${socket.id}] Requested canvas clear for all clients`);
  });
  
  // Handle user count request
  socket.on('get-user-count', () => {
    socket.emit('user-count', connectedUsers.size);
  });
  
  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    const disconnectTime = new Date().toISOString();
    
    console.log(`[${disconnectTime}] User disconnected: ${socket.id}`);
    console.log(`Total users online: ${connectedUsers.size}`);
    
    // Update all remaining clients about the new user count
    io.emit('user-count', connectedUsers.size);
  });
});

// Helper function to validate draw data
function isValidDrawData(data) {
  return (
    data &&
    typeof data.x0 === 'number' && 
    typeof data.y0 === 'number' &&
    typeof data.x1 === 'number' && 
    typeof data.y1 === 'number' &&
    typeof data.color === 'string' &&
    typeof data.brushSize === 'number' &&
    data.brushSize >= 1 && data.brushSize <= 20
  );
}

// Get port from environment variable or use default
const PORT = process.env.PORT || 3000;

// Only start server if file is executed directly (not imported for tests)
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Socket.IO server is running`);
    console.log(`Whiteboard available at: http://localhost:${PORT}`);
  });
}

// Export for testing
module.exports = { 
  app, 
  server, 
  io, 
  isValidDrawData,
  connectedUsers // Export for potential testing
};

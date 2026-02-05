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

// Set up Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
  
  // Handle the 'draw' event from a client
  socket.on('draw', (lineData) => {
    // Validate incoming data
    if (!isValidDrawData(lineData)) {
      console.warn(`[${socket.id}] Invalid draw data received:`, lineData);
      return;
    }
    
    // Broadcast the drawing data to all OTHER connected clients
    socket.broadcast.emit('draw', lineData);
    console.log(`[${socket.id}] Broadcast drawing data:`, lineData);
  });

  // Handle the 'clear-canvas' event from a client
  socket.on('clear-canvas', () => {
    // Broadcast the clear event to ALL connected clients
    io.emit('clear-canvas');
    console.log(`[${socket.id}] Requested canvas clear for all clients`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
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
    typeof data.color === 'string'
  );
}

// Get port from environment variable or use default
const PORT = process.env.PORT || 3000;

// Only start server if file is executed directly (not imported for tests)
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Socket.IO server is running`);
  });
}

// Export for testing
module.exports = { app, server, io, isValidDrawData };
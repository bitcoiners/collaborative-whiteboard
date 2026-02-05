/**
 * Collaborative Whiteboard - Server Implementation
 * 
 * Main server file for the real-time collaborative whiteboard application.
 * Handles HTTP requests, serves static files, and manages WebSocket connections
 * for real-time drawing synchronization between multiple clients.
 * 
 * @file server.js
 * @version 1.0.0
 * @created 2024-02-05
 * @modified 2024-02-05
 * 
 * @dependencies
 * - express: Web application framework
 * - socket.io: Real-time bidirectional event-based communication
 * - http: HTTP server module
 * - path: Utilities for working with file and directory paths
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

// Core Node.js modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

/**
 * Default server port
 * @constant {number}
 * @default 3000
 */
const DEFAULT_PORT = 3000;

/**
 * Maximum allowed brush size for validation
 * @constant {number}
 * @default 20
 */
const MAX_BRUSH_SIZE = 20;

/**
 * Minimum allowed brush size for validation  
 * @constant {number}
 * @default 1
 */
const MIN_BRUSH_SIZE = 1;

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

/**
 * HTTP server instance
 * @type {http.Server}
 */
const server = http.createServer(app);

/**
 * Socket.IO server instance configured with CORS for development
 * @type {socketio.Server}
 */
const io = new Server(server, {
  cors: {
    origin: '*', // Note: Restrict to specific origins in production
    methods: ['GET', 'POST']
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000 // 2 minutes
  }
});

// ============================================================================
// MIDDLEWARE & STATIC FILES
// ============================================================================

/**
 * Serve static files from the 'public' directory
 * This includes: index.html, app.js, style.css
 */
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Map to track connected users
 * Key: socket.id (string)
 * Value: { id: string, connectedAt: string, lastActivity: string }
 * @type {Map<string, Object>}
 */
const connectedUsers = new Map();

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates drawing data received from clients
 * 
 * Ensures all required fields are present and have correct types.
 * This validation prevents malformed data from being broadcast to other clients.
 * 
 * @param {Object} data - The drawing data to validate
 * @param {number} data.x0 - Starting X coordinate
 * @param {number} data.y0 - Starting Y coordinate  
 * @param {number} data.x1 - Ending X coordinate
 * @param {number} data.y1 - Ending Y coordinate
 * @param {string} data.color - Hex color code (e.g., '#FF0000')
 * @param {number} data.brushSize - Brush size (should be between MIN_BRUSH_SIZE and MAX_BRUSH_SIZE)
 * @returns {boolean} True if data is valid, false otherwise
 * 
 * @example
 * // Valid data example
 * const validData = {
 *   x0: 10, y0: 20, x1: 50, y1: 60,
 *   color: '#3366FF', brushSize: 4
 * };
 * isValidDrawData(validData); // Returns true
 * 
 * @example
 * // Invalid data (missing brushSize)
 * const invalidData = {
 *   x0: 10, y0: 20, x1: 50, y1: 60,
 *   color: '#3366FF'
 * };
 * isValidDrawData(invalidData); // Returns false
 */
function isValidDrawData(data) {
  return (
    data &&
    typeof data.x0 === 'number' && 
    typeof data.y0 === 'number' &&
    typeof data.x1 === 'number' && 
    typeof data.y1 === 'number' &&
    typeof data.color === 'string' &&
    typeof data.brushSize === 'number' &&
    data.brushSize >= MIN_BRUSH_SIZE && 
    data.brushSize <= MAX_BRUSH_SIZE
  );
}

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

/**
 * Socket.IO connection event handler
 * 
 * Fired when a new client connects to the server. Sets up all event listeners
 * for the connected socket and manages user tracking.
 * 
 * @event io#connection
 * @param {socketio.Socket} socket - The socket instance for the connected client
 * 
 * @listens socket#draw - Drawing events from client
 * @listens socket#clear-canvas - Canvas clear requests
 * @listens socket#get-user-count - User count requests
 * @listens socket#disconnect - Client disconnection
 */
io.on('connection', (socket) => {
  /**
   * User information object for the connected client
   * @type {Object}
   * @property {string} id - Socket ID
   * @property {string} connectedAt - ISO timestamp of connection
   * @property {string} lastActivity - ISO timestamp of last activity
   */
  const userInfo = {
    id: socket.id,
    connectedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  
  // Add user to tracking map
  connectedUsers.set(socket.id, userInfo);
  
  console.log(`[${userInfo.connectedAt}] User connected: ${socket.id}`);
  console.log(`Total users online: ${connectedUsers.size}`);
  
  // Broadcast updated user count to ALL connected clients
  io.emit('user-count', connectedUsers.size);
  
  /**
   * Welcome message sent to newly connected client
   * @event socket#welcome
   * @type {Object}
   * @property {string} message - Welcome message
   * @property {string} userId - Client's socket ID
   * @property {number} onlineUsers - Current number of online users
   */
  socket.emit('welcome', {
    message: 'Connected to collaborative whiteboard',
    userId: socket.id,
    onlineUsers: connectedUsers.size
  });
  
  // ========================================================================
  // DRAW EVENT HANDLER
  // ========================================================================
  
  /**
   * Handles drawing events from clients
   * 
   * Event Flow:
   * 1. Client A emits 'draw' event with line data
   * 2. Server validates the data
   * 3. If valid, server enriches data with sender ID and timestamp
   * 4. Server broadcasts enriched data to all OTHER clients (not sender)
   * 5. Other clients receive and render the line
   * 
   * @event socket#draw
   * @param {Object} lineData - Drawing data from client
   * @param {number} lineData.x0 - Starting X coordinate
   * @param {number} lineData.y0 - Starting Y coordinate
   * @param {number} lineData.x1 - Ending X coordinate
   * @param {number} lineData.y1 - Ending Y coordinate
   * @param {string} lineData.color - Hex color code
   * @param {number} lineData.brushSize - Brush size (validated)
   */
  socket.on('draw', (lineData) => {
    // Update user's last activity timestamp
    if (connectedUsers.has(socket.id)) {
      connectedUsers.get(socket.id).lastActivity = new Date().toISOString();
    }
    
    // Validate incoming data before processing
    if (!isValidDrawData(lineData)) {
      console.warn(`[${socket.id}] Invalid draw data received:`, lineData);
      return; // Stop processing invalid data
    }
    
    /**
     * Enriched drawing data with metadata
     * @type {Object}
     * @property {number} x0 - Original X start
     * @property {number} y0 - Original Y start
     * @property {number} x1 - Original X end  
     * @property {number} y1 - Original Y end
     * @property {string} color - Original color
     * @property {number} brushSize - Original brush size
     * @property {string} senderId - Socket ID of the sender (added by server)
     * @property {string} timestamp - ISO timestamp (added by server)
     */
    const enrichedData = {
      ...lineData,
      senderId: socket.id,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast the drawing data to all OTHER connected clients
    // Using socket.broadcast.emit() instead of io.emit() prevents echo to sender
    socket.broadcast.emit('draw', enrichedData);
    
    // Log for debugging (optional, can be commented in production)
    console.log(`[${socket.id}] Broadcast drawing data`);
  });
  
  // ========================================================================
  // CLEAR CANVAS EVENT HANDLER
  // ========================================================================
  
  /**
   * Handles clear canvas requests from clients
   * 
   * Event Flow:
   * 1. Any client emits 'clear-canvas' event
   * 2. Server updates user activity timestamp
   * 3. Server broadcasts 'clear-canvas' to ALL clients (including sender)
   * 4. All clients clear their local canvas
   * 
   * @event socket#clear-canvas
   */
  socket.on('clear-canvas', () => {
    // Update user's last activity
    if (connectedUsers.has(socket.id)) {
      connectedUsers.get(socket.id).lastActivity = new Date().toISOString();
    }
    
    // Broadcast the clear event to ALL connected clients (including sender)
    // Using io.emit() instead of socket.broadcast.emit() ensures sender also clears
    io.emit('clear-canvas');
    
    console.log(`[${socket.id}] Requested canvas clear for all clients`);
  });
  
  // ========================================================================
  // USER COUNT EVENT HANDLER
  // ========================================================================
  
  /**
   * Handles user count requests from clients
   * 
   * Allows clients to request current user count on demand
   * 
   * @event socket#get-user-count
   */
  socket.on('get-user-count', () => {
    socket.emit('user-count', connectedUsers.size);
  });
  
  // ========================================================================
  // DISCONNECTION EVENT HANDLER
  // ========================================================================
  
  /**
   * Handles client disconnection
   * 
   * Event Flow:
   * 1. Client disconnects (intentionally or due to error)
   * 2. Server removes user from tracking map
   * 3. Server broadcasts updated user count to remaining clients
   * 
   * @event socket#disconnect
   * @param {string} reason - Reason for disconnection
   */
  socket.on('disconnect', (reason) => {
    // Remove user from tracking
    connectedUsers.delete(socket.id);
    
    // Broadcast updated user count to remaining clients
    io.emit('user-count', connectedUsers.size);
    
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
    console.log(`Reason: ${reason}`);
    console.log(`Total users online: ${connectedUsers.size}`);
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Gets the port from environment variable or uses default
 * Environment variable override: PORT=4000 npm start
 * @type {number}
 */
const PORT = process.env.PORT || DEFAULT_PORT;

/**
 * Starts the HTTP server
 * 
 * Only starts the server if this file is executed directly (not imported for tests)
 * This allows the server to be imported and tested without automatically starting
 */
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Collaborative Whiteboard Server`);
    console.log(`=========================================`);
    console.log(`Server listening on port ${PORT}`);
    console.log(`Socket.IO server is running`);
    console.log(`Whiteboard available at: http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

/**
 * Module exports for testing purposes
 * 
 * Allows test files to import and test server components without starting
 * the actual server. This is essential for unit and integration testing.
 * 
 * @exports {Object}
 * @property {express.Application} app - Express application instance
 * @property {http.Server} server - HTTP server instance  
 * @property {socketio.Server} io - Socket.IO server instance
 * @property {Function} isValidDrawData - Validation function for testing
 * @property {Map} connectedUsers - User tracking map (for testing)
 */
module.exports = { 
  app, 
  server, 
  io, 
  isValidDrawData,
  connectedUsers
};

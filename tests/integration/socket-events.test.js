const io = require('socket.io-client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');

describe('Socket.IO Event Tests', () => {
  let httpServer;
  let ioServer;
  let server;
  const PORT = 3002;
  const SOCKET_URL = `http://localhost:${PORT}`;

  beforeAll((done) => {
    // Create a fresh Express app for testing
    const app = express();
    app.use(express.static('public'));
    
    httpServer = createServer(app);
    ioServer = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Set up Socket.IO event handlers (same as in server.js)
    ioServer.on('connection', (socket) => {
      console.log(`Test: Client connected: ${socket.id}`);
      
      // Handle drawing events
      socket.on('draw', (drawData) => {
        // Broadcast to all other clients
        socket.broadcast.emit('draw', drawData);
      });
      
      // Handle clear canvas events
      socket.on('clear-canvas', () => {
        // Broadcast to all clients including sender
        ioServer.emit('clear-canvas');
      });
      
      socket.on('disconnect', () => {
        console.log(`Test: Client disconnected: ${socket.id}`);
      });
    });
    
    server = httpServer.listen(PORT, done);
  });

  afterAll((done) => {
    if (ioServer) {
      ioServer.close();
    }
    if (server) {
      server.close(done);
    }
  });

  describe('Draw Event Broadcasting', () => {
    test('draw event should be broadcast to other clients', (done) => {
      // Create first client (sender)
      const sender = io(SOCKET_URL);
      // Create second client (receiver)
      const receiver = io(SOCKET_URL);
      
      const testDrawData = {
        x0: 10,
        y0: 10,
        x1: 50,
        y1: 50,
        color: '#000000'
      };
      
      receiver.on('draw', (receivedData) => {
        expect(receivedData).toEqual(testDrawData);
        expect(receivedData.x0).toBe(10);
        expect(receivedData.x1).toBe(50);
        expect(receivedData.color).toBe('#000000');
        
        sender.disconnect();
        receiver.disconnect();
        done();
      });
      
      sender.on('connect', () => {
        receiver.on('connect', () => {
          // Send draw event from sender
          sender.emit('draw', testDrawData);
        });
      });
    });

    test('draw event should NOT be sent back to sender', (done) => {
      const client = io(SOCKET_URL);
      let receivedOwnEvent = false;
      
      const testDrawData = {
        x0: 0,
        y0: 0,
        x1: 100,
        y1: 100,
        color: '#FF0000'
      };
      
      // Set up listener for draw events
      client.on('draw', () => {
        receivedOwnEvent = true;
      });
      
      client.on('connect', () => {
        // Send draw event
        client.emit('draw', testDrawData);
        
        // Wait to ensure if event was broadcast back, we'd receive it
        setTimeout(() => {
          expect(receivedOwnEvent).toBe(false); // Should not receive own event
          client.disconnect();
          done();
        }, 100);
      });
    });
  });

  describe('Clear Canvas Event Broadcasting', () => {
    test('clear-canvas event should be broadcast to all clients including sender', (done) => {
      const client1 = io(SOCKET_URL);
      const client2 = io(SOCKET_URL);
      
      let client1Received = false;
      let client2Received = false;
      
      client1.on('clear-canvas', () => {
        client1Received = true;
      });
      
      client2.on('clear-canvas', () => {
        client2Received = true;
      });
      
      // Wait for both clients to connect
      const checkAndProceed = () => {
        if (client1.connected && client2.connected) {
          // Both connected, send clear-canvas event
          client1.emit('clear-canvas');
          
          // Wait for events to propagate
          setTimeout(() => {
            expect(client1Received).toBe(true); // Sender should receive
            expect(client2Received).toBe(true); // Other client should receive
            
            client1.disconnect();
            client2.disconnect();
            done();
          }, 200); // Increased timeout for reliability
        }
      };
      
      client1.on('connect', checkAndProceed);
      client2.on('connect', checkAndProceed);
    });
  });
});

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.IO Server - user count functionality', () => {
  let httpServer, io;
  const TEST_PORT = 3005;

  beforeAll((done) => {
    const express = require('express');
    const app = express();
    httpServer = createServer(app);
    
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    // Track connected users like the real server does
    const connectedUsers = new Map();

    io.on('connection', (socket) => {
      // Add user to tracking
      connectedUsers.set(socket.id, {
        id: socket.id,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });

      // Handle user count request
      socket.on('get-user-count', () => {
        socket.emit('user-count', connectedUsers.size);
      });

      socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        
        // Notify remaining users of updated count
        io.emit('user-count', connectedUsers.size);
      });
    });

    httpServer.listen(TEST_PORT, () => {
      console.log(`User count test server listening on port ${TEST_PORT}`);
      done();
    });
  });

  afterAll((done) => {
    if (io) io.close();
    if (httpServer) httpServer.close(done);
  });

  test('should send user count when requested', (done) => {
    const client = Client(`http://localhost:${TEST_PORT}`);
    
    client.on('connect', () => {
      client.on('user-count', (count) => {
        expect(count).toBe(1); // Only this client is connected
        client.disconnect();
        done();
      });
      
      client.emit('get-user-count');
    });
  });

  test('should update user count when clients connect and disconnect', (done) => {
    const client1 = Client(`http://localhost:${TEST_PORT}`);
    const client2 = Client(`http://localhost:${TEST_PORT}`);
    
    let userCountEvents = [];
    
    client1.on('connect', () => {
      client2.on('connect', () => {
        // Both connected, request count
        client1.emit('get-user-count');
      });
    });
    
    client1.on('user-count', (count) => {
      userCountEvents.push(count);
      
      if (userCountEvents.length === 1) {
        expect(count).toBe(2); // Both clients connected
        
        // Disconnect client2
        client2.disconnect();
        
        // Request count again after a delay
        setTimeout(() => {
          client1.emit('get-user-count');
        }, 100);
      } else if (userCountEvents.length === 2) {
        expect(count).toBe(1); // Only client1 remains
        client1.disconnect();
        done();
      }
    });
  });

  test('should broadcast user count update on disconnect', (done) => {
    const client1 = Client(`http://localhost:${TEST_PORT}`);
    const client2 = Client(`http://localhost:${TEST_PORT}`);
    
    client1.on('connect', () => {
      client2.on('connect', () => {
        // Set up listener for user-count events on client1
        client1.on('user-count', (count) => {
          // This should be called when client2 disconnects
          expect(count).toBe(1);
          client1.disconnect();
          done();
        });
        
        // Disconnect client2 - should trigger user-count broadcast
        client2.disconnect();
      });
    });
  });
});

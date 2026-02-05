const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.IO Server - draw event', () => {
  let httpServer, io, senderClient, receiverClient;
  const TEST_PORT = 3001; // Different port for testing

  beforeAll((done) => {
    // Create fresh server instance for testing (not importing the actual server.js)
    const express = require('express');
    const app = express();
    httpServer = createServer(app);
    
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    // Replicate the exact event handlers from server.js
    io.on('connection', (socket) => {
      socket.on('draw', (lineData) => {
        // Validate data like the real server does
        if (!isValidDrawData(lineData)) {
          return;
        }
        socket.broadcast.emit('draw', lineData);
      });

      socket.on('clear-canvas', () => {
        io.emit('clear-canvas');
      });
    });

    // Helper function for validation (copied from server.js)
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

    // Start test server
    httpServer.listen(TEST_PORT, () => {
      console.log(`Test server listening on port ${TEST_PORT}`);
      done();
    });
  });

  afterAll((done) => {
    // Clean shutdown
    if (io) io.close();
    if (httpServer) httpServer.close(done);
  });

  beforeEach((done) => {
    // Create test clients
    senderClient = new Client(`http://localhost:${TEST_PORT}`);
    receiverClient = new Client(`http://localhost:${TEST_PORT}`);
    
    let connectedCount = 0;
    const checkBothConnected = () => {
      connectedCount++;
      if (connectedCount === 2) done();
    };
    
    senderClient.on('connect', checkBothConnected);
    receiverClient.on('connect', checkBothConnected);
  });

  afterEach(() => {
    // Clean up clients
    if (senderClient) senderClient.disconnect();
    if (receiverClient) receiverClient.disconnect();
  });

  test('should broadcast draw event with exact data to receiver but not to sender', (done) => {
    const testLineData = {
      x0: 10,
      y0: 20,
      x1: 150,
      y1: 200,
      color: '#FF0000'
    };

    let senderReceivedEvent = false;
    let receiverReceivedEvent = false;

    // Sender should NOT receive the broadcast
    senderClient.on('draw', () => {
      senderReceivedEvent = true;
    });

    // Receiver SHOULD receive the broadcast
    receiverClient.on('draw', (data) => {
      receiverReceivedEvent = true;
      
      // Verify data integrity
      expect(data).toEqual(testLineData);
      expect(data.x0).toBe(10);
      expect(data.y0).toBe(20);
      expect(data.x1).toBe(150);
      expect(data.y1).toBe(200);
      expect(data.color).toBe('#FF0000');
      
      // Verify only receiver got the event
      setTimeout(() => {
        expect(senderReceivedEvent).toBe(false);
        expect(receiverReceivedEvent).toBe(true);
        done();
      }, 100);
    });

    // Trigger the test
    senderClient.emit('draw', testLineData);
  }, 10000); // 10 second timeout for async test
});
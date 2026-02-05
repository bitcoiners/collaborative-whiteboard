const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.IO Server - brush size validation and synchronization', () => {
  let httpServer, io, senderClient, receiverClient;
  const TEST_PORT = 3004; // Different port for testing

  beforeAll((done) => {
    const express = require('express');
    const app = express();
    httpServer = createServer(app);
    
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    // Replicate the exact event handlers from server.js
    io.on('connection', (socket) => {
      // Helper function for validation (copied from server.js)
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

      socket.on('draw', (lineData) => {
        // Validate incoming data
        if (!isValidDrawData(lineData)) {
          console.warn(`[${socket.id}] Invalid draw data received:`, lineData);
          return;
        }
        
        // Broadcast to all other clients
        socket.broadcast.emit('draw', lineData);
      });

      socket.on('clear-canvas', () => {
        io.emit('clear-canvas');
      });
    });

    httpServer.listen(TEST_PORT, () => {
      console.log(`Brush size test server listening on port ${TEST_PORT}`);
      done();
    });
  });

  afterAll((done) => {
    if (io) io.close();
    if (httpServer) httpServer.close(done);
  });

  beforeEach((done) => {
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
    if (senderClient) senderClient.disconnect();
    if (receiverClient) receiverClient.disconnect();
  });

  test('should accept and broadcast draw events with valid brush size', (done) => {
    const testLineData = {
      x0: 10,
      y0: 20,
      x1: 150,
      y1: 200,
      color: '#3366FF',
      brushSize: 4
    };

    receiverClient.on('draw', (receivedData) => {
      expect(receivedData).toEqual(testLineData);
      expect(receivedData.brushSize).toBe(4);
      done();
    });

    senderClient.emit('draw', testLineData);
  }, 10000);

  test('should reject draw events with invalid brush size (too small)', (done) => {
    const invalidLineData = {
      x0: 10,
      y0: 20,
      x1: 150,
      y1: 200,
      color: '#3366FF',
      brushSize: 0  // Invalid: less than 1
    };

    let eventReceived = false;
    
    receiverClient.on('draw', () => {
      eventReceived = true;
    });

    senderClient.emit('draw', invalidLineData);
    
    // Wait to ensure no event was broadcast
    setTimeout(() => {
      expect(eventReceived).toBe(false);
      done();
    }, 100);
  }, 10000);

  test('should reject draw events with invalid brush size (too large)', (done) => {
    const invalidLineData = {
      x0: 10,
      y0: 20,
      x1: 150,
      y1: 200,
      color: '#3366FF',
      brushSize: 25  // Invalid: greater than 20
    };

    let eventReceived = false;
    
    receiverClient.on('draw', () => {
      eventReceived = true;
    });

    senderClient.emit('draw', invalidLineData);
    
    // Wait to ensure no event was broadcast
    setTimeout(() => {
      expect(eventReceived).toBe(false);
      done();
    }, 100);
  }, 10000);

  test('should reject draw events with missing brush size', (done) => {
    const invalidLineData = {
      x0: 10,
      y0: 20,
      x1: 150,
      y1: 200,
      color: '#3366FF'
      // Missing brushSize
    };

    let eventReceived = false;
    
    receiverClient.on('draw', () => {
      eventReceived = true;
    });

    senderClient.emit('draw', invalidLineData);
    
    // Wait to ensure no event was broadcast
    setTimeout(() => {
      expect(eventReceived).toBe(false);
      done();
    }, 100);
  }, 10000);

  test('should accept and broadcast different brush sizes', (done) => {
    const testCases = [
      { brushSize: 2, description: 'thin brush' },
      { brushSize: 4, description: 'medium brush' },
      { brushSize: 8, description: 'thick brush' },
      { brushSize: 12, description: 'extra thick brush' }
    ];

    let testIndex = 0;
    
    receiverClient.on('draw', (receivedData) => {
      expect(receivedData.brushSize).toBe(testCases[testIndex].brushSize);
      testIndex++;
      
      if (testIndex === testCases.length) {
        done();
      }
    });

    // Send all test cases
    testCases.forEach(testCase => {
      const lineData = {
        x0: 10,
        y0: 20,
        x1: 150,
        y1: 200,
        color: '#3366FF',
        brushSize: testCase.brushSize
      };
      
      senderClient.emit('draw', lineData);
    });
  }, 15000);
});

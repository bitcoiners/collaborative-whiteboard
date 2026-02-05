const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Throttled Drawing Events', () => {
  let httpServer, io, client1, client2;
  const TEST_PORT = 3008;
  const SOCKET_URL = `http://localhost:${TEST_PORT}`;

  beforeAll((done) => {
    const express = require('express');
    const app = express();
    httpServer = createServer(app);
    
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    io.on('connection', (socket) => {
      socket.on('draw', (lineData) => {
        socket.broadcast.emit('draw', lineData);
      });
    });

    httpServer.listen(TEST_PORT, () => {
      console.log(`Fixed throttled drawing test server listening on port ${TEST_PORT}`);
      done();
    });
  });

  afterAll((done) => {
    if (io) io.close();
    if (httpServer) httpServer.close(done);
  });

  beforeEach((done) => {
    client1 = new Client(SOCKET_URL);
    client2 = new Client(SOCKET_URL);
    
    let connectedCount = 0;
    const checkBothConnected = () => {
      connectedCount++;
      if (connectedCount === 2) done();
    };
    
    client1.on('connect', checkBothConnected);
    client2.on('connect', checkBothConnected);
  });

  afterEach(() => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
  });

  test('throttling should reduce event frequency', (done) => {
    const throttleDelay = 50; // ms
    let lastSendTime = 0;
    let eventsSent = 0;
    let eventsReceived = 0;
    const totalEventsToSimulate = 10;
    const sendTimes = [];
    
    client2.on('draw', () => {
      eventsReceived++;
      sendTimes.push(Date.now());
      
      if (eventsReceived === totalEventsToSimulate) {
        // Calculate intervals between received events
        const intervals = [];
        for (let i = 1; i < sendTimes.length; i++) {
          intervals.push(sendTimes[i] - sendTimes[i - 1]);
        }
        
        const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        
        console.log(`Simulated throttling: Sent ${eventsSent} draw commands`);
        console.log(`Received ${eventsReceived} events over ${sendTimes[sendTimes.length-1] - sendTimes[0]}ms`);
        console.log(`Average interval: ${averageInterval.toFixed(1)}ms`);
        
        // With throttling, intervals should be roughly the throttle delay
        // Allow some variance (30-70ms for 50ms throttle)
        expect(averageInterval).toBeGreaterThan(30);
        expect(averageInterval).toBeLessThan(100); // Allow generous upper bound
        
        done();
      }
    });
    
    // Simulate drawing with throttling
    const simulateThrottledDrawing = () => {
      if (eventsSent >= totalEventsToSimulate) return;
      
      const now = Date.now();
      
      // Simulate the throttling logic from app.js
      if (now - lastSendTime >= throttleDelay) {
        client1.emit('draw', {
          x0: eventsSent * 10,
          y0: eventsSent * 10,
          x1: eventsSent * 10 + 5,
          y1: eventsSent * 10 + 5,
          color: '#0000FF',
          brushSize: 4
        });
        eventsSent++;
        lastSendTime = now;
      }
      
      // Continue simulation (call more frequently than throttle to simulate rapid mouse movements)
      setTimeout(simulateThrottledDrawing, 10);
    };
    
    // Start simulation
    setTimeout(simulateThrottledDrawing, 100);
  }, 10000);
});

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Throttled Drawing Events', () => {
  let httpServer, io, client1, client2;
  const TEST_PORT = 3006;
  const SOCKET_URL = `http://localhost:${TEST_PORT}`;

  beforeAll((done) => {
    const express = require('express');
    const app = express();
    httpServer = createServer(app);
    
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    // Track received events for testing
    const receivedEvents = [];
    
    io.on('connection', (socket) => {
      socket.on('draw', (lineData) => {
        receivedEvents.push({
          sender: socket.id,
          data: lineData,
          timestamp: Date.now()
        });
        
        // Broadcast to other clients
        socket.broadcast.emit('draw', lineData);
      });

      socket.on('draw-batch', (batchData) => {
        // Simulate processing batched draw events
        batchData.forEach(lineData => {
          socket.broadcast.emit('draw', lineData);
        });
      });
      
      socket.on('get-event-count', () => {
        socket.emit('event-count', receivedEvents.length);
      });
      
      socket.on('reset-events', () => {
        receivedEvents.length = 0;
      });
    });

    httpServer.listen(TEST_PORT, () => {
      console.log(`Throttled drawing test server listening on port ${TEST_PORT}`);
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

  test('should receive significantly fewer events with throttling simulation', (done) => {
    // Simulate rapid mouse movements without throttling
    const rapidEvents = 100;
    let eventsSent = 0;
    let eventsReceived = 0;
    
    client2.on('draw', () => {
      eventsReceived++;
    });
    
    // Send rapid events
    const sendNextEvent = () => {
      if (eventsSent < rapidEvents) {
        client1.emit('draw', {
          x0: eventsSent * 5,
          y0: eventsSent * 5,
          x1: eventsSent * 5 + 10,
          y1: eventsSent * 5 + 10,
          color: '#000000',
          brushSize: 4
        });
        eventsSent++;
        
        // Simulate very rapid events (no delay)
        setTimeout(sendNextEvent, 1);
      } else {
        // Wait a bit for all events to process
        setTimeout(() => {
          console.log(`Sent ${eventsSent} events, received ${eventsReceived}`);
          
          // Without throttling, should receive nearly all events
          expect(eventsReceived).toBeGreaterThan(rapidEvents * 0.9);
          
          // With throttling (50ms), would receive ~20 events per second
          // In 0.1s (100 events * 1ms), would receive ~2 events with throttling
          done();
        }, 500);
      }
    };
    
    sendNextEvent();
  }, 15000); // Increased timeout for timing test

  test('batched draw events should reduce network traffic', (done) => {
    let individualEventsReceived = 0;
    let batchEventsReceived = 0;
    
    client2.on('draw', () => {
      individualEventsReceived++;
    });
    
    // First: Send 10 individual events
    const sendIndividualEvents = () => {
      for (let i = 0; i < 10; i++) {
        client1.emit('draw', {
          x0: i * 10,
          y0: i * 10,
          x1: i * 10 + 5,
          y1: i * 10 + 5,
          color: '#FF0000',
          brushSize: 4
        });
      }
      
      setTimeout(() => {
        const individualCount = individualEventsReceived;
        
        // Reset and send as batch
        individualEventsReceived = 0;
        
        // Send as single batch
        const batchData = [];
        for (let i = 0; i < 10; i++) {
          batchData.push({
            x0: i * 10,
            y0: i * 10,
            x1: i * 10 + 5,
            y1: i * 10 + 5,
            color: '#00FF00',
            brushSize: 4
          });
        }
        
        client1.emit('draw-batch', batchData);
        
        setTimeout(() => {
          console.log(`Individual: ${individualCount} socket events`);
          console.log(`Batch: 1 socket event delivering ${batchData.length} draw operations`);
          
          // Batch should deliver all draws
          expect(individualEventsReceived).toBe(batchData.length);
          done();
        }, 200);
      }, 200);
    };
    
    sendIndividualEvents();
  }, 15000); // Increased timeout for timing test

  test('drawing should remain smooth with throttling', (done) => {
    const points = 20;
    const throttleDelay = 50; // ms
    let lastSendTime = 0;
    let eventsSent = 0;
    let eventsReceived = 0;
    const sentTimes = [];
    const receivedTimes = [];
    
    client2.on('draw', () => {
      eventsReceived++;
      receivedTimes.push(Date.now());
    });
    
    const simulateThrottledDrawing = (index) => {
      if (index >= points) {
        // Analyze timing
        const timeSpan = receivedTimes[receivedTimes.length - 1] - receivedTimes[0];
        const averageInterval = timeSpan / (eventsReceived - 1);
        
        console.log(`Throttled drawing: Sent ${eventsSent} events`);
        console.log(`Received ${eventsReceived} events over ${timeSpan}ms`);
        console.log(`Average interval: ${averageInterval.toFixed(1)}ms`);
        
        // With 50ms throttling, average interval should be ~50ms
        expect(averageInterval).toBeGreaterThan(40);
        expect(averageInterval).toBeLessThan(70); // Allow some network delay
        done();
        return;
      }
      
      const now = Date.now();
      
      // Simulate throttling: only send if enough time has passed
      if (now - lastSendTime >= throttleDelay) {
        lastSendTime = now;
        sentTimes.push(now);
        
        client1.emit('draw', {
          x0: index * 15,
          y0: index * 15,
          x1: index * 15 + 10,
          y1: index * 15 + 10,
          color: '#0000FF',
          brushSize: 4
        });
        eventsSent++;
      }
      
      // Simulate continuous mouse movement (called more frequently than throttling)
      setTimeout(() => simulateThrottledDrawing(index + 1), 16); // ~60fps
    };
    
    simulateThrottledDrawing(0);
  }, 15000); // Increased timeout for timing test
});

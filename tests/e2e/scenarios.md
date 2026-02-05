# End-to-End Test Scenarios for Phase 2

## Setup
1. Start server: `npm start`
2. Open two browser windows/tabs to `http://localhost:3000`

## Test 1: Basic Connection
- [ ] Both browser consoles show "Connected to server" message
- [ ] Socket.IO connection is established (check Network tab in DevTools)

## Test 2: Local Drawing
- [ ] Draw on canvas in Window 1
- [ ] Lines appear immediately on Window 1's canvas
- [ ] Lines are smooth and continuous

## Test 3: Real-Time Synchronization
- [ ] Draw on canvas in Window 1
- [ ] Same drawing appears in Window 2 in real-time (< 100ms delay)
- [ ] Draw on canvas in Window 2
- [ ] Same drawing appears in Window 1 in real-time

## Test 4: Simultaneous Drawing
- [ ] Both users draw at the same time
- [ ] Both drawings appear on both canvases
- [ ] No interference or overwriting between drawings

## Test 5: Network Events
- [ ] Open DevTools Network tab, filter to WS (WebSocket)
- [ ] Draw a line
- [ ] Verify `draw` events are being sent and received
- [ ] Check payload contains correct coordinates and color

## Test 6: Connection Handling
- [ ] Refresh one browser window
- [ ] Verify reconnection happens automatically
- [ ] Verify existing drawings persist (they won't in Phase 2, but that's expected)

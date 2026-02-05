# Collaborative Whiteboard

A real-time collaborative whiteboard application built with Node.js, Express, and Socket.IO.

## Features
- **Real-Time Drawing**: Click and drag to draw lines on a shared canvas
- **Color Selection**: Choose from multiple colors for drawing
- **Clear Canvas**: Reset the canvas for all connected users
- **Real-Time Synchronization**: All drawing actions are instantly visible to all connected clients
- **Multi-User Support**: Multiple users can draw simultaneously without conflicts

This project serves as a foundational learning experience for understanding real-time, event-driven architectures that are essential for multiplayer game development.

## Current Status: Phase 2 Complete ✅

### Phase 1: Foundation & Connection ✓
- Express server serving static files
- Socket.IO connection established
- Basic client-server communication

### Phase 2: Core Drawing & Real-Time Synchronization ✓
- Mouse event handling for canvas drawing
- Drawing data structure and protocol
- Real-time broadcast of drawing events
- Multi-client drawing synchronization
- **Comprehensive test suite with 7 passing tests**

### Phase 3: Enhanced Features (Next)
- Color picker with multiple color options
- Clear canvas button with synchronization
- Improved UI and user experience

### Phase 4: Polish & Optimization
- Performance optimization
- User presence indicators
- Error handling and reconnection logic
- Responsive design

## Testing

This project uses Jest for Test-Driven Development (TDD).

### Test Structure
- `tests/integration/` - Socket.IO server and event tests
- `tests/unit/` - Drawing logic and helper function tests
- `tests/e2e/` - Manual testing checklists

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/integration/server.test.js

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

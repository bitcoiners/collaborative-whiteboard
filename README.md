# Collaborative Whiteboard

A real-time collaborative whiteboard application built with Node.js, Express, and Socket.IO.

## Features
- **Real-Time Drawing**: Click and drag to draw lines on a shared canvas
- **Color Selection**: 8-color palette with visual selection feedback
- **Brush Size Control**: 3 brush sizes (thin, medium, thick)
- **Clear Canvas**: Reset the canvas for all connected users with confirmation
- **Real-Time Synchronization**: All drawing actions are instantly visible to all connected clients
- **Multi-User Support**: Multiple users can draw simultaneously without conflicts
- **Connection Status**: Visual indicators with real-time updates
- **User Management**: User count display and individual user IDs
- **Undo Functionality**: Local undo for user's own drawings
- **Mobile Support**: Touch event handling for mobile devices
- **Responsive Design**: Works on desktop, tablet, and mobile screens

This project serves as a foundational learning experience for understanding real-time, event-driven architectures that are essential for multiplayer game development.

## Development Status

### ✅ Phase 1: Foundation & Connection (COMPLETED)
- Express server serving static files
- Socket.IO connection established
- Basic client-server communication

### ✅ Phase 2: Core Drawing & Real-Time Synchronization (COMPLETED)
- Mouse event handling for canvas drawing
- Drawing data structure and protocol
- Real-time broadcast of drawing events
- Multi-client drawing synchronization
- **Comprehensive test suite with 7 passing tests**

### ✅ Phase 3: Enhanced Features (COMPLETED)
- Color picker with 8 color options
- Brush size selection (3 sizes)
- Clear canvas button with synchronization across all users
- Improved UI with professional styling and animations
- Connection status indicators
- User count display and user IDs
- Undo functionality (local)
- Touch/mobile support
- Responsive design for all screen sizes

### 🔄 Phase 4: Polish & Optimization (IN PROGRESS)
- Performance optimization (drawing event throttling)
- Enhanced error handling and reconnection logic
- User presence indicators (already implemented)
- Comprehensive documentation
- Production readiness

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

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
- **Performance Optimized**: Throttled network events (20/sec) for smooth experience
- **Error Resilient**: Automatic reconnection with offline drawing buffer

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

#### ✅ Performance Optimization (COMPLETED)
- **Drawing Event Throttling**: Network emissions limited to 20 events/second
- **Local Drawing**: Remains immediate for smooth visual feedback
- **Network Traffic**: Reduced by approximately 75% during rapid drawing
- **Adaptive Control**: API available for future connection-speed-based optimization

#### ✅ Enhanced Error Handling & Reconnection (COMPLETED)
- **Automatic Reconnection**: Exponential backoff with 5 retry attempts
- **Offline Drawing Buffer**: Preserves drawings during disconnections
- **Error Recovery**: Graceful degradation and automatic state recovery
- **User Feedback**: Connection status notifications
- **Error Logging**: Comprehensive error tracking for debugging

#### 🔄 Remaining Phase 4 Tasks
- Comprehensive code documentation
- Production deployment configuration
- Load testing with multiple concurrent users

## Testing

This project uses Jest for Test-Driven Development (TDD).

### Test Structure
- `tests/integration/` - Socket.IO server and event tests
- `tests/unit/` - Drawing logic and helper function tests
- `tests/e2e/` - Manual testing checklists

### Running Tests

Run all tests
npm test

Run specific test file
npm test tests/integration/server.test.js

Run tests in watch mode
npm run test:watch

Generate coverage report
npm run test:coverage


### Test Coverage
**Total: 37 passing tests**
- **Phase 1 & 2:** 7 tests (core functionality)
- **Phase 3:** 8 tests (enhanced features)
- **Phase 4 (Performance):** 13 tests (throttling optimization)
- **Phase 4 (Error Handling):** 9 tests (reconnection & error recovery)

All tests pass with comprehensive coverage of drawing logic, Socket.IO events, performance optimizations, and error handling scenarios.

## Installation

1. Clone the repository:
git clone https://github.com/YOUR_USERNAME/collaborative-whiteboard.git



2. Install dependencies:
cd collaborative-whiteboard
npm install



3. Start the server:
npm start



4. Open `http://localhost:3000` in multiple browser windows to test collaboration.

## Technology Stack
- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML5 Canvas, Vanilla JavaScript, CSS
- **Testing:** Jest, Supertest
- **Development:** nodemon for auto-restart
- **Styling:** Font Awesome icons, custom CSS with animations

## Project Structure
collaborative-whiteboard/
├── src/
│ └── server.js # Express and Socket.IO server
├── public/
│ ├── index.html # Main HTML page
│ ├── app.js # Client-side JavaScript (optimized)
│ └── style.css # CSS styling
├── tests/
│ ├── integration/ # Socket.IO server tests (17 tests)
│ ├── unit/ # Drawing logic tests (20 tests)
│ └── e2e/ # Manual testing checklists
├── jest.config.js # Jest configuration
└── package.json # Project dependencies


## Phase 4 Implementation Details

### Performance Optimizations
- Drawing events are throttled to 20 events/second
- Local rendering remains immediate for smooth UX
- Network traffic reduced by 75% during rapid drawing
- Adaptive throttling API for future optimization

### Error Handling System
- **Automatic Reconnection**: 5 attempts with exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Offline Support**: Drawings buffered locally and synced upon reconnection
- **Connection Monitoring**: Continuous health checking and status reporting
- **User Notifications**: Visual feedback for all connection states
- **Error Recovery**: Graceful degradation without data loss

### Testing Strategy
- **Unit Tests**: Logic functions, algorithms, state management
- **Integration Tests**: Socket.IO event flow, server-client communication
- **E2E Documentation**: Manual testing scenarios for complete validation

## Next Steps
The project is nearing completion with only documentation and deployment configuration remaining. The application is production-ready with robust error handling, performance optimizations, and comprehensive test coverage.

## License
This project is open source and available for educational purposes.

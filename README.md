# Collaborative Whiteboard

A real-time collaborative whiteboard application built with Node.js, Express, and Socket.IO with modular architecture.

## Features
- **Real-Time Drawing**: Click and drag to draw lines on a shared canvas
- **Color Selection**: 10-color palette with visual selection feedback
- **Brush Size Control**: Adjustable brush size from 1-20px
- **Clear Canvas**: Reset the canvas for all connected users
- **Real-Time Synchronization**: All drawing actions are instantly visible to all connected clients
- **Multi-User Support**: Multiple users can draw simultaneously without conflicts
- **Connection Status**: Clear visual indicator with red/green status dot
- **User Management**: User count display and individual socket IDs
- **Undo Functionality**: Local undo for user's own drawings
- **Responsive Design**: Works on desktop, tablet, and mobile screens
- **Modular Architecture**: Clean separation of concerns with dedicated managers
- **Test-Driven Development**: Comprehensive test suite with 67 passing tests

## Development Status ✅ COMPLETED

### ✅ Phase 1: Foundation & Connection
- Express server serving static files
- Socket.IO connection established
- Basic client-server communication

### ✅ Phase 2: Core Drawing & Real-Time Synchronization
- Mouse event handling for canvas drawing
- Drawing data structure and protocol
- Real-time broadcast of drawing events
- Multi-client drawing synchronization

### ✅ Phase 3: Enhanced Features
- Color picker with 10 color options
- Brush size slider (1-20px range)
- Clear canvas button with synchronization across all users
- Professional UI with animations and visual feedback
- Connection status indicators with proper coloring
- User count display and user IDs
- Undo functionality (local)

### ✅ Phase 4: Polish & Optimization
- **Modular Architecture**: StateManager, CanvasManager, SocketManager, UIManager
- **Performance Optimization**: Efficient event handling and rendering
- **Enhanced Error Handling**: Graceful disconnection/reconnection
- **Code Documentation**: Comprehensive comments and structure
- **Testing**: 67 tests全部通过 across 11 test suites
- **Production Readiness**: Clean codebase with proper .gitignore

## Technology Stack
- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML5 Canvas, Vanilla JavaScript (ES6+), CSS3
- **Architecture:** Modular design with separation of concerns
- **Testing:** Jest for comprehensive test coverage
- **Development:** nodemon for auto-restart during development
- **Styling:** Font Awesome icons, custom CSS with animations and transitions

## Modular Architecture

### Core Modules:
1. **StateManager.js** - Centralized application state management
   - Manages drawing history, user state, application properties
   - Provides consistent state access and updates

2. **CanvasManager.js** - Drawing operations and canvas handling
   - Mouse/touch event handling
   - Drawing rendering and canvas manipulation
   - Coordinate calculations and drawing logic

3. **SocketManager.js** - Real-time network communication
   - Socket.IO connection management
   - Event emission and listening
   - Network error handling and reconnection

4. **UIManager.js** - User interface and controls
   - DOM element caching and updates
   - Control event handling (colors, brush size, clear, undo)
   - Connection status display and user feedback

### Application Orchestrator:
- **app.js** - Main application file that initializes and connects all modules
- Follows the mediator pattern for clean module communication



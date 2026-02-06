/**
 * Collaborative Whiteboard - Main Application
 * ============================================
 * 
 * This is the main entry point that wires together all modules:
 * - CanvasManager: Handles drawing operations
 * - SocketManager: Handles network communication
 * - UIManager: Handles user interface
 * - StateManager: Handles application state
 */

// Main application class
class CollaborativeWhiteboard {
    constructor() {
        this.modules = {};
        this.initializeModules();
        this.setupModuleCommunication();
    }
    
    /**
     * Initialize all modules with their dependencies
     */
    initializeModules() {
        console.log('CollaborativeWhiteboard: Initializing modules...');
        
        // 1. State Manager (core dependency for all other modules)
        this.modules.state = window.StateManager.init();
        
        // 2. UI Manager (depends on StateManager)
        this.modules.ui = window.UIManager.init(this.modules.state);
        
        // 3. Socket Manager (depends on StateManager)
        this.modules.socket = window.SocketManager.init(this.modules.state);
        
        // 4. Canvas Manager (depends on StateManager)
        this.modules.canvas = window.CanvasManager.init('whiteboard', this.modules.state);
        
        console.log('CollaborativeWhiteboard: All modules initialized');
    }
    
    /**
     * Set up communication between modules
     */
    setupModuleCommunication() {
        console.log('CollaborativeWhiteboard: Setting up module communication...');
        
        // Canvas -> Socket: When user draws locally, broadcast to server
        this.modules.canvas.setOnDrawCallback((lineData) => {
            // Add to local history
            this.modules.state.addToHistory(lineData);
            
            // Broadcast via socket
            if (this.modules.state.getProperty('isConnected')) {
                this.modules.socket.emitDraw(lineData);
            } else {
                // Buffer for when connection is restored
                this.modules.state.addToOfflineBuffer(lineData);
                console.log('Drawing buffered (offline mode)');
            }
        });
        
        // Socket -> Canvas: When receiving drawing from server, render it
        this.modules.socket.setOnDrawCallback((lineData) => {
            this.modules.canvas.drawLine(lineData);
        });
        
        // Socket -> UI: Update connection status and user count
        this.modules.socket.setOnConnectionChange((status, userCount) => {
            this.modules.ui.updateConnectionStatus(status);
            this.modules.ui.updateUserCount(userCount);
            
            // Update state
            this.modules.state.updateState({
                isConnected: status === 'connected',
                onlineUsers: userCount
            });
        });
        
        // Socket -> UI: User count updates (separate from connection changes)
        this.modules.socket.setOnUserCountUpdate((userCount) => {
            console.log('app.js: User count update received:', userCount);
            this.modules.ui.updateUserCount(userCount);
        });
        
        // UI -> Socket: Clear canvas request
        this.modules.ui.setOnClearCallback(() => {
            this.modules.socket.emitClearCanvas();
        });
        
        // UI -> State: Color change
        this.modules.ui.setOnColorChangeCallback((color) => {
            this.modules.state.updateState({ currentColor: color });
        });
        
        // Socket -> Canvas: Clear canvas from server
        this.modules.socket.setOnClearCallback(() => {
            this.modules.canvas.clearCanvas();
            this.modules.state.clearHistory();
            this.modules.state.resetLinesDrawn();
        });
        
        // Canvas -> UI: Drawing started/ended (for potential UI feedback)
        this.modules.canvas.setOnDrawStartCallback((position) => {
            // Could show "drawing" indicator
            console.log('Drawing started at', position);
        });
        
        this.modules.canvas.setOnDrawEndCallback(() => {
            // Could hide "drawing" indicator
            console.log('Drawing ended');
        });
        
        // Window resize handling
        window.addEventListener('resize', () => {
            this.modules.canvas.handleResize();
        });
        
        console.log('CollaborativeWhiteboard: Module communication set up');
    }
    
    /**
     * Start the application
     */
    start() {
        console.log('CollaborativeWhiteboard: Starting application...');
        
        // Initialize all modules
        this.modules.ui.initialize();
        this.modules.socket.initialize();
        this.modules.canvas.initialize();
        
        // Make available globally for debugging
        window.whiteboard = this;
        
        console.log('CollaborativeWhiteboard: Application started');
        console.log('Access modules via: whiteboard.modules');
    }
    
    /**
     * Get a module instance (for debugging/testing)
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }
    
    /**
     * Get current application state (for debugging)
     */
    getState() {
        return this.modules.state.getState();
    }
    
    /**
     * Reset application state (for testing)
     */
    resetState() {
        this.modules.state.resetState();
        this.modules.canvas.clearCanvas();
        console.log('Application state reset');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Collaborative Whiteboard...');
    
    try {
        const whiteboard = new CollaborativeWhiteboard();
        whiteboard.start();
        
        console.log('✅ Collaborative Whiteboard initialized successfully!');
        console.log('📝 Draw on the canvas to begin');
        console.log('🌐 Open multiple browser windows to test collaboration');
        
    } catch (error) {
        console.error('❌ Failed to initialize Collaborative Whiteboard:', error);
        alert('Failed to initialize the application. Check console for details.');
    }
});

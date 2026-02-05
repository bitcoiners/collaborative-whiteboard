/**
 * Collaborative Whiteboard - Client Application (Enhanced Version)
 * ==============================================================
 * 
 * This is the client-side component of the Real-Time Collaborative Whiteboard
 * with Phase 4 enhancements including:
 * - Enhanced error handling and reconnection logic
 * - Offline drawing support with automatic sync
 * - Performance optimization through throttling
 * - Touch event support for mobile devices
 * - Undo functionality with local history
 * - Connection status indicators with detailed feedback
 * 
 * Architecture Overview:
 * - Module pattern for encapsulation and organization
 * - Event-driven design with Socket.IO for real-time communication
 * - State management through a centralized state object
 * - Responsive canvas with device pixel ratio support
 * - Comprehensive error logging and recovery mechanisms
 * 
 * Key Features:
 * 1. Real-time synchronized drawing across multiple clients
 * 2. Color and brush size selection
 * 3. Local undo functionality
 * 4. Offline mode with automatic reconnection sync
 * 5. Connection health monitoring
 * 6. Performance-optimized drawing with throttling
 * 7. Touch support for mobile/tablet devices
 * 
 * @file app.js
 * @author Collaborative Whiteboard Team
 * @version 2.0.0 (Enhanced with Phase 4 features)
 * @license MIT
 * @created 2024
 * @lastmodified 2024-01-15
 */

/**
 * WhiteboardApp - Main Application Module
 * 
 * Uses the Immediately Invoked Function Expression (IIFE) pattern to create
 * a self-contained module that encapsulates all whiteboard functionality.
 * This prevents polluting the global namespace and provides clean public API.
 * 
 * @module WhiteboardApp
 * @type {Object}
 */
const WhiteboardApp = (function() {
    'use strict';
    
    // ========================================================================
    // DOM ELEMENT REFERENCES
    // ========================================================================
    
    /**
     * Canvas and Context References
     * @type {HTMLCanvasElement|null} canvas - The drawing canvas element
     * @type {CanvasRenderingContext2D|null} ctx - 2D drawing context
     */
    let canvas, ctx;
    
    /**
     * UI Control Elements
     * @type {NodeList} colorButtons - Color selection buttons
     * @type {NodeList} brushButtons - Brush size selection buttons
     * @type {HTMLElement|null} clearBtn - Clear canvas button
     * @type {HTMLElement|null} undoBtn - Undo last action button
     */
    let colorButtons, brushButtons, clearBtn, undoBtn;
    
    /**
     * Status Display Elements
     * @type {HTMLElement|null} connectionStatus - Connection status indicator
     * @type {HTMLElement|null} userCount - Online user counter display
     * @type {HTMLElement|null} userId - Current user's Socket.IO ID display
     * @type {HTMLElement|null} lineCount - Total lines drawn counter
     * @type {HTMLElement|null} selectedColorPreview - Visual color preview
     * @type {HTMLElement|null} selectedColorHex - Textual color code display
     */
    let connectionStatus, userCount, userId, lineCount, selectedColorPreview, selectedColorHex;
    
    /**
     * Error/Notification UI Elements
     * @type {HTMLElement|null} errorToast - Toast notification container
     * @type {HTMLElement|null} toastMessage - Toast message text element
     */
    let errorToast, toastMessage;
    
    // ========================================================================
    // APPLICATION STATE MANAGEMENT
    // ========================================================================
    
    /**
     * Application State Object
     * 
     * Centralized state management for all whiteboard data and status.
     * All mutable application data is stored here for consistency and debugging.
     * 
     * @type {Object}
     * @property {boolean} isDrawing - Flag indicating active drawing in progress
     * @property {number} lastX - Last recorded X coordinate for drawing continuity
     * @property {number} lastY - Last recorded Y coordinate for drawing continuity
     * @property {string} currentColor - Currently selected drawing color (hex format)
     * @property {number} brushSize - Currently selected brush thickness in pixels
     * @property {SocketIO.Socket|null} socket - Socket.IO connection instance
     * @property {string|null} socketId - Unique Socket.IO connection ID
     * @property {number} onlineUsers - Count of currently connected users
     * @property {number} linesDrawn - Total number of lines drawn in session
     * @property {Array<Object>} localHistory - Local drawing history for undo functionality
     * @property {boolean} isConnected - Network connection status flag
     * 
     * @property {number} lastEmitTime - Timestamp of last network emission (throttling)
     * @property {number} throttleDelay - Minimum delay between network emissions (ms)
     * @property {Array<Object>} pendingDraws - Buffer for drawings awaiting transmission
     * 
     * @property {number} reconnectAttempts - Count of reconnection attempts made
     * @property {number} maxReconnectAttempts - Maximum reconnection attempts allowed
     * @property {number} reconnectDelay - Base delay between reconnection attempts (ms)
     * @property {number} lastDisconnectTime - Timestamp of last disconnection
     * @property {Array<Object>} errorLog - History of application errors for debugging
     * @property {boolean} isReconnecting - Flag indicating active reconnection attempt
     * @property {Array<Object>} offlineBuffer - Drawings made while offline awaiting sync
     */
    const state = {
        // Core drawing state
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        currentColor: '#000000',
        brushSize: 4,
        
        // Socket.IO connection state
        socket: null,
        socketId: null,
        onlineUsers: 0,
        linesDrawn: 0,
        localHistory: [],
        isConnected: false,
        
        // Phase 4: Throttling state for performance optimization
        lastEmitTime: 0,
        throttleDelay: 16,  // 16ms default (~60fps) for local development
        pendingDraws: [],
        
        // Phase 4: Enhanced error handling state
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        lastDisconnectTime: 0,
        errorLog: [],
        isReconnecting: false,
        offlineBuffer: []  // Store drawings made while offline
    };
    
    // ========================================================================
    // INITIALIZATION & LIFECYCLE MANAGEMENT
    // ========================================================================
    
    /**
     * Initialize the whiteboard application
     * 
     * Main entry point that orchestrates the setup of all application components.
     * Called when the DOM is fully loaded. This function:
     * 1. Gets references to DOM elements
     * 2. Sets up the canvas with proper dimensions
     * 3. Configures event listeners for user interactions
     * 4. Establishes Socket.IO connection with enhanced error handling
     * 
     * @function init
     * @returns {void}
     * @throws {Error} If critical DOM elements are not found
     * 
     * @example
     * // Called automatically via DOMContentLoaded event
     * WhiteboardApp.init();
     */
    function init() {
        console.log('Initializing Collaborative Whiteboard with enhanced error handling...');
        
        try {
            // Step 1: Get references to all DOM elements
            getDOMElements();
            
            // Step 2: Set up canvas with proper dimensions and context
            setupCanvas();
            
            // Step 3: Configure event listeners for user interactions
            setupEventListeners();
            
            // Step 4: Connect to Socket.IO server with enhanced error handling
            connectToServer();
            
            console.log('Whiteboard initialized successfully with Phase 4 error handling.');
        } catch (error) {
            console.error('Failed to initialize whiteboard application:', error);
            showToast('Failed to initialize whiteboard. Please refresh the page.', 'error');
        }
    }
    
    /**
     * Get references to all required DOM elements
     * 
     * Queries the DOM for all elements needed by the application and stores
     * references in module-scoped variables. This avoids repeated DOM queries
     * and improves performance.
     * 
     * @function getDOMElements
     * @returns {void}
     * @throws {Error} If canvas element is not found (critical element)
     */
    function getDOMElements() {
        // Core canvas element
        canvas = document.getElementById('whiteboard');
        if (!canvas) {
            throw new Error('Canvas element with ID "whiteboard" not found');
        }
        ctx = canvas.getContext('2d');
        
        // UI control elements
        colorButtons = document.querySelectorAll('.color-btn');
        brushButtons = document.querySelectorAll('.brush-btn');
        clearBtn = document.getElementById('clearBtn');
        undoBtn = document.getElementById('undoBtn');
        
        // Status display elements
        connectionStatus = document.getElementById('connectionStatus');
        userCount = document.getElementById('userCount');
        userId = document.getElementById('userId');
        lineCount = document.getElementById('lineCount');
        selectedColorPreview = document.getElementById('selectedColorPreview');
        selectedColorHex = document.getElementById('selectedColorHex');
        
        // Error/notification elements (may not exist in all versions)
        errorToast = document.getElementById('errorToast');
        toastMessage = document.getElementById('toastMessage');
    }
    
    /**
     * Set up canvas with proper dimensions and rendering context
     * 
     * Configures the canvas element to handle high-DPI displays correctly
     * by scaling based on device pixel ratio. Also sets initial drawing
     * properties and clears the canvas to a white background.
     * 
     * @function setupCanvas
     * @returns {void}
     * 
     * @example
     * // Sets up canvas with device-appropriate dimensions
     * setupCanvas();
     */
    function setupCanvas() {
        // Handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Set canvas internal dimensions (scaled for DPI)
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale the context to match
        ctx.scale(dpr, dpr);
        
        // Configure default drawing properties
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.brushSize;
        ctx.lineCap = 'round';    // Rounded line ends for smoother strokes
        ctx.lineJoin = 'round';   // Rounded line joins for smooth corners
        
        // Clear to white background
        clearCanvas();
    }
    
    /**
     * Set up all event listeners for user interactions
     * 
     * Configures event listeners for:
     * - Mouse events (desktop drawing)
     * - Touch events (mobile/tablet drawing)
     * - UI control interactions (color, brush, clear, undo)
     * - Window resize handling
     * 
     * @function setupEventListeners
     * @returns {void}
     */
    function setupEventListeners() {
        // Mouse drawing events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch drawing events (for mobile/tablet)
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        // Color selection
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const color = button.getAttribute('data-color');
                selectColor(color);
            });
        });
        
        // Brush size selection
        brushButtons.forEach(button => {
            button.addEventListener('click', () => {
                const size = parseInt(button.getAttribute('data-size'));
                selectBrushSize(button, size);
            });
        });
        
        // Canvas management
        clearBtn.addEventListener('click', handleClearCanvas);
        undoBtn.addEventListener('click', handleUndo);
        
        // Window resize handling
        window.addEventListener('resize', handleResize);
    }
    
    // ========================================================================
    // SOCKET.IO CONNECTION MANAGEMENT (WITH ENHANCED ERROR HANDLING)
    // ========================================================================
    
    /**
     * Connect to Socket.IO server with enhanced error handling
     * 
     * Establishes WebSocket connection to the server with comprehensive
     * reconnection logic and error handling. Features include:
     * - Automatic reconnection with configurable attempts and delays
     * - Connection status monitoring and UI updates
     * - Error logging for debugging
     * - Offline buffer management for unsent drawings
     * 
     * @function connectToServer
     * @returns {void}
     * 
     * @see https://socket.io/docs/v4/client-api/#socket for Socket.IO options
     */
    function connectToServer() {
        console.log('Connecting to server with enhanced error handling...');
        
        // Reset reconnection state
        state.reconnectAttempts = 0;
        state.isReconnecting = false;
        
        // Establish connection with reconnection options
        state.socket = io({
            reconnection: true,
            reconnectionAttempts: state.maxReconnectAttempts,
            reconnectionDelay: state.reconnectDelay,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });
        
        // --------------------------------------------------------------------
        // CONNECTION EVENT HANDLERS
        // --------------------------------------------------------------------
        
        /**
         * Handle successful connection to server
         * 
         * Updates application state, UI, and syncs any offline drawings.
         * 
         * @event connect
         */
        state.socket.on('connect', () => {
            console.log('Connected to server with ID:', state.socket.id);
            
            state.isConnected = true;
            state.isReconnecting = false;
            state.socketId = state.socket.id;
            state.reconnectAttempts = 0; // Reset on successful connection
            
            updateConnectionStatus(true);
            userId.textContent = state.socket.id.substring(0, 8) + '...';
            
            // Show connection restored message
            showToast('Connection restored!', 'success');
            
            // Request current user count from server
            state.socket.emit('get-user-count');
            
            // Send any drawings made while offline
            flushOfflineBuffer();
        });
        
        /**
         * Handle disconnection from server
         * 
         * Manages disconnection scenarios and provides appropriate user feedback.
         * Differentiates between server-initiated disconnects and network issues.
         * 
         * @event disconnect
         * @param {string} reason - Reason for disconnection
         */
        state.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server. Reason:', reason);
            
            state.isConnected = false;
            state.lastDisconnectTime = Date.now();
            updateConnectionStatus(false);
            
            // Log the disconnect reason
            logError('disconnect', `Disconnected: ${reason}`);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect - don't auto-reconnect
                showToast('Disconnected by server. Please refresh the page.', 'error');
            } else {
                // Network issues - will auto-reconnect
                showToast('Connection lost. Attempting to reconnect...', 'warning');
            }
        });
        
        /**
         * Handle successful reconnection after network issues
         * 
         * @event reconnect
         * @param {number} attemptNumber - Number of attempts made before success
         */
        state.socket.on('reconnect', (attemptNumber) => {
            console.log(`Reconnected after ${attemptNumber} attempts`);
            state.reconnectAttempts = attemptNumber;
            showToast(`Reconnected (attempt ${attemptNumber})`, 'success');
        });
        
        /**
         * Handle reconnection attempt (while still trying to reconnect)
         * 
         * @event reconnect_attempt
         * @param {number} attemptNumber - Current attempt number
         */
        state.socket.on('reconnection_attempt', (attemptNumber) => {
            console.log(`Reconnection attempt ${attemptNumber}`);
            state.isReconnecting = true;
            state.reconnectAttempts = attemptNumber;
            updateConnectionStatus(false, `Reconnecting... (${attemptNumber}/${state.maxReconnectAttempts})`);
        });
        
        /**
         * Handle reconnection errors
         * 
         * @event reconnect_error
         * @param {Error} error - The error that occurred during reconnection
         */
        state.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
            logError('reconnect_error', error.message || 'Reconnection failed');
            
            const attemptsLeft = state.maxReconnectAttempts - state.reconnectAttempts;
            if (attemptsLeft > 0) {
                showToast(`Reconnection failed. ${attemptsLeft} attempts left...`, 'warning');
            }
        });
        
        /**
         * Handle complete reconnection failure
         * 
         * Called when all reconnection attempts have been exhausted.
         * 
         * @event reconnect_failed
         */
        state.socket.on('reconnect_failed', () => {
            console.error('Reconnection failed after all attempts');
            state.isReconnecting = false;
            showToast('Failed to reconnect. Please refresh the page.', 'error');
            updateConnectionStatus(false, 'Connection failed');
        });
        
        // --------------------------------------------------------------------
        // APPLICATION-SPECIFIC EVENT HANDLERS
        // --------------------------------------------------------------------
        
        /**
         * Handle incoming drawing events from other users
         * 
         * Renders lines drawn by other connected users in real-time.
         * 
         * @event draw
         * @param {Object} lineData - Drawing data object
         * @param {number} lineData.x0 - Starting X coordinate
         * @param {number} lineData.y0 - Starting Y coordinate
         * @param {number} lineData.x1 - Ending X coordinate
         * @param {number} lineData.y1 - Ending Y coordinate
         * @param {string} lineData.color - Hex color code
         * @param {number} lineData.brushSize - Brush thickness
         */
        state.socket.on('draw', (lineData) => {
            drawLine(lineData);
            state.linesDrawn++;
            updateLineCount();
        });
        
        /**
         * Handle clear canvas requests from server
         * 
         * Clears the local canvas when any user (including this one)
         * requests a canvas clear.
         * 
         * @event clear-canvas
         */
        state.socket.on('clear-canvas', () => {
            console.log('Server requested canvas clear');
            clearCanvas();
            state.localHistory = [];
            state.offlineBuffer = []; // Also clear offline buffer
            undoBtn.disabled = true;
        });
        
        /**
         * Handle user count updates from server
         * 
         * Updates the displayed count of currently connected users.
         * 
         * @event user-count
         * @param {number} count - Number of connected users
         */
        state.socket.on('user-count', (count) => {
            state.onlineUsers = count;
            userCount.textContent = count;
        });
        
        /**
         * Handle connection errors
         * 
         * @event connect_error
         * @param {Error} error - Connection error
         */
        state.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            logError('connect_error', error.message || 'Connection failed');
            
            updateConnectionStatus(false, 'Connection error');
            showToast('Connection error. Retrying...', 'error');
        });
        
        /**
         * Manual reconnection trigger (for potential UI button)
         * 
         * Allows manual reconnection via custom event dispatch.
         * 
         * @event manual-reconnect
         */
        window.addEventListener('manual-reconnect', () => {
            if (state.socket && !state.socket.connected) {
                console.log('Manual reconnection triggered');
                state.socket.connect();
            }
        });
    }
    
    // ========================================================================
    // DRAWING FUNCTIONS & EVENT HANDLERS
    // ========================================================================
    
    /**
     * Start drawing on mouse/touch down
     * 
     * Initiates drawing sequence by setting drawing flag and
     * storing initial coordinates. Handles offline limitations.
     * 
     * @function startDrawing
     * @param {MouseEvent|TouchEvent} e - Mouse or touch event
     * @returns {void}
     */
    function startDrawing(e) {
        // Check offline buffer limit
        if (!state.isConnected && state.offlineBuffer.length > 100) {
            showToast('Too many offline drawings. Please wait for reconnection.', 'warning');
            return;
        }
        
        state.isDrawing = true;
        const pos = getCanvasCoordinates(e);
        [state.lastX, state.lastY] = [pos.x, pos.y];
        
        // Reset throttling state for new stroke
        state.lastEmitTime = 0;
        state.pendingDraws = [];
        
        e.preventDefault();
    }
    
    /**
     * Draw while mouse/touch is moving
     * 
     * Core drawing function that:
     * 1. Renders line locally immediately
     * 2. Saves to local history for undo
     * 3. Emits to server (with throttling if online)
     * 4. Buffers if offline
     * 
     * @function draw
     * @param {MouseEvent|TouchEvent} e - Mouse or touch event
     * @returns {void}
     */
    function draw(e) {
        if (!state.isDrawing) return;
        
        e.preventDefault();
        const pos = getCanvasCoordinates(e);
        const currentTime = Date.now();
        
        // Create line data object
        const lineData = {
            x0: state.lastX,
            y0: state.lastY,
            x1: pos.x,
            y1: pos.y,
            color: state.currentColor,
            brushSize: state.brushSize,
            timestamp: currentTime
        };
        
        // ALWAYS draw locally immediately (for responsive feedback)
        drawLine(lineData);
        
        // Save to local history for undo functionality
        state.localHistory.push(lineData);
        undoBtn.disabled = false;
        
        // Handle network emission (with throttling and offline support)
        if (state.isConnected) {
            // TEMPORARY: Disable throttling for now
            state.socket.emit('draw', lineData);
            
            // Original throttled code (commented out):
            // if (currentTime - state.lastEmitTime >= state.throttleDelay) {
            //     state.socket.emit('draw', lineData);
            //     state.lastEmitTime = currentTime;
            //     state.pendingDraws = [];
            // }
        }
        else {
            // We're offline - buffer the drawing for later sync
            state.offlineBuffer.push(lineData);
            
            // Show offline indicator if this is the first offline drawing
            if (state.offlineBuffer.length === 1) {
                showToast('Drawing offline. Will sync when reconnected.', 'warning');
            }
        }
        
        // Update counters
        state.linesDrawn++;
        updateLineCount();
        
        // Update last position for next line segment
        [state.lastX, state.lastY] = [pos.x, pos.y];
    }
    
    /**
     * Stop drawing on mouse/touch up
     * 
     * @function stopDrawing
     * @returns {void}
     */
    function stopDrawing() {
        state.isDrawing = false;
    }
    
    /**
     * Handle touch start event
     * 
     * Touch equivalent of mouse down event.
     * 
     * @function handleTouchStart
     * @param {TouchEvent} e - Touch event
     * @returns {void}
     */
    function handleTouchStart(e) {
        if (!state.isConnected && state.offlineBuffer.length > 100) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing(touch);
    }
    
    /**
     * Handle touch move event
     * 
     * Touch equivalent of mouse move event.
     * 
     * @function handleTouchMove
     * @param {TouchEvent} e - Touch event
     * @returns {void}
     */
    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        draw(touch);
    }
    
    /**
     * Handle touch end event
     * 
     * Touch equivalent of mouse up event.
     * 
     * @function handleTouchEnd
     * @param {TouchEvent} e - Touch event
     * @returns {void}
     */
    function handleTouchEnd(e) {
        e.preventDefault();
        stopDrawing();
    }
    
    // ========================================================================
    // CANVAS COORDINATE & DRAWING UTILITIES
    // ========================================================================
    
    /**
     * Get canvas coordinates from mouse/touch event
     * 
     * Converts screen coordinates to canvas-relative coordinates
     * accounting for canvas position and any CSS transformations.
     * 
     * @function getCanvasCoordinates
     * @param {MouseEvent|TouchEvent} e - Mouse or touch event
     * @returns {Object} Coordinates object with x and y properties
     * 
     * @example
     * // Returns {x: 150, y: 200} for a click at that canvas position
     * const coords = getCanvasCoordinates(mouseEvent);
     */
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.touches) {
            // Touch event
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            // Mouse event
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    /**
     * Draw a line segment on the canvas
     * 
     * Renders a single line segment with specified properties.
     * Used for both local drawing and rendering received drawings.
     * 
     * @function drawLine
     * @param {Object} lineData - Line segment data
     * @param {number} lineData.x0 - Starting X coordinate
     * @param {number} lineData.y0 - Starting Y coordinate
     * @param {number} lineData.x1 - Ending X coordinate
     * @param {number} lineData.y1 - Ending Y coordinate
     * @param {string} lineData.color - Hex color code
     * @param {number} lineData.brushSize - Brush thickness
     * @returns {void}
     */
    function drawLine(lineData) {
        ctx.beginPath();
        ctx.moveTo(lineData.x0, lineData.y0);
        ctx.lineTo(lineData.x1, lineData.y1);
        ctx.strokeStyle = lineData.color;
        ctx.lineWidth = lineData.brushSize || state.brushSize;
        ctx.stroke();
    }
    
    /**
     * Clear the entire canvas
     * 
     * Resets the canvas to a white background while preserving
     * current drawing properties (color, brush size).
     * 
     * @function clearCanvas
     * @returns {void}
     */
     function clearCanvas() {
        // Get the actual display dimensions (accounting for DPI scaling)
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        
        // Clear the entire visible canvas area
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.brushSize;
    }
    
    // ========================================================================
    // UI CONTROL HANDLERS
    // ========================================================================
    
    /**
     * Handle clear canvas button click
     * 
     * Manages canvas clearing with consideration for:
     * - Offline state and unsaved drawings
     * - Confirmation for destructive action
     * - Server synchronization when connected
     * 
     * @function handleClearCanvas
     * @returns {void}
     */
    function handleClearCanvas() {
        // Handle offline state with unsaved drawings
        if (!state.isConnected && state.offlineBuffer.length > 0) {
            if (confirm('You have offline drawings. Clear locally only (not synced to server)?')) {
                clearCanvas();
                state.localHistory = [];
                state.offlineBuffer = [];
                undoBtn.disabled = true;
                state.linesDrawn = 0;
                updateLineCount();
            }
            return;
        }
        
        // Handle disconnected state
        if (!state.isConnected) {
            alert('You must be connected to clear the canvas for all users.');
            return;
        }
        
        // Handle connected state with confirmation
        if (confirm('Are you sure you want to clear the canvas for ALL users?')) {
            clearCanvas();
            state.localHistory = [];
            state.offlineBuffer = [];
            undoBtn.disabled = true;
            state.linesDrawn = 0;
            updateLineCount();
            state.socket.emit('clear-canvas');
        }
    }
    
    /**
     * Handle undo button click
     * 
     * Removes the last drawn line from local history and redraws
     * the remaining lines. Only affects local canvas, not other users.
     * 
     * @function handleUndo
     * @returns {void}
     */
    function handleUndo() {
        if (state.localHistory.length === 0) return;
        
        // Remove last line from history
        state.localHistory.pop();
        
        // Also remove from offline buffer if it was added while offline
        if (state.offlineBuffer.length > 0) {
            state.offlineBuffer.pop();
        }
        
        // Redraw all remaining lines
        clearCanvas();
        state.localHistory.forEach(line => drawLine(line));
        undoBtn.disabled = state.localHistory.length === 0;
    }
    
    /**
     * Select drawing color
     * 
     * Updates current color state, canvas context, and UI indicators.
     * 
     * @function selectColor
     * @param {string} color - Hex color code (e.g., '#FF0000')
     * @returns {void}
     */
    function selectColor(color) {
        state.currentColor = color;
        ctx.strokeStyle = color;
        
        // Update UI indicators
        selectedColorPreview.style.backgroundColor = color;
        selectedColorHex.textContent = color;
        
        // Update active state on color buttons
        colorButtons.forEach(button => {
            if (button.getAttribute('data-color') === color) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * Select brush size
     * 
     * Updates current brush size state, canvas context, and UI indicators.
     * 
     * @function selectBrushSize
     * @param {HTMLElement} clickedButton - The button that was clicked
     * @param {number} size - Brush size in pixels
     * @returns {void}
     */
    function selectBrushSize(clickedButton, size) {
        state.brushSize = size;
        ctx.lineWidth = size;
        
        // Update active state on brush buttons
        brushButtons.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }
    
    /**
     * Handle window resize
     * 
     * Maintains drawing content when window is resized by
     * saving current canvas content and redrawing after resize.
     * 
     * @function handleResize
     * @returns {void}
     */
    function handleResize() {
        // Save current canvas content as image data
        const currentDrawing = canvas.toDataURL();
        
        // Reconfigure canvas with new dimensions
        setupCanvas();
        
        // Redraw saved content
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = currentDrawing;
    }
    
    // ========================================================================
    // STATUS & ERROR MANAGEMENT
    // ========================================================================
    
    /**
     * Update connection status UI
     * 
     * Updates the connection status indicator with appropriate
     * styling and information based on current connection state.
     * 
     * @function updateConnectionStatus
     * @param {boolean} connected - Whether we're connected to server
     * @param {string} [additionalInfo=''] - Additional status information
     * @returns {void}
     */
    function updateConnectionStatus(connected, additionalInfo = '') {
        state.isConnected = connected;
        
        if (connected) {
            connectionStatus.className = 'status-indicator connected';
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
            if (state.socketId) {
                connectionStatus.innerHTML += ` (${state.socketId.substring(0, 8)}...)`;
            }
        } else {
            connectionStatus.className = 'status-indicator disconnected';
            if (additionalInfo) {
                connectionStatus.innerHTML = `<i class="fas fa-circle"></i> ${additionalInfo}`;
            } else if (state.isReconnecting) {
                connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Reconnecting...';
            } else {
                connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
            }
        }
    }
    
    /**
     * Show toast notification
     * 
     * Displays temporary notification messages to the user.
     * Supports different message types (info, success, warning, error).
     * 
     * @function showToast
     * @param {string} message - Message to display
     * @param {string} [type='info'] - Message type: 'info', 'success', 'warning', 'error'
     * @returns {void}
     */
    function showToast(message, type = 'info') {
        console.log(`Toast [${type}]: ${message}`);
        
        // If toast elements exist in DOM, use them
        if (toastMessage && errorToast) {
            toastMessage.textContent = message;
            errorToast.className = `toast toast-${type} show`;
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorToast) {
                    errorToast.classList.remove('show');
                }
            }, 5000);
        } else {
            // Fallback: console log and alert for important errors
            if (type === 'error') {
                console.error('Error (no toast UI):', message);
            }
        }
    }
    
    /**
     * Log error for debugging
     * 
     * Records errors in application state for later analysis.
     * Maintains a rolling buffer of the last 50 errors.
     * 
     * @function logError
     * @param {string} type - Error type/category
     * @param {string} message - Error message/details
     * @returns {void}
     */
    function logError(type, message) {
        const errorEntry = {
            type,
            message,
            timestamp: Date.now(),
            socketId: state.socketId
        };
        
        state.errorLog.push(errorEntry);
        
        // Keep only last 50 errors (rolling buffer)
        if (state.errorLog.length > 50) {
            state.errorLog.shift();
        }
        
        console.log(`Error logged [${type}]:`, message);
    }
    
    /**
     * Send buffered offline drawings when reconnected
     * 
     * Transmits drawings made while offline to the server
     * after connection is restored. Uses staggered transmission
     * to avoid flooding the server.
     * 
     * @function flushOfflineBuffer
     * @returns {void}
     */
    function flushOfflineBuffer() {
        if (state.offlineBuffer.length === 0 || !state.isConnected) return;
        
        console.log(`Flushing ${state.offlineBuffer.length} offline drawings...`);
        
        // Send each offline drawing with a small delay between them
        state.offlineBuffer.forEach((drawData, index) => {
            setTimeout(() => {
                if (state.isConnected) {
                    state.socket.emit('draw', drawData);
                }
            }, index * 50); // Stagger sends to avoid flooding
        });
        
        const sentCount = state.offlineBuffer.length;
        state.offlineBuffer = [];
        
        if (sentCount > 0) {
            showToast(`${sentCount} offline drawing(s) synced!`, 'success');
        }
    }
    
    /**
     * Update line count display
     * 
     * @function updateLineCount
     * @returns {void}
     */
    function updateLineCount() {
        lineCount.textContent = state.linesDrawn;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    /**
     * Public API exposed by the WhiteboardApp module
     * 
     * Provides controlled access to application functionality
     * for testing, debugging, and potential extension.
     * 
     * @namespace WhiteboardApp
     */
    return {
        /**
         * Initialize the application
         * 
         * Main entry point that should be called when DOM is loaded.
         * Sets up canvas, event listeners, and Socket.IO connection.
         * 
         * @memberof WhiteboardApp
         * @function init
         * @returns {void}
         * 
         * @example
         * // Initialize when DOM is ready
         * document.addEventListener('DOMContentLoaded', WhiteboardApp.init);
         */
        init: init,
        
        /**
         * Get a copy of current application state
         * 
         * Returns a shallow copy of the application state object.
         * Useful for debugging, monitoring, or extending functionality.
         * 
         * @memberof WhiteboardApp
         * @function getState
         * @returns {Object} Copy of application state
         * 
         * @example
         * // Monitor connection status
         * const state = WhiteboardApp.getState();
         * console.log('Is connected?', state.isConnected);
         */
        getState: () => ({ ...state }),
        
        /**
         * Clear the canvas
         * 
         * Public method to clear the canvas programmatically.
         * Note: This only clears locally unless you also emit clear event.
         * 
         * @memberof WhiteboardApp
         * @function clearCanvas
         * @returns {void}
         * 
         * @example
         * // Clear canvas without server broadcast
         * WhiteboardApp.clearCanvas();
         */
        clearCanvas: clearCanvas,
        
        /**
         * Select drawing color
         * 
         * Programmatically change the current drawing color.
         * 
         * @memberof WhiteboardApp
         * @function selectColor
         * @param {string} color - Hex color code (e.g., '#FF0000')
         * @returns {void}
         * 
         * @example
         * // Set drawing color to red
         * WhiteboardApp.selectColor('#FF0000');
         */
        selectColor: selectColor,
        
        /**
         * Select brush size
         * 
         * Programmatically change the current brush thickness.
         * 
         * @memberof WhiteboardApp
         * @function selectBrushSize
         * @param {number} size - Brush size in pixels
         * @returns {void}
         * 
         * @example
         * // Set brush to 8 pixels thick
         * WhiteboardApp.selectBrushSize(8);
         */
        selectBrushSize: (size) => {
            const button = Array.from(brushButtons).find(b => 
                parseInt(b.getAttribute('data-size')) === size
            );
            if (button) selectBrushSize(button, size);
        },
        
        /**
         * Set network emission throttle delay
         * 
         * Adjust the minimum delay between network emissions for
         * performance optimization. Higher values reduce network traffic
         * but may decrease drawing smoothness for other users.
         * 
         * @memberof WhiteboardApp
         * @function setThrottleDelay
         * @param {number} delay - Delay in milliseconds (16-200ms recommended)
         * @returns {void}
         * 
         * @example
         * // Reduce network traffic (less frequent updates)
         * WhiteboardApp.setThrottleDelay(100);
         */
        setThrottleDelay: (delay) => {
            if (delay >= 16 && delay <= 200) {
                state.throttleDelay = delay;
                console.log(`Throttle delay set to ${delay}ms`);
            } else {
                console.warn('Throttle delay must be between 16 and 200ms');
            }
        },
        
        /**
         * Manually attempt reconnection
         * 
         * Trigger manual reconnection to the server.
         * Useful when auto-reconnection has failed or user wants to retry.
         * 
         * @memberof WhiteboardApp
         * @function manualReconnect
         * @returns {boolean} True if reconnection was initiated, false otherwise
         * 
         * @example
         * // Manual reconnection attempt
         * if (WhiteboardApp.manualReconnect()) {
         *     console.log('Reconnection initiated');
         * }
         */
        manualReconnect: () => {
            if (state.socket && !state.socket.connected) {
                console.log('Manual reconnection initiated');
                state.socket.connect();
                return true;
            }
            return false;
        },
        
        /**
         * Clear error log
         * 
         * Reset the error log buffer. Useful for debugging sessions.
         * 
         * @memberof WhiteboardApp
         * @function clearErrorLog
         * @returns {void}
         * 
         * @example
         * // Clear previous errors
         * WhiteboardApp.clearErrorLog();
         */
        clearErrorLog: () => {
            state.errorLog = [];
        },
        
        /**
         * Get error log
         * 
         * Retrieve a copy of the error log for analysis or debugging.
         * 
         * @memberof WhiteboardApp
         * @function getErrorLog
         * @returns {Array<Object>} Copy of error log entries
         * 
         * @example
         * // Analyze recent errors
         * const errors = WhiteboardApp.getErrorLog();
         * errors.forEach(error => console.log(error));
         */
        getErrorLog: () => [...state.errorLog],
        
        /**
         * Flush offline buffer immediately
         * 
         * Manually trigger sending of offline drawings.
         * Normally called automatically on reconnection.
         * 
         * @memberof WhiteboardApp
         * @function flushBuffer
         * @returns {void}
         * 
         * @example
         * // Force sync of offline drawings
         * WhiteboardApp.flushBuffer();
         */
        flushBuffer: flushOfflineBuffer
    };
})();

// ============================================================================
// APPLICATION BOOTSTRAP
// ============================================================================

/**
 * Start the application when DOM is fully loaded
 * 
 * This event listener ensures all DOM elements are available
 * before initializing the whiteboard application.
 * 
 * @event DOMContentLoaded
 * @listens document#DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', WhiteboardApp.init);

// ============================================================================
// GLOBAL ACCESS & TESTING SUPPORT
// ============================================================================

/**
 * Make WhiteboardApp globally available for debugging
 * 
 * In development mode, exposes the application instance globally
 * for browser console debugging and testing.
 * 
 * @global
 * @type {Object}
 */
if (typeof window !== 'undefined') {
    window.WhiteboardApp = WhiteboardApp;
}

/**
 * Export for Node.js/CommonJS environments
 * 
 * Enables testing with frameworks like Jest in Node.js environment.
 * 
 * @exports WhiteboardApp
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhiteboardApp;
}

// ============================================================================
// ERROR BOUNDARY & GLOBAL ERROR HANDLING
// ============================================================================

/**
 * Global error handler for uncaught errors
 * 
 * Catches any unhandled errors in the application and logs them
 * to the error log for debugging purposes.
 * 
 * @listens window#error
 * @param {ErrorEvent} event - Error event
 * @returns {void}
 */
window.addEventListener('error', function(event) {
    console.error('Uncaught error:', event.error);
    
    // Log to application error log if available
    if (window.WhiteboardApp) {
        try {
            WhiteboardApp.getState().errorLog.push({
                type: 'global_error',
                message: event.error?.message || 'Unknown error',
                timestamp: Date.now(),
                stack: event.error?.stack
            });
        } catch (e) {
            // Fallback if WhiteboardApp not fully initialized
            console.error('Failed to log to error log:', e);
        }
    }
});

/**
 * Global promise rejection handler
 * 
 * Catches unhandled promise rejections which might otherwise
 * be silent failures.
 * 
 * @listens window#unhandledrejection
 * @param {PromiseRejectionEvent} event - Promise rejection event
 * @returns {void}
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Log to application error log if available
    if (window.WhiteboardApp) {
        try {
            WhiteboardApp.getState().errorLog.push({
                type: 'unhandled_promise',
                message: event.reason?.message || 'Unknown promise rejection',
                timestamp: Date.now(),
                stack: event.reason?.stack
            });
        } catch (e) {
            console.error('Failed to log promise rejection:', e);
        }
    }
});

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Development mode helpers
 * 
 * These utilities are only available in development mode
 * and provide debugging aids.
 */
if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost')) {    
    /**
     * Development console helper
     * 
     * Provides easy access to application state and utilities
     * from the browser console.
     * 
     * @global
     * @type {Object}
     */
    window.__WHITEBOARD_DEV__ = {
        /**
         * Get application state
         * @returns {Object} Application state
         */
        getState: () => WhiteboardApp.getState(),
        
        /**
         * Trigger manual reconnection
         * @returns {boolean} Success status
         */
        reconnect: () => WhiteboardApp.manualReconnect(),
        
        /**
         * Clear error log
         * @returns {void}
         */
        clearErrors: () => WhiteboardApp.clearErrorLog(),
        
        /**
         * Get error log
         * @returns {Array} Error log entries
         */
        getErrors: () => WhiteboardApp.getErrorLog(),
        
        /**
         * Simulate connection loss
         * @returns {void}
         */
        simulateDisconnect: () => {
            if (WhiteboardApp.getState().socket) {
                WhiteboardApp.getState().socket.disconnect();
                console.log('Simulated disconnection');
            }
        },
        
        /**
         * Reset application state (development only)
         * @returns {void}
         */
        reset: () => {
            // Note: This is a destructive operation for development only
            console.warn('Development reset - this will clear all state');
            WhiteboardApp.clearCanvas();
            WhiteboardApp.clearErrorLog();
            // Re-initialize if needed
            // WhiteboardApp.init();
        }
    };
    
    console.log('Whiteboard development tools available. Use window.__WHITEBOARD_DEV__');
}

// ============================================================================
// APPLICATION INFORMATION
// ============================================================================

/**
 * Application version and build information
 * 
 * This information is useful for debugging and version tracking.
 * 
 * @constant
 * @type {Object}
 */
const APP_INFO = {
    name: 'Collaborative Whiteboard',
    version: '2.0.0',
    phase: 'Phase 4: Polish & Optimization',
    build: '2024-01-15',
    features: [
        'Real-time synchronized drawing',
        'Multi-color and brush size support',
        'Offline drawing with auto-sync',
        'Touch device support',
        'Local undo functionality',
        'Enhanced error handling',
        'Performance optimized drawing'
    ]
};

// Log application info in development
if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost')) {
    console.log(
        `%c${APP_INFO.name} v${APP_INFO.version}`,
        'color: #4CAF50; font-weight: bold; font-size: 14px;'
    );
    console.log(`Phase: ${APP_INFO.phase}`);
    console.log(`Build: ${APP_INFO.build}`);
    console.log('Features:', APP_INFO.features);
}

// ============================================================================
// END OF FILE
// ============================================================================

/**
 * @fileoverview Complete documentation for Collaborative Whiteboard client application.
 * @version 2.0.0
 * @license MIT
 * @see {@link https://socket.io/|Socket.IO Documentation}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API|Canvas API Documentation}
 */
        

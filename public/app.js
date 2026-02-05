// Collaborative Whiteboard - Client Application
// Main application module
const WhiteboardApp = (function() {
    // DOM Elements
    let canvas, ctx;
    let colorButtons, brushButtons, clearBtn, undoBtn;
    let connectionStatus, userCount, userId, lineCount, selectedColorPreview, selectedColorHex;
    
    // Application State
    const state = {
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        currentColor: '#000000',
        brushSize: 4,
        socket: null,
        socketId: null,
        onlineUsers: 0,
        linesDrawn: 0,
        localHistory: [],
        isConnected: false,
        
        // Phase 4: Throttling state for performance optimization
        lastEmitTime: 0,
        throttleDelay: 50, // ms - optimal for smooth drawing (20 events/second)
        pendingDraws: []   // For potential batching (future optimization)
    };
    
    // Initialize the application
    function init() {
        console.log('Initializing Collaborative Whiteboard...');
        
        // Get DOM elements
        canvas = document.getElementById('whiteboard');
        ctx = canvas.getContext('2d');
        colorButtons = document.querySelectorAll('.color-btn');
        brushButtons = document.querySelectorAll('.brush-btn');
        clearBtn = document.getElementById('clearBtn');
        undoBtn = document.getElementById('undoBtn');
        connectionStatus = document.getElementById('connectionStatus');
        userCount = document.getElementById('userCount');
        userId = document.getElementById('userId');
        lineCount = document.getElementById('lineCount');
        selectedColorPreview = document.getElementById('selectedColorPreview');
        selectedColorHex = document.getElementById('selectedColorHex');
        
        // Set up canvas
        setupCanvas();
        
        // Set up event listeners
        setupEventListeners();
        
        // Connect to Socket.IO server
        connectToServer();
        
        console.log('Whiteboard initialized successfully with Phase 4 optimizations.');
    }
    
    // Set up canvas with proper dimensions and context
    function setupCanvas() {
        // Set canvas to display size (handles high DPI screens)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale context to handle high DPI
        ctx.scale(dpr, dpr);
        
        // Set default drawing styles
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Clear canvas with white background
        clearCanvas();
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Canvas mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Canvas touch events for mobile
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
        
        // Clear button
        clearBtn.addEventListener('click', handleClearCanvas);
        
        // Undo button
        undoBtn.addEventListener('click', handleUndo);
        
        // Window resize
        window.addEventListener('resize', handleResize);
    }
    
    // Connect to Socket.IO server
    function connectToServer() {
        console.log('Connecting to server...');
        
        // Establish connection (connects to same host automatically)
        state.socket = io();
        
        // Connection event handlers
        state.socket.on('connect', () => {
            console.log('Connected to server with ID:', state.socket.id);
            
            state.isConnected = true;
            state.socketId = state.socket.id;
            
            updateConnectionStatus(true);
            userId.textContent = state.socket.id.substring(0, 8) + '...';
            
            // Request current user count
            state.socket.emit('get-user-count');
        });
        
        state.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            
            state.isConnected = false;
            updateConnectionStatus(false);
        });
        
        // Drawing events
        state.socket.on('draw', (lineData) => {
            // Draw line received from another user
            drawLine(lineData);
            state.linesDrawn++;
            updateLineCount();
        });
        
        // Clear canvas event
        state.socket.on('clear-canvas', () => {
            console.log('Server requested canvas clear');
            clearCanvas();
            state.localHistory = []; // Clear local history too
            undoBtn.disabled = true;
        });
        
        // User count updates
        state.socket.on('user-count', (count) => {
            state.onlineUsers = count;
            userCount.textContent = count;
        });
        
        // Connection error
        state.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            updateConnectionStatus(false);
        });
    }
    
    // Update connection status UI
    function updateConnectionStatus(connected) {
        state.isConnected = connected;
        
        if (connected) {
            connectionStatus.className = 'status-indicator connected';
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
        } else {
            connectionStatus.className = 'status-indicator disconnected';
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        }
    }
    
    // Handle mouse/touch drawing - WITH THROTTLING OPTIMIZATION
    function startDrawing(e) {
        if (!state.isConnected) return;
        
        state.isDrawing = true;
        const pos = getCanvasCoordinates(e);
        [state.lastX, state.lastY] = [pos.x, pos.y];
        
        // Reset throttling state for new stroke
        state.lastEmitTime = 0;
        state.pendingDraws = [];
        
        // Prevent default to avoid scrolling on touch devices
        e.preventDefault();
    }
    
    // Phase 4: Optimized draw function with throttling
    function draw(e) {
        if (!state.isDrawing || !state.isConnected) return;
        
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
            brushSize: state.brushSize
        };
        
        // ALWAYS draw locally immediately for smooth visual feedback
        drawLine(lineData);
        
        // Save to local history for undo
        state.localHistory.push(lineData);
        undoBtn.disabled = false;
        
        // PHASE 4: THROTTLING - Only emit to server at controlled rate
        if (currentTime - state.lastEmitTime >= state.throttleDelay) {
            // It's time to send to server
            state.socket.emit('draw', lineData);
            state.lastEmitTime = currentTime;
            
            // Clear any pending draws since we just sent the latest
            state.pendingDraws = [];
        } else {
            // During throttle period, store for potential batching
            // (Current implementation skips to reduce complexity)
            // Future enhancement: interpolate points or batch sends
        }
        
        // Update counters and UI
        state.linesDrawn++;
        updateLineCount();
        
        // Update last position
        [state.lastX, state.lastY] = [pos.x, pos.y];
    }
    
    function stopDrawing() {
        state.isDrawing = false;
        
        // Send any final draw if we have one pending
        // (Future enhancement for batching implementation)
    }
    
    // Touch event handlers
    function handleTouchStart(e) {
        if (!state.isConnected) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing(touch);
    }
    
    function handleTouchMove(e) {
        if (!state.isConnected) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        draw(touch);
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        stopDrawing();
    }
    
    // Get canvas coordinates from mouse/touch event
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
    
    // Draw a line on the canvas
    function drawLine(lineData) {
        ctx.beginPath();
        ctx.moveTo(lineData.x0, lineData.y0);
        ctx.lineTo(lineData.x1, lineData.y1);
        ctx.strokeStyle = lineData.color;
        ctx.lineWidth = lineData.brushSize || state.brushSize;
        ctx.stroke();
    }
    
    // Clear the canvas
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Reset drawing styles
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.brushSize;
    }
    
    // Handle clear canvas button
    function handleClearCanvas() {
        if (!state.isConnected) {
            alert('You must be connected to clear the canvas for all users.');
            return;
        }
        
        if (confirm('Are you sure you want to clear the canvas for ALL users?')) {
            // Clear locally
            clearCanvas();
            state.localHistory = [];
            undoBtn.disabled = true;
            state.linesDrawn = 0;
            updateLineCount();
            
            // Notify server
            state.socket.emit('clear-canvas');
        }
    }
    
    // Handle undo button
    function handleUndo() {
        if (state.localHistory.length === 0) return;
        
        // Remove last line from history
        state.localHistory.pop();
        
        // Redraw everything except last line
        clearCanvas();
        
        state.localHistory.forEach(line => {
            drawLine(line);
        });
        
        // Update undo button state
        undoBtn.disabled = state.localHistory.length === 0;
    }
    
    // Select drawing color
    function selectColor(color) {
        state.currentColor = color;
        ctx.strokeStyle = color;
        
        // Update UI
        selectedColorPreview.style.backgroundColor = color;
        selectedColorHex.textContent = color;
        
        // Update active state on buttons
        colorButtons.forEach(button => {
            if (button.getAttribute('data-color') === color) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    // Select brush size
    function selectBrushSize(clickedButton, size) {
        state.brushSize = size;
        ctx.lineWidth = size;
        
        // Update UI
        brushButtons.forEach(button => {
            button.classList.remove('active');
        });
        clickedButton.classList.add('active');
    }
    
    // Handle window resize
    function handleResize() {
        // Store current drawing
        const currentDrawing = canvas.toDataURL();
        
        // Resize canvas
        setupCanvas();
        
        // Redraw existing content (simplified - in production would redraw from history)
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = currentDrawing;
    }
    
    // Update line count display
    function updateLineCount() {
        lineCount.textContent = state.linesDrawn;
    }
    
    // Phase 4: Optional adaptive throttling based on connection quality
    function setAdaptiveThrottle() {
        // Future enhancement: detect connection speed and adjust throttleDelay
        // For now, using fixed 50ms which works well for most connections
    }
    
    // Public API
    return {
        init: init,
        getState: () => ({ ...state }),
        clearCanvas: clearCanvas,
        selectColor: selectColor,
        selectBrushSize: selectBrushSize,
        // Phase 4: Expose throttling control for future optimization
        setThrottleDelay: (delay) => {
            if (delay >= 16 && delay <= 200) {
                state.throttleDelay = delay;
                console.log(`Throttle delay set to ${delay}ms`);
            }
        }
    };
})();

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', WhiteboardApp.init);

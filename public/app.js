// Collaborative Whiteboard - Client Application
// Main application module WITH ENHANCED ERROR HANDLING
const WhiteboardApp = (function() {
    // DOM Elements
    let canvas, ctx;
    let colorButtons, brushButtons, clearBtn, undoBtn;
    let connectionStatus, userCount, userId, lineCount, selectedColorPreview, selectedColorHex;
    let errorToast, toastMessage; // New UI elements for error display
    
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
        throttleDelay: 50,
        pendingDraws: [],
        
        // Phase 4: Enhanced error handling state
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        lastDisconnectTime: 0,
        errorLog: [],
        isReconnecting: false,
        offlineBuffer: [] // Store drawings made while offline
    };
    
    // Initialize the application
    function init() {
        console.log('Initializing Collaborative Whiteboard with enhanced error handling...');
        
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
        
        // Try to get error toast elements (may not exist in current HTML)
        errorToast = document.getElementById('errorToast');
        toastMessage = document.getElementById('toastMessage');
        
        // Set up canvas
        setupCanvas();
        
        // Set up event listeners
        setupEventListeners();
        
        // Connect to Socket.IO server
        connectToServer();
        
        console.log('Whiteboard initialized successfully with Phase 4 error handling.');
    }
    
    // Set up canvas with proper dimensions and context
    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        clearCanvas();
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const color = button.getAttribute('data-color');
                selectColor(color);
            });
        });
        
        brushButtons.forEach(button => {
            button.addEventListener('click', () => {
                const size = parseInt(button.getAttribute('data-size'));
                selectBrushSize(button, size);
            });
        });
        
        clearBtn.addEventListener('click', handleClearCanvas);
        undoBtn.addEventListener('click', handleUndo);
        window.addEventListener('resize', handleResize);
    }
    
    // Connect to Socket.IO server WITH ENHANCED ERROR HANDLING
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
        
        // Connection event handlers
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
            
            // Request current user count
            state.socket.emit('get-user-count');
            
            // Send any drawings made while offline
            flushOfflineBuffer();
        });
        
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
        
        // Enhanced reconnection events
        state.socket.on('reconnect', (attemptNumber) => {
            console.log(`Reconnected after ${attemptNumber} attempts`);
            state.reconnectAttempts = attemptNumber;
            showToast(`Reconnected (attempt ${attemptNumber})`, 'success');
        });
        
        state.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Reconnection attempt ${attemptNumber}`);
            state.isReconnecting = true;
            state.reconnectAttempts = attemptNumber;
            updateConnectionStatus(false, `Reconnecting... (${attemptNumber}/${state.maxReconnectAttempts})`);
        });
        
        state.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
            logError('reconnect_error', error.message || 'Reconnection failed');
            
            const attemptsLeft = state.maxReconnectAttempts - state.reconnectAttempts;
            if (attemptsLeft > 0) {
                showToast(`Reconnection failed. ${attemptsLeft} attempts left...`, 'warning');
            }
        });
        
        state.socket.on('reconnect_failed', () => {
            console.error('Reconnection failed after all attempts');
            state.isReconnecting = false;
            showToast('Failed to reconnect. Please refresh the page.', 'error');
            updateConnectionStatus(false, 'Connection failed');
        });
        
        // Drawing events
        state.socket.on('draw', (lineData) => {
            drawLine(lineData);
            state.linesDrawn++;
            updateLineCount();
        });
        
        // Clear canvas event
        state.socket.on('clear-canvas', () => {
            console.log('Server requested canvas clear');
            clearCanvas();
            state.localHistory = [];
            state.offlineBuffer = []; // Also clear offline buffer
            undoBtn.disabled = true;
        });
        
        // User count updates
        state.socket.on('user-count', (count) => {
            state.onlineUsers = count;
            userCount.textContent = count;
        });
        
        // Enhanced connection error handling
        state.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            logError('connect_error', error.message || 'Connection failed');
            
            updateConnectionStatus(false, 'Connection error');
            showToast('Connection error. Retrying...', 'error');
        });
        
        // Manual reconnection trigger (for UI button if added later)
        window.addEventListener('manual-reconnect', () => {
            if (state.socket && !state.socket.connected) {
                console.log('Manual reconnection triggered');
                state.socket.connect();
            }
        });
    }
    
    // Update connection status UI with enhanced information
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
    
    // Show toast notification for errors/status
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
    
    // Log errors for debugging
    function logError(type, message) {
        const errorEntry = {
            type,
            message,
            timestamp: Date.now(),
            socketId: state.socketId
        };
        
        state.errorLog.push(errorEntry);
        
        // Keep only last 50 errors
        if (state.errorLog.length > 50) {
            state.errorLog.shift();
        }
        
        console.log(`Error logged [${type}]:`, message);
    }
    
    // Handle mouse/touch drawing
    function startDrawing(e) {
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
    
    // Optimized draw function with throttling AND offline support
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
        
        // ALWAYS draw locally immediately
        drawLine(lineData);
        
        // Save to local history for undo
        state.localHistory.push(lineData);
        undoBtn.disabled = false;
        
        // Handle network emission (with throttling and offline support)
        if (state.isConnected) {
            // We're online - use throttling
            if (currentTime - state.lastEmitTime >= state.throttleDelay) {
                state.socket.emit('draw', lineData);
                state.lastEmitTime = currentTime;
                state.pendingDraws = [];
            }
        } else {
            // We're offline - buffer the drawing
            state.offlineBuffer.push(lineData);
            
            // Show offline indicator if this is the first offline drawing
            if (state.offlineBuffer.length === 1) {
                showToast('Drawing offline. Will sync when reconnected.', 'warning');
            }
        }
        
        // Update counters
        state.linesDrawn++;
        updateLineCount();
        
        // Update last position
        [state.lastX, state.lastY] = [pos.x, pos.y];
    }
    
    // Send buffered offline drawings when reconnected
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
    
    function stopDrawing() {
        state.isDrawing = false;
    }
    
    // Touch event handlers
    function handleTouchStart(e) {
        if (!state.isConnected && state.offlineBuffer.length > 100) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing(touch);
    }
    
    function handleTouchMove(e) {
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
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
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
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.brushSize;
    }
    
    // Handle clear canvas button
    function handleClearCanvas() {
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
        
        if (!state.isConnected) {
            alert('You must be connected to clear the canvas for all users.');
            return;
        }
        
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
    
    // Handle undo button
    function handleUndo() {
        if (state.localHistory.length === 0) return;
        
        state.localHistory.pop();
        
        // Also remove from offline buffer if it was added while offline
        if (state.offlineBuffer.length > 0) {
            state.offlineBuffer.pop();
        }
        
        clearCanvas();
        state.localHistory.forEach(line => drawLine(line));
        undoBtn.disabled = state.localHistory.length === 0;
    }
    
    // Select drawing color
    function selectColor(color) {
        state.currentColor = color;
        ctx.strokeStyle = color;
        
        selectedColorPreview.style.backgroundColor = color;
        selectedColorHex.textContent = color;
        
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
        
        brushButtons.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }
    
    // Handle window resize
    function handleResize() {
        const currentDrawing = canvas.toDataURL();
        setupCanvas();
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
    
    // Public API
    return {
        init: init,
        getState: () => ({ ...state }),
        clearCanvas: clearCanvas,
        selectColor: selectColor,
        selectBrushSize: selectBrushSize,
        setThrottleDelay: (delay) => {
            if (delay >= 16 && delay <= 200) {
                state.throttleDelay = delay;
                console.log(`Throttle delay set to ${delay}ms`);
            }
        },
        // Error handling utilities
        manualReconnect: () => {
            if (state.socket && !state.socket.connected) {
                console.log('Manual reconnection initiated');
                state.socket.connect();
                return true;
            }
            return false;
        },
        clearErrorLog: () => {
            state.errorLog = [];
        },
        getErrorLog: () => [...state.errorLog],
        flushBuffer: flushOfflineBuffer
    };
})();

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', WhiteboardApp.init);

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhiteboardApp;
}

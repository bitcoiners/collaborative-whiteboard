/**
 * SocketManager Module
 * ===================
 * 
 * Handles all Socket.IO communication including:
 * - Connection management and reconnection logic
 * - Event emission and listening
 * - Real-time data synchronization
 * - Offline buffering and recovery
 * 
 * @module SocketManager
 */

const SocketManager = (function() {
    'use strict';
    
    // Private variables
    let socket = null;
    let stateManager = null;
    let eventCallbacks = {
        draw: null,
        clear: null,
        connectionChange: null,
        userCountUpdate: null
    };
    
    // Configuration
    const CONFIG = {
        RECONNECT_DELAY: 1000,
        MAX_RECONNECT_ATTEMPTS: 5,
        HEARTBEAT_INTERVAL: 30000
    };
    
    /**
     * Initialize the socket manager
     * @param {Object} stateManagerInstance - StateManager instance
     * @returns {Object} Socket manager instance
     */
    function init(stateManagerInstance) {
        if (!stateManagerInstance) {
            throw new Error('SocketManager: StateManager instance required');
        }
        
        stateManager = stateManagerInstance;
        console.log('SocketManager: Initialized with StateManager');
        
        // Return public API
        return {
            initialize,
            emitDraw,
            emitClearCanvas,
            disconnect,
            reconnect,
            setOnDrawCallback,
            setOnClearCallback,
            setOnConnectionChange,
            setOnUserCountUpdate,
            isConnected,
            getSocketId
        };
    }
    
    /**
     * Initialize Socket.IO connection
     */
    function initialize() {
        console.log('SocketManager: Initializing connection...');
        
        // Check if socket.io is available
        if (typeof io === 'undefined') {
            console.error('SocketManager: Socket.IO library not loaded');
            stateManager.logError('socket_init', 'Socket.IO library not loaded');
            
            // Still update UI as disconnected
            if (eventCallbacks.connectionChange) {
                eventCallbacks.connectionChange('disconnected', 0);
            }
            return;
        }
        
        // Update state
        stateManager.updateState({
            isReconnecting: false,
            reconnectAttempts: 0
        });
        
        // Connect to server
        socket = io({
            reconnection: true,
            reconnectionAttempts: CONFIG.MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: CONFIG.RECONNECT_DELAY
        });
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('SocketManager: Socket.IO connection initialized');
    }
    
    /**
     * Set up Socket.IO event listeners
     */
    function setupEventListeners() {
        if (!socket) return;
        
        // Connection events
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('reconnect', onReconnect);
        socket.on('reconnect_attempt', onReconnectAttempt);
        socket.on('reconnect_error', onReconnectError);
        socket.on('reconnect_failed', onReconnectFailed);
        
        // Application events
        socket.on('draw', onDraw);
        socket.on('clear-canvas', onClearCanvas);
        socket.on('user-count', onUserCount);
        socket.on('user-joined', onUserJoined);
        socket.on('user-left', onUserLeft);
        
        console.log('SocketManager: Event listeners attached');
    }
    
    /**
     * Handle successful connection
     */
    function onConnect() {
        console.log('SocketManager: Connected to server, socket ID:', socket.id);
        
        // Update state
        stateManager.updateState({
            isConnected: true,
            socketId: socket.id,
            reconnectAttempts: 0,
            isReconnecting: false
        });
        
        // Clear any pending reconnect state
        clearReconnectState();
        
        // Flush offline buffer
        flushOfflineBuffer();
        
        // Notify UI
        if (eventCallbacks.connectionChange) {
            eventCallbacks.connectionChange('connected', stateManager.getProperty('onlineUsers') || 0);
        }
        
        // Start heartbeat
        startHeartbeat();
    }
    
    /**
     * Handle disconnection
     * @param {string} reason - Disconnection reason
     */
    function onDisconnect(reason) {
        console.log('SocketManager: Disconnected from server:', reason);
        
        // Update state
        stateManager.updateState({
            isConnected: false,
            isReconnecting: reason === 'io server disconnect' || reason === 'transport close'
        });
        
        // Stop heartbeat
        stopHeartbeat();
        
        // Notify UI
        if (eventCallbacks.connectionChange) {
            eventCallbacks.connectionChange('disconnected', stateManager.getProperty('onlineUsers') || 0);
        }
        
        // Log error
        stateManager.logError('socket_disconnect', `Disconnected: ${reason}`);
    }
    
    /**
     * Handle connection error
     * @param {Error} error - Connection error
     */
    function onConnectError(error) {
        console.error('SocketManager: Connection error:', error);
        stateManager.logError('socket_connect_error', error.message, error);
    }
    
    /**
     * Handle successful reconnection
     */
    function onReconnect() {
        console.log('SocketManager: Reconnected to server');
        
        stateManager.updateState({
            isConnected: true,
            isReconnecting: false,
            reconnectAttempts: 0
        });
        
        clearReconnectState();
        
        if (eventCallbacks.connectionChange) {
            eventCallbacks.connectionChange('connected', stateManager.getProperty('onlineUsers') || 0);
        }
    }
    
    /**
     * Handle reconnection attempt
     * @param {number} attemptNumber - Attempt number
     */
    function onReconnectAttempt(attemptNumber) {
        console.log(`SocketManager: Reconnection attempt ${attemptNumber}`);
        
        stateManager.updateState({
            reconnectAttempts: attemptNumber,
            isReconnecting: true
        });
        
        if (eventCallbacks.connectionChange) {
            eventCallbacks.connectionChange('reconnecting', stateManager.getProperty('onlineUsers') || 0);
        }
    }
    
    /**
     * Handle reconnection error
     * @param {Error} error - Reconnection error
     */
    function onReconnectError(error) {
        console.error('SocketManager: Reconnection error:', error);
        stateManager.logError('socket_reconnect_error', error.message, error);
    }
    
    /**
     * Handle failed reconnection
     */
    function onReconnectFailed() {
        console.error('SocketManager: Reconnection failed after all attempts');
        
        stateManager.updateState({
            isReconnecting: false,
            reconnectAttempts: CONFIG.MAX_RECONNECT_ATTEMPTS
        });
        
        if (eventCallbacks.connectionChange) {
            eventCallbacks.connectionChange('disconnected', stateManager.getProperty('onlineUsers') || 0);
        }
        
        stateManager.logError('socket_reconnect_failed', 'Failed to reconnect after all attempts');
    }
    
    /**
     * Handle incoming draw event
     * @param {Object} lineData - Line data from server
     */
    function onDraw(lineData) {
        console.log('SocketManager: Received draw event', lineData);
        
        // Update state
        stateManager.incrementLinesDrawn();
        
        // Forward to callback
        if (eventCallbacks.draw) {
            eventCallbacks.draw(lineData);
        }
    }
    
    /**
     * Handle incoming clear canvas event
     */
    function onClearCanvas() {
        console.log('SocketManager: Received clear canvas event');
        
        // Update state
        stateManager.clearHistory();
        stateManager.resetLinesDrawn();
        
        // Forward to callback
        if (eventCallbacks.clear) {
            eventCallbacks.clear();
        }
    }
    
    /**
     * Handle user count update
     * @param {number} count - Number of connected users
     */
    function onUserCount(count) {
        console.log(`SocketManager: ${count} users connected`);
        
        // Update state
        stateManager.updateState({ onlineUsers: count });
        
        // Forward to callback
        if (eventCallbacks.userCountUpdate) {
            eventCallbacks.userCountUpdate(count);
        }
    }
    
    /**
     * Handle user joined event
     * @param {Object} userData - User data {id, count}
     */
    function onUserJoined(userData) {
        console.log(`SocketManager: User ${userData.id} joined, total: ${userData.count}`);
        onUserCount(userData.count);
    }
    
    /**
     * Handle user left event
     * @param {Object} userData - User data {id, count}
     */
    function onUserLeft(userData) {
        console.log(`SocketManager: User ${userData.id} left, total: ${userData.count}`);
        onUserCount(userData.count);
    }
    
    /**
     * Emit draw event to server
     * @param {Object} lineData - Line data to draw
     */
    function emitDraw(lineData) {
        if (!socket || !stateManager.getProperty('isConnected')) {
            console.log('SocketManager: Not connected, buffering draw event');
            stateManager.addToOfflineBuffer(lineData);
            return;
        }
        
        try {
            socket.emit('draw', lineData);
            console.log('SocketManager: Emitted draw event', lineData);
        } catch (error) {
            console.error('SocketManager: Error emitting draw event:', error);
            stateManager.logError('socket_emit_draw', error.message, { lineData });
        }
    }
    
    /**
     * Emit clear canvas event to server
     */
    function emitClearCanvas() {
        if (!socket || !stateManager.getProperty('isConnected')) {
            console.log('SocketManager: Not connected, cannot clear canvas');
            return;
        }
        
        try {
            socket.emit('clear-canvas');
            console.log('SocketManager: Emitted clear canvas event');
        } catch (error) {
            console.error('SocketManager: Error emitting clear canvas event:', error);
            stateManager.logError('socket_emit_clear', error.message);
        }
    }
    
    /**
     * Flush offline buffer (send all buffered drawings)
     */
    function flushOfflineBuffer() {
        const buffer = stateManager.getOfflineBuffer();
        if (buffer.length === 0) return;
        
        console.log(`SocketManager: Flushing ${buffer.length} buffered drawings`);
        
        buffer.forEach(lineData => {
            emitDraw(lineData);
        });
        
        stateManager.clearOfflineBuffer();
    }
    
    /**
     * Clear reconnect state indicators
     */
    function clearReconnectState() {
        // Clear any UI indicators for reconnection
        const reconnectIndicator = document.getElementById('reconnectIndicator');
        if (reconnectIndicator) {
            reconnectIndicator.style.display = 'none';
        }
    }
    
    /**
     * Start heartbeat to keep connection alive
     */
    function startHeartbeat() {
        if (window.socketHeartbeatInterval) {
            clearInterval(window.socketHeartbeatInterval);
        }
        
        window.socketHeartbeatInterval = setInterval(() => {
            if (socket && socket.connected) {
                socket.emit('heartbeat', { timestamp: Date.now() });
            }
        }, CONFIG.HEARTBEAT_INTERVAL);
    }
    
    /**
     * Stop heartbeat
     */
    function stopHeartbeat() {
        if (window.socketHeartbeatInterval) {
            clearInterval(window.socketHeartbeatInterval);
            window.socketHeartbeatInterval = null;
        }
    }
    
    /**
     * Manually disconnect from server
     */
    function disconnect() {
        if (socket) {
            socket.disconnect();
            console.log('SocketManager: Manually disconnected');
        }
    }
    
    /**
     * Manually reconnect to server
     */
    function reconnect() {
        if (socket) {
            socket.connect();
            console.log('SocketManager: Manually reconnecting...');
        }
    }
    
    /**
     * Set callback for draw events
     * @param {Function} callback - Callback function
     */
    function setOnDrawCallback(callback) {
        eventCallbacks.draw = callback;
    }
    
    /**
     * Set callback for clear canvas events
     * @param {Function} callback - Callback function
     */
    function setOnClearCallback(callback) {
        eventCallbacks.clear = callback;
    }
    
    /**
     * Set callback for connection status changes
     * @param {Function} callback - Callback function
     */
    function setOnConnectionChange(callback) {
        eventCallbacks.connectionChange = callback;
    }
    
    /**
     * Set callback for user count updates
     * @param {Function} callback - Callback function
     */
    function setOnUserCountUpdate(callback) {
        eventCallbacks.userCountUpdate = callback;
    }
    
    /**
     * Check if connected to server
     * @returns {boolean} Connection status
     */
    function isConnected() {
        return stateManager.getProperty('isConnected') || false;
    }
    
    /**
     * Get socket ID
     * @returns {string|null} Socket ID or null if not connected
     */
    function getSocketId() {
        return stateManager.getProperty('socketId') || null;
    }
    
    // Public API
    return {
        init: init
    };
})();

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketManager;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SocketManager = SocketManager;
}

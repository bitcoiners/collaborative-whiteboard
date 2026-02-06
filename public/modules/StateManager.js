/**
 * StateManager Module
 * ===================
 * 
 * Handles all application state management including:
 * - Centralized state storage and updates
 * - State persistence and serialization
 * - History management (undo functionality)
 * - Error logging and monitoring
 * 
 * @module StateManager
 */

const StateManager = (function() {
    'use strict';
    
    // Default state structure
    const DEFAULT_STATE = {
        // Drawing state
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        currentColor: '#000000',
        brushSize: 4,
        
        // Connection state
        isConnected: false,
        socketId: null,
        onlineUsers: 0,
        
        // Application state
        linesDrawn: 0,
        localHistory: [],
        
        // Performance and error state
        throttleDelay: 50,
        errorLog: [],
        offlineBuffer: [],
        reconnectAttempts: 0,
        isReconnecting: false
    };
    
    // Configuration
    const CONFIG = {
        MAX_ERROR_LOG_SIZE: 50,
        MAX_HISTORY_SIZE: 1000
    };
    
    /**
     * Initialize the state manager
     * @param {Object} initialState - Initial state values (optional)
     * @returns {Object} State manager instance
     */
    function init(initialState = {}) {
        console.log('StateManager: Initializing...');
        
        // Private state object
        let state = {
            ...DEFAULT_STATE,
            ...initialState
        };
        
        /**
         * Get current state (returns a copy)
         * @returns {Object} Current state
         */
        function getState() {
            return { ...state };
        }
        
        /**
         * Update multiple state properties
         * @param {Object} updates - Key-value pairs to update
         */
        function updateState(updates) {
            if (!updates || typeof updates !== 'object') {
                return;
            }
            
            state = {
                ...state,
                ...updates
            };
            
            console.log('StateManager: State updated', Object.keys(updates));
        }
        
        /**
         * Set a single state property
         * @param {string} key - Property name
         * @param {any} value - Property value
         */
        function setProperty(key, value) {
            if (!key || typeof key !== 'string') {
                return;
            }
            
            state = {
                ...state,
                [key]: value
            };
        }
        
        /**
         * Get a single state property
         * @param {string} key - Property name
         * @returns {any} Property value
         */
        function getProperty(key) {
            return state[key];
        }
        
        /**
         * Reset state to initial values
         * @param {Object} newDefaults - New default values (optional)
         */
        function resetState(newDefaults = {}) {
            state = {
                ...DEFAULT_STATE,
                ...newDefaults,
                // Force arrays to be fresh
                localHistory: newDefaults.localHistory || [],
                errorLog: newDefaults.errorLog || [],
                offlineBuffer: newDefaults.offlineBuffer || []
            };
            console.log('StateManager: State reset');
        }
        /**
         * Add drawing to local history
         * @param {Object} lineData - Drawing data
         */
        function addToHistory(lineData) {
            if (!lineData) return;
            
            state.localHistory.push(lineData);
            
            // Limit history size
            if (state.localHistory.length > CONFIG.MAX_HISTORY_SIZE) {
                state.localHistory = state.localHistory.slice(-CONFIG.MAX_HISTORY_SIZE);
            }
        }
        
        /**
         * Clear local history
         */
        function clearHistory() {
            state.localHistory = [];
        }
        
        /**
         * Get last item from history (for undo)
         * @returns {Object|null} Last history item or null
         */
        function getLastHistoryItem() {
            if (state.localHistory.length === 0) {
                return null;
            }
            return state.localHistory[state.localHistory.length - 1];
        }
        
        /**
         * Remove last item from history (undo)
         * @returns {Object|null} Removed item or null
         */
        function removeLastHistoryItem() {
            if (state.localHistory.length === 0) {
                return null;
            }
            return state.localHistory.pop();
        }
        
        /**
         * Get history size
         * @returns {number} Number of items in history
         */
        function getHistorySize() {
            return state.localHistory.length;
        }
        
        /**
         * Log an error
         * @param {string} type - Error type/category
         * @param {string} message - Error message
         * @param {any} data - Additional error data (optional)
         */
        function logError(type, message, data = null) {
            const errorEntry = {
                type,
                message,
                data,
                timestamp: Date.now(),
                socketId: state.socketId
            };
            
            state.errorLog.push(errorEntry);
            
            // Limit error log size
            if (state.errorLog.length > CONFIG.MAX_ERROR_LOG_SIZE) {
                state.errorLog = state.errorLog.slice(-CONFIG.MAX_ERROR_LOG_SIZE);
            }
            
            console.log(`StateManager: Error logged [${type}]`, message);
        }
        
        /**
         * Get error log
         * @returns {Array} Error log entries
         */
        function getErrorLog() {
            return [...state.errorLog];
        }
        
        /**
         * Clear error log
         */
        function clearErrorLog() {
            state.errorLog = [];
        }
        
        /**
         * Increment lines drawn counter
         */
        function incrementLinesDrawn() {
            state.linesDrawn++;
        }
        
        /**
         * Reset lines drawn counter
         */
        function resetLinesDrawn() {
            state.linesDrawn = 0;
        }
        
        /**
         * Add drawing to offline buffer
         * @param {Object} lineData - Drawing data
         */
        function addToOfflineBuffer(lineData) {
            if (!lineData) return;
            
            state.offlineBuffer.push(lineData);
        }
        
        /**
         * Clear offline buffer
         */
        function clearOfflineBuffer() {
            state.offlineBuffer = [];
        }
        
        /**
         * Get offline buffer size
         * @returns {number} Buffer size
         */
        function getOfflineBufferSize() {
            return state.offlineBuffer.length;
        }
        
        /**
         * Get offline buffer
         * @returns {Array} Offline buffer
         */
        function getOfflineBuffer() {
            return [...state.offlineBuffer];
        }
        
        /**
         * Serialize state for storage/transmission
         * @returns {string} JSON string
         */
        function serialize() {
            return JSON.stringify(state);
        }
        
        /**
         * Deserialize state from storage/transmission
         * @param {string} jsonString - JSON string
         */
        function deserialize(jsonString) {
            try {
                const parsed = JSON.parse(jsonString);
                state = {
                    ...DEFAULT_STATE,
                    ...parsed
                };
                return true;
            } catch (error) {
                logError('deserialize', 'Failed to deserialize state', error);
                return false;
            }
        }
        
        // Return public API for this instance
        return {
            getState,
            updateState,
            setProperty,
            getProperty,
            resetState,
            addToHistory,
            clearHistory,
            getLastHistoryItem,
            removeLastHistoryItem,
            getHistorySize,
            logError,
            getErrorLog,
            clearErrorLog,
            incrementLinesDrawn,
            resetLinesDrawn,
            addToOfflineBuffer,
            clearOfflineBuffer,
            getOfflineBufferSize,
            getOfflineBuffer,
            serialize,
            deserialize
        };
    }
    
    // Public API - just the init function
    return {
        init: init,
        DEFAULT_STATE // Export for testing
    };
})();

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}

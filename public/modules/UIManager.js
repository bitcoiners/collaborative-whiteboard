/**
 * UIManager Module
 * ================
 * 
 * Handles all user interface operations including:
 * - Control element setup and event handling
 * - Status updates and user feedback
 * - Dynamic UI state management
 * - User interaction coordination
 * 
 * @module UIManager
 */

const UIManager = (function() {
    'use strict';
    
    // Private variables
    let stateManager = null;
    let eventCallbacks = {
        colorChange: null,
        clear: null,
        undo: null,
        brushSizeChange: null
    };
    
    // DOM element references
    let elements = {};
    
    /**
     * Initialize the UI manager
     * @param {Object} stateManagerInstance - StateManager instance
     * @returns {Object} UI manager instance
     */
    function init(stateManagerInstance) {
        if (!stateManagerInstance) {
            throw new Error('UIManager: StateManager instance required');
        }
        
        stateManager = stateManagerInstance;
        console.log('UIManager: Initialized with StateManager');
        
        // Cache DOM elements
        cacheElements();
        
        // Return public API
        return {
            initialize,
            updateConnectionStatus,
            updateUserCount,
            updateDrawingStats,
            showNotification,
            setOnColorChangeCallback,
            setOnClearCallback,
            setOnUndoCallback,
            setOnBrushSizeChangeCallback,
            getElements
        };
    }
    
    /**
     * Cache frequently used DOM elements
     */
    function cacheElements() {
        elements = {
            status: document.getElementById('statusText'),
            userCount: document.getElementById('userCount'),
            connectionStatus: document.getElementById("connectionStatus"),
            socketId: document.getElementById('socketId'),
            linesDrawn: document.getElementById('linesDrawn'),
            historySize: document.getElementById('historySize'),
            colorButtons: document.querySelectorAll('.color-btn'),
            clearButton: document.getElementById('clearBtn'),
            undoButton: document.getElementById('undoBtn'),
            brushSizeInput: document.getElementById('brushSize'),
            brushSizeValue: document.getElementById('brushSizeValue')
        };
        
        console.log('UIManager: DOM elements cached');
    }
    
    /**
     * Initialize UI components
     */
    function initialize() {
        console.log('UIManager: Initializing UI components...');
        
        // Set up control event listeners
        setupColorButtons();
        setupClearButton();
        setupUndoButton();
        setupBrushSizeControl();
        
        // Initialize UI state from state manager
        initializeUIState();
        
        // Set up periodic UI updates
        setupPeriodicUpdates();
        
        console.log('UIManager: UI initialization complete');
    }
    
    /**
     * Initialize UI state from StateManager
     */
    function initializeUIState() {
        if (!stateManager) return;
        
        // Set initial color selection
        const currentColor = stateManager.getProperty('currentColor') || '#000000';
        updateColorSelection(currentColor);
        
        // Update stats
        updateDrawingStats();
        
        console.log('UIManager: UI state initialized from StateManager');
    }
    
    /**
     * Set up color picker buttons
     */
    function setupColorButtons() {
        if (!elements.colorButtons || elements.colorButtons.length === 0) {
            console.warn('UIManager: No color buttons found');
            return;
        }
        
        elements.colorButtons.forEach(button => {
            button.addEventListener('click', function() {
                const color = this.getAttribute('data-color') || this.style.backgroundColor;
                
                // Update StateManager
                stateManager.updateState({ currentColor: color });
                
                // Update UI
                updateColorSelection(color);
                
                // Notify callback
                if (eventCallbacks.colorChange) {
                    eventCallbacks.colorChange(color);
                }
                
                console.log('UIManager: Color changed to', color);
            });
        });
        
        console.log('UIManager: Color buttons set up');
    }
    
    /**
     * Update color selection in UI
     * @param {string} selectedColor - Selected color
     */
    function updateColorSelection(selectedColor) {
        if (!elements.colorButtons) return;
        
        elements.colorButtons.forEach(button => {
            const buttonColor = button.getAttribute('data-color') || button.style.backgroundColor;
            
            if (buttonColor === selectedColor) {
                button.classList.add('active');
                button.title = `Selected: ${buttonColor}`;
            } else {
                button.classList.remove('active');
                button.title = button.getAttribute('data-original-title') || '';
            }
        });
    }
    
    /**
     * Set up clear button
     */
    function setupClearButton() {
        if (!elements.clearButton) {
            console.warn('UIManager: Clear button not found');
            return;
        }
        
        elements.clearButton.addEventListener('click', function() {
            // Confirm before clearing
            if (confirm('Are you sure you want to clear the canvas for ALL users?')) {
                // Update StateManager
                stateManager.clearHistory();
                stateManager.resetLinesDrawn();
                
                // Update UI
                updateDrawingStats();
                
                // Notify callback
                if (eventCallbacks.clear) {
                    eventCallbacks.clear();
                }
                
                // Show feedback
                showNotification('Canvas cleared for all users', 'info');
                console.log('UIManager: Clear canvas requested');
            }
        });
        
        console.log('UIManager: Clear button set up');
    }
    
    /**
     * Set up undo button
     */
    function setupUndoButton() {
        if (!elements.undoButton) {
            console.warn('UIManager: Undo button not found');
            return;
        }
        
        elements.undoButton.addEventListener('click', function() {
            const lastItem = stateManager.getLastHistoryItem();
            
            if (!lastItem) {
                showNotification('Nothing to undo', 'warning');
                return;
            }
            
            // Remove from history
            const removedItem = stateManager.removeLastHistoryItem();
            
            // Update UI
            updateDrawingStats();
            
            // Notify callback
            if (eventCallbacks.undo) {
                eventCallbacks.undo(removedItem);
            }
            
            showNotification('Last action undone', 'info');
            console.log('UIManager: Undo action performed');
        });
        
        console.log('UIManager: Undo button set up');
    }
    
    /**
     * Set up brush size control
     */
    function setupBrushSizeControl() {
        if (!elements.brushSizeInput) return;
        
        // Initialize from state
        const brushSize = stateManager.getProperty('brushSize') || 4;
        elements.brushSizeInput.value = brushSize;
        if (elements.brushSizeValue) {
            elements.brushSizeValue.textContent = `${brushSize}px`;
        }
        
        // Add event listener
        elements.brushSizeInput.addEventListener('input', function() {
            const size = parseInt(this.value);
            
            // Update StateManager
            stateManager.updateState({ brushSize: size });
            
            // Update UI
            if (elements.brushSizeValue) {
                elements.brushSizeValue.textContent = `${size}px`;
            }
            
            // Notify callback
            if (eventCallbacks.brushSizeChange) {
                eventCallbacks.brushSizeChange(size);
            }
            
            console.log('UIManager: Brush size changed to', size);
        });
        
        console.log('UIManager: Brush size control set up');
    }
    
    /**
     * Update connection status display
     * @param {string} status - Connection status
     */
    function updateConnectionStatus(status) {
        console.log('UIManager: updateConnectionStatus called with:', status);
        console.log('UIManager: status element:', elements.status);
        console.log('UIManager: socketId element:', elements.socketId);
        
        if (!elements.status) {
            console.log('UIManager: ERROR - status element not found');
            return;
        }
        
        const statusMap = {
            'connected': { text: 'Connected', className: 'connected' },
            'disconnected': { text: 'Disconnected', className: 'disconnected' },
            'connecting': { text: 'Connecting...', className: 'connecting' },
            'reconnecting': { text: 'Reconnecting...', className: 'reconnecting' }
        };
        
        const statusInfo = statusMap[status] || statusMap.disconnected;
        
        // Update connection status container
        if (elements.connectionStatus) {
            elements.connectionStatus.className = `status-indicator ${statusInfo.className}`;
        }
        
        // Update status text
        elements.status.textContent = statusInfo.text;
        elements.status.className = statusInfo.className;
        
        // Update socket ID if available and connected
        if (status === 'connected' && elements.socketId) {
            const socketId = stateManager.getProperty('socketId');
            elements.socketId.textContent = socketId ? socketId.substring(0, 8) + '...' : '-';
            console.log('UIManager: Socket ID updated');
        }
        
        console.log(`UIManager: Connection status updated to "${status}"`);
    }
    
    /**
     * Update user count display
     * @param {number} count - Number of connected users
     */
    function updateUserCount(count) {
        console.log('UIManager: updateUserCount called with:', count);
        console.log('UIManager: userCount element:', elements.userCount);
        
        if (!elements.userCount) {
            console.log('UIManager: ERROR - userCount element not found');
            return;
        }
        
        const userCount = count || stateManager.getProperty('onlineUsers') || 0;
        const suffix = userCount === 1 ? 'user' : 'users';
        
        elements.userCount.textContent = `${userCount} ${suffix}`;
        elements.userCount.title = `${userCount} user${userCount === 1 ? '' : 's'} currently connected`;
        
        console.log(`UIManager: User count updated to ${userCount}`);
    }
    
    /**
     * Update drawing statistics
     */
    function updateDrawingStats() {
        if (!stateManager) return;
        
        const linesDrawn = stateManager.getProperty('linesDrawn') || 0;
        const historySize = stateManager.getProperty('localHistory').length || 0;
        
        if (elements.linesDrawn) {
            elements.linesDrawn.textContent = `Lines drawn: ${linesDrawn}`;
        }
        
        if (elements.historySize) {
            elements.historySize.textContent = `History: ${historySize} items`;
            elements.undoButton.disabled = historySize === 0;
            elements.undoButton.title = historySize === 0 ? 'No actions to undo' : 'Undo last action';
        }
    }
    
    /**
     * Set up periodic UI updates
     */
    function setupPeriodicUpdates() {
        // Update stats every 10 seconds
        setInterval(() => {
            if (stateManager) {
                updateDrawingStats();
            }
        }, 10000);
        
        console.log('UIManager: Periodic updates scheduled');
    }
    
    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, warning, error)
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    function showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Add close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        console.log(`UIManager: Notification shown - "${message}" (${type})`);
    }
    
    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon character
     */
    function getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Set callback for color change events
     * @param {Function} callback - Callback function
     */
    function setOnColorChangeCallback(callback) {
        eventCallbacks.colorChange = callback;
    }
    
    /**
     * Set callback for clear events
     * @param {Function} callback - Callback function
     */
    function setOnClearCallback(callback) {
        eventCallbacks.clear = callback;
    }
    
    /**
     * Set callback for undo events
     * @param {Function} callback - Callback function
     */
    function setOnUndoCallback(callback) {
        eventCallbacks.undo = callback;
    }
    
    /**
     * Set callback for brush size change events
     * @param {Function} callback - Callback function
     */
    function setOnBrushSizeChangeCallback(callback) {
        eventCallbacks.brushSizeChange = callback;
    }
    
    /**
     * Get cached DOM elements
     * @returns {Object} DOM elements
     */
    function getElements() {
        return { ...elements };
    }
    
    // Public API
    return {
        init: init
    };
})();

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}

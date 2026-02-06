/**
 * CanvasManager Module
 * ===================
 * 
 * Handles all canvas-related operations including:
 * - Canvas setup and configuration
 * - Mouse event handling for drawing
 * - Local drawing rendering
 * - Canvas clearing and resizing
 * 
 * @module CanvasManager
 */

const CanvasManager = (function() {
    'use strict';
    
    // Private variables
    let canvas, context;
    let stateManager = null;
    let callbacks = {
        onDraw: null,
        onDrawStart: null,
        onDrawEnd: null
    };
    
    /**
     * Calculate mouse position relative to canvas
     * @param {HTMLCanvasElement} canvasElement - The canvas element
     * @param {MouseEvent} event - Mouse event
     * @returns {Object} {x, y} coordinates
     */
    function getMousePosition(canvasElement, event) {
        const rect = canvasElement.getBoundingClientRect();
        const scaleX = canvasElement.width / rect.width;
        const scaleY = canvasElement.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }
    
    /**
     * Initialize the canvas manager
     * @param {string} canvasId - ID of the canvas element
     * @param {Object} stateManagerInstance - StateManager instance
     * @returns {Object} Canvas manager instance
     */
    function init(canvasId, stateManagerInstance) {
        if (!stateManagerInstance) {
            throw new Error('CanvasManager: StateManager instance required');
        }
        
        stateManager = stateManagerInstance;
        
        // Get canvas element
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`CanvasManager: Canvas element with ID "${canvasId}" not found`);
        }
        
        // Get 2D context
        context = canvas.getContext('2d');
        if (!context) {
            throw new Error('CanvasManager: Could not get 2D context');
        }
        
        console.log('CanvasManager: Initialized with StateManager');
        
        // Return public API
        return {
            initialize,
            drawLine,
            clearCanvas,
            handleResize,
            setOnDrawCallback,
            setOnDrawStartCallback,
            setOnDrawEndCallback,
            getCanvas,
            getContext
        };
    }
    
    /**
     * Set up canvas and event listeners
     */
    function initialize() {
        console.log('CanvasManager: Setting up canvas...');
        
        // Set initial canvas size
        handleResize();
        
        // Configure drawing context
        context.lineCap = 'round';
        context.lineJoin = 'round';
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('CanvasManager: Canvas setup complete');
    }
    
    /**
     * Set up mouse event listeners
     */
    function setupEventListeners() {
        if (!canvas) return;
        
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseout', handleMouseUp);
        
        // Touch support for mobile
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        console.log('CanvasManager: Event listeners attached');
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     */
    function handleMouseDown(event) {
        if (!stateManager) return;
        
        event.preventDefault();
        const pos = getMousePosition(canvas, event);
        
        // Update state
        stateManager.updateState({
            isDrawing: true,
            lastX: pos.x,
            lastY: pos.y
        });
        
        // Callback
        if (callbacks.onDrawStart) {
            callbacks.onDrawStart(pos);
        }
        
        console.log('CanvasManager: Drawing started at', pos);
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - Mouse event
     */
    function handleMouseMove(event) {
        if (!stateManager || !stateManager.getProperty('isDrawing')) return;
        
        event.preventDefault();
        const pos = getMousePosition(canvas, event);
        const currentColor = stateManager.getProperty('currentColor') || '#000000';
        const brushSize = stateManager.getProperty('brushSize') || 4;
        
        // Create line data
        const lineData = {
            x0: stateManager.getProperty('lastX'),
            y0: stateManager.getProperty('lastY'),
            x1: pos.x,
            y1: pos.y,
            color: currentColor,
            brushSize: brushSize
        };
        
        // Draw locally
        drawLine(lineData);
        
        // Update state with new position
        stateManager.updateState({
            lastX: pos.x,
            lastY: pos.y
        });
        
        // Increment counter
        stateManager.incrementLinesDrawn();
        
        // Notify via callback
        if (callbacks.onDraw) {
            callbacks.onDraw(lineData);
        }
    }
    
    /**
     * Handle mouse up event
     */
    function handleMouseUp() {
        if (!stateManager) return;
        
        // Update state
        stateManager.updateState({ isDrawing: false });
        
        // Callback
        if (callbacks.onDrawEnd) {
            callbacks.onDrawEnd();
        }
        
        console.log('CanvasManager: Drawing ended');
    }
    
    /**
     * Handle touch start event (for mobile)
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchStart(event) {
        if (!stateManager) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        
        canvas.dispatchEvent(mouseEvent);
    }
    
    /**
     * Handle touch move event (for mobile)
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchMove(event) {
        if (!stateManager) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        
        canvas.dispatchEvent(mouseEvent);
    }
    
    /**
     * Handle touch end event (for mobile)
     */
    function handleTouchEnd() {
        if (!stateManager) return;
        
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    }
    
    /**
     * Draw a line on the canvas
     * @param {Object} lineData - Line data {x0, y0, x1, y1, color, brushSize}
     */
    function drawLine(lineData) {
        if (!context || !lineData) return;
        
        const { x0, y0, x1, y1, color, brushSize = 4 } = lineData;
        
        // Save context state
        context.save();
        
        // Configure line
        context.strokeStyle = color || '#000000';
        context.lineWidth = brushSize;
        
        // Draw the line
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.stroke();
        
        // Restore context
        context.restore();
        
        // Add to history if state manager exists
        if (stateManager) {
            stateManager.addToHistory(lineData);
        }
    }
    
    /**
     * Clear the entire canvas
     */
    function clearCanvas() {
        if (!context || !canvas) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        console.log('CanvasManager: Canvas cleared');
    }
    
    /**
     * Handle canvas resize
     */
    function handleResize() {
        if (!canvas) return;
        
        // Store current canvas content
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempContext.drawImage(canvas, 0, 0);
        
        // Get container dimensions
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Update canvas dimensions
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // Restore content
        context.drawImage(tempCanvas, 0, 0);
        
        console.log(`CanvasManager: Resized to ${canvas.width}x${canvas.height}`);
    }
    
    /**
     * Set callback for draw events
     * @param {Function} callback - Callback function
     */
    function setOnDrawCallback(callback) {
        callbacks.onDraw = callback;
    }
    
    /**
     * Set callback for draw start events
     * @param {Function} callback - Callback function
     */
    function setOnDrawStartCallback(callback) {
        callbacks.onDrawStart = callback;
    }
    
    /**
     * Set callback for draw end events
     * @param {Function} callback - Callback function
     */
    function setOnDrawEndCallback(callback) {
        callbacks.onDrawEnd = callback;
    }
    
    /**
     * Get canvas element
     * @returns {HTMLCanvasElement} Canvas element
     */
    function getCanvas() {
        return canvas;
    }
    
    /**
     * Get drawing context
     * @returns {CanvasRenderingContext2D} Drawing context
     */
    function getContext() {
        return context;
    }
    
    // Public API
    return {
        init: init,
        // Expose for testing
        getMousePosition: getMousePosition
    };
})();

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasManager;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.CanvasManager = CanvasManager;
}

/**
 * StateManager Module Tests
 * =========================
 * 
 * Tests for the StateManager module interface and functionality.
 */

describe('StateManager Module', () => {
    let StateManager;
    let initialState;
    
    beforeEach(() => {
        jest.resetModules();
        
        // Load module to get DEFAULT_STATE
        StateManager = require('../../../public/modules/StateManager.js');
        
        // Use the actual DEFAULT_STATE from the module
        initialState = {
            ...StateManager.DEFAULT_STATE
        };
    });
    
    test('should be defined as a function', () => {
        expect(typeof StateManager).toBe('object');
        expect(typeof StateManager.init).toBe('function');
    });
    
    test('should initialize with initial state and return instance', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(stateManager).toBeDefined();
        expect(typeof stateManager).toBe('object');
    });
    
    test('should provide getState method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.getState).toBe('function');
    });
    
    test('should provide updateState method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.updateState).toBe('function');
    });
    
    test('should provide setProperty method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.setProperty).toBe('function');
    });
    
    test('should provide getProperty method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.getProperty).toBe('function');
    });
    
    test('should provide resetState method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.resetState).toBe('function');
    });
    
    test('should provide addToHistory method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.addToHistory).toBe('function');
    });
    
    test('should provide clearHistory method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.clearHistory).toBe('function');
    });
    
    test('should provide logError method', () => {
        const stateManager = StateManager.init(initialState);
        
        expect(typeof stateManager.logError).toBe('function');
    });
    
    describe('getState method', () => {
        test('should return current state', () => {
            const stateManager = StateManager.init(initialState);
            const state = stateManager.getState();
            
            expect(state).toEqual(initialState);
        });
        
        test('should return a copy, not the original', () => {
            const stateManager = StateManager.init(initialState);
            const state = stateManager.getState();
            
            // Modify the returned state
            state.isDrawing = true;
            
            // Original state should not be affected
            const newState = stateManager.getState();
            expect(newState.isDrawing).toBe(false);
        });
    });
    
    describe('updateState method', () => {
        test('should update multiple state properties', () => {
            const stateManager = StateManager.init(initialState);
            
            stateManager.updateState({
                isDrawing: true,
                currentColor: '#FF0000',
                brushSize: 8
            });
            
            const state = stateManager.getState();
            expect(state.isDrawing).toBe(true);
            expect(state.currentColor).toBe('#FF0000');
            expect(state.brushSize).toBe(8);
        });
        
        test('should not affect unspecified properties', () => {
            const stateManager = StateManager.init(initialState);
            
            stateManager.updateState({
                currentColor: '#FF0000'
            });
            
            const state = stateManager.getState();
            expect(state.currentColor).toBe('#FF0000');
            expect(state.brushSize).toBe(4); // Should remain unchanged
            expect(state.isDrawing).toBe(false); // Should remain unchanged
        });
    });
    
    describe('setProperty and getProperty methods', () => {
        test('should set and get individual properties', () => {
            const stateManager = StateManager.init(initialState);
            
            stateManager.setProperty('currentColor', '#00FF00');
            const color = stateManager.getProperty('currentColor');
            
            expect(color).toBe('#00FF00');
        });
        
        test('should handle nested properties', () => {
            const stateManager = StateManager.init(initialState);
            
            // Test with nested path (if supported)
            stateManager.setProperty('lastX', 100);
            stateManager.setProperty('lastY', 200);
            
            expect(stateManager.getProperty('lastX')).toBe(100);
            expect(stateManager.getProperty('lastY')).toBe(200);
        });
        
        test('should return undefined for non-existent properties', () => {
            const stateManager = StateManager.init(initialState);
            
            const value = stateManager.getProperty('nonExistent');
            
            expect(value).toBeUndefined();
        });
    });
    
    describe('addToHistory and clearHistory methods', () => {
        test('should add items to localHistory', () => {
            const stateManager = StateManager.init(initialState);
            
            const lineData = { x0: 10, y0: 10, x1: 50, y1: 50, color: '#FF0000', brushSize: 4 };
            stateManager.addToHistory(lineData);
            
            const state = stateManager.getState();
            expect(state.localHistory).toHaveLength(1);
            expect(state.localHistory[0]).toEqual(lineData);
        });
        
        test('should clear localHistory', () => {
            const stateManager = StateManager.init(initialState);
            
            // Add some history
            stateManager.addToHistory({ x0: 10, y0: 10, x1: 50, y1: 50 });
            stateManager.addToHistory({ x0: 50, y0: 50, x1: 100, y1: 100 });
            
            // Clear it
            stateManager.clearHistory();
            
            const state = stateManager.getState();
            expect(state.localHistory).toHaveLength(0);
        });
    });
    
    describe('logError method', () => {
        test('should add errors to errorLog', () => {
            const stateManager = StateManager.init(initialState);
            
            stateManager.logError('connection', 'Failed to connect');
            
            const state = stateManager.getState();
            expect(state.errorLog).toHaveLength(1);
            expect(state.errorLog[0].type).toBe('connection');
            expect(state.errorLog[0].message).toBe('Failed to connect');
        });
        
        test('should limit errorLog size', () => {
            const stateManager = StateManager.init(initialState);
            
            // Add more errors than the limit (default 50)
            for (let i = 0; i < 60; i++) {
                stateManager.logError('test', `Error ${i}`);
            }
            
            const state = stateManager.getState();
            expect(state.errorLog).toHaveLength(50); // Should be limited to 50
            expect(state.errorLog[0].message).toBe('Error 10'); // First 10 should be removed
        });
    });
    
    describe('resetState method', () => {
        test('should reset state to default values', () => {
            const stateManager = StateManager.init(initialState);
            
            // Modify state
            stateManager.updateState({
                isDrawing: true,
                currentColor: '#FF0000',
                linesDrawn: 42
            });
            
            // Add some history and errors
            stateManager.addToHistory({ x0: 10, y0: 10, x1: 50, y1: 50 });
            stateManager.logError('test', 'Test error');
            
            // Reset
            stateManager.resetState();
            
            const state = stateManager.getState();
            expect(state.isDrawing).toBe(false);
            expect(state.currentColor).toBe('#000000');
            expect(state.linesDrawn).toBe(0);
            expect(state.localHistory).toHaveLength(0);
            expect(state.errorLog).toHaveLength(0);
        });
        
        test('should merge custom values with defaults on reset', () => {
            const stateManager = StateManager.init(initialState);
            
            // Modify state
            stateManager.updateState({
                isDrawing: true,
                currentColor: '#FF0000',
                brushSize: 8
            });
            
            // Reset with custom values - these should override defaults
            stateManager.resetState({
                currentColor: '#00FF00',
                brushSize: 2
            });
            
            const state = stateManager.getState();
            expect(state.currentColor).toBe('#00FF00');
            expect(state.brushSize).toBe(2);
            expect(state.isDrawing).toBe(false); // Should be reset to default
        });
    });
});

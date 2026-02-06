// tests/unit/modules/SocketManager.test.js - NEW VERSION
const SocketManager = require('../../../public/modules/SocketManager');

describe('SocketManager Module', () => {
    let mockStateManager;
    let mockSocket;
    
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Create mock StateManager
        mockStateManager = {
            updateState: jest.fn(),
            getProperty: jest.fn((key) => {
                if (key === 'isConnected') return false;
                if (key === 'socketId') return null;
                if (key === 'onlineUsers') return 0;
                return null;
            }),
            logError: jest.fn(),
            getOfflineBuffer: jest.fn(() => []),
            clearOfflineBuffer: jest.fn(),
            addToOfflineBuffer: jest.fn(),
            incrementLinesDrawn: jest.fn(),
            clearHistory: jest.fn(),
            resetLinesDrawn: jest.fn()
        };
        
        // Create mock socket
        mockSocket = {
            on: jest.fn(),
            emit: jest.fn(),
            id: 'test-socket-123',
            connected: false,
            disconnect: jest.fn(),
            connect: jest.fn()
        };
        
        // Mock global.io
        global.io = jest.fn(() => mockSocket);
    });
    
    afterEach(() => {
        delete global.io;
    });
    
    test('should initialize with StateManager', () => {
        const socketManager = SocketManager.init(mockStateManager);
        
        expect(socketManager).toBeDefined();
        expect(typeof socketManager.initialize).toBe('function');
        expect(typeof socketManager.emitDraw).toBe('function');
        expect(typeof socketManager.emitClearCanvas).toBe('function');
    });
    
    test('should throw error without StateManager', () => {
        expect(() => {
            SocketManager.init();
        }).toThrow('StateManager instance required');
    });
    
    test('initialize should set up socket connection', () => {
        const socketManager = SocketManager.init(mockStateManager);
        
        socketManager.initialize();
        
        // Should have created socket
        expect(global.io).toHaveBeenCalled();
    });
    
    test('emitDraw should work when connected', () => {
        const socketManager = SocketManager.init(mockStateManager);
        socketManager.initialize();
        
        // Mock connected state
        mockSocket.connected = true;
        mockStateManager.getProperty.mockReturnValue(true);
        
        const lineData = { x0: 10, y0: 10, x1: 50, y1: 50, color: '#FF0000', brushSize: 4 };
        socketManager.emitDraw(lineData);
        
        // Should emit via socket
        expect(mockSocket.emit).toHaveBeenCalledWith('draw', lineData);
    });
    
    test('emitDraw should buffer when not connected', () => {
        const socketManager = SocketManager.init(mockStateManager);
        socketManager.initialize();
        
        // Mock disconnected state
        mockSocket.connected = false;
        mockStateManager.getProperty.mockReturnValue(false);
        
        const lineData = { x0: 10, y0: 10, x1: 50, y1: 50, color: '#FF0000', brushSize: 4 };
        socketManager.emitDraw(lineData);
        
        // Should buffer instead of emitting
        expect(mockSocket.emit).not.toHaveBeenCalled();
        expect(mockStateManager.addToOfflineBuffer).toHaveBeenCalledWith(lineData);
    });
    
    test('emitClearCanvas should work', () => {
        const socketManager = SocketManager.init(mockStateManager);
        socketManager.initialize();
        
        // Mock connected state
        mockSocket.connected = true;
        mockStateManager.getProperty.mockReturnValue(true);
        
        socketManager.emitClearCanvas();
        
        // Should emit clear-canvas event
        expect(mockSocket.emit).toHaveBeenCalledWith('clear-canvas');
    });
});

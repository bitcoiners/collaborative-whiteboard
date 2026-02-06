// tests/unit/modules/UIManager.test.js
const UIManager = require('../../../public/modules/UIManager');

describe('UIManager Module', () => {
    let mockStateManager;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockStateManager = {
            getState: jest.fn(() => ({})),
            updateState: jest.fn(),
            getProperty: jest.fn(() => null)
        };
    });
    
    test('should initialize with StateManager', () => {
        const uiManager = UIManager.init(mockStateManager);
        expect(uiManager).toBeDefined();
    });
    
    test('should throw error without StateManager', () => {
        expect(() => {
            UIManager.init();
        }).toThrow('StateManager instance required');
    });
});

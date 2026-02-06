// tests/unit/modules/CanvasManager.test.js
const CanvasManager = require('../../../public/modules/CanvasManager');

describe('CanvasManager Module', () => {
    test('should be defined as a function', () => {
        expect(typeof CanvasManager.init).toBe('function');
    });
});

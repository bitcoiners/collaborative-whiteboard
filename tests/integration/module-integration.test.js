// tests/integration/module-integration.test.js
const fs = require('fs');
const path = require('path');

describe('Modular Architecture Integration', () => {
    const baseDir = path.join(__dirname, '../..');
    const modulesDir = path.join(baseDir, 'public/modules');
    const srcDir = path.join(baseDir, 'src');
    
    describe('File Structure', () => {
        test('all module files exist', () => {
            const expectedModules = [
                'StateManager.js',
                'CanvasManager.js',
                'SocketManager.js',
                'UIManager.js'
            ];
            
            expectedModules.forEach(moduleName => {
                const modulePath = path.join(modulesDir, moduleName);
                expect(fs.existsSync(modulePath)).toBe(true);
            });
        });
        
        test('app.js exists and orchestrates modules', () => {
            const appPath = path.join(baseDir, 'public/app.js');
            expect(fs.existsSync(appPath)).toBe(true);
            
            const appCode = fs.readFileSync(appPath, 'utf8');
            
            // Verify app.js has the main class
            expect(appCode).toContain('class CollaborativeWhiteboard');
            expect(appCode).toContain('initializeModules');
            expect(appCode).toContain('setupModuleCommunication');
            
            // Verify it references all modules
            expect(appCode).toContain('StateManager');
            expect(appCode).toContain('CanvasManager');
            expect(appCode).toContain('SocketManager');
            expect(appCode).toContain('UIManager');
        });
        
        test('server.js exists in src directory with Socket.IO setup', () => {
            const serverPath = path.join(srcDir, 'server.js');
            expect(fs.existsSync(serverPath)).toBe(true);
            
            const serverCode = fs.readFileSync(serverPath, 'utf8');
            
            // Check for Socket.IO setup
            expect(serverCode).toContain('const io = new Server(server');
            expect(serverCode).toContain("io.on('connection'");
            expect(serverCode).toContain("socket.on('draw'");
            expect(serverCode).toContain("socket.on('clear-canvas'");
        });
        
        test('HTML file exists and references all modules', () => {
            const htmlPath = path.join(baseDir, 'public/index.html');
            expect(fs.existsSync(htmlPath)).toBe(true);
            
            const htmlCode = fs.readFileSync(htmlPath, 'utf8');
            
            // Check for module script tags
            expect(htmlCode).toContain('StateManager.js');
            expect(htmlCode).toContain('CanvasManager.js');
            expect(htmlCode).toContain('SocketManager.js');
            expect(htmlCode).toContain('UIManager.js');
            expect(htmlCode).toContain('app.js');
        });
    });
    
    describe('Module API Structure', () => {
        test('StateManager module exports expected API', () => {
            const stateManagerPath = path.join(modulesDir, 'StateManager.js');
            const stateManagerCode = fs.readFileSync(stateManagerPath, 'utf8');
            
            // Check for public API methods
            const expectedMethods = [
                'getState(',
                'updateState(',
                'getProperty(',
                'addToHistory(',
                'resetState(',
                'clearHistory(',
                'logError('
            ];
            
            expectedMethods.forEach(method => {
                expect(stateManagerCode).toContain(method);
            });
        });
        
        test('CanvasManager module exports expected API', () => {
            const canvasManagerPath = path.join(modulesDir, 'CanvasManager.js');
            const canvasManagerCode = fs.readFileSync(canvasManagerPath, 'utf8');
            
            const expectedMethods = [
                'drawLine(',
                'clearCanvas(',
                'handleResize(',
                'setOnDrawCallback(',
                'setOnDrawStartCallback(',
                'setOnDrawEndCallback('
            ];
            
            expectedMethods.forEach(method => {
                expect(canvasManagerCode).toContain(method);
            });
        });
        
        test('SocketManager module exports expected API', () => {
            const socketManagerPath = path.join(modulesDir, 'SocketManager.js');
            const socketManagerCode = fs.readFileSync(socketManagerPath, 'utf8');
            
            const expectedMethods = [
                'emitDraw(',
                'emitClearCanvas(',
                'setOnDrawCallback(',
                'setOnClearCallback(',
                'setOnConnectionChange(',
                'initialize('
            ];
            
            expectedMethods.forEach(method => {
                expect(socketManagerCode).toContain(method);
            });
        });
        
        test('UIManager module exports expected API', () => {
            const uiManagerPath = path.join(modulesDir, 'UIManager.js');
            const uiManagerCode = fs.readFileSync(uiManagerPath, 'utf8');
            
            const expectedMethods = [
                'updateConnectionStatus(',
                'updateUserCount(',
                'setOnClearCallback(',
                'setOnColorChangeCallback(',
                'setOnUndoCallback(',
                'initialize('
            ];
            
            expectedMethods.forEach(method => {
                expect(uiManagerCode).toContain(method);
            });
        });
    });
    
    describe('Application Architecture', () => {
        test('app.js implements proper module wiring', () => {
            const appPath = path.join(baseDir, 'public/app.js');
            const appCode = fs.readFileSync(appPath, 'utf8');
            
            // Check for module initialization
            expect(appCode).toContain('this.modules.state = window.StateManager.init()');
            expect(appCode).toContain('this.modules.ui = window.UIManager.init(this.modules.state)');
            expect(appCode).toContain('this.modules.socket = window.SocketManager.init(this.modules.state)');
            expect(appCode).toContain('this.modules.canvas = window.CanvasManager.init(\'whiteboard\', this.modules.state)');
            
            // Check for callback setup
            expect(appCode).toContain('setOnDrawCallback');
            expect(appCode).toContain('setOnClearCallback');
            expect(appCode).toContain('setOnColorChangeCallback');
            expect(appCode).toContain('setOnConnectionChange');
        });
        
        test('package.json has correct configuration', () => {
            const packagePath = path.join(baseDir, 'package.json');
            expect(fs.existsSync(packagePath)).toBe(true);
            
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Check scripts exist
            expect(packageData.scripts).toBeDefined();
            expect(packageData.scripts.start).toBeDefined();
            expect(packageData.scripts.dev).toBeDefined();
            expect(packageData.scripts.test).toBeDefined();
            
            // Check dependencies exist (not using toHaveProperty due to dot in socket.io)
            expect(packageData.dependencies).toBeDefined();
            expect(packageData.dependencies.express).toBeDefined();
            expect(packageData.dependencies['socket.io']).toBeDefined();
            
            // Check main entry point
            expect(packageData.main).toBe('src/server.js');
        });
    });
});

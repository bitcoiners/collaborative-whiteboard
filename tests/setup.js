// tests/setup.js
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
};

// Create document mock with proper Jest mock
global.document = {
    getElementById: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({})),
    body: { appendChild: jest.fn() }
};

// Mock window
global.window = {
    setTimeout: jest.fn(),
    clearTimeout: jest.fn(),
    setInterval: jest.fn(),
    clearInterval: jest.fn(),
    alert: jest.fn(),
    confirm: jest.fn(() => true)
};

// Tests for enhanced error handling and reconnection logic

describe('Error Handling & Reconnection Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('reconnection logic', () => {
    test('should attempt reconnection after disconnect', () => {
      const createReconnectionManager = () => {
        let isConnected = false;
        let reconnectAttempts = 0;
        const maxAttempts = 5;
        const baseDelay = 1000;
        
        return {
          attemptReconnect: () => {
            if (reconnectAttempts < maxAttempts) {
              reconnectAttempts++;
              const delay = baseDelay * Math.min(reconnectAttempts, 3); // Exponential backoff capped at 3x
              return {
                shouldRetry: true,
                delay,
                attempt: reconnectAttempts
              };
            }
            return { shouldRetry: false, attempt: reconnectAttempts };
          },
          reset: () => {
            reconnectAttempts = 0;
          },
          getState: () => ({ isConnected, reconnectAttempts, maxAttempts })
        };
      };
      
      const manager = createReconnectionManager();
      
      // First attempt
      const result1 = manager.attemptReconnect();
      expect(result1.shouldRetry).toBe(true);
      expect(result1.delay).toBe(1000);
      expect(result1.attempt).toBe(1);
      
      // Second attempt
      const result2 = manager.attemptReconnect();
      expect(result2.shouldRetry).toBe(true);
      expect(result2.delay).toBe(2000); // 2x backoff
      expect(result2.attempt).toBe(2);
      
      // Third attempt
      const result3 = manager.attemptReconnect();
      expect(result3.shouldRetry).toBe(true);
      expect(result3.delay).toBe(3000); // 3x backoff (capped)
      expect(result3.attempt).toBe(3);
    });
    
    test('should stop reconnection attempts after max retries', () => {
      const createReconnectionManager = () => {
        let reconnectAttempts = 0;
        const maxAttempts = 3;
        
        return {
          attemptReconnect: () => {
            if (reconnectAttempts < maxAttempts) {
              reconnectAttempts++;
              return { shouldRetry: true, attempt: reconnectAttempts };
            }
            return { shouldRetry: false, attempt: reconnectAttempts };
          },
          getState: () => ({ reconnectAttempts, maxAttempts })
        };
      };
      
      const manager = createReconnectionManager();
      
      // First 3 attempts should succeed
      expect(manager.attemptReconnect().shouldRetry).toBe(true);
      expect(manager.attemptReconnect().shouldRetry).toBe(true);
      expect(manager.attemptReconnect().shouldRetry).toBe(true);
      
      // Fourth attempt should fail (max attempts reached)
      const result = manager.attemptReconnect();
      expect(result.shouldRetry).toBe(false);
      expect(result.attempt).toBe(3);
      expect(manager.getState().reconnectAttempts).toBe(3);
    });
  });
  
  describe('error state management', () => {
    test('should track different error types', () => {
      const errorTypes = {
        CONNECTION_LOST: 'connection_lost',
        NETWORK_ERROR: 'network_error',
        SERVER_ERROR: 'server_error',
        TIMEOUT: 'timeout'
      };
      
      const createErrorTracker = () => {
        const errors = [];
        
        return {
          logError: (type, message, timestamp = Date.now()) => {
            errors.push({ type, message, timestamp, count: 1 });
          },
          getErrors: () => errors,
          getErrorCount: (type) => 
            errors.filter(e => e.type === type).length,
          clearErrors: () => errors.length = 0
        };
      };
      
      const tracker = createErrorTracker();
      
      tracker.logError(errorTypes.CONNECTION_LOST, 'Lost connection to server');
      tracker.logError(errorTypes.NETWORK_ERROR, 'Network request failed');
      tracker.logError(errorTypes.CONNECTION_LOST, 'Connection lost again');
      
      expect(tracker.getErrors()).toHaveLength(3);
      expect(tracker.getErrorCount(errorTypes.CONNECTION_LOST)).toBe(2);
      expect(tracker.getErrorCount(errorTypes.NETWORK_ERROR)).toBe(1);
      expect(tracker.getErrorCount(errorTypes.SERVER_ERROR)).toBe(0);
    });
    
    test('should determine recovery action based on error type', () => {
      const determineRecoveryAction = (errorType, errorCount) => {
        const strategies = {
          connection_lost: {
            1: { action: 'reconnect_immediately', delay: 0 },
            2: { action: 'reconnect_with_delay', delay: 1000 },
            3: { action: 'reconnect_with_backoff', delay: 3000 },
            default: { action: 'wait_for_user', delay: 0 }
          },
          network_error: {
            1: { action: 'retry_request', delay: 500 },
            2: { action: 'switch_transport', delay: 0 },
            default: { action: 'show_error', delay: 0 }
          },
          server_error: {
            default: { action: 'notify_admin', delay: 0 }
          }
        };
        
        const strategy = strategies[errorType];
        if (!strategy) return { action: 'unknown', delay: 0 };
        
        return strategy[errorCount] || strategy.default;
      };
      
      // Test connection_lost errors
      expect(determineRecoveryAction('connection_lost', 1))
        .toEqual({ action: 'reconnect_immediately', delay: 0 });
      expect(determineRecoveryAction('connection_lost', 3))
        .toEqual({ action: 'reconnect_with_backoff', delay: 3000 });
      
      // Test network_error errors  
      expect(determineRecoveryAction('network_error', 1))
        .toEqual({ action: 'retry_request', delay: 500 });
      expect(determineRecoveryAction('network_error', 3))
        .toEqual({ action: 'show_error', delay: 0 });
      
      // Test unknown error type
      expect(determineRecoveryAction('unknown_error', 1))
        .toEqual({ action: 'unknown', delay: 0 });
    });
  });
  
  describe('connection state persistence', () => {
    test('should save and restore drawing state during reconnection', () => {
      const createStateManager = () => {
        let localState = {
          lines: [],
          lastSaveTime: 0
        };
        
        return {
          saveState: (lines) => {
            localState.lines = [...lines];
            localState.lastSaveTime = Date.now();
            return { saved: true, count: lines.length };
          },
          restoreState: () => ({
            lines: [...localState.lines],
            lastSaveTime: localState.lastSaveTime
          }),
          clearState: () => {
            localState.lines = [];
            localState.lastSaveTime = 0;
          },
          getState: () => ({ ...localState })
        };
      };
      
      const manager = createStateManager();
      const testLines = [
        { x0: 0, y0: 0, x1: 10, y1: 10, color: '#000000', brushSize: 4 },
        { x0: 10, y0: 10, x1: 20, y1: 20, color: '#FF0000', brushSize: 4 }
      ];
      
      // Save state
      const saveResult = manager.saveState(testLines);
      expect(saveResult.saved).toBe(true);
      expect(saveResult.count).toBe(2);
      
      // Restore state
      const restored = manager.restoreState();
      expect(restored.lines).toHaveLength(2);
      expect(restored.lines[0]).toEqual(testLines[0]);
      expect(restored.lines[1]).toEqual(testLines[1]);
      
      // Clear state
      manager.clearState();
      expect(manager.getState().lines).toHaveLength(0);
    });
    
    test('should detect stale state', () => {
      const isStateStale = (saveTime, currentTime, staleThreshold = 30000) => {
        return currentTime - saveTime > staleThreshold;
      };
      
      const now = Date.now();
      const freshTime = now - 10000; // 10 seconds ago
      const staleTime = now - 40000; // 40 seconds ago
      
      expect(isStateStale(freshTime, now, 30000)).toBe(false);
      expect(isStateStale(staleTime, now, 30000)).toBe(true);
      expect(isStateStale(staleTime, now, 60000)).toBe(false); // Longer threshold
    });
  });
});

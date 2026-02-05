// Tests for throttle/debounce performance optimization

describe('Performance Optimization - Throttle/Debounce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('throttle function', () => {
    // Simple throttle implementation for testing
    const createThrottle = () => {
      let lastCall = 0;
      return (fn, delay) => {
        return function(...args) {
          const now = Date.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            return fn.apply(this, args);
          }
        };
      };
    };
    
    test('should call function immediately on first call', () => {
      const mockFn = jest.fn();
      const throttle = createThrottle();
      const throttledFn = throttle(mockFn, 50);
      
      throttledFn('test');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test');
    });
    
    test('should throttle subsequent calls within delay period', () => {
      const mockFn = jest.fn();
      const throttle = createThrottle();
      const throttledFn = throttle(mockFn, 50);
      
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);
      
      try {
        // First call - should execute
        throttledFn('first');
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('first');
        
        // Second call immediately after - should be throttled
        throttledFn('second');
        expect(mockFn).toHaveBeenCalledTimes(1); // Still 1
        
        // Advance time past delay
        mockTime = 1060; // 60ms later
        throttledFn('third');
        expect(mockFn).toHaveBeenCalledTimes(2); // Now 2
        expect(mockFn).toHaveBeenLastCalledWith('third');
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
  
  describe('draw event batching', () => {
    test('should batch multiple draw points into fewer network events', () => {
      // Simulate batching logic
      const batchDrawPoints = (points, maxBatchSize = 10) => {
        const batches = [];
        for (let i = 0; i < points.length; i += maxBatchSize) {
          batches.push(points.slice(i, i + maxBatchSize));
        }
        return batches;
      };
      
      const testPoints = Array.from({length: 25}, (_, i) => ({
        x: i * 10,
        y: i * 10,
        color: '#000000',
        brushSize: 4
      }));
      
      const batches = batchDrawPoints(testPoints, 10);
      
      expect(batches).toHaveLength(3); // 25 points in batches of 10 = 3 batches
      expect(batches[0]).toHaveLength(10);
      expect(batches[1]).toHaveLength(10);
      expect(batches[2]).toHaveLength(5);
      
      // Verify data integrity
      expect(batches[0][0].x).toBe(0);
      expect(batches[0][9].x).toBe(90);
      expect(batches[2][0].x).toBe(200);
    });
    
    test('should maintain drawing order in batches', () => {
      const interpolatePoints = (start, end, steps) => {
        const points = [];
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          points.push({
            x: start.x + (end.x - start.x) * ratio,
            y: start.y + (end.y - start.y) * ratio,
            color: start.color,
            brushSize: start.brushSize
          });
        }
        return points;
      };
      
      const startPoint = { x: 0, y: 0, color: '#FF0000', brushSize: 4 };
      const endPoint = { x: 100, y: 100, color: '#FF0000', brushSize: 4 };
      
      const interpolated = interpolatePoints(startPoint, endPoint, 5);
      
      expect(interpolated).toHaveLength(6);
      expect(interpolated[0]).toEqual({ x: 0, y: 0, color: '#FF0000', brushSize: 4 });
      expect(interpolated[3]).toEqual({ x: 60, y: 60, color: '#FF0000', brushSize: 4 });
      expect(interpolated[5]).toEqual({ x: 100, y: 100, color: '#FF0000', brushSize: 4 });
    });
  });
  
  describe('performance metrics', () => {
    test('should calculate appropriate throttle delay for smooth drawing', () => {
      const calculateOptimalThrottle = (connectionType) => {
        const delays = {
          'local': 16,     // ~60fps for local network
          'wifi': 33,      // ~30fps for good wifi
          'mobile': 50,    // ~20fps for mobile data
          'slow': 100      // ~10fps for slow connections
        };
        return delays[connectionType] || 50;
      };
      
      expect(calculateOptimalThrottle('local')).toBe(16);
      expect(calculateOptimalThrottle('wifi')).toBe(33);
      expect(calculateOptimalThrottle('mobile')).toBe(50);
      expect(calculateOptimalThrottle('slow')).toBe(100);
      expect(calculateOptimalThrottle('unknown')).toBe(50);
    });
    
    test('should measure drawing performance', () => {
      const measurePerformance = (drawEvents, timeWindow) => {
        const eventsPerSecond = drawEvents.length / (timeWindow / 1000);
        const bytesPerEvent = 100;
        const bandwidth = eventsPerSecond * bytesPerEvent;
        
        return {
          eventsPerSecond,
          bandwidth: Math.round(bandwidth),
          recommendation: eventsPerSecond > 60 ? 'throttle more' : 'optimal'
        };
      };
      
      const metrics = measurePerformance(Array(120).fill({}), 1000);
      expect(metrics.eventsPerSecond).toBe(120);
      expect(metrics.recommendation).toBe('throttle more');
      
      const goodMetrics = measurePerformance(Array(30).fill({}), 1000);
      expect(goodMetrics.recommendation).toBe('optimal');
    });
  });
});

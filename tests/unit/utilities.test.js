/**
 * @jest-environment jsdom
 */

import { debounce } from '../../src/utils/debounce.js';
import { PerformanceMonitor } from '../../src/utils/performanceMonitor.js';

describe('Debounce Utility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should delay function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should reset delay on multiple calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    jest.advanceTimersByTime(50);
    debouncedFn(); // Should reset the timer

    jest.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should pass arguments correctly', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2', 123);
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  test('should preserve context', () => {
    const obj = {
      value: 42,
      method: jest.fn(function() {
        return this.value;
      })
    };

    const debouncedMethod = debounce(obj.method, 100);
    debouncedMethod.call(obj);
    jest.advanceTimersByTime(100);

    expect(obj.method).toHaveBeenCalled();
  });

  test('should handle immediate execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100, true); // immediate = true

    debouncedFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Subsequent calls should be debounced
    debouncedFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    debouncedFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('should provide cancel functionality', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn.cancel();
    jest.advanceTimersByTime(100);

    expect(mockFn).not.toHaveBeenCalled();
  });

  test('should provide flush functionality', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('test');
    debouncedFn.flush();

    expect(mockFn).toHaveBeenCalledWith('test');
  });
});

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    
    // Mock performance.now()
    let mockTime = 0;
    global.performance = global.performance || {};
    global.performance.now = jest.fn(() => mockTime);
    
    // Helper to advance mock time
    global.advanceTime = (ms) => {
      mockTime += ms;
    };
  });

  afterEach(() => {
    monitor.stop();
    monitor.clear();
  });

  describe('Basic Functionality', () => {
    test('should initialize with correct default values', () => {
      expect(monitor.isRunning).toBe(false);
      expect(monitor.metrics.size).toBe(0);
      expect(monitor.listeners.length).toBe(0);
    });

    test('should start monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    test('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning).toBe(false);
    });
  });

  describe('Performance Measurement', () => {
    test('should measure execution time', () => {
      const testFunction = () => {
        global.advanceTime(50);
        return 'result';
      };

      const result = monitor.measure('testOp', testFunction);
      
      expect(result).toBe('result');
      expect(monitor.metrics.has('testOp')).toBe(true);
      
      const metric = monitor.metrics.get('testOp');
      expect(metric.count).toBe(1);
      expect(metric.total).toBe(50);
      expect(metric.average).toBe(50);
    });

    test('should track multiple measurements', () => {
      const testFunction = () => {
        global.advanceTime(30);
      };

      monitor.measure('multiTest', testFunction);
      monitor.measure('multiTest', testFunction);
      monitor.measure('multiTest', testFunction);

      const metric = monitor.metrics.get('multiTest');
      expect(metric.count).toBe(3);
      expect(metric.total).toBe(90);
      expect(metric.average).toBe(30);
      expect(metric.min).toBe(30);
      expect(metric.max).toBe(30);
    });

    test('should handle async functions', async () => {
      const asyncFunction = async () => {
        global.advanceTime(100);
        return Promise.resolve('async result');
      };

      const result = await monitor.measureAsync('asyncOp', asyncFunction);
      
      expect(result).toBe('async result');
      expect(monitor.metrics.has('asyncOp')).toBe(true);
      expect(monitor.metrics.get('asyncOp').total).toBe(100);
    });

    test('should handle function errors gracefully', () => {
      const errorFunction = () => {
        global.advanceTime(25);
        throw new Error('Test error');
      };

      expect(() => monitor.measure('errorOp', errorFunction)).toThrow('Test error');
      
      // Should still record the measurement
      expect(monitor.metrics.has('errorOp')).toBe(true);
      expect(monitor.metrics.get('errorOp').total).toBe(25);
    });
  });

  describe('Manual Timing', () => {
    test('should support manual start/end timing', () => {
      monitor.startTiming('manualOp');
      global.advanceTime(75);
      monitor.endTiming('manualOp');

      const metric = monitor.metrics.get('manualOp');
      expect(metric.total).toBe(75);
      expect(metric.count).toBe(1);
    });

    test('should handle multiple concurrent manual timings', () => {
      monitor.startTiming('op1');
      global.advanceTime(25);
      monitor.startTiming('op2');
      global.advanceTime(25);
      monitor.endTiming('op1');
      global.advanceTime(25);
      monitor.endTiming('op2');

      expect(monitor.metrics.get('op1').total).toBe(50);
      expect(monitor.metrics.get('op2').total).toBe(50);
    });

    test('should warn about ending non-existent timing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      monitor.endTiming('nonexistent');
      
      expect(consoleSpy).toHaveBeenCalledWith('No active timing found for: nonexistent');
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      // Mock requestAnimationFrame
      global.requestAnimationFrame = jest.fn((callback) => {
        setTimeout(callback, 16); // ~60fps
        return 1;
      });
      
      // Mock additional performance APIs
      global.performance.memory = {
        usedJSHeapSize: 1024000,
        totalJSHeapSize: 2048000,
        jsHeapSizeLimit: 4096000
      };
    });

    test('should start performance monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    test('should collect frame rate data when monitoring', (done) => {
      monitor.start();
      
      setTimeout(() => {
        monitor.stop();
        const metrics = monitor.getMetrics();
        
        expect(metrics.frameRate).toBeDefined();
        expect(typeof metrics.frameRate.current).toBe('number');
        done();
      }, 100);
    });

    test('should collect memory usage data', () => {
      monitor.start();
      const metrics = monitor.getMetrics();
      
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.used).toBe(1024000);
      expect(metrics.memory.total).toBe(2048000);
    });
  });

  describe('Thresholds and Alerts', () => {
    test('should set and check thresholds', () => {
      monitor.setThreshold('slowOp', 100);
      
      const slowFunction = () => {
        global.advanceTime(150);
      };

      const listener = jest.fn();
      monitor.addListener(listener);
      
      monitor.measure('slowOp', slowFunction);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'threshold-exceeded',
          operation: 'slowOp',
          duration: 150,
          threshold: 100
        })
      );
    });

    test('should not alert when under threshold', () => {
      monitor.setThreshold('fastOp', 100);
      
      const fastFunction = () => {
        global.advanceTime(50);
      };

      const listener = jest.fn();
      monitor.addListener(listener);
      
      monitor.measure('fastOp', fastFunction);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Event Listeners', () => {
    test('should add and notify listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      monitor.addListener(listener1);
      monitor.addListener(listener2);
      
      const testEvent = { type: 'test', data: 'test data' };
      monitor.emit(testEvent);
      
      expect(listener1).toHaveBeenCalledWith(testEvent);
      expect(listener2).toHaveBeenCalledWith(testEvent);
    });

    test('should remove listeners', () => {
      const listener = jest.fn();
      
      monitor.addListener(listener);
      monitor.removeListener(listener);
      
      monitor.emit({ type: 'test' });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('should clear all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      monitor.addListener(listener1);
      monitor.addListener(listener2);
      monitor.clearListeners();
      
      monitor.emit({ type: 'test' });
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Data Management', () => {
    test('should get detailed metrics', () => {
      const testFunction = () => {
        global.advanceTime(40);
      };

      monitor.measure('detailTest', testFunction);
      monitor.measure('detailTest', testFunction);

      const metrics = monitor.getMetrics();
      const detailMetric = metrics.operations.detailTest;
      
      expect(detailMetric.count).toBe(2);
      expect(detailMetric.total).toBe(80);
      expect(detailMetric.average).toBe(40);
      expect(detailMetric.min).toBe(40);
      expect(detailMetric.max).toBe(40);
    });

    test('should get summary statistics', () => {
      const op1 = () => global.advanceTime(50);
      const op2 = () => global.advanceTime(100);

      monitor.measure('op1', op1);
      monitor.measure('op2', op2);

      const summary = monitor.getSummary();
      
      expect(summary.totalOperations).toBe(2);
      expect(summary.totalTime).toBe(150);
      expect(summary.averageTime).toBe(75);
      expect(summary.slowestOperation).toBe('op2');
    });

    test('should export data', () => {
      const testFunction = () => global.advanceTime(30);
      
      monitor.measure('exportTest', testFunction);
      
      const exported = monitor.exportData();
      
      expect(exported.timestamp).toBeDefined();
      expect(exported.operations.exportTest).toBeDefined();
      expect(exported.operations.exportTest.count).toBe(1);
    });

    test('should clear all data', () => {
      const testFunction = () => global.advanceTime(30);
      
      monitor.measure('clearTest', testFunction);
      expect(monitor.metrics.size).toBe(1);
      
      monitor.clear();
      expect(monitor.metrics.size).toBe(0);
    });
  });

  describe('Performance Profiling', () => {
    test('should create performance profile', () => {
      const operations = {
        'fast-op': () => global.advanceTime(10),
        'medium-op': () => global.advanceTime(50),
        'slow-op': () => global.advanceTime(200)
      };

      monitor.setThreshold('slow-op', 100);
      
      Object.entries(operations).forEach(([name, fn]) => {
        monitor.measure(name, fn);
      });

      const profile = monitor.createProfile();
      
      expect(profile.operations).toHaveLength(3);
      expect(profile.thresholdViolations).toHaveLength(1);
      expect(profile.recommendations).toBeDefined();
      expect(profile.recommendations.length).toBeGreaterThan(0);
    });

    test('should generate performance recommendations', () => {
      // Simulate various performance scenarios
      const slowOp = () => global.advanceTime(300);
      const frequentOp = () => global.advanceTime(5);

      // Slow operation
      monitor.measure('slow-operation', slowOp);
      
      // Frequent operation
      for (let i = 0; i < 100; i++) {
        monitor.measure('frequent-operation', frequentOp);
      }

      const recommendations = monitor.getRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('slow-operation'))).toBe(true);
    });
  });

  describe('Resource Usage Tracking', () => {
    test('should track memory usage over time', () => {
      monitor.start();
      
      // Simulate memory changes
      global.performance.memory.usedJSHeapSize = 2048000;
      
      setTimeout(() => {
        const metrics = monitor.getMetrics();
        expect(metrics.memory.used).toBe(2048000);
        monitor.stop();
      }, 50);
    });

    test('should calculate memory efficiency', () => {
      const efficiency = monitor.getMemoryEfficiency();
      
      expect(efficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing performance API gracefully', () => {
      const originalPerformance = global.performance;
      delete global.performance;

      const newMonitor = new PerformanceMonitor();
      expect(() => newMonitor.start()).not.toThrow();
      
      global.performance = originalPerformance;
    });

    test('should handle undefined memory API', () => {
      const originalMemory = global.performance.memory;
      delete global.performance.memory;

      const metrics = monitor.getMetrics();
      expect(metrics.memory).toBeNull();
      
      global.performance.memory = originalMemory;
    });

    test('should handle requestAnimationFrame fallback', () => {
      const originalRAF = global.requestAnimationFrame;
      delete global.requestAnimationFrame;

      expect(() => monitor.start()).not.toThrow();
      
      global.requestAnimationFrame = originalRAF;
    });
  });

  describe('Performance Benchmarking', () => {
    test('should run benchmarks', async () => {
      const testFunction = () => {
        global.advanceTime(Math.random() * 10 + 5); // 5-15ms
      };

      const results = await monitor.benchmark('benchmark-test', testFunction, {
        iterations: 10,
        warmupIterations: 2
      });

      expect(results.iterations).toBe(10);
      expect(results.average).toBeGreaterThan(0);
      expect(results.min).toBeGreaterThan(0);
      expect(results.max).toBeGreaterThan(0);
      expect(results.standardDeviation).toBeGreaterThanOrEqual(0);
    });

    test('should compare benchmark results', async () => {
      const fastFn = () => global.advanceTime(5);
      const slowFn = () => global.advanceTime(20);

      const fastResults = await monitor.benchmark('fast', fastFn, { iterations: 5 });
      const slowResults = await monitor.benchmark('slow', slowFn, { iterations: 5 });

      const comparison = monitor.compareBenchmarks('fast', 'slow');

      expect(comparison.faster).toBe('fast');
      expect(comparison.slower).toBe('slow');
      expect(comparison.speedupFactor).toBeGreaterThan(1);
    });
  });
});

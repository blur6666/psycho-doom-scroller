/**
 * PerformanceOptimizer Module Unit Tests
 * 
 * Tests the functionality of the PerformanceOptimizer module including:
 * - Initialization and configuration
 * - Shader compilation queue management
 * - FPS monitoring and adjustment
 * - Battery status optimization
 * - Inactivity detection
 * - Resource tracking
 */

import PerformanceOptimizer from '../../performance-optimizer.js';
import MockWebGLContext from '../mock-webgl-context.js';

describe('PerformanceOptimizer', () => {
  let mockWebGLCore;
  let mockShaderManager;
  let performanceOptimizer;
  let mockManifest;
  let originalPerformanceNow;
  let originalSetTimeout;
  let originalSetInterval;
  let mockBattery;
  
  // Setup mocks and PerformanceOptimizer instance before each test
  beforeEach(() => {
    // Create mock WebGL context
    const mockGL = new MockWebGLContext();
    
    // Create a mock WebGLCore
    mockWebGLCore = {
      getContext: jest.fn().mockReturnValue(mockGL)
    };
    
    // Create a mock ShaderManager with a sample manifest
    mockManifest = [
      { id: 'shader1', name: 'Shader 1' },
      { id: 'shader2', name: 'Shader 2' },
      { id: 'shader3', name: 'Shader 3' }
    ];
    
    mockShaderManager = {
      getManifest: jest.fn().mockReturnValue(mockManifest),
      getCurrentShaderIndex: jest.fn().mockReturnValue(0),
      loadShaderByIndex: jest.fn().mockResolvedValue({
        id: 'shader2',
        name: 'Shader 2',
        program: 'program_1'
      }),
      getCache: jest.fn().mockReturnValue({
        'shader1': 'source1',
        'shader2': 'source2'
      })
    };
    
    // Mock performance.now
    originalPerformanceNow = performance.now;
    performance.now = jest.fn().mockReturnValue(1000);
    
    // Mock setTimeout and setInterval
    originalSetTimeout = window.setTimeout;
    originalSetInterval = window.setInterval;
    window.setTimeout = jest.fn().mockImplementation((fn) => {
      // Immediately invoke the function for testing
      fn();
      return 123; // Return a fake timer ID
    });
    window.setInterval = jest.fn().mockImplementation((fn) => {
      // Return a fake timer ID without invoking
      return 456;
    });
    
    // Mock document.dispatchEvent to track emitted events
    document.dispatchEvent = jest.fn();
    
    // Mock Battery API
    mockBattery = {
      level: 0.8, // 80%
      charging: true,
      addEventListener: jest.fn()
    };
    
    navigator.getBattery = jest.fn().mockResolvedValue(mockBattery);
    
    // Mock document event listeners
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
    
    // Initialize PerformanceOptimizer with mock dependencies
    performanceOptimizer = new PerformanceOptimizer(mockWebGLCore, mockShaderManager, {
      preloadCount: 2,
      queueProcessDelay: 10, // Short delay for testing
      fpsHistoryLength: 10,
      fpsTarget: 60,
      inactivityThreshold: 100, // Short threshold for testing
      enableBatteryOptimization: true,
      lowBatteryThreshold: 0.3 // 30%
    });
  });
  
  afterEach(() => {
    // Clean up
    jest.resetAllMocks();
    
    // Restore original methods
    performance.now = originalPerformanceNow;
    window.setTimeout = originalSetTimeout;
    window.setInterval = originalSetInterval;
    
    // Clean up resources
    performanceOptimizer.destroy();
  });
  
  // Test initialization
  test('should initialize correctly', () => {
    expect(performanceOptimizer.init()).toBe(true);
    
    // Should set up performance monitoring
    expect(window.setInterval).toHaveBeenCalled();
    
    // Should attempt to set up battery monitoring
    expect(navigator.getBattery).toHaveBeenCalled();
    
    // Should set up event listeners
    expect(document.addEventListener).toHaveBeenCalled();
    
    // Should emit initialized event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-initialized'
      })
    );
  });
  
  // Test shader compilation queue
  test('should queue shaders for compilation correctly', () => {
    performanceOptimizer.queueShadersForCompilation(0, 2);
    
    // Should add next shaders to queue
    expect(performanceOptimizer.getQueueLength()).toBe(2);
    
    // Should call loadShaderByIndex during processing
    expect(mockShaderManager.loadShaderByIndex).toHaveBeenCalled();
  });
  
  // Test queue processing
  test('should process shader queue correctly', async () => {
    // Add items to queue
    performanceOptimizer.compilationQueue = [1, 2];
    performanceOptimizer.isProcessing = false;
    
    // Process queue
    await performanceOptimizer.processShaderQueue();
    
    // Should mark as processing while active
    expect(performanceOptimizer.isProcessing).toBe(false); // Should be done after our mocked setTimeout
    
    // Should attempt to load shaders
    expect(mockShaderManager.loadShaderByIndex).toHaveBeenCalledWith(1, true);
    
    // Should emit events
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-queue-processing-start'
      })
    );
    
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-queue-processing-end'
      })
    );
  });
  
  // Test shader preloading
  test('should preload shaders correctly', () => {
    // Call preload method
    performanceOptimizer.preloadShaders(2, true);
    
    // Should call queueShadersForCompilation
    expect(mockShaderManager.getCurrentShaderIndex).toHaveBeenCalled();
    expect(performanceOptimizer.getQueueLength()).toBeGreaterThan(0);
  });
  
  // Test FPS calculation
  test('should calculate FPS correctly', () => {
    // Mock elapsed time of 1 second with 60 frames
    performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    performanceOptimizer.frameCount = 60;
    performanceOptimizer.lastFpsUpdate = 1000;
    
    // Update FPS
    performanceOptimizer._updateFps();
    
    // Should calculate 60 FPS
    expect(performanceOptimizer.fpsHistory[0]).toBe(60);
    
    // Should emit fps-update event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-fps-update'
      })
    );
    
    // Should get current FPS
    expect(performanceOptimizer.getCurrentFps()).toBe(60);
  });
  
  // Test battery optimizations
  test('should apply battery optimizations when battery is low', () => {
    // Mock battery status as low and not charging
    mockBattery.level = 0.2; // 20%
    mockBattery.charging = false;
    
    // Set up battery monitoring manually (since we mocked getBattery)
    performanceOptimizer.batteryMonitoring = true;
    performanceOptimizer.batteryLevel = mockBattery.level;
    performanceOptimizer.batteryCharging = mockBattery.charging;
    
    // Apply battery optimizations
    performanceOptimizer.optimizeForBattery();
    
    // Should reduce preload count
    expect(performanceOptimizer.preloadCount).toBe(
      performanceOptimizer.options.batteryOptimizationMode.preloadCount
    );
    
    // Should lower target FPS
    expect(performanceOptimizer.options.fpsTarget).toBe(
      performanceOptimizer.options.batteryOptimizationMode.fpsTarget
    );
    
    // Should emit fps-target-changed event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-fps-target-changed'
      })
    );
  });
  
  // Test battery status with charging battery
  test('should not apply battery optimizations when battery is charging', () => {
    // Mock battery status as low but charging
    mockBattery.level = 0.2; // 20%
    mockBattery.charging = true;
    
    // Set up battery monitoring manually
    performanceOptimizer.batteryMonitoring = true;
    performanceOptimizer.batteryLevel = mockBattery.level;
    performanceOptimizer.batteryCharging = mockBattery.charging;
    
    // Store original values
    const originalPreloadCount = performanceOptimizer.preloadCount;
    const originalFpsTarget = performanceOptimizer.options.fpsTarget;
    
    // Apply battery optimizations
    performanceOptimizer.optimizeForBattery();
    
    // Should not change preload count
    expect(performanceOptimizer.preloadCount).toBe(originalPreloadCount);
    
    // Should not change target FPS
    expect(performanceOptimizer.options.fpsTarget).toBe(originalFpsTarget);
  });
  
  // Test resource usage tracking
  test('should track resource usage correctly', () => {
    // Update resource usage
    performanceOptimizer._updateResourceUsage();
    
    // Should update resource metrics
    const resourceUsage = performanceOptimizer.getResourceUsage();
    expect(resourceUsage).toBeDefined();
    expect(resourceUsage.totalMemoryEstimate).toBeGreaterThanOrEqual(0);
  });
  
  // Test performance adjustment
  test('should adjust performance settings based on FPS', () => {
    // Setup for performance adjustment
    performanceOptimizer.fpsHistory = [30, 30, 30]; // Well below target of 60
    performanceOptimizer.lastPerformanceAdjustment = 0; // Ensure adjustment is allowed
    
    // Adjust performance
    performanceOptimizer._adjustPerformance();
    
    // Should reduce preload count to improve performance
    expect(performanceOptimizer.preloadCount).toBeLessThan(performanceOptimizer.options.preloadCount);
    
    // Should emit quality-adjusted event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-quality-adjusted'
      })
    );
    
    // Now test high FPS adjustment
    performanceOptimizer.fpsHistory = [120, 120, 120]; // Well above target of 60
    performanceOptimizer.lastPerformanceAdjustment = 0; // Reset adjustment timer
    performanceOptimizer.preloadCount = 1; // Set low preload count
    
    // Adjust performance
    performanceOptimizer._adjustPerformance();
    
    // Should increase preload count when FPS is high
    expect(performanceOptimizer.preloadCount).toBeGreaterThan(1);
  });
  
  // Test inactivity detection
  test('should handle user inactivity correctly', () => {
    // Setup inactivity detection
    performanceOptimizer._setupInactivityMonitoring();
    
    // Manually trigger inactivity
    performanceOptimizer._handleInactivity();
    
    // Should lower FPS target
    expect(performanceOptimizer.options.fpsTarget).toBe(performanceOptimizer.options.inactivityFramerate);
    
    // Should emit inactivity event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-inactivity-detected'
      })
    );
    
    // Now test activity resumption
    performanceOptimizer.lastActivityTime = 0; // Set as inactive
    
    // Reset inactivity timer (simulates user activity)
    performanceOptimizer._resetInactivityTimer();
    
    // Should emit activity resumed event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-activity-resumed'
      })
    );
  });
  
  // Test battery status handling
  test('should handle battery status changes correctly', () => {
    // Setup battery monitoring manually
    performanceOptimizer.batteryMonitoring = true;
    
    // Update battery status
    performanceOptimizer.batteryLevel = 0.2;
    performanceOptimizer.batteryCharging = false;
    
    // Handle battery status
    performanceOptimizer._handleBatteryStatus();
    
    // Should emit battery-status event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-battery-status'
      })
    );
  });
  
  // Test cleanup on destroy
  test('should clean up resources when destroyed', () => {
    // Setup inactivity timer
    performanceOptimizer.inactivityTimer = 123;
    
    // Set up event listeners
    performanceOptimizer._setupInactivityMonitoring();
    
    // Now destroy
    performanceOptimizer.destroy();
    
    // Should clear compilation queue
    expect(performanceOptimizer.compilationQueue.length).toBe(0);
    expect(performanceOptimizer.isProcessing).toBe(false);
    
    // Should remove event listeners
    expect(document.removeEventListener).toHaveBeenCalled();
  });
  
  // Test performance monitoring
  test('should monitor performance correctly', () => {
    // Call performance monitoring method
    performanceOptimizer._monitorPerformance();
    
    // Should update resource usage
    expect(mockWebGLCore.getContext).toHaveBeenCalled();
    
    // Should emit performance metrics
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-optimizer-performance-metrics'
      })
    );
  });
});
/**
 * EventHandler Module Unit Tests
 * 
 * Tests the functionality of the EventHandler module including:
 * - Initialization and configuration
 * - Event throttling
 * - Navigation handling
 * - Handling of different event types (wheel, touch, key, click)
 * - Device detection
 */

import EventHandler from '../../event-handler.js';
import MockWebGLContext from '../mock-webgl-context.js';

describe('EventHandler', () => {
  let mockWebGLCore;
  let mockShaderManager;
  let mockTransitionEngine;
  let eventHandler;
  let mockCanvas;
  let mockManifest;
  
  // Setup mocks and EventHandler instance before each test
  beforeEach(() => {
    // Create a mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    // Create mock WebGL context
    const mockGL = new MockWebGLContext();
    
    // Create a mock WebGLCore
    mockWebGLCore = {
      getContext: jest.fn().mockReturnValue(mockGL),
      getCanvas: jest.fn().mockReturnValue(mockCanvas),
      handleResize: jest.fn()
    };
    
    // Create a mock ShaderManager with a sample manifest
    mockManifest = [
      { id: 'shader1', name: 'Shader 1' },
      { id: 'shader2', name: 'Shader 2' },
      { id: 'shader3', name: 'Shader 3' }
    ];
    
    mockShaderManager = {
      getManifest: jest.fn().mockReturnValue(mockManifest),
      getCurrentShaderIndex: jest.fn().mockReturnValue(0)
    };
    
    // Create a mock TransitionEngine
    mockTransitionEngine = {
      isTransitioning: jest.fn().mockReturnValue(false),
      startTransition: jest.fn().mockResolvedValue(true)
    };
    
    // Initialize EventHandler with mock dependencies
    eventHandler = new EventHandler(mockWebGLCore, mockShaderManager, mockTransitionEngine, {
      navigationCooldown: 100, // Shorter cooldown for testing
      swipeThreshold: 10,
      wheelThreshold: 0.05,
      preventDefaultEvents: true
    });
    
    // Mock document.dispatchEvent to track emitted events
    document.dispatchEvent = jest.fn();
    
    // Mock performance.now() for consistent timing tests
    const originalPerformanceNow = performance.now;
    performance.now = jest.fn().mockReturnValue(1000);
    
    // Store original methods to restore them later
    eventHandler._originalAddEventListener = EventTarget.prototype.addEventListener;
    eventHandler._originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    // Mock addEventListener to prevent actual event binding
    EventTarget.prototype.addEventListener = jest.fn();
    EventTarget.prototype.removeEventListener = jest.fn();
  });
  
  afterEach(() => {
    // Clean up
    jest.resetAllMocks();
    
    // Restore original methods
    if (eventHandler._originalAddEventListener) {
      EventTarget.prototype.addEventListener = eventHandler._originalAddEventListener;
    }
    
    if (eventHandler._originalRemoveEventListener) {
      EventTarget.prototype.removeEventListener = eventHandler._originalRemoveEventListener;
    }
    
    // Clean up any lingering event handlers
    eventHandler.destroy();
  });
  
  // Test initialization
  test('should initialize correctly', () => {
    expect(eventHandler.init()).toBe(true);
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'event-handler-initialized'
      })
    );
  });
  
  // Test navigation throttling
  test('should throttle navigation attempts', () => {
    // First navigation attempt should not be throttled
    expect(eventHandler.throttleNavigation()).toBe(false);
    
    // Second attempt within cooldown period should be throttled
    expect(eventHandler.throttleNavigation()).toBe(true);
    
    // Mock time advancing past cooldown
    performance.now.mockReturnValue(1200); // 200ms later
    
    // Now navigation should be allowed again
    expect(eventHandler.throttleNavigation()).toBe(false);
  });
  
  // Test handling wheel events
  test('should handle wheel events correctly', () => {
    // Create a mock wheel event
    const mockWheelEvent = {
      deltaY: 1.0, // Positive means scroll down/next
      preventDefault: jest.fn()
    };
    
    // Handle the wheel event
    eventHandler.handleWheelEvent(mockWheelEvent);
    
    // Should prevent default
    expect(mockWheelEvent.preventDefault).toHaveBeenCalled();
    
    // Should attempt to navigate
    expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
    expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(1); // Direction should be 1 (next)
    
    // Test scroll in the opposite direction
    mockWheelEvent.deltaY = -1.0; // Negative means scroll up/previous
    mockTransitionEngine.startTransition.mockClear();
    
    // Mock time advancing past cooldown
    performance.now.mockReturnValue(1200); // 200ms later
    
    eventHandler.handleWheelEvent(mockWheelEvent);
    
    expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
    expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(-1); // Direction should be -1 (previous)
  });
  
  // Test handling key events
  test('should handle keyboard navigation correctly', () => {
    // Test "next" keys
    const nextKeys = ['ArrowDown', 'ArrowRight', 'PageDown', 'n', 'N'];
    
    nextKeys.forEach(key => {
      const mockKeyEvent = {
        key,
        target: { tagName: 'DIV' } // Not an input field
      };
      
      // Reset mocks and mock time
      mockTransitionEngine.startTransition.mockClear();
      performance.now.mockReturnValue(1000 + Math.random() * 1000); // Ensure we're past cooldown
      
      eventHandler.handleKeyDownEvent(mockKeyEvent);
      
      expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
      expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(1); // Direction should be 1 (next)
    });
    
    // Test "previous" keys
    const prevKeys = ['ArrowUp', 'ArrowLeft', 'PageUp', 'p', 'P'];
    
    prevKeys.forEach(key => {
      const mockKeyEvent = {
        key,
        target: { tagName: 'DIV' } // Not an input field
      };
      
      // Reset mocks and mock time
      mockTransitionEngine.startTransition.mockClear();
      performance.now.mockReturnValue(1000 + Math.random() * 1000); // Ensure we're past cooldown
      
      eventHandler.handleKeyDownEvent(mockKeyEvent);
      
      expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
      expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(-1); // Direction should be -1 (previous)
    });
  });
  
  // Test ignoring navigation keys in input fields
  test('should ignore keyboard navigation in input fields', () => {
    const mockKeyEvent = {
      key: 'ArrowDown',
      target: { tagName: 'INPUT' } // An input field
    };
    
    eventHandler.handleKeyDownEvent(mockKeyEvent);
    
    // Should not attempt to navigate
    expect(mockTransitionEngine.startTransition).not.toHaveBeenCalled();
  });
  
  // Test handling touch events
  test('should handle touch navigation correctly', () => {
    // Setup for touch events
    const mockTouchStartEvent = {
      touches: [{
        clientX: 100,
        clientY: 100
      }],
      preventDefault: jest.fn()
    };
    
    const mockTouchEndEvent = {
      changedTouches: [{
        clientX: 100,
        clientY: 50 // 50px swipe up
      }],
      preventDefault: jest.fn()
    };
    
    // First record the touch start
    eventHandler.handleTouchStartEvent(mockTouchStartEvent);
    
    // Then handle the touch end (swipe up)
    eventHandler.handleTouchEndEvent(mockTouchEndEvent);
    
    // Should attempt to navigate (swipe up = next)
    expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
    expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(1); // Direction should be 1 (next)
    
    // Now test a swipe down
    mockTouchStartEvent.touches[0].clientY = 100;
    mockTouchEndEvent.changedTouches[0].clientY = 150; // 50px swipe down
    
    // Reset mocks and mock time
    mockTransitionEngine.startTransition.mockClear();
    performance.now.mockReturnValue(1200); // 200ms later
    
    // First record the touch start
    eventHandler.handleTouchStartEvent(mockTouchStartEvent);
    
    // Then handle the touch end (swipe down)
    eventHandler.handleTouchEndEvent(mockTouchEndEvent);
    
    // Should attempt to navigate (swipe down = previous)
    expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
    expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(-1); // Direction should be -1 (previous)
  });
  
  // Test handling click events for navigation
  test('should handle click navigation correctly', () => {
    // Mock canvas bounding rect
    const mockRect = {
      left: 0,
      top: 0,
      width: 800,
      height: 600
    };
    mockCanvas.getBoundingClientRect = jest.fn().mockReturnValue(mockRect);
    
    // Click on left side (previous)
    const mockClickLeftEvent = {
      clientX: 100, // Within left 30% of canvas
      clientY: 300
    };
    
    eventHandler.handleClickEvent(mockClickLeftEvent);
    
    // Should attempt to navigate to previous
    expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
    expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(-1); // Direction should be -1 (previous)
    
    // Click on right side (next)
    const mockClickRightEvent = {
      clientX: 700, // Within right 30% of canvas
      clientY: 300
    };
    
    // Reset mocks and mock time
    mockTransitionEngine.startTransition.mockClear();
    performance.now.mockReturnValue(1200); // 200ms later
    
    eventHandler.handleClickEvent(mockClickRightEvent);
    
    // Should attempt to navigate to next
    expect(mockTransitionEngine.startTransition).toHaveBeenCalled();
    expect(mockTransitionEngine.startTransition.mock.calls[0][1]).toBe(1); // Direction should be 1 (next)
  });
  
  // Test handling resize events
  test('should handle resize events correctly', () => {
    eventHandler.handleResizeEvent();
    
    // Should update the WebGL canvas
    expect(mockWebGLCore.handleResize).toHaveBeenCalled();
    
    // Should emit resize event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'event-handler-resize'
      })
    );
  });
  
  // Test navigation when transitions are already active
  test('should not start new transition if one is already active', () => {
    // Mock transition already in progress
    mockTransitionEngine.isTransitioning.mockReturnValue(true);
    
    // Attempt to navigate
    eventHandler._handleNavigation(1);
    
    // Should check if transitioning
    expect(mockTransitionEngine.isTransitioning).toHaveBeenCalled();
    
    // Should NOT attempt to start a new transition
    expect(mockTransitionEngine.startTransition).not.toHaveBeenCalled();
  });
  
  // Test device detection
  test('should detect mobile devices', () => {
    // Test the device detection functionality
    const isMobile = eventHandler.isMobileDevice();
    
    // This will depend on the environment where tests are run
    expect(typeof isMobile).toBe('boolean');
  });
  
  // Test cleanup on destroy
  test('should clean up event listeners on destroy', () => {
    // Initialize event handler
    eventHandler.init();
    
    // Destroy the event handler
    eventHandler.destroy();
    
    // Should attempt to remove event listeners
    expect(EventTarget.prototype.removeEventListener).toHaveBeenCalled();
  });
});
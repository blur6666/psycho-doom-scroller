/**
 * UIController Module Unit Tests
 * 
 * Tests the functionality of the UIController module including:
 * - Initialization and configuration
 * - Notification system
 * - Navigation hints
 * - Loading indicators
 * - Keyframe animations
 * - DOM interaction
 */

import UIController from '../../ui-controller.js';
import MockWebGLContext from '../mock-webgl-context.js';

describe('UIController', () => {
  let mockWebGLCore;
  let uiController;
  let mockCanvas;
  let originalCreateElement;
  let originalGetElementById;
  let originalAppendChild;
  let originalSetItem;
  let originalGetItem;
  let mockNotificationContainer;
  let mockLoadingElement;
  
  // Setup mocks and UIController instance before each test
  beforeEach(() => {
    // Create a mock canvas
    mockCanvas = {
      width: 800,
      height: 600
    };
    
    // Create mock WebGL context
    const mockGL = new MockWebGLContext();
    
    // Create a mock WebGLCore
    mockWebGLCore = {
      getContext: jest.fn().mockReturnValue(mockGL),
      getCanvas: jest.fn().mockReturnValue(mockCanvas)
    };
    
    // Mock document methods
    originalCreateElement = document.createElement;
    originalGetElementById = document.getElementById;
    originalAppendChild = document.body.appendChild;
    
    mockNotificationContainer = {
      id: 'notification-container',
      appendChild: jest.fn()
    };
    
    mockLoadingElement = {
      id: 'loading-indicator',
      appendChild: jest.fn(),
      style: {}
    };
    
    document.createElement = jest.fn(tagName => {
      const element = {
        tagName,
        style: {},
        className: '',
        textContent: '',
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        querySelector: jest.fn().mockImplementation(selector => {
          if (selector === 'div:not(:first-child)') {
            return { textContent: '' };
          }
          return null;
        })
      };
      return element;
    });
    
    document.getElementById = jest.fn(id => {
      if (id === 'notification-container') {
        return mockNotificationContainer;
      } else if (id === 'loading-indicator') {
        return mockLoadingElement;
      } else if (id === 'ui-controller-keyframes') {
        return null; // Keyframes element doesn't exist yet
      }
      return null;
    });
    
    document.body.appendChild = jest.fn();
    document.head.appendChild = jest.fn();
    
    // Mock localStorage
    originalSetItem = localStorage.setItem;
    originalGetItem = localStorage.getItem;
    
    localStorage.setItem = jest.fn();
    localStorage.getItem = jest.fn().mockReturnValue(null); // Simulate first visit
    
    // Mock document.dispatchEvent to track emitted events
    document.dispatchEvent = jest.fn();
    
    // Initialize UIController with mock dependencies
    uiController = new UIController(mockWebGLCore, {
      notificationDuration: 100, // Shorter duration for testing
      hideHintsAfter: 100 // Shorter duration for testing
    });
  });
  
  afterEach(() => {
    // Clean up
    jest.resetAllMocks();
    
    // Restore original methods
    document.createElement = originalCreateElement;
    document.getElementById = originalGetElementById;
    document.body.appendChild = originalAppendChild;
    localStorage.setItem = originalSetItem;
    localStorage.getItem = originalGetItem;
    
    // Clean up resources
    uiController.destroy();
  });
  
  // Test initialization
  test('should initialize correctly', () => {
    expect(uiController.init()).toBe(true);
    
    // Should create containers if they don't exist
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(document.body.appendChild).toHaveBeenCalled();
    
    // Should mark as visited
    expect(localStorage.setItem).toHaveBeenCalledWith('webgl-app-visited', 'true');
    
    // Should emit initialized event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-initialized'
      })
    );
  });
  
  // Test notification system
  test('should show and hide notifications correctly', () => {
    uiController.init();
    
    // Show a notification
    const notification = uiController.showNotification('Test message', 'info');
    
    // Should create notification element
    expect(notification).toBeTruthy();
    expect(notification.textContent).toContain('Test message');
    
    // Should add notification to container
    expect(mockNotificationContainer.appendChild).toHaveBeenCalledWith(notification);
    
    // Should emit notification-show event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-notification-show'
      })
    );
    
    // Now hide the notification
    uiController.hideNotification();
    
    // Should emit notification-hide event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-notification-hide'
      })
    );
    
    // Should clear the notification reference
    expect(uiController.getNotificationElement()).toBeNull();
  });
  
  // Test creating different types of notifications
  test('should create different notification types correctly', () => {
    uiController.init();
    
    // Test info notification
    const infoNotification = uiController.showNotification('Info message', 'info');
    expect(infoNotification.className).toContain('info');
    
    // Test success notification
    const successNotification = uiController.showNotification('Success message', 'success');
    expect(successNotification.className).toContain('success');
    
    // Test error notification
    const errorNotification = uiController.showNotification('Error message', 'error');
    expect(errorNotification.className).toContain('error');
  });
  
  // Test navigation hints
  test('should show and hide navigation hints correctly', () => {
    uiController.init();
    
    // Show navigation hints
    uiController.showNavigationHints();
    
    // Should create two hint elements (left and right)
    expect(document.createElement).toHaveBeenCalledTimes(4); // 2 containers + 2 hints
    expect(document.body.appendChild).toHaveBeenCalledTimes(4); // 2 containers + 2 hints
    
    // Should emit hints-show event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-hints-show'
      })
    );
    
    // Now hide the hints
    uiController.hideNavigationHints();
    
    // Should emit hints-hide event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-hints-hide'
      })
    );
    
    // Should clear the navigation hints array
    expect(uiController.navigationHints.length).toBe(0);
  });
  
  // Test loading indicator
  test('should show and hide loading indicator correctly', () => {
    uiController.init();
    
    // Show loading indicator
    uiController.showLoading(true, 'Loading test...');
    
    // Should update the loading message
    const textElement = mockLoadingElement.querySelector('div:not(:first-child)');
    if (textElement) {
      expect(textElement.textContent).toBe('Loading test...');
    }
    
    // Should display the loading element
    expect(mockLoadingElement.style.display).toBe('flex');
    
    // Should emit loading-show event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-loading-show'
      })
    );
    
    // Now hide the loading indicator
    uiController.showLoading(false);
    
    // Should hide the loading element
    expect(mockLoadingElement.style.display).toBe('none');
    
    // Should emit loading-hide event
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui-controller-loading-hide'
      })
    );
  });
  
  // Test applying styles
  test('should apply styles correctly', () => {
    // Create a test element
    const element = { style: {} };
    
    // Apply some styles
    const styles = {
      color: 'red',
      backgroundColor: 'blue',
      fontSize: '14px'
    };
    
    uiController._applyStyles(element, styles);
    
    // Styles should be applied to the element
    expect(element.style.color).toBe('red');
    expect(element.style.backgroundColor).toBe('blue');
    expect(element.style.fontSize).toBe('14px');
  });
  
  // Test keyframe animations
  test('should add keyframe animations to document head', () => {
    uiController.init();
    
    // Should create a style element
    expect(document.createElement).toHaveBeenCalledWith('style');
    
    // Should add style element to document head
    expect(document.head.appendChild).toHaveBeenCalled();
  });
  
  // Test notification enabling/disabling
  test('should enable and disable notifications', () => {
    uiController.init();
    
    // Notifications should be enabled by default
    expect(uiController.isEnabled()).toBe(true);
    
    // Disable notifications
    uiController.setNotificationsEnabled(false);
    expect(uiController.isEnabled()).toBe(false);
    
    // Show notification while disabled
    const notification = uiController.showNotification('This should not appear');
    
    // Should not create a notification
    expect(notification).toBeNull();
    
    // Enable notifications again
    uiController.setNotificationsEnabled(true);
    expect(uiController.isEnabled()).toBe(true);
    
    // Show notification while enabled
    const enabledNotification = uiController.showNotification('This should appear');
    
    // Should create a notification
    expect(enabledNotification).toBeTruthy();
  });
  
  // Test event handling
  test('should set up event listeners correctly', () => {
    // The _setupEventListeners method should add event listeners
    uiController.init();
    
    // Create mock events
    const loadStartEvent = new CustomEvent('shader-manager-load-start');
    const loadEndEvent = new CustomEvent('shader-manager-load-end');
    
    // Manually trigger events
    document.dispatchEvent(loadStartEvent);
    
    // Should show loading indicator
    expect(mockLoadingElement.style.display).toBe('flex');
    
    // Now end loading
    document.dispatchEvent(loadEndEvent);
    
    // Should hide loading indicator
    expect(mockLoadingElement.style.display).toBe('none');
  });
  
  // Test cleanup on destroy
  test('should clean up resources when destroyed', () => {
    uiController.init();
    
    // Show a notification
    const notification = uiController.showNotification('Test notification');
    
    // Show navigation hints
    uiController.showNavigationHints();
    
    // Show loading indicator
    uiController.showLoading(true);
    
    // Now destroy the UI controller
    uiController.destroy();
    
    // Should hide notification
    expect(uiController.getNotificationElement()).toBeNull();
    
    // Should hide navigation hints
    expect(uiController.navigationHints.length).toBe(0);
    
    // Should hide loading indicator
    expect(mockLoadingElement.style.display).toBe('none');
  });
});
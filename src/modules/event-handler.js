/**
 * EventHandler Module
 * 
 * Responsible for handling user input events (mouse, touch, keyboard) and system
 * events (resize, orientation change). Coordinates event-driven actions and
 * implements event throttling and debouncing.
 */

class EventHandler {
  /**
   * Create a new EventHandler instance
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {ShaderManager} shaderManager - The ShaderManager instance
   * @param {TransitionEngine} transitionEngine - The TransitionEngine instance
   * @param {Object} options - Configuration options
   */
  constructor(webglCore, shaderManager, transitionEngine, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    this.shaderManager = shaderManager;
    this.transitionEngine = transitionEngine;
    
    // State
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.lastNavigationTime = 0;
    this.navigationCooldown = options.navigationCooldown || 500; // ms
    this.isMobile = this._isMobileDevice();
    this.eventListeners = new Map(); // Store references to bound event handlers
    
    // Configuration
    this.options = Object.assign({
      navigationCooldown: 500,
      doubleTapDelay: 300,
      swipeThreshold: 50,
      wheelThreshold: 0.1,
      enableFullscreenToggle: true,
      preventDefaultEvents: true
    }, options);
    
    // Bind methods to preserve 'this' context
    this.handleWheelEvent = this.handleWheelEvent.bind(this);
    this.handleTouchStartEvent = this.handleTouchStartEvent.bind(this);
    this.handleTouchMoveEvent = this.handleTouchMoveEvent.bind(this);
    this.handleTouchEndEvent = this.handleTouchEndEvent.bind(this);
    this.handleKeyDownEvent = this.handleKeyDownEvent.bind(this);
    this.handleResizeEvent = this.handleResizeEvent.bind(this);
    this.handleClickEvent = this.handleClickEvent.bind(this);
    this._handleNavigation = this._handleNavigation.bind(this);
    this._toggleFullscreen = this._toggleFullscreen.bind(this);
    this._emitEvent = this._emitEvent.bind(this);
  }
  
  /**
   * Initialize the EventHandler
   * @returns {boolean} - Whether initialization was successful
   */
  init() {
    // Set up all event listeners
    this._setupEventListeners();
    
    console.log('EventHandler: Initialized');
    this._emitEvent('initialized');
    
    return true;
  }
  
  /**
   * Clean up event listeners and resources
   */
  destroy() {
    // Remove all event listeners
    this._removeEventListeners();
    
    console.log('EventHandler: Destroyed');
  }
  
  /**
   * Set up navigation event handlers (keyboard, mouse, touch)
   */
  setupNavigationHandlers() {
    // Keyboard events
    this._addEventListenerWithRef(document, 'keydown', this.handleKeyDownEvent);
    
    // Mouse wheel events
    this._addEventListenerWithRef(window, 'wheel', this.handleWheelEvent, { passive: false });
    
    // Touch events for mobile
    if (this.isMobile) {
      const canvas = this.webglCore.getCanvas();
      if (canvas) {
        this._addEventListenerWithRef(canvas, 'touchstart', this.handleTouchStartEvent, { passive: false });
        this._addEventListenerWithRef(canvas, 'touchmove', this.handleTouchMoveEvent, { passive: false });
        this._addEventListenerWithRef(canvas, 'touchend', this.handleTouchEndEvent, { passive: false });
      }
    }
    
    // Click events
    this._addEventListenerWithRef(document, 'click', this.handleClickEvent);
    
    console.log('EventHandler: Navigation handlers set up');
  }
  
  /**
   * Set up resize handler
   */
  setupResizeHandler() {
    this._addEventListenerWithRef(window, 'resize', this.handleResizeEvent);
    
    // Initial resize call
    this.handleResizeEvent();
    
    console.log('EventHandler: Resize handler set up');
  }
  
  /**
   * Check if navigation should be throttled
   * @returns {boolean} - Whether navigation should be throttled
   */
  throttleNavigation() {
    const now = performance.now();
    const elapsed = now - this.lastNavigationTime;
    
    if (elapsed < this.navigationCooldown) {
      console.log(`EventHandler: Navigation throttled (${elapsed.toFixed(0)}ms < ${this.navigationCooldown}ms cooldown)`);
      return true;
    }
    
    // Update last navigation time
    this.lastNavigationTime = now;
    return false;
  }
  
  /**
   * Check if device is mobile
   * @returns {boolean} - Whether device is mobile
   */
  isMobileDevice() {
    return this.isMobile;
  }
  
  /**
   * Get navigation cooldown period
   * @returns {number} - Cooldown period in ms
   */
  getNavigationCooldown() {
    return this.navigationCooldown;
  }
  
  /**
   * Set navigation cooldown period
   * @param {number} cooldown - Cooldown period in ms
   */
  setNavigationCooldown(cooldown) {
    this.navigationCooldown = cooldown;
  }
  
  /**
   * Handle wheel events for navigation
   * @param {WheelEvent} event - Wheel event
   */
  handleWheelEvent(event) {
    // Prevent default behavior if configured
    if (this.options.preventDefaultEvents) {
      event.preventDefault();
    }
    
    // Skip if navigation is throttled
    if (this.throttleNavigation()) return;
    
    // Determine direction based on deltaY
    // Positive deltaY = scroll down, negative = scroll up
    const direction = event.deltaY > 0 ? 1 : -1;
    
    // Only navigate if the delta exceeds the threshold
    if (Math.abs(event.deltaY) > this.options.wheelThreshold) {
      this._handleNavigation(direction);
    }
  }
  
  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch start event
   */
  handleTouchStartEvent(event) {
    // Store initial touch position
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
      this.touchStartX = event.touches[0].clientX;
    }
  }
  
  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch move event
   */
  handleTouchMoveEvent(event) {
    // Prevent default behavior to avoid scrolling the page
    if (this.options.preventDefaultEvents) {
      event.preventDefault();
    }
  }
  
  /**
   * Handle touch end event
   * @param {TouchEvent} event - Touch end event
   */
  handleTouchEndEvent(event) {
    // Skip if navigation is throttled
    if (this.throttleNavigation()) return;
    
    if (event.changedTouches.length > 0) {
      const touchEndY = event.changedTouches[0].clientY;
      const touchEndX = event.changedTouches[0].clientX;
      
      // Calculate delta
      const deltaY = touchEndY - this.touchStartY;
      const deltaX = touchEndX - this.touchStartX;
      
      // Determine if it's a vertical swipe
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.options.swipeThreshold) {
        // Swipe up = next, swipe down = previous (opposite of natural scrolling)
        const direction = deltaY < 0 ? 1 : -1;
        this._handleNavigation(direction);
      }
      
      // Check for double tap
      this._handleDoubleTap(event);
    }
  }
  
  /**
   * Handle key down events
   * @param {KeyboardEvent} event - Key down event
   */
  handleKeyDownEvent(event) {
    // Skip if inside input fields
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return;
    }
    
    // Skip if navigation is throttled
    if (this.throttleNavigation()) return;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
      case 'n':
      case 'N':
        this._handleNavigation(1);
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
      case 'p':
      case 'P':
        this._handleNavigation(-1);
        break;
        
      case ' ':
      case 'r':
      case 'R':
        // Random shader
        this._handleNavigation(0);
        break;
        
      case 'f':
      case 'F':
        // Toggle fullscreen
        if (this.options.enableFullscreenToggle) {
          this._toggleFullscreen();
        }
        break;
    }
  }
  
  /**
   * Handle resize events
   * @param {Event} [event] - Resize event
   */
  handleResizeEvent(event) {
    // Update WebGL canvas size
    if (this.webglCore) {
      this.webglCore.handleResize();
    }
    
    this._emitEvent('resize', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }
  
  /**
   * Handle click events
   * @param {MouseEvent} event - Click event
   */
  handleClickEvent(event) {
    // Skip if navigation is throttled
    if (this.throttleNavigation()) return;
    
    // Determine if clicking on navigation elements
    // This would typically be implemented with actual UI elements
    const canvas = this.webglCore.getCanvas();
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Simple left/right region detection
    if (x < rect.width * 0.3) {
      // Left side - previous
      this._handleNavigation(-1);
    } else if (x > rect.width * 0.7) {
      // Right side - next
      this._handleNavigation(1);
    }
  }
  
  /**
   * Set up all event listeners
   * @private
   */
  _setupEventListeners() {
    // Set up navigation handlers
    this.setupNavigationHandlers();
    
    // Set up resize handler
    this.setupResizeHandler();
    
    // Set up other event handlers (orientation change, visibility change, etc.)
    this._addEventListenerWithRef(window, 'orientationchange', this.handleResizeEvent);
    this._addEventListenerWithRef(document, 'visibilitychange', () => {
      this._emitEvent('visibility-change', {
        isVisible: !document.hidden
      });
    });
    
    // Set up fullscreen change detection
    this._addEventListenerWithRef(document, 'fullscreenchange', () => {
      this._emitEvent('fullscreen-change', {
        isFullscreen: !!document.fullscreenElement
      });
    });
  }
  
  /**
   * Remove all event listeners
   * @private
   */
  _removeEventListeners() {
    // Remove all event listeners using the stored references
    this.eventListeners.forEach((handler, key) => {
      const [element, eventType, options] = key.split('|');
      const target = element === 'window' ? window : 
                    element === 'document' ? document : 
                    document.querySelector(element);
      
      if (target) {
        target.removeEventListener(eventType, handler, options);
      }
    });
    
    // Clear the map
    this.eventListeners.clear();
  }
  
  /**
   * Add event listener and store reference for later cleanup
   * @private
   * @param {EventTarget} element - Element to attach listener to
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @param {Object} [options] - Event listener options
   */
  _addEventListenerWithRef(element, eventType, handler, options = {}) {
    // Create a unique key for this event listener
    const elementKey = element === window ? 'window' : 
                      element === document ? 'document' : 
                      element.id ? `#${element.id}` : 
                      '.canvas'; // Fallback for canvas
    
    const key = `${elementKey}|${eventType}|${JSON.stringify(options)}`;
    
    // Store handler reference
    this.eventListeners.set(key, handler);
    
    // Add event listener
    element.addEventListener(eventType, handler, options);
  }
  
  /**
   * Handle navigation based on direction
   * @private
   * @param {number} direction - Direction (1 for next, -1 for previous, 0 for random)
   */
  _handleNavigation(direction) {
    if (!this.transitionEngine || !this.shaderManager) return;
    
    // Skip if transition is already active
    if (this.transitionEngine.isTransitioning()) {
      return;
    }
    
    this._emitEvent('navigation', { direction });
    
    // Handle navigation based on direction
    if (direction === 0) {
      // Random shader
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      const manifestLength = this.shaderManager.getManifest().length;
      
      if (manifestLength <= 1) return;
      
      // Select random index different from current
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * manifestLength);
      } while (randomIndex === currentIndex && manifestLength > 1);
      
      // Start transition
      this.transitionEngine.startTransition(randomIndex, 
        randomIndex > currentIndex ? 1 : -1);
    } else {
      // Calculate target index based on direction
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      const manifestLength = this.shaderManager.getManifest().length;
      
      let targetIndex;
      if (direction > 0) {
        // Next shader
        targetIndex = (currentIndex + 1) % manifestLength;
      } else {
        // Previous shader
        targetIndex = (currentIndex - 1 + manifestLength) % manifestLength;
      }
      
      // Start transition
      this.transitionEngine.startTransition(targetIndex, direction);
    }
  }
  
  /**
   * Handle double tap gesture
   * @private
   * @param {TouchEvent} event - Touch event
   */
  _handleDoubleTap(event) {
    // Check if device supports fullscreen
    if (!this.options.enableFullscreenToggle) return;
    
    // Get current time
    const now = performance.now();
    
    // Check if this is a double tap
    if (this.lastTapTime && (now - this.lastTapTime < this.options.doubleTapDelay)) {
      // Double tap detected, toggle fullscreen
      this._toggleFullscreen();
      
      // Reset last tap time
      this.lastTapTime = 0;
    } else {
      // Single tap, update last tap time
      this.lastTapTime = now;
    }
  }
  
  /**
   * Toggle fullscreen mode
   * @private
   */
  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      const canvas = this.webglCore.getCanvas();
      if (canvas && canvas.requestFullscreen) {
        canvas.requestFullscreen().catch(err => {
          console.error('EventHandler: Error attempting to enable fullscreen mode:', err);
        });
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
  
  /**
   * Check if device is mobile
   * @private
   * @returns {boolean} - Whether device is mobile
   */
  _isMobileDevice() {
    return (
      typeof window.orientation !== 'undefined' ||
      navigator.userAgent.indexOf('IEMobile') !== -1 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }
  
  /**
   * Prevent default behavior for event
   * @private
   * @param {Event} event - Event to prevent default for
   */
  _preventDefaultBehavior(event) {
    if (this.options.preventDefaultEvents) {
      event.preventDefault();
    }
  }
  
  /**
   * Emit an event
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event details
   */
  _emitEvent(type, detail = {}) {
    const event = new CustomEvent(`event-handler-${type}`, {
      detail: {
        ...detail,
        eventHandler: this
      }
    });
    
    document.dispatchEvent(event);
  }
}

export default EventHandler;
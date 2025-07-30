/**
 * UIController Module
 * 
 * Responsible for managing notification system, navigation hints,
 * loading indicators, and other UI elements. Coordinates UI updates
 * and provides a consistent interface for user interface operations.
 */

class UIController {
  /**
   * Create a new UIController instance
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {Object} options - Configuration options
   */
  constructor(webglCore, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    
    // UI elements references
    this.notificationElement = null;
    this.navigationHints = [];
    this.loadingElement = null;
    
    // State
    this.notificationsEnabled = true;
    this.isFirstVisit = !localStorage.getItem('webgl-app-visited');
    this.hintsEnabled = options.hintsEnabled !== false;
    
    // Configuration
    this.options = Object.assign({
      hintsEnabled: true,
      notificationDuration: 3000,
      hideHintsAfter: 5000,
      loadingElementId: 'loading-indicator',
      notificationContainerId: 'notification-container',
      navigationHintClassPrefix: 'nav-hint',
      styles: {
        notification: {
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '4px',
          zIndex: '100',
          maxWidth: '80%',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          animation: 'fadeIn 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        },
        notificationError: {
          backgroundColor: 'rgba(220, 53, 69, 0.8)'
        },
        notificationSuccess: {
          backgroundColor: 'rgba(40, 167, 69, 0.8)'
        },
        notificationInfo: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        },
        notificationClose: {
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          marginLeft: '10px',
          opacity: '0.7',
          transition: 'opacity 0.2s ease'
        },
        loadingIndicator: {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '20px',
          borderRadius: '4px',
          zIndex: '100',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        },
        loadingSpinner: {
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          borderTop: '4px solid #ffffff',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        },
        navigationHint: {
          position: 'fixed',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: '#fff',
          padding: '10px',
          borderRadius: '4px',
          zIndex: '90',
          pointerEvents: 'none',
          opacity: '0.8',
          transition: 'opacity 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        navHintLeft: {
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)'
        },
        navHintRight: {
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)'
        }
      },
      keyframes: {
        fadeIn: [
          { opacity: 0, transform: 'translate(-50%, -10px)' },
          { opacity: 1, transform: 'translate(-50%, 0)' }
        ],
        spin: [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ]
      }
    }, options);
    
    // Bind methods to preserve 'this' context
    this.showNotification = this.showNotification.bind(this);
    this.hideNotification = this.hideNotification.bind(this);
    this.showNavigationHints = this.showNavigationHints.bind(this);
    this.hideNavigationHints = this.hideNavigationHints.bind(this);
    this.showLoading = this.showLoading.bind(this);
    this._emitEvent = this._emitEvent.bind(this);
  }
  
  /**
   * Initialize the UIController
   * @returns {boolean} - Whether initialization was successful
   */
  init() {
    // Create container for notifications if it doesn't exist
    let notificationContainer = document.getElementById(this.options.notificationContainerId);
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = this.options.notificationContainerId;
      document.body.appendChild(notificationContainer);
    }
    
    // Create loading indicator if it doesn't exist
    let loadingIndicator = document.getElementById(this.options.loadingElementId);
    if (!loadingIndicator) {
      loadingIndicator = document.createElement('div');
      loadingIndicator.id = this.options.loadingElementId;
      this._applyStyles(loadingIndicator, this.options.styles.loadingIndicator);
      
      // Create spinner
      const spinner = document.createElement('div');
      this._applyStyles(spinner, this.options.styles.loadingSpinner);
      loadingIndicator.appendChild(spinner);
      
      // Create loading text
      const loadingText = document.createElement('div');
      loadingText.textContent = 'Loading...';
      loadingText.style.marginTop = '10px';
      loadingIndicator.appendChild(loadingText);
      
      // Initially hidden
      loadingIndicator.style.display = 'none';
      
      document.body.appendChild(loadingIndicator);
      this.loadingElement = loadingIndicator;
    } else {
      this.loadingElement = loadingIndicator;
    }
    
    // Add keyframe animations to document if they don't exist
    this._addKeyframeAnimations();
    
    // Mark as visited
    if (this.isFirstVisit) {
      localStorage.setItem('webgl-app-visited', 'true');
      
      // Show hints on first visit
      setTimeout(() => {
        this.showNavigationHints();
      }, 1000);
    }
    
    // Set up event listeners
    this._setupEventListeners();
    
    console.log('UIController: Initialized');
    this._emitEvent('initialized');
    
    return true;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Remove any active notifications
    this.hideNotification();
    
    // Remove navigation hints
    this.hideNavigationHints();
    
    // Hide loading indicator
    this.showLoading(false);
    
    console.log('UIController: Destroyed');
  }
  
  /**
   * Show a notification message
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('info', 'success', 'error')
   * @param {number} duration - Duration in milliseconds (0 for no auto-hide)
   * @returns {HTMLElement} - The notification element
   */
  showNotification(message, type = 'info', duration = this.options.notificationDuration) {
    // Skip if notifications are disabled
    if (!this.notificationsEnabled) return null;
    
    // Hide any existing notification
    this.hideNotification();
    
    // Create notification element
    const notification = this._createNotificationElement(message, type);
    
    // Add to DOM
    const container = document.getElementById(this.options.notificationContainerId);
    if (container) {
      container.appendChild(notification);
    } else {
      document.body.appendChild(notification);
    }
    
    this.notificationElement = notification;
    
    // Auto-hide after duration if specified
    if (duration > 0) {
      setTimeout(() => {
        this.hideNotification();
      }, duration);
    }
    
    this._emitEvent('notification-show', { message, type });
    
    return notification;
  }
  
  /**
   * Hide the current notification
   */
  hideNotification() {
    if (this.notificationElement && this.notificationElement.parentNode) {
      this.notificationElement.parentNode.removeChild(this.notificationElement);
      this._emitEvent('notification-hide');
    }
    
    this.notificationElement = null;
  }
  
  /**
   * Show navigation hints
   * @param {number} duration - Duration to show hints in milliseconds (0 for no auto-hide)
   */
  showNavigationHints() {
    // Skip if hints are disabled
    if (!this.hintsEnabled) return;
    
    // Hide any existing hints
    this.hideNavigationHints();
    
    const canvas = this.webglCore.getCanvas();
    if (!canvas) return;
    
    // Create left hint (Previous)
    const leftHint = this._createNavigationHintElement('left', '← Previous');
    document.body.appendChild(leftHint);
    this.navigationHints.push(leftHint);
    
    // Create right hint (Next)
    const rightHint = this._createNavigationHintElement('right', 'Next →');
    document.body.appendChild(rightHint);
    this.navigationHints.push(rightHint);
    
    // Auto-hide after duration if specified
    if (this.options.hideHintsAfter > 0) {
      setTimeout(() => {
        this.hideNavigationHints();
      }, this.options.hideHintsAfter);
    }
    
    this._emitEvent('hints-show');
  }
  
  /**
   * Hide navigation hints
   */
  hideNavigationHints() {
    this.navigationHints.forEach(hint => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    });
    
    this.navigationHints = [];
    this._emitEvent('hints-hide');
  }
  
  /**
   * Show or hide loading indicator
   * @param {boolean} show - Whether to show or hide
   * @param {string} [message] - Optional message to display
   */
  showLoading(show, message = 'Loading...') {
    if (!this.loadingElement) return;
    
    if (show) {
      // Update message if needed
      const textElement = this.loadingElement.querySelector('div:not(:first-child)');
      if (textElement) {
        textElement.textContent = message;
      }
      
      // Show loading indicator
      this.loadingElement.style.display = 'flex';
      this._emitEvent('loading-show', { message });
    } else {
      // Hide loading indicator
      this.loadingElement.style.display = 'none';
      this._emitEvent('loading-hide');
    }
  }
  
  /**
   * Enable or disable notifications
   * @param {boolean} enabled - Whether notifications are enabled
   */
  setNotificationsEnabled(enabled) {
    this.notificationsEnabled = enabled;
  }
  
  /**
   * Check if notifications are enabled
   * @returns {boolean} - Whether notifications are enabled
   */
  isEnabled() {
    return this.notificationsEnabled;
  }
  
  /**
   * Get the current notification element
   * @returns {HTMLElement|null} - Current notification element or null
   */
  getNotificationElement() {
    return this.notificationElement;
  }
  
  /**
   * Create a notification element
   * @private
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('info', 'success', 'error')
   * @returns {HTMLElement} - Notification element
   */
  _createNotificationElement(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Apply base notification styles
    this._applyStyles(notification, this.options.styles.notification);
    
    // Apply type-specific styles
    switch (type) {
      case 'error':
        this._applyStyles(notification, this.options.styles.notificationError);
        break;
      case 'success':
        this._applyStyles(notification, this.options.styles.notificationSuccess);
        break;
      default:
        this._applyStyles(notification, this.options.styles.notificationInfo);
    }
    
    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'notification-close';
    this._applyStyles(closeButton, this.options.styles.notificationClose);
    
    // Add hover effect
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.opacity = '1';
    });
    
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.opacity = '0.7';
    });
    
    // Add click handler
    closeButton.addEventListener('click', () => {
      this.hideNotification();
    });
    
    notification.appendChild(closeButton);
    
    return notification;
  }
  
  /**
   * Create a navigation hint element
   * @private
   * @param {string} position - Hint position ('left' or 'right')
   * @param {string} text - Hint text
   * @returns {HTMLElement} - Navigation hint element
   */
  _createNavigationHintElement(position, text) {
    const hint = document.createElement('div');
    hint.className = `${this.options.navigationHintClassPrefix} ${this.options.navigationHintClassPrefix}-${position}`;
    hint.textContent = text;
    
    // Apply base navigation hint styles
    this._applyStyles(hint, this.options.styles.navigationHint);
    
    // Apply position-specific styles
    if (position === 'left') {
      this._applyStyles(hint, this.options.styles.navHintLeft);
    } else if (position === 'right') {
      this._applyStyles(hint, this.options.styles.navHintRight);
    }
    
    return hint;
  }
  
  /**
   * Apply styles to an element
   * @private
   * @param {HTMLElement} element - Element to style
   * @param {Object} styles - Styles to apply
   */
  _applyStyles(element, styles) {
    if (!element || !styles) return;
    
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  }
  
  /**
   * Add keyframe animations to document
   * @private
   */
  _addKeyframeAnimations() {
    // Check if animations already exist
    if (document.getElementById('ui-controller-keyframes')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'ui-controller-keyframes';
    
    // Create keyframes CSS
    let keyframesCSS = '';
    
    Object.entries(this.options.keyframes).forEach(([name, frames]) => {
      keyframesCSS += `@keyframes ${name} {\n`;
      
      frames.forEach((frame, index) => {
        const percentage = index === 0 ? '0%' : 
                          index === frames.length - 1 ? '100%' : 
                          `${Math.round(index / (frames.length - 1) * 100)}%`;
        
        keyframesCSS += `  ${percentage} {\n`;
        Object.entries(frame).forEach(([prop, value]) => {
          keyframesCSS += `    ${prop}: ${value};\n`;
        });
        keyframesCSS += `  }\n`;
      });
      
      keyframesCSS += '}\n';
    });
    
    // Add keyframes to style element
    styleElement.textContent = keyframesCSS;
    
    // Add to document head
    document.head.appendChild(styleElement);
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for shader loading events
    document.addEventListener('shader-manager-load-start', () => {
      this.showLoading(true, 'Loading shader...');
    });
    
    document.addEventListener('shader-manager-load-end', () => {
      this.showLoading(false);
    });
    
    // Listen for transition events
    document.addEventListener('transition-engine-transition-start', () => {
      // Could show a transitioning indicator if needed
    });
    
    document.addEventListener('transition-engine-transition-complete', () => {
      // Handle transition completion
    });
    
    // Listen for navigation events
    document.addEventListener('event-handler-navigation', () => {
      // Hide navigation hints when user navigates
      this.hideNavigationHints();
    });
  }
  
  /**
   * Emit an event
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event details
   */
  _emitEvent(type, detail = {}) {
    const event = new CustomEvent(`ui-controller-${type}`, {
      detail: {
        ...detail,
        uiController: this
      }
    });
    
    document.dispatchEvent(event);
  }
}

export default UIController;
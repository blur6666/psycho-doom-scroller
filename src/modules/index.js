/**
 * Main Application Module
 * 
 * Integrates WebGLCore, ShaderManager, and other modules to create
 * a modular WebGL application. Serves as an entry point for the proof of concept.
 */

import WebGLCore from './webgl-core.js';
import ShaderManager from './shader-manager.js';
import TransitionEngine from './transition-engine.js';
import EventHandler from './event-handler.js';
import UIController from './ui-controller.js';
import PerformanceOptimizer from './performance-optimizer.js';

class WebGLApplication {
  /**
   * Create a new WebGL application
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Default options
    this.options = Object.assign({
      canvasSelector: '#glsl-canvas',
      debug: false,
      preloadCount: 2,
      shuffleManifest: true,
      autoStart: true,
      transitionDuration: 1000,
      transitionEffect: 'fade',
      navigationCooldown: 500,
      preventDefaultEvents: true,
      notificationDuration: 3000,
      hintsEnabled: true,
      enableBatteryOptimization: true,
      autoAdjustQuality: true,
      fpsTarget: 60
    }, options);
    
    // Module instances
    this.webglCore = null;
    this.shaderManager = null;
    this.transitionEngine = null;
    this.eventHandler = null;
    this.uiController = null;
    this.performanceOptimizer = null;
    
    // State
    this.isRunning = false;
    this.animationFrameId = null;
    this.startTime = 0;
    
    // Bind methods to preserve 'this' context
    this.render = this.render.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this._handleError = this._handleError.bind(this);
  }
  
  /**
   * Initialize the application
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async init() {
    console.log('WebGLApplication: Initializing');
    
    try {
      // Create WebGLCore instance
      this.webglCore = new WebGLCore({
        debug: this.options.debug,
        contextAttributes: {
          alpha: true,
          antialias: true,
          depth: false
        }
      });
      
      // Find or create canvas
      let canvas;
      if (this.options.canvasSelector.startsWith('#')) {
        // Try to find existing canvas
        canvas = document.querySelector(this.options.canvasSelector);
        
        // Create canvas if not found
        if (!canvas) {
          console.log('WebGLApplication: Canvas not found, creating new one');
          canvas = document.createElement('canvas');
          canvas.id = this.options.canvasSelector.substring(1);
          document.body.appendChild(canvas);
          
          // Apply initial styles
          canvas.style.width = '100vw';
          canvas.style.height = '100vh';
          canvas.style.display = 'block';
        }
      } else {
        canvas = this.options.canvasSelector;
      }
      
      // Initialize WebGLCore
      const webglInitialized = this.webglCore.init(canvas);
      
      if (!webglInitialized) {
        throw new Error('Failed to initialize WebGLCore');
      }
      
      // Create UIController instance (early to handle loading indicators)
      this.uiController = new UIController(this.webglCore, {
        notificationDuration: this.options.notificationDuration,
        hintsEnabled: this.options.hintsEnabled
      });
      
      // Initialize UIController
      const uiControllerInitialized = this.uiController.init();
      
      if (!uiControllerInitialized) {
        throw new Error('Failed to initialize UIController');
      }
      
      // Show loading indicator
      this.uiController.showLoading(true, 'Initializing application...');
      
      // Create ShaderManager instance
      this.shaderManager = new ShaderManager(this.webglCore, {
        enableCache: true,
        preloadCount: this.options.preloadCount,
        shuffleManifest: this.options.shuffleManifest
      });
      
      // Initialize ShaderManager
      const shaderManagerInitialized = await this.shaderManager.init();
      
      if (!shaderManagerInitialized) {
        throw new Error('Failed to initialize ShaderManager');
      }
      
      // Create TransitionEngine instance
      this.transitionEngine = new TransitionEngine(this.webglCore, this.shaderManager, {
        duration: this.options.transitionDuration,
        defaultEffect: this.options.transitionEffect
      });
      
      // Initialize TransitionEngine
      const transitionEngineInitialized = this.transitionEngine.init();
      
      if (!transitionEngineInitialized) {
        throw new Error('Failed to initialize TransitionEngine');
      }
      
      // Create EventHandler instance
      this.eventHandler = new EventHandler(
        this.webglCore,
        this.shaderManager,
        this.transitionEngine,
        {
          navigationCooldown: this.options.navigationCooldown,
          preventDefaultEvents: this.options.preventDefaultEvents
        }
      );
      
      // Initialize EventHandler
      const eventHandlerInitialized = this.eventHandler.init();
      
      if (!eventHandlerInitialized) {
        throw new Error('Failed to initialize EventHandler');
      }
      
      // Create PerformanceOptimizer instance
      this.performanceOptimizer = new PerformanceOptimizer(
        this.webglCore, 
        this.shaderManager, 
        {
          preloadCount: this.options.preloadCount,
          fpsTarget: this.options.fpsTarget,
          enableBatteryOptimization: this.options.enableBatteryOptimization,
          autoAdjustQuality: this.options.autoAdjustQuality
        }
      );
      
      // Initialize PerformanceOptimizer
      const performanceOptimizerInitialized = this.performanceOptimizer.init();
      
      if (!performanceOptimizerInitialized) {
        throw new Error('Failed to initialize PerformanceOptimizer');
      }
      
      // Set up error handling listeners
      this._setupErrorHandlers();
      
      // Load initial shader
      if (this.shaderManager.getManifest().length > 0) {
        this.uiController.showLoading(true, 'Loading initial shader...');
        
        // Select a random shader as the first shader
        const randomInitialIndex = Math.floor(Math.random() * this.shaderManager.getManifest().length);
        console.log(`WebGLApplication: Starting with random shader index: ${randomInitialIndex}`);
        
        // Load the randomly selected first shader
        const initialShader = await this.shaderManager.loadShaderByIndex(randomInitialIndex);
        
        if (!initialShader) {
          this.uiController.showNotification('Failed to load initial shader, trying another one', 'warning');
          console.warn('WebGLApplication: Failed to load initial shader, trying next one');
          // Try next shader
          const nextIndex = (randomInitialIndex + 1) % this.shaderManager.getManifest().length;
          await this.shaderManager.loadShaderByIndex(nextIndex);
        }
        
        // Hide loading indicator
        this.uiController.showLoading(false);
        
        // Show success notification
        this.uiController.showNotification('Shader loaded successfully', 'success');
        
        // Preload shaders using the performance optimizer
        setTimeout(() => {
          this.performanceOptimizer.preloadShaders(this.options.preloadCount, true);
        }, 500);
      } else {
        this.uiController.showLoading(false);
        this.uiController.showNotification('No shaders found in manifest', 'error');
        console.warn('WebGLApplication: No shaders found in manifest');
      }
      
      // Start render loop if autoStart is true
      if (this.options.autoStart) {
        this.start();
      }
      
      console.log('WebGLApplication: Initialization complete');
      return true;
    } catch (error) {
      console.error('WebGLApplication: Initialization failed', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Start the render loop
   */
  start() {
    if (this.isRunning) return;
    
    console.log('WebGLApplication: Starting render loop');
    this.isRunning = true;
    this.startTime = performance.now();
    this.render();
  }
  
  /**
   * Stop the render loop
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('WebGLApplication: Stopping render loop');
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Destroy the application and release resources
   */
  destroy() {
    console.log('WebGLApplication: Destroying');
    
    // Stop render loop
    this.stop();
    
    // Clean up error handlers
    document.removeEventListener('shader-manager-error', this._handleError);
    document.removeEventListener('webgl-context-lost', this._handleError);
    document.removeEventListener('transition-engine-error', this._handleError);
    document.removeEventListener('event-handler-error', this._handleError);
    document.removeEventListener('ui-controller-error', this._handleError);
    document.removeEventListener('performance-optimizer-error', this._handleError);
    
    // Clean up modules in reverse order of creation
    if (this.performanceOptimizer) {
      this.performanceOptimizer.destroy();
      this.performanceOptimizer = null;
    }
    
    if (this.uiController) {
      this.uiController.destroy();
      this.uiController = null;
    }
    
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    
    if (this.transitionEngine) {
      this.transitionEngine.destroy();
      this.transitionEngine = null;
    }
    
    if (this.shaderManager) {
      this.shaderManager.destroy();
      this.shaderManager = null;
    }
    
    if (this.webglCore) {
      this.webglCore.destroy();
      this.webglCore = null;
    }
  }
  
  /**
   * Handle window resize events
   */
  handleResize() {
    if (this.webglCore) {
      this.webglCore.handleResize();
    }
  }
  
  /**
   * Render loop
   * @param {number} time - Current time in milliseconds
   */
  render(time) {
    if (!this.isRunning) return;
    
    // Get WebGL context
    const gl = this.webglCore.getContext();
    
    if (!gl) {
      console.error('WebGLApplication: WebGL context not available');
      this.stop();
      return;
    }
    
    // Clear canvas
    this.webglCore.clear();
    
    // Calculate elapsed time
    const currentTime = time || performance.now();
    const elapsedTime = currentTime - this.startTime;
    
    // Check if transition is active
    if (this.transitionEngine && this.transitionEngine.isTransitioning()) {
      // Render transition
      this.transitionEngine.render(currentTime);
    } else {
      // Get current shader program
      const currentShader = this.shaderManager.getCurrentShader();
      
      if (currentShader) {
        // Use shader program
        this.webglCore.useProgram(currentShader.program);
        
        // Set uniforms
        const uniformLocs = {};
        uniformLocs.resolution = gl.getUniformLocation(currentShader.program, 'u_resolution');
        uniformLocs.time = gl.getUniformLocation(currentShader.program, 'u_time');
        uniformLocs.aspectRatio = gl.getUniformLocation(currentShader.program, 'u_aspectRatio');
        
        // Calculate aspect ratio
        const canvas = this.webglCore.getCanvas();
        const aspectRatio = canvas.width / canvas.height;
        
        // Set standard uniforms if they exist
        if (uniformLocs.resolution) {
          gl.uniform2f(uniformLocs.resolution, canvas.width, canvas.height);
        }
        
        if (uniformLocs.time) {
          // Convert time to seconds
          gl.uniform1f(uniformLocs.time, elapsedTime / 1000.0);
        }
        
        if (uniformLocs.aspectRatio) {
          gl.uniform1f(uniformLocs.aspectRatio, aspectRatio);
        }
        
        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Increment draw call counter
        this.webglCore.perfCounters.drawCalls++;
      }
    }
    
    // Continue the render loop
    this.animationFrameId = requestAnimationFrame(this.render);
  }
  
  /**
   * Navigate to next shader
   * @returns {Promise<boolean>} - Whether navigation was successful
   */
  async nextShader() {
    if (!this.shaderManager || !this.transitionEngine) return false;
    
    // Don't start a new transition if one is already active
    if (this.transitionEngine.isTransitioning()) {
      this.uiController?.showNotification('Transition already in progress', 'info');
      console.warn('WebGLApplication: Transition already in progress');
      return false;
    }
    
    // Calculate the next index (with wraparound)
    const currentIndex = this.shaderManager.getCurrentShaderIndex();
    const nextIndex = (currentIndex + 1) % this.shaderManager.getManifest().length;
    
    try {
      // Start transition to next shader
      const result = await this.transitionEngine.startTransition(nextIndex, 1);
      
      if (result) {
        const shaderInfo = this.shaderManager.getManifest()[nextIndex];
        if (shaderInfo && shaderInfo.name) {
          this.uiController?.showNotification(`Loaded: ${shaderInfo.name}`, 'success');
        }
        
        // Queue more shaders for preloading
        if (this.performanceOptimizer) {
          this.performanceOptimizer.preloadShaders();
        }
      }
      
      return result;
    } catch (error) {
      console.error('WebGLApplication: Failed to navigate to next shader', error);
      this.uiController?.showNotification('Failed to navigate to next shader', 'error');
      return false;
    }
  }
  
  /**
   * Navigate to previous shader
   * @returns {Promise<boolean>} - Whether navigation was successful
   */
  async prevShader() {
    if (!this.shaderManager || !this.transitionEngine) return false;
    
    // Don't start a new transition if one is already active
    if (this.transitionEngine.isTransitioning()) {
      this.uiController?.showNotification('Transition already in progress', 'info');
      console.warn('WebGLApplication: Transition already in progress');
      return false;
    }
    
    // Calculate the previous index (with wraparound)
    const currentIndex = this.shaderManager.getCurrentShaderIndex();
    const prevIndex = (currentIndex - 1 + this.shaderManager.getManifest().length) % 
                      this.shaderManager.getManifest().length;
    
    try {
      // Start transition to previous shader
      const result = await this.transitionEngine.startTransition(prevIndex, -1);
      
      if (result) {
        const shaderInfo = this.shaderManager.getManifest()[prevIndex];
        if (shaderInfo && shaderInfo.name) {
          this.uiController?.showNotification(`Loaded: ${shaderInfo.name}`, 'success');
        }
        
        // Queue more shaders for preloading
        if (this.performanceOptimizer) {
          this.performanceOptimizer.preloadShaders();
        }
      }
      
      return result;
    } catch (error) {
      console.error('WebGLApplication: Failed to navigate to previous shader', error);
      this.uiController?.showNotification('Failed to navigate to previous shader', 'error');
      return false;
    }
  }
  
  /**
   * Navigate to a random shader
   * @returns {Promise<boolean>} - Whether navigation was successful
   */
  async randomShader() {
    if (!this.shaderManager || !this.transitionEngine) return false;
    
    // Don't start a new transition if one is already active
    if (this.transitionEngine.isTransitioning()) {
      this.uiController?.showNotification('Transition already in progress', 'info');
      console.warn('WebGLApplication: Transition already in progress');
      return false;
    }
    
    const currentIndex = this.shaderManager.getCurrentShaderIndex();
    const manifestLength = this.shaderManager.getManifest().length;
    
    if (manifestLength <= 1) return false;
    
    // Make sure we don't select the current shader
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * manifestLength);
    } while (randomIndex === currentIndex);
    
    try {
      // Start transition to random shader
      const result = await this.transitionEngine.startTransition(randomIndex, 
                                           randomIndex > currentIndex ? 1 : -1);
      
      if (result) {
        const shaderInfo = this.shaderManager.getManifest()[randomIndex];
        if (shaderInfo && shaderInfo.name) {
          this.uiController?.showNotification(`Loaded: ${shaderInfo.name}`, 'success');
        }
        
        // Queue more shaders for preloading
        if (this.performanceOptimizer) {
          this.performanceOptimizer.preloadShaders();
        }
      }
      
      return result;
    } catch (error) {
      console.error('WebGLApplication: Failed to navigate to random shader', error);
      this.uiController?.showNotification('Failed to navigate to random shader', 'error');
      return false;
    }
  }
  
  /**
   * Get performance metrics
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {
      fps: 0,
      drawCalls: 0,
      programSwitches: 0,
      stateChanges: 0,
      isTransitioning: false,
      transitionProgress: 0,
      batteryStatus: {
        monitoring: false,
        level: 1.0,
        charging: true
      }
    };
    
    if (this.webglCore) {
      const webglMetrics = this.webglCore.getPerformanceMetrics();
      metrics.drawCalls = webglMetrics.drawCalls;
      metrics.programSwitches = webglMetrics.programSwitches;
      metrics.stateChanges = webglMetrics.stateChanges;
    }
    
    if (this.transitionEngine) {
      metrics.isTransitioning = this.transitionEngine.isTransitioning();
      metrics.transitionProgress = this.transitionEngine.getTransitionProgress();
    }
    
    if (this.performanceOptimizer) {
      metrics.fps = this.performanceOptimizer.getCurrentFps();
      metrics.batteryStatus = this.performanceOptimizer.getBatteryStatus();
      metrics.queueLength = this.performanceOptimizer.getQueueLength();
      metrics.isProcessingQueue = this.performanceOptimizer.isProcessingQueue();
      metrics.resourceUsage = this.performanceOptimizer.getResourceUsage();
    }
    
    return metrics;
  }
  
  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    if (this.webglCore) {
      this.webglCore.resetPerformanceMetrics();
    }
  }
  
  /**
   * Set up error handlers for all modules
   * @private
   */
  _setupErrorHandlers() {
    // Error handling
    document.addEventListener('shader-manager-error', this._handleError);
    document.addEventListener('webgl-context-lost', this._handleError);
    document.addEventListener('transition-engine-error', this._handleError);
    document.addEventListener('event-handler-error', this._handleError);
    document.addEventListener('ui-controller-error', this._handleError);
    document.addEventListener('performance-optimizer-error', this._handleError);
    
    // Handle context restoration
    document.addEventListener('webgl-context-restored', () => {
      console.log('WebGLApplication: WebGL context restored, reloading current shader');
      this.uiController?.showNotification('WebGL context restored, reloading shader', 'info');
      
      // Reload current shader
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      if (currentIndex >= 0) {
        this.shaderManager.loadShaderByIndex(currentIndex);
      }
    });
    
    // Handle transition events
    document.addEventListener('transition-engine-transition-complete', (event) => {
      console.log('WebGLApplication: Transition completed');
    });
    
    // Handle navigation events from event handler
    document.addEventListener('event-handler-navigation', (event) => {
      const direction = event.detail.direction;
      
      // Convert direction to navigation method
      if (direction === 0) {
        this.randomShader();
      } else if (direction > 0) {
        this.nextShader();
      } else {
        this.prevShader();
      }
    });
    
    // Handle resize events from event handler
    document.addEventListener('event-handler-resize', () => {
      this.handleResize();
    });
    
    // Show navigation hints when requested
    document.addEventListener('event-handler-hints-requested', () => {
      this.uiController?.showNavigationHints();
    });
    
    // Handle performance warning events
    document.addEventListener('performance-optimizer-memory-warning', (event) => {
      const { usage, threshold } = event.detail;
      const usageMB = (usage / (1024 * 1024)).toFixed(1);
      const thresholdMB = (threshold / (1024 * 1024)).toFixed(1);
      
      this.uiController?.showNotification(
        `High memory usage: ${usageMB}MB (threshold: ${thresholdMB}MB)`,
        'warning'
      );
    });
    
    document.addEventListener('performance-optimizer-compile-time-warning', (event) => {
      const { index, time, threshold } = event.detail;
      
      this.uiController?.showNotification(
        `Slow shader compilation: ${time.toFixed(0)}ms (threshold: ${threshold}ms)`,
        'warning'
      );
    });
    
    // Update FPS display when FPS changes
    document.addEventListener('performance-optimizer-fps-update', (event) => {
      const { fps, average } = event.detail;
      // This could be used to update a UI element showing FPS
    });
    
    // When battery status changes
    document.addEventListener('performance-optimizer-battery-status', (event) => {
      const { level, charging } = event.detail;
      
      if (!charging && level < 0.2) {
        this.uiController?.showNotification(
          `Low battery (${Math.round(level * 100)}%). Performance optimizations enabled.`,
          'info'
        );
      }
    });
  }
  
  /**
   * Handle errors
   * @private
   * @param {Event|Error} errorOrEvent - Error object or event with error details
   */
  _handleError(errorOrEvent) {
    let error, errorMessage;
    
    if (errorOrEvent instanceof Event && errorOrEvent.detail) {
      error = errorOrEvent.detail.error;
      errorMessage = errorOrEvent.detail.message || 'Unknown error';
    } else if (errorOrEvent instanceof Error) {
      error = errorOrEvent;
      errorMessage = error.message;
    } else {
      error = new Error('Unknown error');
      errorMessage = 'An unknown error occurred';
    }
    
    console.error('WebGLApplication: Error occurred', errorMessage, error);
    
    // Use UIController for notifications if available
    if (this.uiController) {
      this.uiController.showNotification(errorMessage, 'error');
    } else {
      // Fallback to direct DOM manipulation
      const notification = document.createElement('div');
      notification.className = 'webgl-notification error';
      notification.textContent = errorMessage;
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.className = 'notification-close';
      closeButton.addEventListener('click', () => {
        document.body.removeChild(notification);
      });
      notification.appendChild(closeButton);
      
      // Add to DOM
      document.body.appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
    }
  }
}

export default WebGLApplication;
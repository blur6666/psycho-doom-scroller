/**
 * PerformanceOptimizer Module
 * 
 * Responsible for managing shader compilation queue, implementing resource
 * management, handling performance tuning, and monitoring rendering performance.
 */

class PerformanceOptimizer {
  /**
   * Create a new PerformanceOptimizer instance
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {ShaderManager} shaderManager - The ShaderManager instance
   * @param {Object} options - Configuration options
   */
  constructor(webglCore, shaderManager, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    this.shaderManager = shaderManager;
    
    // Compilation queue state
    this.compilationQueue = [];
    this.isProcessing = false;
    this.preloadCount = options.preloadCount || 2;
    
    // Performance state
    this.fpsHistory = [];
    this.fpsHistoryLength = options.fpsHistoryLength || 60;
    this.lastFpsUpdate = 0;
    this.frameCount = 0;
    this.lastPerformanceAdjustment = 0;
    
    // Resource tracking
    this.resourceUsage = {
      textureCount: 0,
      bufferCount: 0,
      programCount: 0,
      totalMemoryEstimate: 0
    };
    
    // Battery monitoring
    this.batteryMonitoring = false;
    this.batteryLevel = 1.0; // Default to full battery
    this.batteryCharging = true; // Default to charging
    
    // Inactivity monitoring
    this.inactivityTimer = null;
    this.lastActivityTime = Date.now();
    this.inactivityThreshold = options.inactivityThreshold || 60000; // 1 minute default
    
    // Configuration
    this.options = Object.assign({
      preloadCount: 2,
      queueProcessDelay: 100, // ms delay between processing queue items
      fpsHistoryLength: 60,
      fpsTarget: 60,
      inactivityThreshold: 60000, // 1 minute
      inactivityFramerate: 10, // Target fps when inactive
      memoryWarningThreshold: 500 * 1024 * 1024, // 500MB
      enableBatteryOptimization: true,
      lowBatteryThreshold: 0.3, // 30%
      batteryOptimizationMode: {
        preloadCount: 1,
        fpsTarget: 30
      },
      autoAdjustQuality: true,
      qualityAdjustmentInterval: 10000, // 10 seconds
      performanceProfilingInterval: 1000, // 1 second
      compileTimeWarningThreshold: 100 // ms
    }, options);
    
    // Bind methods to preserve 'this' context
    this.queueShadersForCompilation = this.queueShadersForCompilation.bind(this);
    this.processShaderQueue = this.processShaderQueue.bind(this);
    this._processNextShaderInQueue = this._processNextShaderInQueue.bind(this);
    this._updateFps = this._updateFps.bind(this);
    this._monitorPerformance = this._monitorPerformance.bind(this);
    this._resetInactivityTimer = this._resetInactivityTimer.bind(this);
    this._handleInactivity = this._handleInactivity.bind(this);
    this._handleBatteryStatus = this._handleBatteryStatus.bind(this);
    this._emitEvent = this._emitEvent.bind(this);
  }
  
  /**
   * Initialize the PerformanceOptimizer
   * @returns {boolean} - Whether initialization was successful
   */
  init() {
    // Set up performance monitoring
    this._setupPerformanceMonitoring();
    
    // Set up battery monitoring if supported
    this._setupBatteryMonitoring();
    
    // Set up inactivity monitoring
    this._setupInactivityMonitoring();
    
    // Set up WebGL context loss handling
    document.addEventListener('webgl-context-lost', () => {
      this.compilationQueue = [];
      this.isProcessing = false;
    });
    
    // Set up periodic performance adjustments if enabled
    if (this.options.autoAdjustQuality) {
      setInterval(() => {
        this._adjustPerformance();
      }, this.options.qualityAdjustmentInterval);
    }
    
    console.log('PerformanceOptimizer: Initialized');
    this._emitEvent('initialized');
    
    return true;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear any pending timeouts
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    // Clear compilation queue
    this.compilationQueue = [];
    this.isProcessing = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this._resetInactivityTimer);
    document.removeEventListener('keydown', this._resetInactivityTimer);
    document.removeEventListener('click', this._resetInactivityTimer);
    document.removeEventListener('touchstart', this._resetInactivityTimer);
    
    console.log('PerformanceOptimizer: Destroyed');
  }
  
  /**
   * Queue shaders for compilation
   * @param {number} startIndex - Starting index in manifest
   * @param {number} count - Number of shaders to queue
   */
  queueShadersForCompilation(startIndex, count) {
    if (!this.shaderManager) return;
    
    const manifest = this.shaderManager.getManifest();
    if (!manifest || manifest.length <= 1) return;
    
    // Limit count to reasonable values
    const actualCount = Math.min(count, manifest.length - 1);
    
    console.log(`PerformanceOptimizer: Adding ${actualCount} shaders to compilation queue...`);
    
    // Add each of the next N shaders to the queue
    for (let i = 0; i < actualCount; i++) {
      // Calculate the index with wraparound
      const nextIndex = (startIndex + i + 1) % manifest.length;
      
      // Skip if we've wrapped around back to current index
      if (nextIndex === this.shaderManager.getCurrentShaderIndex()) continue;
      
      // Skip if already in queue
      if (this.compilationQueue.includes(nextIndex)) continue;
      
      // Add to queue
      this.compilationQueue.push(nextIndex);
      console.log(`PerformanceOptimizer: Added shader index ${nextIndex} to compilation queue`);
    }
    
    // Start processing the queue if not already processing
    if (!this.isProcessing) {
      this.processShaderQueue();
    }
  }
  
  /**
   * Process the shader compilation queue
   */
  async processShaderQueue() {
    // If queue is empty or already processing, exit
    if (this.compilationQueue.length === 0 || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this._emitEvent('queue-processing-start', { queueLength: this.compilationQueue.length });
    
    // Process one shader at a time
    await this._processNextShaderInQueue();
  }
  
  /**
   * Preload shaders for smoother transitions
   * @param {number} count - Number of shaders to preload
   * @param {boolean} isInitialLoad - Whether this is the initial application load
   */
  preloadShaders(count = this.preloadCount, isInitialLoad = false) {
    // Use default preload count
    const preloadCount = isInitialLoad ? count : this.preloadCount;
    
    // Adjust preload count based on battery status if optimizations enabled
    let adjustedCount = preloadCount;
    if (this.options.enableBatteryOptimization && 
        this.batteryMonitoring && 
        !this.batteryCharging && 
        this.batteryLevel < this.options.lowBatteryThreshold) {
      adjustedCount = this.options.batteryOptimizationMode.preloadCount;
    }
    
    // Queue shaders for compilation
    if (this.shaderManager) {
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      this.queueShadersForCompilation(currentIndex, adjustedCount);
    }
  }
  
  /**
   * Optimize for battery life
   */
  optimizeForBattery() {
    if (!this.options.enableBatteryOptimization) return;
    
    if (!this.batteryCharging && this.batteryLevel < this.options.lowBatteryThreshold) {
      // Apply battery-saving optimizations
      console.log('PerformanceOptimizer: Applying battery-saving optimizations');
      
      // Reduce preload count
      this.preloadCount = this.options.batteryOptimizationMode.preloadCount;
      
      // Lower target fps
      if (this.options.fpsTarget > this.options.batteryOptimizationMode.fpsTarget) {
        this.options.fpsTarget = this.options.batteryOptimizationMode.fpsTarget;
        this._emitEvent('fps-target-changed', { target: this.options.fpsTarget });
      }
    } else {
      // Restore normal settings
      this.preloadCount = this.options.preloadCount;
      this.options.fpsTarget = this.options.originalFpsTarget || 60;
      this._emitEvent('fps-target-changed', { target: this.options.fpsTarget });
    }
  }
  
  /**
   * Get the queue length
   * @returns {number} - Number of shaders in the queue
   */
  getQueueLength() {
    return this.compilationQueue.length;
  }
  
  /**
   * Check if the queue is currently being processed
   * @returns {boolean} - Whether queue is being processed
   */
  isProcessingQueue() {
    return this.isProcessing;
  }
  
  /**
   * Get the current preload count
   * @returns {number} - Preload count
   */
  getPreloadCount() {
    return this.preloadCount;
  }
  
  /**
   * Get the current FPS (averaged over history)
   * @returns {number} - Current FPS
   */
  getCurrentFps() {
    if (this.fpsHistory.length === 0) return 0;
    
    // Calculate average FPS from history
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }
  
  /**
   * Get resource usage metrics
   * @returns {Object} - Resource usage metrics
   */
  getResourceUsage() {
    return { ...this.resourceUsage };
  }
  
  /**
   * Get battery status
   * @returns {Object} - Battery status
   */
  getBatteryStatus() {
    return {
      monitoring: this.batteryMonitoring,
      level: this.batteryLevel,
      charging: this.batteryCharging
    };
  }
  
  /**
   * Process the next shader in the compilation queue
   * @private
   */
  async _processNextShaderInQueue() {
    // If queue is empty, exit
    if (this.compilationQueue.length === 0) {
      this.isProcessing = false;
      this._emitEvent('queue-processing-end');
      return;
    }
    
    // Get the next shader index
    const nextIndex = this.compilationQueue.shift();
    
    console.log(`PerformanceOptimizer: Processing shader ${nextIndex} from compilation queue (${this.compilationQueue.length} remaining)`);
    
    try {
      // Measure compilation time
      const startTime = performance.now();
      
      // Compile the shader (but don't set as current)
      await this.shaderManager.loadShaderByIndex(nextIndex, true);
      
      const endTime = performance.now();
      const compilationTime = endTime - startTime;
      
      console.log(`PerformanceOptimizer: Successfully compiled shader ${nextIndex} in ${compilationTime.toFixed(1)}ms`);
      
      // Check if compilation took too long
      if (compilationTime > this.options.compileTimeWarningThreshold) {
        console.warn(`PerformanceOptimizer: Shader ${nextIndex} took ${compilationTime.toFixed(1)}ms to compile (above threshold of ${this.options.compileTimeWarningThreshold}ms)`);
        this._emitEvent('compile-time-warning', { 
          index: nextIndex, 
          time: compilationTime,
          threshold: this.options.compileTimeWarningThreshold
        });
      }
    } catch (error) {
      console.warn(`PerformanceOptimizer: Failed to compile shader ${nextIndex}:`, error);
    }
    
    // Wait a small delay before processing the next item
    // This gives the browser time to handle user interactions
    if (this.compilationQueue.length > 0) {
      setTimeout(this._processNextShaderInQueue, this.options.queueProcessDelay);
    } else {
      this.isProcessing = false;
      this._emitEvent('queue-processing-end');
      console.log("PerformanceOptimizer: Compilation queue is now empty");
    }
  }
  
  /**
   * Set up performance monitoring
   * @private
   */
  _setupPerformanceMonitoring() {
    // Store original FPS target
    this.options.originalFpsTarget = this.options.fpsTarget;
    
    // Set up FPS counter
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;
    
    // Set up performance monitoring interval
    setInterval(() => {
      this._monitorPerformance();
    }, this.options.performanceProfilingInterval);
    
    // Add callback to update frame count
    const frameCallback = () => {
      this.frameCount++;
      this._updateFps();
      requestAnimationFrame(frameCallback);
    };
    
    requestAnimationFrame(frameCallback);
  }
  
  /**
   * Update FPS measurement
   * @private
   */
  _updateFps() {
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;
    
    // Update FPS once per second
    if (elapsed >= 1000) {
      const fps = (this.frameCount * 1000) / elapsed;
      
      // Add to history
      this.fpsHistory.push(fps);
      
      // Limit history length
      if (this.fpsHistory.length > this.fpsHistoryLength) {
        this.fpsHistory.shift();
      }
      
      // Reset counters
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      
      // Emit FPS update event
      this._emitEvent('fps-update', { fps, average: this.getCurrentFps() });
    }
  }
  
  /**
   * Monitor overall performance
   * @private
   */
  _monitorPerformance() {
    // Update resource usage metrics
    this._updateResourceUsage();
    
    // Check for memory warnings
    if (this.resourceUsage.totalMemoryEstimate > this.options.memoryWarningThreshold) {
      console.warn(`PerformanceOptimizer: Memory usage (${(this.resourceUsage.totalMemoryEstimate / (1024 * 1024)).toFixed(1)}MB) exceeds threshold (${(this.options.memoryWarningThreshold / (1024 * 1024)).toFixed(1)}MB)`);
      this._emitEvent('memory-warning', { 
        usage: this.resourceUsage.totalMemoryEstimate,
        threshold: this.options.memoryWarningThreshold
      });
    }
    
    // Emit performance metrics event
    this._emitEvent('performance-metrics', {
      fps: this.getCurrentFps(),
      resources: this.resourceUsage,
      battery: {
        level: this.batteryLevel,
        charging: this.batteryCharging
      }
    });
  }
  
  /**
   * Update resource usage metrics
   * @private
   */
  _updateResourceUsage() {
    const gl = this.webglCore.getContext();
    if (!gl) return;
    
    // This is an estimate as browsers don't expose precise memory usage
    let totalMemoryEstimate = 0;
    
    // Get WebGL extension for debugging info if available
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    
    // Update memory estimate based on programs, textures, etc.
    if (this.shaderManager) {
      // Estimate program memory (very rough approximation)
      const programCount = Object.keys(this.shaderManager.getCache()).length;
      this.resourceUsage.programCount = programCount;
      totalMemoryEstimate += programCount * 50 * 1024; // ~50KB per program
    }
    
    // Update total memory estimate
    this.resourceUsage.totalMemoryEstimate = totalMemoryEstimate;
  }
  
  /**
   * Adjust performance settings based on metrics
   * @private
   */
  _adjustPerformance() {
    // Skip if automatic adjustments are disabled
    if (!this.options.autoAdjustQuality) return;
    
    const now = performance.now();
    
    // Limit adjustment frequency
    if (now - this.lastPerformanceAdjustment < this.options.qualityAdjustmentInterval) return;
    this.lastPerformanceAdjustment = now;
    
    const currentFps = this.getCurrentFps();
    const targetFps = this.options.fpsTarget;
    
    // If FPS is too low, reduce quality settings
    if (currentFps < targetFps * 0.8 && currentFps > 0) {
      console.log(`PerformanceOptimizer: FPS (${currentFps}) below target (${targetFps}), reducing quality`);
      
      // Reduce preload count
      if (this.preloadCount > 1) {
        this.preloadCount--;
        this._emitEvent('quality-adjusted', { 
          setting: 'preloadCount', 
          value: this.preloadCount,
          reason: 'low-fps'
        });
      }
      
      // Add other quality reduction measures here
    }
    // If FPS is much higher than needed, could increase quality
    else if (currentFps > targetFps * 1.5 && this.preloadCount < this.options.preloadCount) {
      console.log(`PerformanceOptimizer: FPS (${currentFps}) well above target (${targetFps}), increasing quality`);
      
      // Increase preload count up to original setting
      if (this.preloadCount < this.options.preloadCount) {
        this.preloadCount++;
        this._emitEvent('quality-adjusted', { 
          setting: 'preloadCount', 
          value: this.preloadCount,
          reason: 'high-fps'
        });
      }
      
      // Add other quality improvement measures here
    }
  }
  
  /**
   * Set up battery monitoring
   * @private
   */
  _setupBatteryMonitoring() {
    // Skip if battery optimizations are disabled
    if (!this.options.enableBatteryOptimization) return;
    
    // Check if Battery API is supported
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        this.batteryMonitoring = true;
        
        // Initial battery status
        this.batteryLevel = battery.level;
        this.batteryCharging = battery.charging;
        
        // Set up battery event listeners
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this._handleBatteryStatus();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.batteryCharging = battery.charging;
          this._handleBatteryStatus();
        });
        
        // Initial optimization
        this._handleBatteryStatus();
        
        console.log(`PerformanceOptimizer: Battery monitoring enabled. Level: ${(this.batteryLevel * 100).toFixed(0)}%, Charging: ${this.batteryCharging}`);
      }).catch(error => {
        console.warn('PerformanceOptimizer: Battery monitoring not available', error);
        this.batteryMonitoring = false;
      });
    } else {
      console.log('PerformanceOptimizer: Battery API not supported');
      this.batteryMonitoring = false;
    }
  }
  
  /**
   * Handle battery status changes
   * @private
   */
  _handleBatteryStatus() {
    // Apply optimizations based on battery status
    this.optimizeForBattery();
    
    // Emit battery status event
    this._emitEvent('battery-status', { 
      level: this.batteryLevel,
      charging: this.batteryCharging
    });
  }
  
  /**
   * Set up inactivity monitoring
   * @private
   */
  _setupInactivityMonitoring() {
    // Set up event listeners for user activity
    document.addEventListener('mousemove', this._resetInactivityTimer);
    document.addEventListener('keydown', this._resetInactivityTimer);
    document.addEventListener('click', this._resetInactivityTimer);
    document.addEventListener('touchstart', this._resetInactivityTimer);
    
    // Initialize inactivity timer
    this._resetInactivityTimer();
  }
  
  /**
   * Reset inactivity timer
   * @private
   */
  _resetInactivityTimer() {
    // Clear existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    // Update last activity time
    const wasInactive = Date.now() - this.lastActivityTime > this.inactivityThreshold;
    this.lastActivityTime = Date.now();
    
    // If we were inactive but now have activity, restore normal settings
    if (wasInactive) {
      console.log('PerformanceOptimizer: Activity detected, restoring normal settings');
      
      // Restore original FPS target if it was lowered
      if (this.options.fpsTarget !== this.options.originalFpsTarget) {
        this.options.fpsTarget = this.options.originalFpsTarget;
        this._emitEvent('fps-target-changed', { target: this.options.fpsTarget });
      }
      
      this._emitEvent('activity-resumed');
    }
    
    // Set new inactivity timer
    this.inactivityTimer = setTimeout(this._handleInactivity, this.inactivityThreshold);
  }
  
  /**
   * Handle user inactivity
   * @private
   */
  _handleInactivity() {
    console.log('PerformanceOptimizer: User inactive, applying power-saving settings');
    
    // Lower FPS target during inactivity
    this.options.fpsTarget = this.options.inactivityFramerate;
    
    this._emitEvent('inactivity-detected', { 
      threshold: this.inactivityThreshold,
      newFpsTarget: this.options.fpsTarget
    });
  }
  
  /**
   * Emit an event
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event details
   */
  _emitEvent(type, detail = {}) {
    const event = new CustomEvent(`performance-optimizer-${type}`, {
      detail: {
        ...detail,
        performanceOptimizer: this
      }
    });
    
    document.dispatchEvent(event);
  }
}

export default PerformanceOptimizer;
/**
 * TransitionEngine Module
 * 
 * Responsible for managing shader transitions, implementing various transition effects,
 * handling transition timing and progress, and coordinating between shader programs
 * during transitions.
 */

class TransitionEngine {
  /**
   * Create a new TransitionEngine instance
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {ShaderManager} shaderManager - The ShaderManager instance
   * @param {Object} options - Configuration options
   * @param {number} options.duration - Default transition duration in milliseconds
   * @param {string} options.defaultEffect - Default transition effect
   * @param {Function} options.easingFunction - Default easing function
   */
  constructor(webglCore, shaderManager, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    this.shaderManager = shaderManager;
    
    // State
    this.active = false;
    this.startTime = 0;
    this.duration = options.duration || 1000; // Default 1 second
    this.progress = 0;
    this.direction = 1; // 1 for next, -1 for previous
    this.previousProgram = null;
    this.nextProgram = null;
    this.previousShader = null;
    this.nextShader = null;
    
    // Configuration
    this.options = Object.assign({
      duration: 1000,
      defaultEffect: 'fade',
      easingFunction: this._defaultEasing,
      blendMode: {
        src: null, // Will use WebGL defaults
        dst: null
      }
    }, options);
    
    // Bind methods to preserve 'this' context
    this.startTransition = this.startTransition.bind(this);
    this.updateTransition = this.updateTransition.bind(this);
    this.completeTransition = this.completeTransition.bind(this);
    this._emitEvent = this._emitEvent.bind(this);
  }
  
  /**
   * Initialize the TransitionEngine
   * @returns {boolean} - Whether initialization was successful
   */
  init() {
    console.log('TransitionEngine: Initialized');
    return true;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.completeTransition(true);
    console.log('TransitionEngine: Destroyed');
  }
  
  /**
   * Start a transition to the target shader
   * @param {number|string} targetShaderId - Target shader ID or index
   * @param {number} direction - Direction of transition (1 for next, -1 for previous)
   * @param {Object} options - Transition options
   * @returns {Promise<boolean>} - Whether transition was started successfully
   */
  async startTransition(targetShaderId, direction = 1, options = {}) {
    // Don't start a new transition if one is already active
    if (this.active) {
      console.warn('TransitionEngine: Transition already in progress');
      return false;
    }
    
    // Get WebGL context
    const gl = this.webglCore.getContext();
    if (!gl) {
      console.error('TransitionEngine: WebGL context not available');
      return false;
    }
    
    try {
      // Store current shader as previous
      this.previousShader = this.shaderManager.getCurrentShader();
      if (!this.previousShader) {
        console.warn('TransitionEngine: No current shader to transition from');
        return false;
      }
      
      this.previousProgram = this.previousShader.program;
      
      // Determine target shader index
      let targetIndex;
      if (typeof targetShaderId === 'number') {
        // Direct index provided
        targetIndex = targetShaderId;
      } else if (typeof targetShaderId === 'string') {
        // Shader ID provided, find its index
        const manifest = this.shaderManager.getManifest();
        targetIndex = manifest.findIndex(shader => shader.id === targetShaderId);
        
        if (targetIndex === -1) {
          console.error(`TransitionEngine: Shader with ID ${targetShaderId} not found`);
          return false;
        }
      } else {
        // Calculate based on direction
        const currentIndex = this.shaderManager.getCurrentShaderIndex();
        const manifestLength = this.shaderManager.getManifest().length;
        
        if (direction > 0) {
          // Next shader
          targetIndex = (currentIndex + 1) % manifestLength;
        } else {
          // Previous shader
          targetIndex = (currentIndex - 1 + manifestLength) % manifestLength;
        }
      }
      
      // Load target shader
      this.nextShader = await this.shaderManager.loadShaderByIndex(targetIndex, true);
      
      if (!this.nextShader) {
        console.error('TransitionEngine: Failed to load target shader');
        return false;
      }
      
      this.nextProgram = this.nextShader.program;
      
      // Set up transition state
      this.active = true;
      this.startTime = performance.now();
      this.duration = options.duration || this.options.duration;
      this.direction = direction;
      this.progress = 0;
      
      // Set up blend mode if needed
      if (options.blendMode || this.options.blendMode.src) {
        const src = (options.blendMode && options.blendMode.src) || this.options.blendMode.src;
        const dst = (options.blendMode && options.blendMode.dst) || this.options.blendMode.dst;
        
        if (src && dst) {
          this.webglCore.setBlendFunc(src, dst);
        }
      }
      
      // Enable blending for transitions
      this.webglCore.setCapability('blend', true);
      
      // Emit transition start event
      this._emitEvent('transition-start', {
        from: this.previousShader.id,
        to: this.nextShader.id,
        direction: this.direction
      });
      
      console.log(`TransitionEngine: Started transition from ${this.previousShader.id} to ${this.nextShader.id}`);
      return true;
    } catch (error) {
      console.error('TransitionEngine: Error starting transition', error);
      this.active = false;
      return false;
    }
  }
  
  /**
   * Update the transition progress
   * @param {number} time - Current time in milliseconds
   * @returns {number} - Current transition progress (0-1)
   */
  updateTransition(time) {
    if (!this.active) return 0;
    
    // Calculate raw progress
    const elapsed = time - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1.0);
    
    // Apply easing function
    const easingFn = this.options.easingFunction || this._defaultEasing;
    this.progress = easingFn(rawProgress);
    
    // Complete transition if finished
    if (rawProgress >= 1.0) {
      this.completeTransition();
    }
    
    return this.progress;
  }
  
  /**
   * Render the current transition state
   * @param {number} time - Current time in milliseconds
   */
  render(time) {
    if (!this.active || !this.previousProgram || !this.nextProgram) return;
    
    // Get WebGL context
    const gl = this.webglCore.getContext();
    if (!gl) return;
    
    // Update transition progress
    this.updateTransition(time);
    
    // Choose the appropriate rendering method based on effect
    const effect = this.options.defaultEffect;
    
    switch (effect) {
      case 'fade':
        this._renderFadeTransition(time);
        break;
      case 'slide':
        this._renderSlideTransition(time);
        break;
      default:
        this._renderFadeTransition(time);
    }
  }
  
  /**
   * Complete the current transition
   * @param {boolean} force - Whether to force completion regardless of progress
   */
  completeTransition(force = false) {
    if (!this.active) return;
    
    // If not forced, only complete if progress is near the end
    if (!force && this.progress < 0.95) return;
    
    // Emit transition complete event
    this._emitEvent('transition-complete', {
      shader: this.nextShader.id
    });
    
    // Clean up
    this.active = false;
    this.progress = 0;
    this.previousProgram = null;
    this.previousShader = null;
    
    console.log('TransitionEngine: Transition completed');
  }
  
  /**
   * Check if a transition is currently active
   * @returns {boolean} - Whether a transition is active
   */
  isTransitioning() {
    return this.active;
  }
  
  /**
   * Get the current transition progress
   * @returns {number} - Current progress (0-1)
   */
  getTransitionProgress() {
    return this.progress;
  }
  
  /**
   * Get the transition direction
   * @returns {number} - Direction (1 for next, -1 for previous)
   */
  getTransitionDirection() {
    return this.direction;
  }
  
  /**
   * Get the previous shader program
   * @returns {WebGLProgram} - Previous program
   */
  getPreviousProgram() {
    return this.previousProgram;
  }
  
  /**
   * Get the next shader program
   * @returns {WebGLProgram} - Next program
   */
  getNextProgram() {
    return this.nextProgram;
  }
  
  /**
   * Render a fade transition
   * @private
   * @param {number} time - Current time
   */
  _renderFadeTransition(time) {
    const gl = this.webglCore.getContext();
    const canvas = this.webglCore.getCanvas();
    
    if (!gl || !canvas) return;
    
    // Calculate aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    
    // First, render the previous shader with alpha = 1 - progress
    this.webglCore.useProgram(this.previousProgram);
    
    // Set uniforms for previous shader
    const prevUniforms = {
      u_resolution: [canvas.width, canvas.height],
      u_time: time / 1000.0,
      u_aspectRatio: aspectRatio,
      u_alpha: 1.0 - this.progress
    };
    
    // Set uniforms
    const uniformLocs = {};
    uniformLocs.resolution = gl.getUniformLocation(this.previousProgram, 'u_resolution');
    uniformLocs.time = gl.getUniformLocation(this.previousProgram, 'u_time');
    uniformLocs.aspectRatio = gl.getUniformLocation(this.previousProgram, 'u_aspectRatio');
    uniformLocs.alpha = gl.getUniformLocation(this.previousProgram, 'u_alpha');
    
    if (uniformLocs.resolution) {
      gl.uniform2f(uniformLocs.resolution, canvas.width, canvas.height);
    }
    
    if (uniformLocs.time) {
      gl.uniform1f(uniformLocs.time, time / 1000.0);
    }
    
    if (uniformLocs.aspectRatio) {
      gl.uniform1f(uniformLocs.aspectRatio, aspectRatio);
    }
    
    if (uniformLocs.alpha) {
      gl.uniform1f(uniformLocs.alpha, 1.0 - this.progress);
    }
    
    // Set blend function for fading
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw first shader
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Now render the next shader with alpha = progress
    this.webglCore.useProgram(this.nextProgram);
    
    // Set uniforms for next shader
    uniformLocs.resolution = gl.getUniformLocation(this.nextProgram, 'u_resolution');
    uniformLocs.time = gl.getUniformLocation(this.nextProgram, 'u_time');
    uniformLocs.aspectRatio = gl.getUniformLocation(this.nextProgram, 'u_aspectRatio');
    uniformLocs.alpha = gl.getUniformLocation(this.nextProgram, 'u_alpha');
    
    if (uniformLocs.resolution) {
      gl.uniform2f(uniformLocs.resolution, canvas.width, canvas.height);
    }
    
    if (uniformLocs.time) {
      gl.uniform1f(uniformLocs.time, time / 1000.0);
    }
    
    if (uniformLocs.aspectRatio) {
      gl.uniform1f(uniformLocs.aspectRatio, aspectRatio);
    }
    
    if (uniformLocs.alpha) {
      gl.uniform1f(uniformLocs.alpha, this.progress);
    }
    
    // Draw second shader
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  /**
   * Render a slide transition
   * @private
   * @param {number} time - Current time
   */
  _renderSlideTransition(time) {
    const gl = this.webglCore.getContext();
    const canvas = this.webglCore.getCanvas();
    
    if (!gl || !canvas) return;
    
    // Calculate aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    
    // Calculate offsets based on direction and progress
    const offset = this.direction * this.progress * 2.0; // *2 to move fully off-screen
    
    // First, render the previous shader sliding out
    this.webglCore.useProgram(this.previousProgram);
    
    // Set uniforms for previous shader
    const uniformLocs = {};
    uniformLocs.resolution = gl.getUniformLocation(this.previousProgram, 'u_resolution');
    uniformLocs.time = gl.getUniformLocation(this.previousProgram, 'u_time');
    uniformLocs.aspectRatio = gl.getUniformLocation(this.previousProgram, 'u_aspectRatio');
    uniformLocs.offset = gl.getUniformLocation(this.previousProgram, 'u_offset');
    
    if (uniformLocs.resolution) {
      gl.uniform2f(uniformLocs.resolution, canvas.width, canvas.height);
    }
    
    if (uniformLocs.time) {
      gl.uniform1f(uniformLocs.time, time / 1000.0);
    }
    
    if (uniformLocs.aspectRatio) {
      gl.uniform1f(uniformLocs.aspectRatio, aspectRatio);
    }
    
    if (uniformLocs.offset) {
      gl.uniform1f(uniformLocs.offset, -offset);
    }
    
    // Draw first shader
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Now render the next shader sliding in
    this.webglCore.useProgram(this.nextProgram);
    
    // Set uniforms for next shader
    uniformLocs.resolution = gl.getUniformLocation(this.nextProgram, 'u_resolution');
    uniformLocs.time = gl.getUniformLocation(this.nextProgram, 'u_time');
    uniformLocs.aspectRatio = gl.getUniformLocation(this.nextProgram, 'u_aspectRatio');
    uniformLocs.offset = gl.getUniformLocation(this.nextProgram, 'u_offset');
    
    if (uniformLocs.resolution) {
      gl.uniform2f(uniformLocs.resolution, canvas.width, canvas.height);
    }
    
    if (uniformLocs.time) {
      gl.uniform1f(uniformLocs.time, time / 1000.0);
    }
    
    if (uniformLocs.aspectRatio) {
      gl.uniform1f(uniformLocs.aspectRatio, aspectRatio);
    }
    
    if (uniformLocs.offset) {
      gl.uniform1f(uniformLocs.offset, 2.0 - offset); // Start off-screen (2.0) and slide in
    }
    
    // Draw second shader
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  /**
   * Default easing function (cubic ease-in-out)
   * @private
   * @param {number} t - Raw progress (0-1)
   * @returns {number} - Eased progress (0-1)
   */
  _defaultEasing(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Apply a specific easing function to raw progress
   * @private
   * @param {number} rawProgress - Raw linear progress (0-1)
   * @returns {number} - Eased progress (0-1)
   */
  _applyEasingFunction(rawProgress) {
    return this.options.easingFunction(rawProgress);
  }
  
  /**
   * Emit an event
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event details
   */
  _emitEvent(type, detail = {}) {
    const event = new CustomEvent(`transition-engine-${type}`, {
      detail: {
        ...detail,
        transitionEngine: this
      }
    });
    
    document.dispatchEvent(event);
  }
}

// Export module
export default TransitionEngine;
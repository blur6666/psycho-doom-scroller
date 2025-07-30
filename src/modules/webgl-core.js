/**
 * WebGLCore Module
 * 
 * Responsible for WebGL context management, basic rendering operations,
 * and providing an interface for the rendering pipeline.
 */

class WebGLCore {
  /**
   * Create a new WebGLCore instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.debug - Enable debug mode
   * @param {Object} options.contextAttributes - WebGL context attributes
   */
  constructor(options = {}) {
    // Core properties
    this.canvas = null;
    this.gl = null;
    this.currentProgram = null;
    this.options = Object.assign({
      debug: false,
      contextAttributes: {
        alpha: true,
        antialias: true,
        depth: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false
      }
    }, options);
    
    // Performance monitoring
    this.perfCounters = {
      drawCalls: 0,
      programSwitches: 0,
      stateChanges: 0,
      redundantStateChanges: 0, // New counter for tracking redundant state changes
      stateChangesByType: {} // Track changes by type
    };
    
    // State tracking (to help prevent WebGL state leakage)
    this._stateTracker = {
      blend: false,
      depthTest: false,
      scissorTest: false,
      cullFace: false,
      depthWrite: true,
      currentTextureUnit: 0,
      boundTextures: {},
      currentFramebuffer: null,
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      clearColor: [0, 0, 0, 1],
      blendFunc: { src: null, dst: null },
      blendEquation: null,
      depthFunc: null,
      cullFaceMode: null,
      lineWidth: 1.0,
      polygonOffset: { factor: 0, units: 0 },
      scissor: { x: 0, y: 0, width: 0, height: 0 },
      stencilFunc: { func: null, ref: 0, mask: 0xFFFFFFFF },
      stencilOp: { fail: null, zfail: null, zpass: null },
      stencilMask: 0xFFFFFFFF
    };
    
    // State change history for debugging
    this._stateChangeHistory = [];
    this._maxHistoryEntries = 100;
    
    // Default render states
    this.defaultState = {
      blend: false,
      depthTest: false,
      cullFace: false,
      depthWrite: true,
      clearColor: [0, 0, 0, 1],
      viewport: null // Will be set during initialization
    };
    
    // Bind methods to preserve 'this' context
    this._handleContextLost = this._handleContextLost.bind(this);
    this._handleContextRestored = this._handleContextRestored.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }
  
  /**
   * Initialize WebGL context on provided canvas
   * @param {HTMLCanvasElement|string} canvasOrSelector - Canvas element or selector
   * @returns {boolean} - Whether initialization was successful
   */
  init(canvasOrSelector) {
    // Get canvas element
    if (typeof canvasOrSelector === 'string') {
      this.canvas = document.querySelector(canvasOrSelector);
    } else {
      this.canvas = canvasOrSelector;
    }
    
    if (!this.canvas) {
      console.error('WebGLCore: Canvas not found');
      return false;
    }
    
    // Initialize WebGL context
    try {
      this.gl = this.canvas.getContext('webgl2', this.options.contextAttributes);
      
      if (!this.gl) {
        console.error('WebGLCore: WebGL2 not supported, trying WebGL1');
        this.gl = this.canvas.getContext('webgl', this.options.contextAttributes);
        
        if (!this.gl) {
          console.error('WebGLCore: WebGL not supported');
          return false;
        }
      }
      
      // Set up context loss handling
      this.canvas.addEventListener('webglcontextlost', this._handleContextLost);
      this.canvas.addEventListener('webglcontextrestored', this._handleContextRestored);
      
      // Set up initial viewport and clear color
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.handleResize();
      
      // Update default viewport state
      this.defaultState.viewport = {
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height
      };
      
      // Set up debugging if enabled
      if (this.options.debug) {
        this._setupDebugging();
      }
      
      // Initialize state tracker with actual GL state
      this._initializeStateTracker();
      
      console.log('WebGLCore: Initialized with', 
        this.gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1');
      
      return true;
    } catch (error) {
      console.error('WebGLCore: Error initializing WebGL context', error);
      return false;
    }
  }
  
  /**
   * Initialize state tracker with actual GL state
   * @private
   */
  _initializeStateTracker() {
    const gl = this.gl;
    if (!gl) return;
    
    // Query initial state from WebGL
    this._stateTracker.blend = gl.isEnabled(gl.BLEND);
    this._stateTracker.depthTest = gl.isEnabled(gl.DEPTH_TEST);
    this._stateTracker.cullFace = gl.isEnabled(gl.CULL_FACE);
    this._stateTracker.scissorTest = gl.isEnabled(gl.SCISSOR_TEST);
    
    // Get depth mask (depth writing)
    gl.getParameter(gl.DEPTH_WRITEMASK, this._stateTracker.depthWrite);
    
    // Get viewport
    const viewport = gl.getParameter(gl.VIEWPORT);
    this._stateTracker.viewport = {
      x: viewport[0],
      y: viewport[1],
      width: viewport[2],
      height: viewport[3]
    };
    
    // Get clear color
    const clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
    this._stateTracker.clearColor = [
      clearColor[0],
      clearColor[1],
      clearColor[2],
      clearColor[3]
    ];
    
    // Other state queries would go here
  }
  
  /**
   * Clean up resources and remove event listeners
   */
  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this._handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this._handleContextRestored);
    }
    
    // Delete any created WebGL resources
    if (this.gl) {
      // We're not deleting programs or shaders here as they might be managed by other components
      // Just null the references
      this.currentProgram = null;
      this.gl = null;
    }
    
    this.canvas = null;
    console.log('WebGLCore: Destroyed');
  }
  
  /**
   * Clear the canvas with current clear color
   */
  clear() {
    if (!this.gl) return;
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
  
  /**
   * Use a shader program and track it as the current program
   * @param {WebGLProgram} program - The WebGL program to use
   */
  useProgram(program) {
    if (!this.gl || !program) return;
    
    // Only switch if it's a different program
    if (program !== this.currentProgram) {
      this.perfCounters.programSwitches++;
      this.gl.useProgram(program);
      this.currentProgram = program;
    }
  }
  
  /**
   * Set the viewport to match canvas dimensions
   * @param {number} [width] - Optional explicit width
   * @param {number} [height] - Optional explicit height
   */
  setViewport(width, height) {
    if (!this.gl) return;
    
    width = width || this.canvas.width;
    height = height || this.canvas.height;
    
    const viewport = {
      x: 0,
      y: 0,
      width,
      height
    };
    
    this._applyViewport(viewport);
  }
  
  /**
   * Apply viewport settings
   * @private
   * @param {Object} viewport - Viewport settings
   */
  _applyViewport(viewport) {
    if (!this.gl) return;
    
    const current = this._stateTracker.viewport;
    
    // Only apply if different
    if (current.x !== viewport.x || 
        current.y !== viewport.y || 
        current.width !== viewport.width || 
        current.height !== viewport.height) {
      
      this.gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
      
      // Update state tracker
      this._stateTracker.viewport = { ...viewport };
      this._trackStateChange('viewport', viewport);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Resize the canvas to match its display size considering device pixel ratio
   * @returns {boolean} - Whether the canvas was resized
   */
  resizeCanvasToDisplaySize() {
    if (!this.canvas) return false;
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(this.canvas.clientWidth * dpr);
    const displayHeight = Math.floor(this.canvas.clientHeight * dpr);
    
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      return true;
    }
    
    return false;
  }
  
  /**
   * Handle resize events
   */
  handleResize() {
    if (this.resizeCanvasToDisplaySize()) {
      this.setViewport();
      return true;
    }
    return false;
  }
  
  /**
   * Get uniform location for the current program
   * @param {string} name - Uniform name
   * @returns {WebGLUniformLocation} - Uniform location
   */
  getUniformLocation(name) {
    if (!this.gl || !this.currentProgram) return null;
    
    return this.gl.getUniformLocation(this.currentProgram, name);
  }
  
  /**
   * Set uniform value based on its type
   * @param {WebGLUniformLocation} location - Uniform location
   * @param {*} value - Uniform value
   * @param {string} type - Uniform type (float, vec2, etc.)
   */
  setUniform(location, value, type) {
    if (!this.gl || !location) return;
    
    switch (type) {
      case 'float':
      case '1f':
        this.gl.uniform1f(location, value);
        break;
      case 'vec2':
      case '2f':
        this.gl.uniform2f(location, value[0], value[1]);
        break;
      case 'vec3':
      case '3f':
        this.gl.uniform3f(location, value[0], value[1], value[2]);
        break;
      case 'vec4':
      case '4f':
        this.gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        break;
      case 'int':
      case '1i':
        this.gl.uniform1i(location, value);
        break;
      case 'ivec2':
      case '2i':
        this.gl.uniform2i(location, value[0], value[1]);
        break;
      case 'ivec3':
      case '3i':
        this.gl.uniform3i(location, value[0], value[1], value[2]);
        break;
      case 'ivec4':
      case '4i':
        this.gl.uniform4i(location, value[0], value[1], value[2], value[3]);
        break;
      case 'mat2':
        this.gl.uniformMatrix2fv(location, false, value);
        break;
      case 'mat3':
        this.gl.uniformMatrix3fv(location, false, value);
        break;
      case 'mat4':
        this.gl.uniformMatrix4fv(location, false, value);
        break;
      default:
        console.warn(`WebGLCore: Unknown uniform type ${type}`);
    }
  }
  
  /**
   * Create a vertex buffer for a full-screen quad
   * @returns {WebGLBuffer} - Vertex buffer
   */
  createQuadBuffer() {
    if (!this.gl) return null;
    
    const positions = new Float32Array([
      -1.0, -1.0,  // Bottom-left
       1.0, -1.0,  // Bottom-right
      -1.0,  1.0,  // Top-left
       1.0,  1.0   // Top-right
    ]);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    return buffer;
  }
  
  /**
   * Set up vertex buffer for a fullscreen quad on the current program
   * @param {WebGLProgram} program - Shader program to use
   * @param {string} [positionAttribute='aVertexPosition'] - Name of position attribute
   */
  setupVertexBuffer(program, positionAttribute = 'aVertexPosition') {
    if (!this.gl || !program) return;
    
    // Create and bind vertex buffer if it doesn't exist
    if (!this._quadBuffer) {
      this._quadBuffer = this.createQuadBuffer();
    }
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._quadBuffer);
    
    // Set up vertex attributes
    const positionLocation = this.gl.getAttribLocation(program, positionAttribute);
    if (positionLocation >= 0) {
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    } else if (this.options.debug) {
      console.warn(`WebGLCore: Position attribute '${positionAttribute}' not found in shader program`);
    }
  }
  
  /**
   * Enable or disable WebGL capability with state tracking
   * @param {string} capability - Capability name ('blend', 'depthTest', etc.)
   * @param {boolean} enable - Whether to enable or disable
   */
  setCapability(capability, enable) {
    if (!this.gl) return;
    
    // Map capability string to WebGL enum
    let glCapability;
    let stateKey;
    
    switch (capability) {
      case 'blend':
        glCapability = this.gl.BLEND;
        stateKey = 'blend';
        break;
      case 'depthTest':
        glCapability = this.gl.DEPTH_TEST;
        stateKey = 'depthTest';
        break;
      case 'scissorTest':
        glCapability = this.gl.SCISSOR_TEST;
        stateKey = 'scissorTest';
        break;
      case 'cullFace':
        glCapability = this.gl.CULL_FACE;
        stateKey = 'cullFace';
        break;
      case 'stencilTest':
        glCapability = this.gl.STENCIL_TEST;
        stateKey = 'stencilTest';
        break;
      // Add more capabilities as needed
      default:
        console.warn(`WebGLCore: Unknown capability ${capability}`);
        return;
    }
    
    // Only change state if needed
    if (this._stateTracker[stateKey] !== enable) {
      this.perfCounters.stateChanges++;
      
      // Update type-specific counter
      if (!this.perfCounters.stateChangesByType[capability]) {
        this.perfCounters.stateChangesByType[capability] = 0;
      }
      this.perfCounters.stateChangesByType[capability]++;
      
      if (enable) {
        this.gl.enable(glCapability);
      } else {
        this.gl.disable(glCapability);
      }
      
      // Update state tracker
      this._stateTracker[stateKey] = enable;
      this._trackStateChange(capability, enable);
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set blend function with state tracking
   * @param {number} src - Source blend factor
   * @param {number} dst - Destination blend factor
   */
  setBlendFunc(src, dst) {
    if (!this.gl) return;
    
    // Enable blending if it's not already enabled
    this.setCapability('blend', true);
    
    // Only set if different
    if (this._stateTracker.blendFunc.src !== src || this._stateTracker.blendFunc.dst !== dst) {
      // Set blend function
      this.gl.blendFunc(src, dst);
      
      // Update state tracker
      this._stateTracker.blendFunc = { src, dst };
      this._trackStateChange('blendFunc', { src, dst });
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set blend equation with state tracking
   * @param {number} mode - Blend equation mode
   */
  setBlendEquation(mode) {
    if (!this.gl) return;
    
    // Enable blending if it's not already enabled
    this.setCapability('blend', true);
    
    // Only set if different
    if (this._stateTracker.blendEquation !== mode) {
      // Set blend equation
      this.gl.blendEquation(mode);
      
      // Update state tracker
      this._stateTracker.blendEquation = mode;
      this._trackStateChange('blendEquation', mode);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set depth function with state tracking
   * @param {number} func - Depth function
   */
  setDepthFunc(func) {
    if (!this.gl) return;
    
    // Enable depth testing if it's not already enabled
    this.setCapability('depthTest', true);
    
    // Only set if different
    if (this._stateTracker.depthFunc !== func) {
      // Set depth function
      this.gl.depthFunc(func);
      
      // Update state tracker
      this._stateTracker.depthFunc = func;
      this._trackStateChange('depthFunc', func);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set depth mask (depth writing) with state tracking
   * @param {boolean} flag - Whether to enable depth writing
   */
  setDepthMask(flag) {
    if (!this.gl) return;
    
    // Only set if different
    if (this._stateTracker.depthWrite !== flag) {
      // Set depth mask
      this.gl.depthMask(flag);
      
      // Update state tracker
      this._stateTracker.depthWrite = flag;
      this._trackStateChange('depthMask', flag);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set cull face mode with state tracking
   * @param {number} mode - Cull face mode
   */
  setCullFace(mode) {
    if (!this.gl) return;
    
    // Enable cull face if it's not already enabled
    this.setCapability('cullFace', true);
    
    // Only set if different
    if (this._stateTracker.cullFaceMode !== mode) {
      // Set cull face mode
      this.gl.cullFace(mode);
      
      // Update state tracker
      this._stateTracker.cullFaceMode = mode;
      this._trackStateChange('cullFace', mode);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set line width with state tracking
   * @param {number} width - Line width
   */
  setLineWidth(width) {
    if (!this.gl) return;
    
    // Only set if different
    if (this._stateTracker.lineWidth !== width) {
      // Set line width
      this.gl.lineWidth(width);
      
      // Update state tracker
      this._stateTracker.lineWidth = width;
      this._trackStateChange('lineWidth', width);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set polygon offset with state tracking
   * @param {number} factor - Polygon offset factor
   * @param {number} units - Polygon offset units
   */
  setPolygonOffset(factor, units) {
    if (!this.gl) return;
    
    // Only set if different
    if (this._stateTracker.polygonOffset.factor !== factor || this._stateTracker.polygonOffset.units !== units) {
      // Set polygon offset
      this.gl.polygonOffset(factor, units);
      
      // Update state tracker
      this._stateTracker.polygonOffset = { factor, units };
      this._trackStateChange('polygonOffset', { factor, units });
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set scissor rectangle with state tracking
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   */
  setScissor(x, y, width, height) {
    if (!this.gl) return;
    
    // Enable scissor test if it's not already enabled
    this.setCapability('scissorTest', true);
    
    // Only set if different
    if (this._stateTracker.scissor.x !== x || 
        this._stateTracker.scissor.y !== y || 
        this._stateTracker.scissor.width !== width || 
        this._stateTracker.scissor.height !== height) {
      
      // Set scissor rectangle
      this.gl.scissor(x, y, width, height);
      
      // Update state tracker
      this._stateTracker.scissor = { x, y, width, height };
      this._trackStateChange('scissor', { x, y, width, height });
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set stencil function with state tracking
   * @param {number} func - Stencil function
   * @param {number} ref - Reference value
   * @param {number} mask - Mask
   */
  setStencilFunc(func, ref, mask) {
    if (!this.gl) return;
    
    // Enable stencil test if it's not already enabled
    this.setCapability('stencilTest', true);
    
    // Only set if different
    if (this._stateTracker.stencilFunc.func !== func || 
        this._stateTracker.stencilFunc.ref !== ref || 
        this._stateTracker.stencilFunc.mask !== mask) {
      
      // Set stencil function
      this.gl.stencilFunc(func, ref, mask);
      
      // Update state tracker
      this._stateTracker.stencilFunc = { func, ref, mask };
      this._trackStateChange('stencilFunc', { func, ref, mask });
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set stencil operation with state tracking
   * @param {number} fail - Operation when stencil test fails
   * @param {number} zfail - Operation when stencil test passes but depth test fails
   * @param {number} zpass - Operation when stencil test and depth test pass
   */
  setStencilOp(fail, zfail, zpass) {
    if (!this.gl) return;
    
    // Enable stencil test if it's not already enabled
    this.setCapability('stencilTest', true);
    
    // Only set if different
    if (this._stateTracker.stencilOp.fail !== fail || 
        this._stateTracker.stencilOp.zfail !== zfail || 
        this._stateTracker.stencilOp.zpass !== zpass) {
      
      // Set stencil operation
      this.gl.stencilOp(fail, zfail, zpass);
      
      // Update state tracker
      this._stateTracker.stencilOp = { fail, zfail, zpass };
      this._trackStateChange('stencilOp', { fail, zfail, zpass });
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set stencil mask with state tracking
   * @param {number} mask - Stencil mask
   */
  setStencilMask(mask) {
    if (!this.gl) return;
    
    // Only set if different
    if (this._stateTracker.stencilMask !== mask) {
      // Set stencil mask
      this.gl.stencilMask(mask);
      
      // Update state tracker
      this._stateTracker.stencilMask = mask;
      this._trackStateChange('stencilMask', mask);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set clear color with state tracking
   * @param {number} r - Red component (0-1)
   * @param {number} g - Green component (0-1)
   * @param {number} b - Blue component (0-1)
   * @param {number} a - Alpha component (0-1)
   */
  setClearColor(r, g, b, a) {
    if (!this.gl) return;
    
    const currentClear = this._stateTracker.clearColor;
    
    // Only set if different
    if (currentClear[0] !== r || 
        currentClear[1] !== g || 
        currentClear[2] !== b || 
        currentClear[3] !== a) {
      
      // Set clear color
      this.gl.clearColor(r, g, b, a);
      
      // Update state tracker
      this._stateTracker.clearColor = [r, g, b, a];
      this._trackStateChange('clearColor', [r, g, b, a]);
      this.perfCounters.stateChanges++;
    } else if (this.options.debug) {
      this.perfCounters.redundantStateChanges++;
    }
  }
  
  /**
   * Set the current render state using a declarative object
   * @param {Object} state - Render state configuration
   * @param {boolean} [state.blend] - Enable/disable blending
   * @param {boolean} [state.depthTest] - Enable/disable depth testing
   * @param {boolean} [state.scissorTest] - Enable/disable scissor testing
   * @param {boolean} [state.cullFace] - Enable/disable face culling
   * @param {boolean} [state.depthWrite] - Enable/disable depth writing
   * @param {Object} [state.blendFunc] - Blend function configuration
   * @param {number} [state.blendFunc.src] - Source blend factor
   * @param {number} [state.blendFunc.dst] - Destination blend factor
   * @param {number} [state.blendEquation] - Blend equation mode
   * @param {number} [state.depthFunc] - Depth function
   * @param {number} [state.cullFaceMode] - Cull face mode
   * @param {number} [state.lineWidth] - Line width
   * @param {Object} [state.polygonOffset] - Polygon offset configuration
   * @param {number} [state.polygonOffset.factor] - Polygon offset factor
   * @param {number} [state.polygonOffset.units] - Polygon offset units
   * @param {Object} [state.scissor] - Scissor rectangle configuration
   * @param {number} [state.scissor.x] - Scissor rectangle X coordinate
   * @param {number} [state.scissor.y] - Scissor rectangle Y coordinate
   * @param {number} [state.scissor.width] - Scissor rectangle width
   * @param {number} [state.scissor.height] - Scissor rectangle height
   * @param {Object} [state.viewport] - Viewport configuration
   * @param {number} [state.viewport.x] - Viewport X coordinate
   * @param {number} [state.viewport.y] - Viewport Y coordinate
   * @param {number} [state.viewport.width] - Viewport width
   * @param {number} [state.viewport.height] - Viewport height
   * @param {Array} [state.clearColor] - Clear color [r, g, b, a]
   */
  setRenderState(state) {
    if (!this.gl || !state) return;
    
    // Apply each capability
    if (state.blend !== undefined) {
      this.setCapability('blend', state.blend);
    }
    
    if (state.depthTest !== undefined) {
      this.setCapability('depthTest', state.depthTest);
    }
    
    if (state.scissorTest !== undefined) {
      this.setCapability('scissorTest', state.scissorTest);
    }
    
    if (state.cullFace !== undefined) {
      this.setCapability('cullFace', state.cullFace);
    }
    
    if (state.depthWrite !== undefined) {
      this.setDepthMask(state.depthWrite);
    }
    
    // Apply blend function if specified
    if (state.blendFunc) {
      this.setBlendFunc(state.blendFunc.src, state.blendFunc.dst);
    }
    
    // Apply blend equation if specified
    if (state.blendEquation !== undefined) {
      this.setBlendEquation(state.blendEquation);
    }
    
    // Apply depth function if specified
    if (state.depthFunc !== undefined) {
      this.setDepthFunc(state.depthFunc);
    }
    
    // Apply cull face mode if specified
    if (state.cullFaceMode !== undefined) {
      this.setCullFace(state.cullFaceMode);
    }
    
    // Apply line width if specified
    if (state.lineWidth !== undefined) {
      this.setLineWidth(state.lineWidth);
    }
    
    // Apply polygon offset if specified
    if (state.polygonOffset) {
      this.setPolygonOffset(state.polygonOffset.factor, state.polygonOffset.units);
    }
    
    // Apply scissor rectangle if specified
    if (state.scissor) {
      this.setScissor(state.scissor.x, state.scissor.y, state.scissor.width, state.scissor.height);
    }
    
    // Apply viewport if specified
    if (state.viewport) {
      this._applyViewport(state.viewport);
    }
    
    // Apply clear color if specified
    if (state.clearColor) {
      this.setClearColor(state.clearColor[0], state.clearColor[1], state.clearColor[2], state.clearColor[3]);
    }
    
    // Apply stencil function if specified
    if (state.stencilFunc) {
      this.setStencilFunc(state.stencilFunc.func, state.stencilFunc.ref, state.stencilFunc.mask);
    }
    
    // Apply stencil operation if specified
    if (state.stencilOp) {
      this.setStencilOp(state.stencilOp.fail, state.stencilOp.zfail, state.stencilOp.zpass);
    }
    
    // Apply stencil mask if specified
    if (state.stencilMask !== undefined) {
      this.setStencilMask(state.stencilMask);
    }
  }
  
  /**
   * Reset render state to defaults
   */
  resetRenderState() {
    this.setRenderState(this.defaultState);
  }
  
  /**
   * Track state change for debugging
   * @private
   * @param {string} type - State type
   * @param {*} value - New state value
   */
  _trackStateChange(type, value) {
    if (!this.options.debug) return;
    
    // Create state change entry
    const entry = {
      type,
      value,
      timestamp: Date.now(),
      stack: new Error().stack
    };
    
    // Add to history
    this._stateChangeHistory.unshift(entry);
    
    // Limit history size
    if (this._stateChangeHistory.length > this._maxHistoryEntries) {
      this._stateChangeHistory.pop();
    }
  }
  
  /**
   * Get current WebGL state
   * @returns {Object} - Current state tracker object
   */
  getState() {
    return { ...this._stateTracker };
  }
  
  /**
   * Get state change history
   * @returns {Array} - State change history
   */
  getStateChangeHistory() {
    return [...this._stateChangeHistory];
  }
  
  /**
   * Get WebGL context
   * @returns {WebGLRenderingContext} - The WebGL context
   */
  getContext() {
    return this.gl;
  }
  
  /**
   * Get canvas element
   * @returns {HTMLCanvasElement} - The canvas element
   */
  getCanvas() {
    return this.canvas;
  }
  
  /**
   * Get current shader program
   * @returns {WebGLProgram} - The current WebGL program
   */
  getCurrentProgram() {
    return this.currentProgram;
  }
  
  /**
   * Get performance counters
   * @returns {Object} - Performance counter metrics
   */
  getPerformanceMetrics() {
    return { ...this.perfCounters };
  }
  
  /**
   * Reset performance counters
   */
  resetPerformanceMetrics() {
    Object.keys(this.perfCounters).forEach(key => {
      if (key === 'stateChangesByType') {
        this.perfCounters[key] = {};
      } else {
        this.perfCounters[key] = 0;
      }
    });
  }
  
  /**
   * Compare two states and return the differences
   * @param {Object} state1 - First state
   * @param {Object} state2 - Second state
   * @returns {Object} - Differences between states
   */
  diffStates(state1, state2) {
    if (!state1 || !state2) return {};
    
    const differences = {};
    
    // Compare each property
    Object.keys(state1).forEach(key => {
      // Skip properties that are objects
      if (typeof state1[key] === 'object' && state1[key] !== null) {
        // For objects, compare each property
        const objDiff = {};
        let hasDiff = false;
        
        Object.keys(state1[key]).forEach(subKey => {
          if (state1[key][subKey] !== state2[key]?.[subKey]) {
            objDiff[subKey] = {
              from: state1[key][subKey],
              to: state2[key]?.[subKey]
            };
            hasDiff = true;
          }
        });
        
        if (hasDiff) {
          differences[key] = objDiff;
        }
      } else if (state1[key] !== state2[key]) {
        differences[key] = {
          from: state1[key],
          to: state2[key]
        };
      }
    });
    
    return differences;
  }
  
  /**
   * Create a WebGLStateSnapshot object that can be restored later
   * @returns {Object} - State snapshot
   */
  createStateSnapshot() {
    return {
      ...this.getState(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Restore a previously created state snapshot
   * @param {Object} snapshot - State snapshot to restore
   */
  restoreStateSnapshot(snapshot) {
    if (!snapshot) return;
    
    // Create a render state object from the snapshot
    const renderState = {
      blend: snapshot.blend,
      depthTest: snapshot.depthTest,
      scissorTest: snapshot.scissorTest,
      cullFace: snapshot.cullFace,
      depthWrite: snapshot.depthWrite,
      blendFunc: snapshot.blendFunc,
      blendEquation: snapshot.blendEquation,
      depthFunc: snapshot.depthFunc,
      cullFaceMode: snapshot.cullFaceMode,
      lineWidth: snapshot.lineWidth,
      polygonOffset: snapshot.polygonOffset,
      scissor: snapshot.scissor,
      viewport: snapshot.viewport,
      clearColor: snapshot.clearColor,
      stencilFunc: snapshot.stencilFunc,
      stencilOp: snapshot.stencilOp,
      stencilMask: snapshot.stencilMask
    };
    
    // Apply the render state
    this.setRenderState(renderState);
  }
  
  /**
   * Handle WebGL context loss
   * @private
   * @param {Event} event - Context loss event
   */
  _handleContextLost(event) {
    event.preventDefault();
    console.warn('WebGLCore: WebGL context lost');
    
    // Emit event for other modules to handle
    const contextLostEvent = new CustomEvent('webgl-context-lost', {
      detail: { webglCore: this }
    });
    document.dispatchEvent(contextLostEvent);
  }
  
  /**
   * Handle WebGL context restoration
   * @private
   * @param {Event} event - Context restored event
   */
  _handleContextRestored(event) {
    console.log('WebGLCore: WebGL context restored');
    
    // Reset state tracker
    this._stateTracker = {
      blend: false,
      depthTest: false,
      scissorTest: false,
      cullFace: false,
      depthWrite: true,
      currentTextureUnit: 0,
      boundTextures: {},
      currentFramebuffer: null,
      viewport: { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height },
      clearColor: [0, 0, 0, 1],
      blendFunc: { src: null, dst: null },
      blendEquation: null,
      depthFunc: null,
      cullFaceMode: null,
      lineWidth: 1.0,
      polygonOffset: { factor: 0, units: 0 },
      scissor: { x: 0, y: 0, width: 0, height: 0 },
      stencilFunc: { func: null, ref: 0, mask: 0xFFFFFFFF },
      stencilOp: { fail: null, zfail: null, zpass: null },
      stencilMask: 0xFFFFFFFF
    };
    
    // Reset state change history
    this._stateChangeHistory = [];
    
    // Reset performance counters
    this.resetPerformanceMetrics();
    
    // Emit event for other modules to handle
    const contextRestoredEvent = new CustomEvent('webgl-context-restored', {
      detail: { webglCore: this }
    });
    document.dispatchEvent(contextRestoredEvent);
  }
  
  /**
   * Set up debugging tools
   * @private
   */
  _setupDebugging() {
    if (!this.gl) return;
    
    console.log('WebGLCore: Setting up debugging');
    
    // Use WebGL debug extension if available
    let ext = this.gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const vendor = this.gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      const renderer = this.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      console.log(`WebGLCore: GPU - ${vendor} ${renderer}`);
    }
    
    // Try to use the KHR debug extension for better error reporting
    if (this.gl instanceof WebGL2RenderingContext) {
      ext = this.gl.getExtension('KHR_debug');
      if (ext) {
        console.log('WebGLCore: KHR_debug extension available');
        this.gl.enable(ext.DEBUG_OUTPUT);
        this.gl.enable(ext.DEBUG_OUTPUT_SYNCHRONOUS);
        
        this.gl.debug = {
          output: true,
          outputSynchronous: true
        };
        
        // Set up debug callback
        this.gl.debugMessageCallback((source, type, id, severity, message) => {
          let sourceStr, typeStr, severityStr;
          
          switch (source) {
            case ext.DEBUG_SOURCE_API: sourceStr = 'API'; break;
            case ext.DEBUG_SOURCE_WINDOW_SYSTEM: sourceStr = 'Window System'; break;
            case ext.DEBUG_SOURCE_SHADER_COMPILER: sourceStr = 'Shader Compiler'; break;
            case ext.DEBUG_SOURCE_THIRD_PARTY: sourceStr = 'Third Party'; break;
            case ext.DEBUG_SOURCE_APPLICATION: sourceStr = 'Application'; break;
            case ext.DEBUG_SOURCE_OTHER: sourceStr = 'Other'; break;
            default: sourceStr = `Unknown (${source})`;
          }
          
          switch (type) {
            case ext.DEBUG_TYPE_ERROR: typeStr = 'Error'; break;
            case ext.DEBUG_TYPE_DEPRECATED_BEHAVIOR: typeStr = 'Deprecated Behavior'; break;
            case ext.DEBUG_TYPE_UNDEFINED_BEHAVIOR: typeStr = 'Undefined Behavior'; break;
            case ext.DEBUG_TYPE_PORTABILITY: typeStr = 'Portability'; break;
            case ext.DEBUG_TYPE_PERFORMANCE: typeStr = 'Performance'; break;
            case ext.DEBUG_TYPE_OTHER: typeStr = 'Other'; break;
            default: typeStr = `Unknown (${type})`;
          }
          
          switch (severity) {
            case ext.DEBUG_SEVERITY_HIGH: severityStr = 'High'; break;
            case ext.DEBUG_SEVERITY_MEDIUM: severityStr = 'Medium'; break;
            case ext.DEBUG_SEVERITY_LOW: severityStr = 'Low'; break;
            case ext.DEBUG_SEVERITY_NOTIFICATION: severityStr = 'Notification'; break;
            default: severityStr = `Unknown (${severity})`;
          }
          
          const msg = `WebGL Debug: [${sourceStr}] [${typeStr}] [${severityStr}] (${id}): ${message}`;
          
          if (severity === ext.DEBUG_SEVERITY_HIGH) {
            console.error(msg);
          } else if (severity === ext.DEBUG_SEVERITY_MEDIUM) {
            console.warn(msg);
          } else {
            console.log(msg);
          }
        });
      }
    }
    
    // Add checks after each WebGL call in debug mode
    if (this.options.debug) {
      // Override some common methods to add error checking
      const originalUseProgram = this.useProgram.bind(this);
      this.useProgram = (program) => {
        originalUseProgram(program);
        const error = this.gl.getError();
        if (error !== this.gl.NO_ERROR) {
          console.error(`WebGLCore: Error after useProgram: ${error}`);
        }
      };
    }
  }
  
  /**
   * Validate WebGL context capabilities
   * @private
   * @returns {boolean} - Whether validation passed
   */
  _validateContext() {
    if (!this.gl) return false;
    
    const contextValid = true;
    
    // We can add additional capability checks here
    // For example, checking for required extensions, etc.
    
    return contextValid;
  }
}

/**
 * WebGLStateTracker - A standalone class for tracking WebGL state changes
 * This is a more advanced version that can be used for debugging
 */
class WebGLStateTracker {
  /**
   * Create a new WebGLStateTracker
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {Object} options - Configuration options
   */
  constructor(webglCore, options = {}) {
    this.webglCore = webglCore;
    this.gl = webglCore.getContext();
    
    this.options = Object.assign({
      maxHistoryEntries: 100,
      enableStackTraces: true,
      verbose: false
    }, options);
    
    // State change history
    this.history = [];
    
    // Current state
    this.currentState = null;
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the state tracker
   */
  initialize() {
    // Get initial state
    this.currentState = this.webglCore.getState();
    
    // Clear history
    this.history = [];
  }
  
  /**
   * Track a state change
   * @param {string} type - State type
   * @param {*} oldValue - Old state value
   * @param {*} newValue - New state value
   */
  trackStateChange(type, oldValue, newValue) {
    // Create state change entry
    const entry = {
      type,
      oldValue,
      newValue,
      timestamp: Date.now()
    };
    
    // Add stack trace if enabled
    if (this.options.enableStackTraces) {
      entry.stack = new Error().stack;
    }
    
    // Add to history
    this.history.unshift(entry);
    
    // Limit history size
    if (this.history.length > this.options.maxHistoryEntries) {
      this.history.pop();
    }
    
    // Log if verbose
    if (this.options.verbose) {
      console.log(`WebGLStateTracker: ${type} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);
    }
  }
  
  /**
   * Get state change history
   * @param {string} [type] - Filter history by state type
   * @returns {Array} - State change history
   */
  getHistory(type) {
    if (type) {
      return this.history.filter(entry => entry.type === type);
    }
    
    return [...this.history];
  }
  
  /**
   * Clear state change history
   */
  clearHistory() {
    this.history = [];
  }
  
  /**
   * Get history summary, grouping by type and counting changes
   * @returns {Object} - History summary
   */
  getHistorySummary() {
    const summary = {};
    
    // Count changes by type
    this.history.forEach(entry => {
      if (!summary[entry.type]) {
        summary[entry.type] = 0;
      }
      
      summary[entry.type]++;
    });
    
    return summary;
  }
  
  /**
   * Find redundant state changes (same value set multiple times)
   * @returns {Array} - Redundant state changes
   */
  findRedundantChanges() {
    const redundant = [];
    
    // Group by type
    const byType = {};
    
    this.history.forEach(entry => {
      if (!byType[entry.type]) {
        byType[entry.type] = [];
      }
      
      byType[entry.type].push(entry);
    });
    
    // Find redundant changes in each type
    Object.entries(byType).forEach(([type, entries]) => {
      if (entries.length < 2) return;
      
      // Check consecutive entries
      for (let i = 0; i < entries.length - 1; i++) {
        const current = entries[i];
        const next = entries[i + 1];
        
        // If setting to the same value, mark as redundant
        if (JSON.stringify(current.newValue) === JSON.stringify(next.newValue)) {
          redundant.push({
            type,
            first: next,
            second: current
          });
        }
      }
    });
    
    return redundant;
  }
  
  /**
   * Analyze state change patterns
   * @returns {Object} - Analysis results
   */
  analyzeStateChanges() {
    const analysis = {
      totalChanges: this.history.length,
      changesByType: this.getHistorySummary(),
      redundantChanges: this.findRedundantChanges(),
      recommendations: []
    };
    
    // Add recommendations based on analysis
    if (analysis.redundantChanges.length > 0) {
      analysis.recommendations.push(
        'Consider batching state changes to reduce redundant changes'
      );
    }
    
    // Find the most frequently changed states
    const sortedTypes = Object.entries(analysis.changesByType)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    if (sortedTypes.length > 0) {
      analysis.mostFrequentlyChangedStates = sortedTypes.slice(0, 3);
      
      analysis.recommendations.push(
        `Consider optimizing ${analysis.mostFrequentlyChangedStates.join(', ')} state changes`
      );
    }
    
    return analysis;
  }
}

// Export modules
export default { WebGLCore, WebGLStateTracker };
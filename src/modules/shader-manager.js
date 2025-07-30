/**
 * ShaderManager Module
 * 
 * Responsible for loading, compiling, and managing WebGL shaders.
 * Handles shader caching, manifest management, and compilation queuing.
 */

class ShaderManager {
  /**
   * Create a new ShaderManager instance
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.enableCache - Enable shader source caching
   * @param {number} options.preloadCount - Number of shaders to preload
   * @param {boolean} options.shuffleManifest - Whether to shuffle the manifest on load
   */
  constructor(webglCore, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    
    // Initialize state
    this.manifest = [];
    this.cache = {};
    this.currentShaderIndex = -1;
    this.currentShader = null;
    
    // Compilation queue system
    this.compilationQueue = [];
    this.isProcessing = false;
    
    // Config options with defaults
    this.options = Object.assign({
      enableCache: true,
      preloadCount: 2,
      shuffleManifest: true,
      manifestUrl: '/api/shaders/manifest',
      shaderBaseUrl: '/api/shaders/'
    }, options);
    
    // Bind methods to preserve 'this' context
    this._processNextShaderInQueue = this._processNextShaderInQueue.bind(this);
    this._emitEvent = this._emitEvent.bind(this);
  }
  
  /**
   * Initialize the ShaderManager
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async init() {
    // Check if WebGLCore is properly initialized
    if (!this.webglCore || !this.webglCore.getContext()) {
      console.error('ShaderManager: WebGLCore not initialized');
      return false;
    }
    
    // Load shader manifest
    try {
      await this.loadManifest();
      return true;
    } catch (error) {
      console.error('ShaderManager: Initialization failed', error);
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear shader cache
    this.cache = {};
    
    // Reset compilation queue
    this.compilationQueue = [];
    this.isProcessing = false;
    
    // Clear manifest
    this.manifest = [];
    this.currentShaderIndex = -1;
    this.currentShader = null;
    
    console.log('ShaderManager: Destroyed');
  }
  
  /**
   * Load shader manifest from server
   * @returns {Promise<Array>} - Promise resolving to the shader manifest
   */
  async loadManifest() {
    this._emitEvent('load-start');
    
    try {
      const response = await fetch(this.options.manifestUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shader manifest: ${response.status} ${response.statusText}`);
      }
      
      let manifest = await response.json();
      
      // Shuffle manifest if enabled
      if (this.options.shuffleManifest) {
        manifest = this._shuffleArray(manifest);
      }
      
      this.manifest = manifest;
      console.log(`ShaderManager: Loaded manifest with ${manifest.length} shaders`);
      
      this._emitEvent('manifest-loaded', { count: manifest.length });
      
      return manifest;
    } catch (error) {
      console.error('Error fetching shader manifest:', error);
      this._emitEvent('error', { message: 'Failed to load shader manifest', error });
      return [];
    } finally {
      this._emitEvent('load-end');
    }
  }
  
  /**
   * Load a shader by ID
   * @param {string} id - Shader ID from manifest
   * @returns {Promise<Object|null>} - Promise resolving to shader object or null if failed
   */
  async loadShaderById(id) {
    // Find shader in manifest
    const shaderInfo = this.manifest.find(shader => shader.id === id);
    
    if (!shaderInfo) {
      console.error(`ShaderManager: Shader with ID ${id} not found in manifest`);
      return null;
    }
    
    // Find index in manifest for later reference
    const index = this.manifest.indexOf(shaderInfo);
    
    try {
      // Load shader source
      const fsSource = await this._fetchShaderSource(id);
      
      if (!fsSource) {
        throw new Error(`Failed to load shader source for ${id}`);
      }
      
      // Use default vertex shader from DOM
      const vsSource = document.getElementById('vertex-shader')?.textContent;
      
      if (!vsSource) {
        throw new Error('Default vertex shader not found in DOM');
      }
      
      // Compile shader program
      const program = await this.compileShaderProgram(vsSource, fsSource, id);
      
      if (!program) {
        throw new Error(`Failed to compile shader ${id}`);
      }
      
      // Update current shader info
      this.currentShaderIndex = index;
      this.currentShader = {
        id,
        name: shaderInfo.name,
        program,
        info: shaderInfo
      };
      
      // Set up vertex buffer for the program
      const gl = this.webglCore.getContext();
      this.webglCore.useProgram(program);
      this.webglCore.setupVertexBuffer(program);
      
      this._emitEvent('shader-loaded', { id, index, name: shaderInfo.name });
      
      return this.currentShader;
    } catch (error) {
      console.error(`Error loading shader ${id}:`, error);
      this._emitEvent('error', { message: `Failed to load shader ${id}`, error });
      return null;
    }
  }
  
  /**
   * Load a shader by index in the manifest
   * @param {number} index - Index in the manifest
   * @param {boolean} forTransition - Whether this is for a transition
   * @returns {Promise<Object|null>} - Promise resolving to shader object or null if failed
   */
  async loadShaderByIndex(index, forTransition = false) {
    // Validate index
    if (index < 0 || index >= this.manifest.length) {
      console.error(`ShaderManager: Invalid shader index: ${index}`);
      return null;
    }
    
    if (!forTransition) {
      this._emitEvent('load-start');
    }
    
    try {
      const shaderInfo = this.manifest[index];
      
      // Use loadShaderById for the actual loading
      const shader = await this.loadShaderById(shaderInfo.id);
      
      if (!forTransition) {
        // Preload next shaders
        this.preloadShaders(this.options.preloadCount);
      }
      
      return shader;
    } catch (error) {
      console.error(`Error loading shader at index ${index}:`, error);
      this._emitEvent('error', { message: `Failed to load shader at index ${index}`, error });
      return null;
    } finally {
      if (!forTransition) {
        this._emitEvent('load-end');
      }
    }
  }
  
  /**
   * Compile and link a shader program
   * @param {string} vsSource - Vertex shader source
   * @param {string} fsSource - Fragment shader source
   * @param {string} shaderId - ID for error reporting
   * @returns {WebGLProgram|null} - Compiled program or null if failed
   */
  compileShaderProgram(vsSource, fsSource, shaderId = 'unknown') {
    const gl = this.webglCore.getContext();
    
    if (!gl) {
      console.error('ShaderManager: WebGL context not available');
      return null;
    }
    
    try {
      // Start performance measurement if supported
      const startTime = performance.now ? performance.now() : 0;
      
      // Compile vertex shader
      const vertexShader = this._createShader(gl, vsSource, gl.VERTEX_SHADER);
      if (!vertexShader) {
        this._emitEvent('compilation-error', { 
          type: 'vertex', 
          id: shaderId, 
          message: 'Failed to compile vertex shader' 
        });
        return null;
      }
      
      // Compile fragment shader
      const fragmentShader = this._createShader(gl, fsSource, gl.FRAGMENT_SHADER);
      if (!fragmentShader) {
        // Clean up vertex shader
        gl.deleteShader(vertexShader);
        
        this._emitEvent('compilation-error', { 
          type: 'fragment', 
          id: shaderId, 
          message: 'Failed to compile fragment shader' 
        });
        return null;
      }
      
      // Create and link program
      const program = this._createProgram(gl, vertexShader, fragmentShader);
      if (!program) {
        // Clean up shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        
        this._emitEvent('compilation-error', { 
          type: 'program', 
          id: shaderId, 
          message: 'Failed to link shader program' 
        });
        return null;
      }
      
      // End performance measurement
      if (performance.now) {
        const endTime = performance.now();
        console.log(`ShaderManager: Compiled shader ${shaderId} in ${(endTime - startTime).toFixed(2)}ms`);
      }
      
      this._emitEvent('compilation-success', { id: shaderId, program });
      
      return program;
    } catch (error) {
      console.error(`Unexpected error compiling shader ${shaderId}:`, error);
      this._emitEvent('error', { 
        message: `Unexpected error compiling shader ${shaderId}`, 
        error 
      });
      return null;
    }
  }
  
  /**
   * Get shader program by ID
   * @param {string} id - Shader ID
   * @returns {WebGLProgram|null} - Shader program or null if not found
   */
  getShaderProgram(id) {
    if (this.currentShader && this.currentShader.id === id) {
      return this.currentShader.program;
    }
    
    // Shader not loaded yet, return null
    console.warn(`ShaderManager: Shader ${id} not currently loaded`);
    return null;
  }
  
  /**
   * Preload shaders by adding them to the compilation queue
   * @param {number} count - Number of shaders to preload
   * @param {boolean} isInitialLoad - Whether this is the initial load
   */
  preloadShaders(count = this.options.preloadCount, isInitialLoad = false) {
    if (this.manifest.length <= 1) {
      return; // Nothing to preload with 0 or 1 shaders
    }
    
    // For initial load, use the specified count
    // For user interactions, use 1 to prevent performance stutters
    const shadersToPreload = isInitialLoad ? count : Math.min(count, 1);
    
    console.log(`ShaderManager: Preloading ${shadersToPreload} shader(s)`);
    
    // Add shaders to compilation queue
    this.queueShadersForCompilation(this.currentShaderIndex, shadersToPreload);
  }
  
  /**
   * Add shader indices to the compilation queue
   * @param {number} startIndex - Starting index
   * @param {number} count - Number of shaders to add
   */
  queueShadersForCompilation(startIndex, count) {
    if (this.manifest.length <= 1) {
      return; // Nothing to queue with 0 or 1 shaders
    }
    
    // Limit count to reasonable values
    const actualCount = Math.min(count, this.manifest.length - 1);
    
    console.log(`ShaderManager: Adding ${actualCount} shaders to compilation queue...`);
    
    // Add each of the next N shaders to the queue
    for (let i = 0; i < actualCount; i++) {
      // Calculate the index with wraparound
      const nextIndex = (startIndex + i + 1) % this.manifest.length;
      
      // Skip if we've wrapped around back to current index
      if (nextIndex === this.currentShaderIndex) continue;
      
      // Skip if already in queue
      if (this.compilationQueue.includes(nextIndex)) continue;
      
      // Add to queue
      this.compilationQueue.push(nextIndex);
      console.log(`ShaderManager: Added shader index ${nextIndex} to compilation queue`);
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
   * Get the current shader
   * @returns {Object|null} - Current shader object or null
   */
  getCurrentShader() {
    return this.currentShader;
  }
  
  /**
   * Get the current shader index
   * @returns {number} - Current shader index
   */
  getCurrentShaderIndex() {
    return this.currentShaderIndex;
  }
  
  /**
   * Get the shader manifest
   * @returns {Array} - Shader manifest
   */
  getManifest() {
    return this.manifest;
  }
  
  /**
   * Get the shader cache
   * @returns {Object} - Shader source cache
   */
  getCache() {
    return this.cache;
  }
  
  /**
   * Get compilation queue length
   * @returns {number} - Queue length
   */
  getQueueLength() {
    return this.compilationQueue.length;
  }
  
  /**
   * Check if queue is being processed
   * @returns {boolean} - Whether queue is being processed
   */
  isProcessingQueue() {
    return this.isProcessing;
  }
  
  /**
   * Create a shader of the specified type
   * @private
   * @param {WebGLRenderingContext} gl - WebGL context
   * @param {string} source - Shader source code
   * @param {number} type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
   * @returns {WebGLShader|null} - Compiled shader or null if failed
   */
  _createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', info);
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  /**
   * Create and link a WebGL program
   * @private
   * @param {WebGLRenderingContext} gl - WebGL context
   * @param {WebGLShader} vertexShader - Compiled vertex shader
   * @param {WebGLShader} fragmentShader - Compiled fragment shader
   * @returns {WebGLProgram|null} - Linked program or null if failed
   */
  _createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      console.error('Program linking error:', info);
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }
  
  /**
   * Fetch shader source by ID
   * @private
   * @param {string} id - Shader ID
   * @returns {Promise<string|null>} - Promise resolving to shader source or null if failed
   */
  async _fetchShaderSource(id) {
    // Check cache first if enabled
    if (this.options.enableCache && this.cache[id]) {
      console.log(`ShaderManager: Using cached source for ${id}`);
      return this.cache[id];
    }
    
    this._emitEvent('load-start');
    
    try {
      const response = await fetch(`${this.options.shaderBaseUrl}${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shader ${id}: ${response.status} ${response.statusText}`);
      }
      
      const source = await response.text();
      
      if (!source) {
        throw new Error(`Shader ${id} is empty or missing`);
      }
      
      console.log(`ShaderManager: Loaded shader ${id} (${source.length} bytes)`);
      
      // Cache the source if caching is enabled
      if (this.options.enableCache) {
        this.cache[id] = source;
      }
      
      return source;
    } catch (error) {
      console.error(`Error fetching shader ${id}:`, error);
      this._emitEvent('error', { message: `Failed to fetch shader ${id}`, error });
      return null;
    } finally {
      this._emitEvent('load-end');
    }
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
    
    console.log(`ShaderManager: Processing shader ${nextIndex} from compilation queue (${this.compilationQueue.length} remaining)`);
    
    try {
      // Compile the shader (but don't set as current)
      await this.loadShaderByIndex(nextIndex, true);
      console.log(`ShaderManager: Successfully compiled shader ${nextIndex}`);
    } catch (error) {
      console.warn(`ShaderManager: Failed to compile shader ${nextIndex}:`, error);
    }
    
    // Wait a small delay before processing the next item
    // This gives the browser time to handle user interactions
    if (this.compilationQueue.length > 0) {
      setTimeout(this._processNextShaderInQueue, 100);
    } else {
      this.isProcessing = false;
      this._emitEvent('queue-processing-end');
      console.log("ShaderManager: Compilation queue is now empty");
    }
  }
  
  /**
   * Shuffle an array using the Fisher-Yates algorithm
   * @private
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   */
  _shuffleArray(array) {
    // Create a copy of the array to avoid modifying the original
    const shuffled = [...array];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Random index from 0 to i
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
  
  /**
   * Emit an event
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event details
   */
  _emitEvent(type, detail = {}) {
    const event = new CustomEvent(`shader-manager-${type}`, {
      detail: { 
        ...detail,
        shaderManager: this
      }
    });
    
    document.dispatchEvent(event);
  }
}

// Export module
export default ShaderManager;
/**
 * Material Module
 * 
 * Provides a high-level abstraction for shader programs and uniforms.
 * Encapsulates a shader program and its associated uniform values,
 * making it easier to manage shaders with different uniform requirements.
 */

import { WebGLStateTracker } from './webgl-core.js';

/**
 * Material - A high-level abstraction for shader programs and uniform management
 */
class Material {
  /**
   * Create a new Material
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {Object} options - Configuration options
   * @param {WebGLProgram} options.program - WebGL program to use
   * @param {string} options.name - Material name
   * @param {Object} options.uniforms - Initial uniform values
   * @param {Object} options.renderState - Initial render state
   * @param {Object} options.defines - Shader preprocessor defines
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(webglCore, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    
    // Get WebGL context
    this.gl = webglCore.getContext();
    
    if (!this.gl) {
      throw new Error('Material: WebGL context not available');
    }
    
    // Store program and name
    this.program = options.program || null;
    this.name = options.name || 'Material';
    
    // Uniform management
    this.uniformLocations = {}; // Cache for uniform locations
    this.uniformValues = {};    // Current uniform values
    this.uniformTypes = {};     // Type information for each uniform
    this.uniformInfo = {};      // Info about each uniform (size, type, etc.)
    
    // Default uniforms from options
    this.defaultUniforms = options.uniforms || {};
    
    // Render state
    this.renderState = options.renderState || {
      blend: false,
      depthTest: true,
      cullFace: false,
      depthWrite: true,
    };
    
    // Store shader defines
    this.defines = options.defines || {};
    
    // Additional metadata
    this.metadata = options.metadata || {};
    
    // Batched updates flag
    this.batchMode = false;
    this.pendingUpdates = new Set();
    
    // Performance tracking
    this.perfMetrics = {
      uniformUpdates: 0,
      renderStateChanges: 0,
      redundantUpdates: 0,
      lastUsedTime: 0
    };
    
    // Debug mode
    this.debug = options.debug || false;
    
    // Initialize if program is provided
    if (this.program) {
      this._cacheUniformLocations();
      this.setUniforms(this.defaultUniforms);
    }
  }
  
  /**
   * Set the shader program for this material
   * @param {WebGLProgram} program - WebGL program
   * @returns {Material} - This material (for chaining)
   */
  setProgram(program) {
    if (program !== this.program) {
      this.program = program;
      this._cacheUniformLocations();
      
      // Apply default uniforms to new program
      this.setUniforms(this.defaultUniforms);
    }
    return this;
  }
  
  /**
   * Cache uniform locations for the current program
   * @private
   */
  _cacheUniformLocations() {
    // Clear previous cache
    this.uniformLocations = {};
    this.uniformInfo = {};
    
    // Skip if no program
    if (!this.program || !this.gl) return;
    
    // Get number of active uniforms
    const numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
    
    // Cache each uniform location and info
    for (let i = 0; i < numUniforms; i++) {
      const info = this.gl.getActiveUniform(this.program, i);
      if (info) {
        const name = info.name;
        // Remove array suffix if present (e.g., "u_colors[0]" -> "u_colors")
        const baseName = name.replace(/\[.*?\]$/, '');
        
        // Store location
        this.uniformLocations[baseName] = this.gl.getUniformLocation(this.program, name);
        
        // Store uniform info
        this.uniformInfo[baseName] = {
          size: info.size,
          type: info.type,
          typeName: this._getUniformTypeName(info.type),
          isArray: info.size > 1 || name !== baseName
        };
      }
    }
  }
  
  /**
   * Get uniform type name from WebGL type constant
   * @private
   * @param {number} type - WebGL uniform type constant
   * @returns {string} - Type name
   */
  _getUniformTypeName(type) {
    const gl = this.gl;
    
    // Map WebGL type constants to type names
    switch (type) {
      case gl.FLOAT: return 'float';
      case gl.FLOAT_VEC2: return 'vec2';
      case gl.FLOAT_VEC3: return 'vec3';
      case gl.FLOAT_VEC4: return 'vec4';
      case gl.INT: return 'int';
      case gl.INT_VEC2: return 'ivec2';
      case gl.INT_VEC3: return 'ivec3';
      case gl.INT_VEC4: return 'ivec4';
      case gl.BOOL: return 'bool';
      case gl.BOOL_VEC2: return 'bvec2';
      case gl.BOOL_VEC3: return 'bvec3';
      case gl.BOOL_VEC4: return 'bvec4';
      case gl.FLOAT_MAT2: return 'mat2';
      case gl.FLOAT_MAT3: return 'mat3';
      case gl.FLOAT_MAT4: return 'mat4';
      case gl.SAMPLER_2D: return 'sampler2D';
      case gl.SAMPLER_CUBE: return 'samplerCube';
      default: return 'unknown';
    }
  }
  
  /**
   * Use this material (activate its shader program and apply render state)
   * @returns {Material} - This material (for chaining)
   */
  use() {
    if (!this.program) return this;
    
    // Use the program
    this.webglCore.useProgram(this.program);
    
    // Apply render state
    this.webglCore.setRenderState(this.renderState);
    
    // Update last used time
    this.perfMetrics.lastUsedTime = performance.now();
    
    return this;
  }
  
  /**
   * Set a single uniform value
   * @param {string} name - Uniform name
   * @param {*} value - Uniform value
   * @param {string} [type] - Uniform type (auto-detected if not provided)
   * @returns {Material} - This material (for chaining)
   */
  setUniform(name, value, type) {
    // Skip if no program
    if (!this.program) return this;
    
    // Get uniform location (cached)
    const location = this._getUniformLocation(name);
    
    // Skip if uniform doesn't exist in the shader
    if (!location) {
      if (this.debug) {
        console.warn(`Material: Uniform '${name}' not found in shader program '${this.name}'`);
      }
      return this;
    }
    
    // Check if value has changed to avoid redundant updates
    const currentValue = this.uniformValues[name];
    const valueChanged = !this._areUniformValuesEqual(currentValue, value);
    
    if (!valueChanged && this.uniformValues[name] !== undefined) {
      this.perfMetrics.redundantUpdates++;
      return this;
    }
    
    // Store the value for later reference
    this.uniformValues[name] = this._cloneUniformValue(value);
    
    // Determine type if not provided
    if (!type) {
      // First check if we have type info
      if (this.uniformInfo[name]) {
        type = this.uniformInfo[name].typeName;
      } else {
        // Fall back to determining from value
        type = this._determineUniformType(value);
      }
    }
    
    // Store the type information
    this.uniformTypes[name] = type;
    
    // If in batch mode, add to pending updates
    if (this.batchMode) {
      this.pendingUpdates.add(name);
      return this;
    }
    
    // Otherwise, update immediately
    this._applyUniform(name, value, type, location);
    this.perfMetrics.uniformUpdates++;
    
    return this;
  }
  
  /**
   * Set multiple uniforms at once
   * @param {Object} uniformsObject - Object with uniform names and values
   * @returns {Material} - This material (for chaining)
   */
  setUniforms(uniformsObject) {
    // Skip if no program or empty object
    if (!this.program || !uniformsObject) return this;
    
    // Start batch mode
    this.beginBatch();
    
    // Set each uniform
    Object.entries(uniformsObject).forEach(([name, value]) => {
      this.setUniform(name, value);
    });
    
    // End batch mode and apply changes
    this.endBatch();
    
    return this;
  }
  
  /**
   * Begin batched uniform updates
   * @returns {Material} - This material (for chaining)
   */
  beginBatch() {
    this.batchMode = true;
    return this;
  }
  
  /**
   * End batched uniform updates and apply all changes
   * @returns {Material} - This material (for chaining)
   */
  endBatch() {
    // Skip if no program or not in batch mode
    if (!this.program || !this.batchMode) return this;
    
    // Use the program before applying uniforms
    this.webglCore.useProgram(this.program);
    
    // Apply all pending uniform updates
    this.pendingUpdates.forEach(name => {
      const value = this.uniformValues[name];
      const type = this.uniformTypes[name];
      const location = this._getUniformLocation(name);
      
      if (location) {
        this._applyUniform(name, value, type, location);
        this.perfMetrics.uniformUpdates++;
      }
    });
    
    // Clear batch state
    this.batchMode = false;
    this.pendingUpdates.clear();
    
    return this;
  }
  
  /**
   * Get current uniform value
   * @param {string} name - Uniform name
   * @returns {*} - Current uniform value or undefined
   */
  getUniform(name) {
    return this.uniformValues[name];
  }
  
  /**
   * Get all current uniform values
   * @returns {Object} - Object with all uniform values
   */
  getUniforms() {
    return { ...this.uniformValues };
  }
  
  /**
   * Reset uniforms to default values
   * @returns {Material} - This material (for chaining)
   */
  resetUniforms() {
    this.setUniforms(this.defaultUniforms);
    return this;
  }
  
  /**
   * Set default uniform values
   * @param {Object} uniformsObject - Object with uniform names and values
   * @returns {Material} - This material (for chaining)
   */
  setDefaultUniforms(uniformsObject) {
    this.defaultUniforms = { ...uniformsObject };
    return this;
  }
  
  /**
   * Set render state
   * @param {Object} state - Render state object
   * @returns {Material} - This material (for chaining)
   */
  setRenderState(state) {
    this.renderState = { ...this.renderState, ...state };
    this.perfMetrics.renderStateChanges++;
    return this;
  }
  
  /**
   * Get current render state
   * @returns {Object} - Current render state
   */
  getRenderState() {
    return { ...this.renderState };
  }
  
  /**
   * Clone this material (creates a new material with the same properties)
   * @param {string} [newName] - Name for the cloned material
   * @returns {Material} - New material instance
   */
  clone(newName) {
    return new Material(this.webglCore, {
      program: this.program,
      name: newName || `${this.name}_clone`,
      uniforms: this._cloneUniformValues(this.uniformValues),
      renderState: { ...this.renderState },
      defines: { ...this.defines },
      metadata: { ...this.metadata },
      debug: this.debug
    });
  }
  
  /**
   * Get performance metrics
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.perfMetrics };
  }
  
  /**
   * Reset performance metrics
   * @returns {Material} - This material (for chaining)
   */
  resetPerformanceMetrics() {
    this.perfMetrics = {
      uniformUpdates: 0,
      renderStateChanges: 0,
      redundantUpdates: 0,
      lastUsedTime: this.perfMetrics.lastUsedTime
    };
    return this;
  }
  
  /**
   * Determine uniform type based on value
   * @private
   * @param {*} value - Uniform value
   * @returns {string} - Uniform type
   */
  _determineUniformType(value) {
    // Number
    if (typeof value === 'number') {
      return 'float';
    }
    
    // Boolean
    if (typeof value === 'boolean') {
      return 'bool';
    }
    
    // Array or typed array
    if (Array.isArray(value) || ArrayBuffer.isView(value)) {
      // Determine type based on length
      switch (value.length) {
        case 2:
          // Check if all elements are integers
          if (value.every(v => Number.isInteger(v))) {
            return 'ivec2';
          }
          return 'vec2';
        case 3:
          // Check if all elements are integers
          if (value.every(v => Number.isInteger(v))) {
            return 'ivec3';
          }
          return 'vec3';
        case 4:
          // Check if all elements are integers
          if (value.every(v => Number.isInteger(v))) {
            return 'ivec4';
          }
          return 'vec4';
        case 9:
          return 'mat3';
        case 16:
          return 'mat4';
        default:
          return 'float'; // Default to float
      }
    }
    
    // Default
    return 'float';
  }
  
  /**
   * Apply uniform value based on its type
   * @private
   * @param {string} name - Uniform name
   * @param {*} value - Uniform value
   * @param {string} type - Uniform type
   * @param {WebGLUniformLocation} location - Uniform location
   */
  _applyUniform(name, value, type, location) {
    // Make sure program is active
    this.webglCore.useProgram(this.program);
    
    try {
      // Apply uniform based on type
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
        case 'bool':
          this.gl.uniform1i(location, value ? 1 : 0);
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
        case 'sampler2D':
        case 'samplerCube':
          this.gl.uniform1i(location, value);
          break;
        default:
          console.warn(`Material: Unknown uniform type ${type} for ${name}`);
      }
    } catch (error) {
      console.error(`Material: Error applying uniform ${name} with type ${type}:`, error);
    }
  }
  
  /**
   * Get uniform location (cached)
   * @private
   * @param {string} name - Uniform name
   * @returns {WebGLUniformLocation|null} - Uniform location or null
   */
  _getUniformLocation(name) {
    // Return cached location if available
    if (this.uniformLocations[name] !== undefined) {
      return this.uniformLocations[name];
    }
    
    // Get location from WebGL
    const location = this.gl.getUniformLocation(this.program, name);
    
    // Cache location (even if null)
    this.uniformLocations[name] = location;
    
    return location;
  }
  
  /**
   * Check if two uniform values are equal
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} - Whether values are equal
   */
  _areUniformValuesEqual(a, b) {
    // Handle null or undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    
    // Handle primitive types
    if (typeof a !== 'object' && typeof b !== 'object') {
      return a === b;
    }
    
    // Handle arrays
    if ((Array.isArray(a) || ArrayBuffer.isView(a)) && 
        (Array.isArray(b) || ArrayBuffer.isView(b))) {
      
      if (a.length !== b.length) return false;
      
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      
      return true;
    }
    
    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!this._areUniformValuesEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clone uniform value
   * @private
   * @param {*} value - Uniform value to clone
   * @returns {*} - Cloned value
   */
  _cloneUniformValue(value) {
    // Handle null or undefined
    if (value == null) return value;
    
    // Handle primitive types
    if (typeof value !== 'object') return value;
    
    // Handle arrays
    if (Array.isArray(value)) {
      return [...value];
    }
    
    // Handle typed arrays
    if (ArrayBuffer.isView(value)) {
      // Clone typed array by creating a new one of the same type
      return new value.constructor(value);
    }
    
    // Handle objects
    if (typeof value === 'object') {
      const result = {};
      for (const key in value) {
        result[key] = this._cloneUniformValue(value[key]);
      }
      return result;
    }
    
    return value;
  }
  
  /**
   * Clone all uniform values
   * @private
   * @param {Object} uniformValues - Uniform values to clone
   * @returns {Object} - Cloned uniform values
   */
  _cloneUniformValues(uniformValues) {
    const result = {};
    
    for (const key in uniformValues) {
      result[key] = this._cloneUniformValue(uniformValues[key]);
    }
    
    return result;
  }
}

/**
 * MaterialLibrary - A collection of materials with management utilities
 */
class MaterialLibrary {
  /**
   * Create a new MaterialLibrary
   * @param {WebGLCore} webglCore - The WebGLCore instance
   */
  constructor(webglCore) {
    this.webglCore = webglCore;
    this.materials = new Map();
    this.defaultMaterial = null;
  }
  
  /**
   * Add a material to the library
   * @param {Material} material - Material to add
   * @param {string} [name] - Optional name (uses material.name if not provided)
   * @returns {MaterialLibrary} - This library (for chaining)
   */
  add(material, name) {
    const materialName = name || material.name;
    
    // Ensure name is unique
    if (this.materials.has(materialName)) {
      console.warn(`MaterialLibrary: Material with name '${materialName}' already exists, overwriting`);
    }
    
    this.materials.set(materialName, material);
    
    // Set as default if this is the first material
    if (this.materials.size === 1 && !this.defaultMaterial) {
      this.defaultMaterial = material;
    }
    
    return this;
  }
  
  /**
   * Get a material by name
   * @param {string} name - Material name
   * @returns {Material|null} - Material or null if not found
   */
  get(name) {
    return this.materials.get(name) || null;
  }
  
  /**
   * Remove a material from the library
   * @param {string} name - Material name
   * @returns {boolean} - Whether material was removed
   */
  remove(name) {
    // Check if material exists
    if (!this.materials.has(name)) {
      return false;
    }
    
    // Check if this is the default material
    if (this.defaultMaterial === this.materials.get(name)) {
      this.defaultMaterial = this.materials.size > 1 ? 
        this.materials.values().next().value : null;
    }
    
    // Remove material
    return this.materials.delete(name);
  }
  
  /**
   * Set the default material
   * @param {string|Material} nameOrMaterial - Material name or instance
   * @returns {MaterialLibrary} - This library (for chaining)
   */
  setDefault(nameOrMaterial) {
    if (typeof nameOrMaterial === 'string') {
      const material = this.materials.get(nameOrMaterial);
      
      if (!material) {
        console.warn(`MaterialLibrary: Material with name '${nameOrMaterial}' not found`);
        return this;
      }
      
      this.defaultMaterial = material;
    } else if (nameOrMaterial instanceof Material) {
      // Add material if not already in library
      if (!this.materials.has(nameOrMaterial.name)) {
        this.add(nameOrMaterial);
      }
      
      this.defaultMaterial = nameOrMaterial;
    }
    
    return this;
  }
  
  /**
   * Get the default material
   * @returns {Material|null} - Default material or null if none
   */
  getDefault() {
    return this.defaultMaterial;
  }
  
  /**
   * Get all materials
   * @returns {Array<Material>} - Array of all materials
   */
  getAll() {
    return Array.from(this.materials.values());
  }
  
  /**
   * Get all material names
   * @returns {Array<string>} - Array of all material names
   */
  getNames() {
    return Array.from(this.materials.keys());
  }
  
  /**
   * Create a new material and add it to the library
   * @param {string} name - Material name
   * @param {Object} options - Material options
   * @returns {Material} - New material
   */
  create(name, options = {}) {
    const material = new Material(this.webglCore, {
      ...options,
      name
    });
    
    this.add(material);
    
    return material;
  }
  
  /**
   * Clone a material
   * @param {string} sourceName - Source material name
   * @param {string} newName - New material name
   * @returns {Material|null} - Cloned material or null if source not found
   */
  clone(sourceName, newName) {
    const sourceMaterial = this.materials.get(sourceName);
    
    if (!sourceMaterial) {
      console.warn(`MaterialLibrary: Material with name '${sourceName}' not found`);
      return null;
    }
    
    const clonedMaterial = sourceMaterial.clone(newName);
    this.add(clonedMaterial);
    
    return clonedMaterial;
  }
  
  /**
   * Get the number of materials
   * @returns {number} - Number of materials
   */
  count() {
    return this.materials.size;
  }
  
  /**
   * Clear all materials
   * @returns {MaterialLibrary} - This library (for chaining)
   */
  clear() {
    this.materials.clear();
    this.defaultMaterial = null;
    return this;
  }
}

/**
 * Create a basic material with common presets
 * @param {WebGLCore} webglCore - The WebGLCore instance
 * @param {string} type - Material type ('basic', 'phong', 'unlit', etc.)
 * @param {Object} options - Material options
 * @returns {Material} - New material
 */
function createMaterial(webglCore, type = 'basic', options = {}) {
  // Base options
  const baseOptions = {
    name: options.name || `${type}Material`,
    program: options.program || null,
    uniforms: {},
    renderState: {},
    debug: options.debug || false
  };
  
  // Apply type-specific presets
  switch (type.toLowerCase()) {
    case 'basic':
      // Basic material with simple options
      baseOptions.uniforms = {
        u_color: options.color || [1, 1, 1, 1],
        u_opacity: options.opacity !== undefined ? options.opacity : 1.0,
        ...options.uniforms
      };
      
      baseOptions.renderState = {
        blend: options.transparent === true,
        depthTest: options.depthTest !== false,
        depthWrite: options.depthWrite !== false,
        cullFace: options.cullFace === true,
        ...options.renderState
      };
      
      if (options.transparent) {
        baseOptions.renderState.blendFunc = {
          src: webglCore.gl.SRC_ALPHA,
          dst: webglCore.gl.ONE_MINUS_SRC_ALPHA
        };
      }
      break;
      
    case 'unlit':
      // Unlit material without lighting
      baseOptions.uniforms = {
        u_color: options.color || [1, 1, 1, 1],
        u_opacity: options.opacity !== undefined ? options.opacity : 1.0,
        u_texture: options.texture !== undefined ? options.texture : null,
        u_useTexture: options.texture !== undefined ? 1 : 0,
        ...options.uniforms
      };
      
      baseOptions.renderState = {
        blend: options.transparent === true,
        depthTest: options.depthTest !== false,
        depthWrite: options.depthWrite !== false,
        cullFace: options.cullFace === true,
        ...options.renderState
      };
      
      if (options.transparent) {
        baseOptions.renderState.blendFunc = {
          src: webglCore.gl.SRC_ALPHA,
          dst: webglCore.gl.ONE_MINUS_SRC_ALPHA
        };
      }
      break;
      
    default:
      console.warn(`createMaterial: Unknown material type '${type}', using basic settings`);
  }
  
  // Create material
  return new Material(webglCore, baseOptions);
}

// Export modules
export { Material, MaterialLibrary, createMaterial, UniformBuffer };

/**
 * UniformBuffer - A higher-level abstraction for managing uniform buffers
 * This is a more advanced version that uses WebGL 2.0 Uniform Buffer Objects
 * for improved performance when supported
 */
class UniformBuffer {
  /**
   * Create a new UniformBuffer
   * @param {WebGLCore} webglCore - The WebGLCore instance
   * @param {Object} options - Configuration options
   * @param {string} options.name - Buffer name
   * @param {Object} options.layout - Buffer layout (name -> type mapping)
   * @param {number} options.bindingPoint - Binding point index
   */
  constructor(webglCore, options = {}) {
    // Store dependencies
    this.webglCore = webglCore;
    
    // Get WebGL context
    this.gl = webglCore.getContext();
    
    if (!this.gl) {
      throw new Error('UniformBuffer: WebGL context not available');
    }
    
    // Check if UBOs are supported (WebGL 2.0)
    this.isUboSupported = this.gl instanceof WebGL2RenderingContext;
    
    // Store options
    this.name = options.name || 'UniformBuffer';
    this.layout = options.layout || {};
    this.bindingPoint = options.bindingPoint || 0;
    
    // Initialize buffer
    this.buffer = null;
    this.bufferSize = 0;
    this.offsets = {};
    this.values = {};
    
    // Performance tracking
    this.perfMetrics = {
      updates: 0,
      binds: 0,
      lastUsedTime: 0
    };
    
    // Create buffer if supported
    if (this.isUboSupported) {
      this._createBuffer();
    }
  }
  
  /**
   * Set a uniform value
   * @param {string} name - Uniform name
   * @param {*} value - Uniform value
   * @returns {UniformBuffer} - This buffer (for chaining)
   */
  setUniform(name, value) {
    if (!this.isUboSupported) {
      console.warn('UniformBuffer: Uniform Buffer Objects not supported');
      return this;
    }
    
    // Skip if uniform not in layout
    if (!this.layout[name]) {
      console.warn(`UniformBuffer: Uniform ${name} not in layout`);
      return this;
    }
    
    // Check if value has changed
    const valueChanged = !this._areValuesEqual(this.values[name], value);
    
    if (!valueChanged && this.values[name] !== undefined) {
      return this;
    }
    
    // Store value
    this.values[name] = this._cloneValue(value);
    
    // Update buffer data
    this._updateBufferData(name, value);
    this.perfMetrics.updates++;
    
    return this;
  }
  
  /**
   * Set multiple uniforms at once
   * @param {Object} uniformsObject - Object with uniform names and values
   * @returns {UniformBuffer} - This buffer (for chaining)
   */
  setUniforms(uniformsObject) {
    if (!this.isUboSupported) {
      console.warn('UniformBuffer: Uniform Buffer Objects not supported');
      return this;
    }
    
    // Skip if empty object
    if (!uniformsObject) return this;
    
    // Bind buffer
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer);
    
    // Set each uniform
    Object.entries(uniformsObject).forEach(([name, value]) => {
      // Skip if uniform not in layout
      if (!this.layout[name]) {
        console.warn(`UniformBuffer: Uniform ${name} not in layout`);
        return;
      }
      
      // Check if value has changed
      const valueChanged = !this._areValuesEqual(this.values[name], value);
      
      if (!valueChanged && this.values[name] !== undefined) {
        return;
      }
      
      // Store value
      this.values[name] = this._cloneValue(value);
      
      // Update buffer data
      this._updateBufferData(name, value);
      this.perfMetrics.updates++;
    });
    
    // Unbind buffer
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
    
    return this;
  }
  
  /**
   * Bind this uniform buffer to a shader program
   * @param {WebGLProgram} program - WebGL program
   * @param {string} [blockName] - Uniform block name (defaults to buffer name)
   * @returns {UniformBuffer} - This buffer (for chaining)
   */
  bindToProgram(program, blockName) {
    if (!this.isUboSupported || !program) return this;
    
    // Use buffer name if block name not provided
    blockName = blockName || this.name;
    
    // Get uniform block index
    const blockIndex = this.gl.getUniformBlockIndex(program, blockName);
    
    // Skip if block not found
    if (blockIndex === this.gl.INVALID_INDEX) {
      console.warn(`UniformBuffer: Uniform block ${blockName} not found in program`);
      return this;
    }
    
    // Bind buffer to binding point
    this.gl.uniformBlockBinding(program, blockIndex, this.bindingPoint);
    this.perfMetrics.binds++;
    
    return this;
  }
  
  /**
   * Bind the buffer to its binding point
   * @returns {UniformBuffer} - This buffer (for chaining)
   */
  bind() {
    if (!this.isUboSupported) return this;
    
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, this.bindingPoint, this.buffer);
    this.perfMetrics.binds++;
    this.perfMetrics.lastUsedTime = performance.now();
    
    return this;
  }
  
  /**
   * Get performance metrics
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.perfMetrics };
  }
  
  /**
   * Reset performance metrics
   * @returns {UniformBuffer} - This buffer (for chaining)
   */
  resetPerformanceMetrics() {
    this.perfMetrics = {
      updates: 0,
      binds: 0,
      lastUsedTime: this.perfMetrics.lastUsedTime
    };
    return this;
  }
  
  /**
   * Check if two values are equal
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} - Whether values are equal
   */
  _areValuesEqual(a, b) {
    // Handle null or undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    
    // Handle primitive types
    if (typeof a !== 'object' && typeof b !== 'object') {
      return a === b;
    }
    
    // Handle arrays
    if ((Array.isArray(a) || ArrayBuffer.isView(a)) && 
        (Array.isArray(b) || ArrayBuffer.isView(b))) {
      
      if (a.length !== b.length) return false;
      
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clone a value
   * @private
   * @param {*} value - Value to clone
   * @returns {*} - Cloned value
   */
  _cloneValue(value) {
    // Handle null or undefined
    if (value == null) return value;
    
    // Handle primitive types
    if (typeof value !== 'object') return value;
    
    // Handle arrays
    if (Array.isArray(value)) {
      return [...value];
    }
    
    // Handle typed arrays
    if (ArrayBuffer.isView(value)) {
      return new value.constructor(value);
    }
    
    return value;
  }
  
  /**
   * Update a specific uniform in the buffer
   * @private
   * @param {string} name - Uniform name
   * @param {*} value - Uniform value
   */
  _updateBufferData(name, value) {
    // Skip if buffer not created
    if (!this.buffer) return;
    
    // Get uniform info
    const type = this.layout[name];
    const offset = this.offsets[name];
    
    // Skip if offset not found
    if (offset === undefined) return;
    
    // Bind buffer
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer);
    
    // Update based on type
    switch (type) {
      case 'float':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Float32Array([value]), 0, 1);
        break;
      case 'vec2':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Float32Array(value), 0, 2);
        break;
      case 'vec3':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Float32Array(value), 0, 3);
        break;
      case 'vec4':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Float32Array(value), 0, 4);
        break;
      case 'int':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Int32Array([value]), 0, 1);
        break;
      case 'ivec2':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Int32Array(value), 0, 2);
        break;
      case 'ivec3':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Int32Array(value), 0, 3);
        break;
      case 'ivec4':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Int32Array(value), 0, 4);
        break;
      case 'mat3':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Float32Array(value), 0, 9);
        break;
      case 'mat4':
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, new Float32Array(value), 0, 16);
        break;
      default:
        console.warn(`UniformBuffer: Unsupported type ${type} for ${name}`);
    }
    
    // Unbind buffer
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
  }
  
  /**
   * Create the uniform buffer
   * @private
   */
  _createBuffer() {
    // Skip if not supported
    if (!this.isUboSupported) return;
    
    // Create buffer
    this.buffer = this.gl.createBuffer();
    
    // Calculate buffer size and offsets
    let bufferSize = 0;
    const STD140_ALIGNMENT = 16; // 4 bytes * 4 components
    
    // Calculate offsets for each uniform
    Object.entries(this.layout).forEach(([name, type]) => {
      // Calculate size based on type
      let size;
      switch (type) {
        case 'float':
        case 'int':
          size = 4;
          break;
        case 'vec2':
        case 'ivec2':
          size = 8;
          break;
        case 'vec3':
        case 'ivec3':
          size = 12;
          break;
        case 'vec4':
        case 'ivec4':
          size = 16;
          break;
        case 'mat3':
          size = 48; // 3x3 matrix with padding = 3 vec4s = 48 bytes
          break;
        case 'mat4':
          size = 64; // 4x4 matrix = 16 floats = 64 bytes
          break;
        default:
          console.warn(`UniformBuffer: Unsupported type ${type} for ${name}`);
          size = 0;
      }
      
      // Calculate aligned offset (std140 layout)
      const alignment = type === 'mat3' || type === 'mat4' ? 
        STD140_ALIGNMENT : Math.min(size, STD140_ALIGNMENT);
      const alignedOffset = Math.ceil(bufferSize / alignment) * alignment;
      
      // Store offset
      this.offsets[name] = alignedOffset;
      
      // Update buffer size
      bufferSize = alignedOffset + size;
    });
    
    // Round up to a multiple of STD140_ALIGNMENT
    this.bufferSize = Math.ceil(bufferSize / STD140_ALIGNMENT) * STD140_ALIGNMENT;
    
    // Bind buffer
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer);
    
    // Allocate buffer
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, this.bufferSize, this.gl.DYNAMIC_DRAW);
    
    // Bind buffer to binding point
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, this.bindingPoint, this.buffer);
    
    // Unbind buffer
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
  }
}
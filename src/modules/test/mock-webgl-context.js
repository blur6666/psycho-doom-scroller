/**
 * @fileoverview Mock WebGL Rendering Context for unit testing.
 * This mock allows testing WebGL-dependent modules without a browser environment.
 * It supports both WebGL1 and WebGL2 functionalities.
 */

class MockWebGLContext {
  /**
   * Create a new MockWebGLContext
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.isWebGL2=false] - Whether to mock a WebGL2 context
   */
  constructor(options = {}) {
    this.isWebGL2 = options.isWebGL2 || false;
    this._initConstants();
    this.state = {};
    this.calls = {};
    this.debug = {
      errors: [],
      warnings: [],
      lastCall: null,
      callStack: [],
    };
    this.reset();
  }

  /**
   * Initializes all WebGL constants.
   * @private
   */
  _initConstants() {
    // Buffer constants
    this.ARRAY_BUFFER = 0x8892;
    this.ELEMENT_ARRAY_BUFFER = 0x8893;
    this.STATIC_DRAW = 0x88E4;
    this.DYNAMIC_DRAW = 0x88E8;

    // Clearing constants
    this.COLOR_BUFFER_BIT = 0x4000;
    this.DEPTH_BUFFER_BIT = 0x0100;
    this.STENCIL_BUFFER_BIT = 0x0400;

    // Shader constants
    this.VERTEX_SHADER = 0x8B31;
    this.FRAGMENT_SHADER = 0x8B30;
    this.COMPILE_STATUS = 0x8B81;
    this.LINK_STATUS = 0x8B82;

    // Data types
    this.FLOAT = 0x1406;
    this.UNSIGNED_BYTE = 0x1401;
    this.UNSIGNED_SHORT = 0x1403;
    this.UNSIGNED_INT = 0x1405;

    // Drawing modes
    this.POINTS = 0x0000;
    this.LINES = 0x0001;
    this.LINE_LOOP = 0x0002;
    this.LINE_STRIP = 0x0003;
    this.TRIANGLES = 0x0004;
    this.TRIANGLE_STRIP = 0x0005;
    this.TRIANGLE_FAN = 0x0006;
  }

  /**
   * Resets the mock's state and call counters.
   */
  reset() {
    this.resetState();
    this.resetCallCounters();
    this.debug.errors = [];
    this.debug.warnings = [];
    this.debug.lastCall = null;
    this.debug.callStack = [];
  }

  /**
   * Resets the mock state to its default values.
   */
  resetState() {
    this.state = {
      clearColor: [0, 0, 0, 0],
      clearDepth: 1.0,
      clearStencil: 0,
      currentProgram: null,
      shaders: {},
      programs: {},
      buffers: {},
      textures: {},
      uniformLocations: {},
      attribLocations: {},
      nextShaderId: 1,
      nextProgramId: 1,
      nextBufferId: 1,
      nextTextureId: 1,
      nextUniformLoc: 1,
      nextAttribLoc: 0,
    };
  }

  /**
   * Resets all call counters to zero.
   */
  resetCallCounters() {
    this.calls = {};
  }

  /**
   * Records a function call for debugging and verification.
   * @param {string} name - The name of the function that was called.
   * @param {Array} [args=[]] - The arguments passed to the function.
   * @private
   */
  _recordCall(name, args = []) {
    if (this.calls[name] === undefined) {
      this.calls[name] = 0;
    }
    this.calls[name]++;

    const callInfo = { name, args, timestamp: Date.now() };
    this.debug.lastCall = callInfo;
    this.debug.callStack.push(callInfo);
    if (this.debug.callStack.length > 100) {
      this.debug.callStack.shift();
    }
  }

  /**
   * Set the clear color
   * @param {number} r - Red (0-1)
   * @param {number} g - Green (0-1)
   * @param {number} b - Blue (0-1)
   * @param {number} a - Alpha (0-1)
   */
  clearColor(r, g, b, a) {
    this._recordCall('clearColor', [r, g, b, a]);
    this.state.clearColor = [r, g, b, a];
  }

  /**
   * Clear the specified buffers.
   * @param {number} mask - The buffer bits to clear.
   */
  clear(mask) {
    this._recordCall('clear', [mask]);
    // No actual clearing happens in the mock
  }

  /**
   * Create a shader object.
   * @param {number} type - The type of shader (VERTEX_SHADER or FRAGMENT_SHADER).
   * @returns {string} A mock shader object (ID).
   */
  createShader(type) {
    this._recordCall('createShader', [type]);
    const shaderId = `shader_${this.state.nextShaderId++}`;
    this.state.shaders[shaderId] = { type, source: null, compiled: false };
    return shaderId;
  }

  /**
   * Set the source code of a shader.
   * @param {string} shader - The shader object (ID).
   * @param {string} source - The GLSL source code.
   */
  shaderSource(shader, source) {
    this._recordCall('shaderSource', [shader, source]);
    if (this.state.shaders[shader]) {
      this.state.shaders[shader].source = source;
    }
  }

  /**
   * Compile a shader.
   * @param {string} shader - The shader object (ID).
   */
  compileShader(shader) {
    this._recordCall('compileShader', [shader]);
    if (this.state.shaders[shader]) {
      this.state.shaders[shader].compiled = true;
    }
  }

  /**
   * Get a shader parameter.
   * @param {string} shader - The shader object (ID).
   * @param {number} pname - The parameter to get (e.g., COMPILE_STATUS).
   * @returns {*} The value of the parameter.
   */
  getShaderParameter(shader, pname) {
    this._recordCall('getShaderParameter', [shader, pname]);
    if (this.state.shaders[shader]) {
      switch (pname) {
        case this.COMPILE_STATUS:
          return this.state.shaders[shader].compiled;
      }
    }
    return null;
  }

  /**
   * Get the shader info log.
   * @param {string} shader - The shader object (ID).
   * @returns {string} The info log.
   */
  getShaderInfoLog(shader) {
    this._recordCall('getShaderInfoLog', [shader]);
    if (this.state.shaders[shader] && !this.state.shaders[shader].compiled) {
      return 'Mock shader compilation error';
    }
    return '';
  }

  /**
   * Create a program object.
   * @returns {string} A mock program object (ID).
   */
  createProgram() {
    this._recordCall('createProgram');
    const programId = `program_${this.state.nextProgramId++}`;
    this.state.programs[programId] = { shaders: [], linked: false, attributes: {}, uniforms: {} };
    return programId;
  }

  /**
   * Attach a shader to a program.
   * @param {string} program - The program object (ID).
   * @param {string} shader - The shader object (ID).
   */
  attachShader(program, shader) {
    this._recordCall('attachShader', [program, shader]);
    if (this.state.programs[program] && this.state.shaders[shader]) {
      this.state.programs[program].shaders.push(shader);
    }
  }

  /**
   * Link a program.
   * @param {string} program - The program object (ID).
   */
  linkProgram(program) {
    this._recordCall('linkProgram', [program]);
    if (this.state.programs[program]) {
      this.state.programs[program].linked = true;
    }
  }

  /**
   * Get a program parameter.
   * @param {string} program - The program object (ID).
   * @param {number} pname - The parameter to get (e.g., LINK_STATUS).
   * @returns {*} The value of the parameter.
   */
  getProgramParameter(program, pname) {
    this._recordCall('getProgramParameter', [program, pname]);
    if (this.state.programs[program]) {
      switch (pname) {
        case this.LINK_STATUS:
          return this.state.programs[program].linked;
      }
    }
    return null;
  }

  /**
   * Get the program info log.
   * @param {string} program - The program object (ID).
   * @returns {string} The info log.
   */
  getProgramInfoLog(program) {
    this._recordCall('getProgramInfoLog', [program]);
    if (this.state.programs[program] && !this.state.programs[program].linked) {
      return 'Mock program link error';
    }
    return '';
  }

  /**
   * Use a program.
   * @param {string} program - The program object (ID).
   */
  useProgram(program) {
    this._recordCall('useProgram', [program]);
    this.state.currentProgram = program;
  }

  /**
   * Get the location of a uniform variable.
   * @param {string} program - The program object (ID).
   * @param {string} name - The name of the uniform.
   * @returns {string} The mock location of the uniform.
   */
  getUniformLocation(program, name) {
    this._recordCall('getUniformLocation', [program, name]);
    const locId = `uniform_${this.state.nextUniformLoc++}`;
    this.state.uniformLocations[locId] = { program, name };
    return locId;
  }

  /**
   * Get the location of an attribute variable.
   * @param {string} program - The program object (ID).
   * @param {string} name - The name of the attribute.
   * @returns {number} The mock location of the attribute.
   */
  getAttribLocation(program, name) {
    this._recordCall('getAttribLocation', [program, name]);
    const loc = this.state.nextAttribLoc++;
    this.state.attribLocations[loc] = { program, name };
    return loc;
  }

  /**
   * Create a buffer object.
   * @returns {string} A mock buffer object (ID).
   */
  createBuffer() {
    this._recordCall('createBuffer');
    const bufferId = `buffer_${this.state.nextBufferId++}`;
    this.state.buffers[bufferId] = { data: null, target: null, usage: null };
    return bufferId;
  }

  /**
   * Bind a buffer object.
   * @param {number} target - The buffer target (e.g., ARRAY_BUFFER).
   * @param {string} buffer - The buffer object (ID).
   */
  bindBuffer(target, buffer) {
    this._recordCall('bindBuffer', [target, buffer]);
    if (this.state.buffers[buffer]) {
      this.state.buffers[buffer].target = target;
    }
  }

  /**
   * Set buffer data.
   * @param {number} target - The buffer target.
   * @param {ArrayBuffer|ArrayBufferView} data - The data to store.
   * @param {number} usage - The usage pattern (e.g., STATIC_DRAW).
   */
  bufferData(target, data, usage) {
    this._recordCall('bufferData', [target, data, usage]);
    for (const bufId in this.state.buffers) {
      if (this.state.buffers[bufId].target === target) {
        this.state.buffers[bufId].data = data;
        this.state.buffers[bufId].usage = usage;
        return;
      }
    }
  }

  /**
   * Specify the location and data format of a vertex attribute.
   * @param {number} index - The attribute location.
   * @param {number} size - The number of components per attribute.
   * @param {number} type - The data type.
   * @param {boolean} normalized - Whether to normalize integer data.
   * @param {number} stride - The offset in bytes between consecutive attributes.
   * @param {number} offset - The offset in bytes of the first component.
   */
  vertexAttribPointer(index, size, type, normalized, stride, offset) {
    this._recordCall('vertexAttribPointer', [index, size, type, normalized, stride, offset]);
  }

  /**
   * Enable a vertex attribute array.
   * @param {number} index - The attribute location.
   */
  enableVertexAttribArray(index) {
    this._recordCall('enableVertexAttribArray', [index]);
  }

  /**
   * Draw primitives.
   * @param {number} mode - The drawing mode (e.g., TRIANGLES).
   * @param {number} first - The starting index.
   * @param {number} count - The number of indices to be rendered.
   */
  drawArrays(mode, first, count) {
    this._recordCall('drawArrays', [mode, first, count]);
  }

  /**
   * Draw primitives from element arrays.
   * @param {number} mode - The drawing mode.
   * @param {number} count - The number of elements to be rendered.
   * @param {number} type - The type of the values in the element array buffer.
   * @param {number} offset - The offset in bytes into the element array buffer.
   */
  drawElements(mode, count, type, offset) {
    this._recordCall('drawElements', [mode, count, type, offset]);
  }

  /**
   * Get an error code.
   * @returns {number} The current error code.
   */
  getError() {
    this._recordCall('getError');
    if (this.debug.errors.length > 0) {
      return this.debug.errors.shift();
    }
    return this.NO_ERROR;
  }
}

export default MockWebGLContext;
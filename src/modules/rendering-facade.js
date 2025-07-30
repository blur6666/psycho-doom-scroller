/**
 * RenderingFacade Module
 * 
 * Provides a facade over both the old monolithic WebGL implementation and the
 * new modular architecture. This allows for a phased migration where features
 * can be gradually moved from the old implementation to the new one using
 * feature flags.
 */

import WebGLCore from './webgl-core.js';
import ShaderManager from './shader-manager.js';
import { Material } from './material.js';

class RenderingFacade {
  /**
   * Create a new RenderingFacade
   * @param {Object} options - Configuration options
   * @param {boolean} options.useNewImplementation - Whether to use the new implementation
   * @param {Object} options.featureFlags - Feature flags for selective migration
   * @param {Object} options.legacyGlobals - Legacy global variables to sync with
   */
  constructor(options = {}) {
    // Configuration
    this.options = Object.assign({
      useNewImplementation: false,  // Default to old implementation
      featureFlags: {
        useNewWebGLCore: false,     // Use new WebGLCore
        useNewShaderManager: false, // Use new ShaderManager
        useNewTransitions: false,   // Use new transition system
        useNewEventHandling: false, // Use new event handling
      },
      legacyGlobals: null           // Reference to legacy global variables
    }, options);
    
    // Modules for new implementation
    this.webglCore = null;
    this.shaderManager = null;
    
    // References for old implementation
    this.legacyGlobals = this.options.legacyGlobals;
    
    // State tracking
    this.isInitialized = false;
    this.currentImplementation = 'legacy';
    
    // Proxy methods that will be overridden based on implementation
    this._setupProxyMethods();
  }
  
  /**
   * Initialize the facade
   * @param {HTMLCanvasElement|string} canvasOrSelector - Canvas element or selector
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async init(canvasOrSelector) {
    console.log(`RenderingFacade: Initializing with ${this.options.useNewImplementation ? 'new' : 'legacy'} implementation`);
    
    // If using new implementation (fully or partially)
    if (this.options.useNewImplementation || Object.values(this.options.featureFlags).some(flag => flag)) {
      try {
        await this._initNewImplementation(canvasOrSelector);
        this.currentImplementation = 'new';
      } catch (error) {
        console.error('RenderingFacade: Failed to initialize new implementation, falling back to legacy', error);
        await this._initLegacyImplementation(canvasOrSelector);
        this.currentImplementation = 'legacy';
      }
    } else {
      // Use legacy implementation
      await this._initLegacyImplementation(canvasOrSelector);
      this.currentImplementation = 'legacy';
    }
    
    this.isInitialized = true;
    return true;
  }
  
  /**
   * Initialize the new modular implementation
   * @private
   * @param {HTMLCanvasElement|string} canvasOrSelector - Canvas element or selector
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async _initNewImplementation(canvasOrSelector) {
    // Initialize WebGLCore
    this.webglCore = new WebGLCore({
      debug: true
    });
    
    const webglInitialized = this.webglCore.init(canvasOrSelector);
    
    if (!webglInitialized) {
      throw new Error('Failed to initialize WebGLCore');
    }
    
    // Initialize ShaderManager
    this.shaderManager = new ShaderManager(this.webglCore, {
      enableCache: true,
      shuffleManifest: false // To match legacy behavior
    });
    
    const shaderManagerInitialized = await this.shaderManager.init();
    
    if (!shaderManagerInitialized) {
      throw new Error('Failed to initialize ShaderManager');
    }
    
    // Override facade methods with new implementation
    this._overrideWithNewImplementation();
    
    console.log('RenderingFacade: New implementation initialized successfully');
    return true;
  }
  
  /**
   * Initialize the legacy monolithic implementation
   * @private
   * @param {HTMLCanvasElement|string} canvasOrSelector - Canvas element or selector
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async _initLegacyImplementation(canvasOrSelector) {
    if (!this.legacyGlobals) {
      console.warn('RenderingFacade: No legacy globals provided, legacy implementation may not work');
    }
    
    // Find canvas element
    let canvas;
    if (typeof canvasOrSelector === 'string') {
      canvas = document.querySelector(canvasOrSelector);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = canvasOrSelector.replace(/^#/, '');
        document.body.appendChild(canvas);
      }
    } else {
      canvas = canvasOrSelector;
    }
    
    // Set up global references to match legacy implementation expectations
    if (window.canvas !== canvas) {
      window.canvas = canvas;
    }
    
    // Initialize legacy implementation
    // This would typically trigger the DOMContentLoaded event handler in the old code
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // Document already loaded, manually trigger initialization
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    }
    
    // Override facade methods with legacy implementation
    this._overrideWithLegacyImplementation();
    
    console.log('RenderingFacade: Legacy implementation initialized successfully');
    return true;
  }
  
  /**
   * Set up proxy methods that will be overridden based on implementation
   * @private
   */
  _setupProxyMethods() {
    // These methods will be overridden based on the active implementation
    this.loadShader = () => { throw new Error('Method not implemented'); };
    this.nextShader = () => { throw new Error('Method not implemented'); };
    this.prevShader = () => { throw new Error('Method not implemented'); };
    this.randomShader = () => { throw new Error('Method not implemented'); };
    this.clear = () => { throw new Error('Method not implemented'); };
    this.render = () => { throw new Error('Method not implemented'); };
    this.resize = () => { throw new Error('Method not implemented'); };
  }
  
  /**
   * Override facade methods with new implementation
   * @private
   */
  _overrideWithNewImplementation() {
    // Load shader implementation
    this.loadShader = async (idOrIndex) => {
      if (typeof idOrIndex === 'number') {
        return await this.shaderManager.loadShaderByIndex(idOrIndex);
      } else {
        return await this.shaderManager.loadShaderById(idOrIndex);
      }
    };
    
    // Navigation implementations
    this.nextShader = async () => {
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      const nextIndex = (currentIndex + 1) % this.shaderManager.getManifest().length;
      return await this.shaderManager.loadShaderByIndex(nextIndex);
    };
    
    this.prevShader = async () => {
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      const manifestLength = this.shaderManager.getManifest().length;
      const prevIndex = (currentIndex - 1 + manifestLength) % manifestLength;
      return await this.shaderManager.loadShaderByIndex(prevIndex);
    };
    
    this.randomShader = async () => {
      const currentIndex = this.shaderManager.getCurrentShaderIndex();
      const manifestLength = this.shaderManager.getManifest().length;
      
      // Make sure we don't select the current shader
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * manifestLength);
      } while (randomIndex === currentIndex && manifestLength > 1);
      
      return await this.shaderManager.loadShaderByIndex(randomIndex);
    };
    
    // Rendering implementations
    this.clear = () => {
      this.webglCore.clear();
    };
    
    this.render = (time) => {
      // Get WebGL context
      const gl = this.webglCore.getContext();
      
      if (!gl) {
        console.error('RenderingFacade: WebGL context not available');
        return;
      }
      
      // Clear canvas
      this.webglCore.clear();
      
      // Get current shader
      const currentShader = this.shaderManager.getCurrentShader();
      
      if (currentShader) {
        // Use shader program
        this.webglCore.useProgram(currentShader.program);
        
        // Get canvas and calculate aspect ratio
        const canvas = this.webglCore.getCanvas();
        const aspectRatio = canvas.width / canvas.height;
        
        // Set uniforms
        const uniforms = {
          u_resolution: [canvas.width, canvas.height],
          u_time: time / 1000.0,
          u_aspectRatio: aspectRatio,
          u_isLandscape: canvas.width > canvas.height ? 1 : 0
        };
        
        // Create material for uniform management
        const material = new Material(this.webglCore, {
          program: currentShader.program,
          uniforms
        });
        
        material.use().setUniforms(uniforms);
        
        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
    
    this.resize = () => {
      this.webglCore.handleResize();
    };
  }
  
  /**
   * Override facade methods with legacy implementation
   * @private
   */
  _overrideWithLegacyImplementation() {
    // Verify that legacy globals are available
    if (!this.legacyGlobals && typeof window !== 'undefined') {
      // Try to find globals in window
      this.legacyGlobals = window;
    }
    
    if (!this.legacyGlobals) {
      console.error('RenderingFacade: Legacy globals not available');
      return;
    }
    
    // Load shader implementation
    this.loadShader = async (idOrIndex) => {
      if (typeof idOrIndex === 'number') {
        // Call legacy loadShaderByIndex
        if (typeof this.legacyGlobals.loadShaderByIndex === 'function') {
          return this.legacyGlobals.loadShaderByIndex(idOrIndex);
        }
      } else {
        // Find index by ID and call legacy loadShaderByIndex
        if (typeof this.legacyGlobals.shaderManifest !== 'undefined' && 
            Array.isArray(this.legacyGlobals.shaderManifest)) {
          const index = this.legacyGlobals.shaderManifest.findIndex(shader => shader.id === idOrIndex);
          if (index >= 0 && typeof this.legacyGlobals.loadShaderByIndex === 'function') {
            return this.legacyGlobals.loadShaderByIndex(index);
          }
        }
      }
      return null;
    };
    
    // Navigation implementations
    this.nextShader = async () => {
      if (typeof this.legacyGlobals.transitionToNextShader === 'function') {
        return this.legacyGlobals.transitionToNextShader();
      }
      return false;
    };
    
    this.prevShader = async () => {
      if (typeof this.legacyGlobals.transitionToPrevShader === 'function') {
        return this.legacyGlobals.transitionToPrevShader();
      }
      return false;
    };
    
    this.randomShader = async () => {
      if (typeof this.legacyGlobals.transitionToRandomShader === 'function') {
        return this.legacyGlobals.transitionToRandomShader();
      }
      return false;
    };
    
    // Rendering implementations
    this.clear = () => {
      if (this.legacyGlobals.gl) {
        this.legacyGlobals.gl.clear(this.legacyGlobals.gl.COLOR_BUFFER_BIT);
      }
    };
    
    this.render = (time) => {
      // Legacy implementation typically handles rendering in its own render loop
      // This is just a pass-through to ensure compatibility
      if (typeof this.legacyGlobals.render === 'function') {
        this.legacyGlobals.render(time);
      }
    };
    
    this.resize = () => {
      if (typeof this.legacyGlobals.handleResize === 'function') {
        this.legacyGlobals.handleResize();
      } else if (typeof this.legacyGlobals.resizeCanvasToDisplaySize === 'function' && 
                this.legacyGlobals.canvas && this.legacyGlobals.gl) {
        this.legacyGlobals.resizeCanvasToDisplaySize(this.legacyGlobals.canvas);
        this.legacyGlobals.gl.viewport(0, 0, this.legacyGlobals.canvas.width, this.legacyGlobals.canvas.height);
      }
    };
  }
  
  /**
   * Switch implementation at runtime
   * @param {string} implementation - Implementation to switch to ('new' or 'legacy')
   * @returns {boolean} - Whether switch was successful
   */
  switchImplementation(implementation) {
    if (!this.isInitialized) {
      console.error('RenderingFacade: Cannot switch implementation before initialization');
      return false;
    }
    
    if (implementation === 'new') {
      if (!this.webglCore || !this.shaderManager) {
        console.error('RenderingFacade: New implementation not available');
        return false;
      }
      this._overrideWithNewImplementation();
      this.currentImplementation = 'new';
      console.log('RenderingFacade: Switched to new implementation');
      return true;
    } else if (implementation === 'legacy') {
      if (!this.legacyGlobals) {
        console.error('RenderingFacade: Legacy implementation not available');
        return false;
      }
      this._overrideWithLegacyImplementation();
      this.currentImplementation = 'legacy';
      console.log('RenderingFacade: Switched to legacy implementation');
      return true;
    } else {
      console.error(`RenderingFacade: Unknown implementation "${implementation}"`);
      return false;
    }
  }
  
  /**
   * Toggle between implementations
   * @returns {string} - New active implementation
   */
  toggleImplementation() {
    const newImplementation = this.currentImplementation === 'new' ? 'legacy' : 'new';
    this.switchImplementation(newImplementation);
    return newImplementation;
  }
  
  /**
   * Set feature flags to control which parts of the implementation to use
   * @param {Object} featureFlags - Feature flags object
   * @returns {RenderingFacade} - This facade instance (for chaining)
   */
  setFeatureFlags(featureFlags) {
    this.options.featureFlags = Object.assign(this.options.featureFlags, featureFlags);
    
    // Determine if we should use new implementation based on feature flags
    this.options.useNewImplementation = Object.values(this.options.featureFlags).some(flag => flag);
    
    // Re-override methods based on new flags
    if (this.options.useNewImplementation) {
      this._overrideWithNewImplementation();
      this.currentImplementation = 'new';
    } else {
      this._overrideWithLegacyImplementation();
      this.currentImplementation = 'legacy';
    }
    
    return this;
  }
  
  /**
   * Get current implementation
   * @returns {string} - Current implementation ('new' or 'legacy')
   */
  getCurrentImplementation() {
    return this.currentImplementation;
  }
  
  /**
   * Get feature flags
   * @returns {Object} - Current feature flags
   */
  getFeatureFlags() {
    return { ...this.options.featureFlags };
  }
  
  /**
   * Destroy the facade and clean up resources
   */
  destroy() {
    // Clean up new implementation
    if (this.shaderManager) {
      this.shaderManager.destroy();
      this.shaderManager = null;
    }
    
    if (this.webglCore) {
      this.webglCore.destroy();
      this.webglCore = null;
    }
    
    // Clean up legacy references
    this.legacyGlobals = null;
    
    this.isInitialized = false;
    console.log('RenderingFacade: Destroyed');
  }
}

export default RenderingFacade;
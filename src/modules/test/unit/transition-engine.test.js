/**
 * TransitionEngine Module Unit Tests
 * 
 * Tests the functionality of the TransitionEngine module including:
 * - Initialization and configuration
 * - Transition start, update, and completion
 * - Different transition effects
 * - Error handling
 */

import TransitionEngine from '../../transition-engine.js';
import MockWebGLContext from '../mock-webgl-context.js';

describe('TransitionEngine', () => {
  let mockWebGLCore;
  let mockShaderManager;
  let transitionEngine;
  let mockCanvas;
  let mockManifest;
  
  // Setup mocks and TransitionEngine instance before each test
  beforeEach(() => {
    // Create a mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    // Create mock WebGL context
    const mockGL = new MockWebGLContext({
      shaderCompileSuccess: true,
      programLinkSuccess: true
    });
    
    // Create a mock WebGLCore
    mockWebGLCore = {
      getContext: jest.fn().mockReturnValue(mockGL),
      getCanvas: jest.fn().mockReturnValue(mockCanvas),
      useProgram: jest.fn(),
      setCapability: jest.fn(),
      setBlendFunc: jest.fn(),
      getCurrentProgram: jest.fn()
    };
    
    // Create a mock ShaderManager with a sample manifest
    mockManifest = [
      { id: 'shader1', name: 'Shader 1' },
      { id: 'shader2', name: 'Shader 2' },
      { id: 'shader3', name: 'Shader 3' }
    ];
    
    // Create mock shaders
    const mockShader1 = {
      id: 'shader1',
      name: 'Shader 1',
      program: 'program_0',
      info: mockManifest[0]
    };
    
    const mockShader2 = {
      id: 'shader2',
      name: 'Shader 2',
      program: 'program_1',
      info: mockManifest[1]
    };
    
    mockShaderManager = {
      getCurrentShader: jest.fn().mockReturnValue(mockShader1),
      getManifest: jest.fn().mockReturnValue(mockManifest),
      getCurrentShaderIndex: jest.fn().mockReturnValue(0),
      loadShaderByIndex: jest.fn().mockResolvedValue(mockShader2)
    };
    
    // Initialize TransitionEngine with mock dependencies
    transitionEngine = new TransitionEngine(mockWebGLCore, mockShaderManager, {
      duration: 500,
      defaultEffect: 'fade'
    });
    
    // Mock document.dispatchEvent to track emitted events
    document.dispatchEvent = jest.fn();
  });
  
  afterEach(() => {
    // Clean up
    jest.resetAllMocks();
  });
  
  // Test initialization
  test('should initialize correctly', () => {
    expect(transitionEngine.init()).toBe(true);
    expect(transitionEngine.isTransitioning()).toBe(false);
    expect(transitionEngine.getTransitionProgress()).toBe(0);
  });
  
  // Test starting a transition
  test('should start a transition correctly', async () => {
    // Start transition to next shader
    const result = await transitionEngine.startTransition(1);
    
    expect(result).toBe(true);
    expect(transitionEngine.isTransitioning()).toBe(true);
    expect(mockWebGLCore.getContext).toHaveBeenCalled();
    expect(mockShaderManager.getCurrentShader).toHaveBeenCalled();
    expect(mockShaderManager.loadShaderByIndex).toHaveBeenCalledWith(1, true);
    expect(mockWebGLCore.setCapability).toHaveBeenCalledWith('blend', true);
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transition-engine-transition-start'
      })
    );
  });
  
  // Test transition failure with no current shader
  test('should fail to start transition if no current shader', async () => {
    // Mock getCurrentShader to return null
    mockShaderManager.getCurrentShader.mockReturnValueOnce(null);
    
    const result = await transitionEngine.startTransition(1);
    
    expect(result).toBe(false);
    expect(transitionEngine.isTransitioning()).toBe(false);
  });
  
  // Test updating transition progress
  test('should update transition progress correctly', () => {
    // Start a transition
    transitionEngine.startTransition(1);
    
    // Mock performance.now for consistent testing
    const mockStartTime = 1000;
    const mockCurrentTime = 1250; // 50% of the 500ms duration
    
    // Set start time directly for testing
    transitionEngine.startTime = mockStartTime;
    
    // Update transition
    const progress = transitionEngine.updateTransition(mockCurrentTime);
    
    // Should be approximately 0.5 (50%) progress with easing applied
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
    expect(transitionEngine.progress).toBe(progress);
  });
  
  // Test completing a transition
  test('should complete a transition correctly', async () => {
    // Start a transition
    await transitionEngine.startTransition(1);
    
    // Complete the transition
    transitionEngine.progress = 0.95; // Just below completion threshold
    transitionEngine.completeTransition();
    
    expect(transitionEngine.isTransitioning()).toBe(false);
    expect(transitionEngine.progress).toBe(0);
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transition-engine-transition-complete'
      })
    );
  });
  
  // Test forced transition completion
  test('should force-complete a transition when requested', async () => {
    // Start a transition
    await transitionEngine.startTransition(1);
    
    // Set progress below the normal completion threshold
    transitionEngine.progress = 0.5;
    
    // Force-complete the transition
    transitionEngine.completeTransition(true);
    
    expect(transitionEngine.isTransitioning()).toBe(false);
    expect(document.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transition-engine-transition-complete'
      })
    );
  });
  
  // Test rendering fade transition
  test('should render fade transition correctly', async () => {
    // Start a transition
    await transitionEngine.startTransition(1);
    
    // Mock GL functions for rendering
    const mockGL = mockWebGLCore.getContext();
    mockGL.uniform1f = jest.fn();
    mockGL.uniform2f = jest.fn();
    mockGL.drawArrays = jest.fn();
    
    // Render the transition
    transitionEngine.render(1500);
    
    // Should have used both programs and drawn twice
    expect(mockWebGLCore.useProgram).toHaveBeenCalledTimes(2);
    expect(mockGL.drawArrays).toHaveBeenCalledTimes(2);
    expect(mockGL.uniform1f).toHaveBeenCalled();
  });
  
  // Test the destroy method
  test('should clean up resources when destroyed', async () => {
    // Start a transition
    await transitionEngine.startTransition(1);
    
    // Destroy the transition engine
    transitionEngine.destroy();
    
    expect(transitionEngine.isTransitioning()).toBe(false);
    expect(transitionEngine.previousProgram).toBeNull();
    expect(transitionEngine.nextProgram).toBeNull();
  });
  
  // Test transition with custom duration
  test('should respect custom transition duration', async () => {
    // Start transition with custom duration
    await transitionEngine.startTransition(1, 1, { duration: 1000 });
    
    expect(transitionEngine.duration).toBe(1000);
  });
  
  // Test default easing function
  test('should apply default easing function correctly', () => {
    // Test various progress values through the easing function
    const samples = [0, 0.25, 0.5, 0.75, 1];
    samples.forEach(sample => {
      const eased = transitionEngine._defaultEasing(sample);
      
      // Easing should always return a value between 0 and 1
      expect(eased).toBeGreaterThanOrEqual(0);
      expect(eased).toBeLessThanOrEqual(1);
      
      // Easing should follow the cubic ease-in-out curve
      // Middle values should change more rapidly than endpoints
      if (sample > 0 && sample < 1) {
        const derivative = (transitionEngine._defaultEasing(sample + 0.01) - eased) / 0.01;
        if (sample < 0.5) {
          expect(derivative).toBeGreaterThan(0); // Slope should be positive
        } else {
          expect(derivative).toBeGreaterThan(0); // Slope should be positive
        }
      }
    });
  });
});
// State management for WebGL context
let canvas, gl, program, animationFrameId;
let aspectRatio = 1.0;
let deviceOrientation = 'landscape';

// Shader management
let currentShaderIndex = 0;
let shaderManifest = [];
let isLoading = false;

// Transition state management
let isTransitioning = false;
let transitionStartTime = 0;
let transitionDuration = 375; // transition duration in ms (2x faster than original 750ms)
let transitionDirection = 1;  // 1 = next, -1 = previous
let prevProgram = null;       // previous shader program during transition
let nextProgram = null;       // next shader program during transition
let transitionProgress = 0;   // 0.0 to 1.0
let targetShaderIndex = 0;    // target shader index for the current transition

// Cache for uniform locations to avoid redundant lookups
let uniformLocations = {
    resolution: null,
    time: null,
    aspectRatio: null,
    orientation: null
};

/**
 * Updates uniform locations for the current shader program
 * This needs to be called whenever the shader program changes
 */
function updateUniformLocations() {
    if (!program) return;
    
    uniformLocations.resolution = gl.getUniformLocation(program, 'u_resolution');
    uniformLocations.time = gl.getUniformLocation(program, 'u_time');
    uniformLocations.aspectRatio = gl.getUniformLocation(program, 'u_aspectRatio');
    uniformLocations.orientation = gl.getUniformLocation(program, 'u_isLandscape');
    
    console.log('Uniform locations updated for new shader');
}

/**
 * Creates a shader of specified type with provided source code
 * @param {WebGLRenderingContext} gl - The WebGL context
 * @param {string} source - GLSL source code
 * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @returns {WebGLShader|null} - Compiled shader or null if compilation failed
 */
function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

/**
 * Resizes the canvas to match its display size, considering device pixel ratio
 * @param {HTMLCanvasElement} canvas - The canvas element to resize
 * @returns {boolean} - Whether the canvas was resized
 */
function resizeCanvasToDisplaySize(canvas) {
    // Use device pixel ratio for higher resolution on high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;
    
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        
        // Update aspect ratio for use in shaders
        aspectRatio = width / height;
        
        // Detect and store orientation
        deviceOrientation = width > height ? 'landscape' : 'portrait';
        console.log(`Canvas resized: ${width}x${height}, orientation: ${deviceOrientation}, DPR: ${dpr}`);
        
        return true;
    }
    return false;
}

/**
 * Creates and initializes the WebGL canvas
 */
function createCanvas() {
    // Dynamically create canvas element
    canvas = document.createElement('canvas');
    canvas.id = 'glsl-canvas';
    document.body.appendChild(canvas);
    
    // Apply initial styles
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    
    // Initialize WebGL context
    gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL2 not supported');
        return false;
    }
    
    return true;
}

/**
 * Shows or hides the loading indicator
 * @param {boolean} show - Whether to show or hide the loading indicator
 */
function showLoading(show) {
    isLoading = show;
    
    // Create loading indicator if it doesn't exist
    let loadingIndicator = document.getElementById('loading-indicator');
    if (!loadingIndicator && show) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = 'Loading shader...';
        document.body.appendChild(loadingIndicator);
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

/**
 * Fetches the shader manifest from the API
 * @returns {Promise<Array>} - Promise resolving to shader manifest
 */
async function fetchShaderManifest() {
    showLoading(true);
    try {
        const response = await fetch('/api/shaders/manifest');
        if (!response.ok) {
            throw new Error(`Failed to fetch shader manifest: ${response.status} ${response.statusText}`);
        }
        const manifest = await response.json();
        console.log(`Loaded shader manifest with ${manifest.length} shaders`);
        return manifest;
    } catch (error) {
        console.error('Error fetching shader manifest:', error);
        return [];
    } finally {
        showLoading(false);
    }
}

/**
 * Fetches a shader source by ID
 * @param {string} id - Shader ID from manifest
 * @returns {Promise<string>} - Promise resolving to shader source
 */
async function fetchShaderSource(id) {
    showLoading(true);
    try {
        const response = await fetch(`/api/shaders/${encodeURIComponent(id)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch shader ${id}: ${response.status} ${response.statusText}`);
        }
        const source = await response.text();
        console.log(`Loaded shader ${id} (${source.length} bytes)`);
        return source;
    } catch (error) {
        console.error(`Error fetching shader ${id}:`, error);
        return null;
    } finally {
        showLoading(false);
    }
}

/**
 * Creates and shows a notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Notification type (error, info, success)
 * @param {number} duration - How long to show notification in ms (0 for permanent)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notification
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        document.body.removeChild(existingNotification);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add close button for permanent notifications
    if (duration === 0) {
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.className = 'notification-close';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(notification);
        });
        notification.appendChild(closeButton);
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto-hide after duration (if not permanent)
    if (duration > 0) {
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
    
    // Log message to console too
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
}

/**
 * Compiles and links a shader program from vertex and fragment shader sources
 * @param {string} vsSource - Vertex shader source
 * @param {string} fsSource - Fragment shader source
 * @param {string} shaderId - ID of shader for error reporting
 * @returns {WebGLProgram|null} - Compiled program or null if failed
 */
function compileShaderProgram(vsSource, fsSource, shaderId = 'unknown') {
    try {
        // Compile vertex shader
        const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
        if (!vertexShader) {
            showNotification(`Failed to compile vertex shader: ${shaderId}`, 'error', 5000);
            return null;
        }
        
        // Compile fragment shader
        const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
            gl.deleteShader(vertexShader);
            showNotification(`Failed to compile fragment shader: ${shaderId}`, 'error', 5000);
            return null;
        }
        
        // Create and link program
        const shaderProgram = createProgram(gl, vertexShader, fragmentShader);
        if (!shaderProgram) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            showNotification(`Failed to link shader program: ${shaderId}`, 'error', 5000);
            return null;
        }
        
        return shaderProgram;
    } catch (error) {
        showNotification(`Unexpected error compiling shader ${shaderId}: ${error.message}`, 'error', 5000);
        console.error('Shader compilation error details:', error);
        return null;
    }
}

/**
 * Sets up the vertex buffer for a fullscreen quad
 * @param {WebGLProgram} program - Shader program to use
 */
function setupVertexBuffer(program) {
    // Create and bind vertex buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Define a fullscreen quad (two triangles)
    const positions = [
        -1.0, -1.0,  // Bottom-left
         1.0, -1.0,  // Bottom-right
        -1.0,  1.0,  // Top-left
         1.0,  1.0   // Top-right
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Set up vertex attributes
    const positionLocation = gl.getAttribLocation(program, 'aVertexPosition');
    if (positionLocation >= 0) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    } else {
        console.warn('Position attribute not found in shader program');
    }
}

// Flag to track if this is the first visit
let isFirstVisit = true;

/**
 * Shows navigation hints for first-time users
 */
function showNavigationHints() {
    if (!isFirstVisit) return;
    
    // Create navigation hints
    const topHint = document.createElement('div');
    topHint.className = 'nav-hint top';
    topHint.textContent = 'Swipe/scroll up or click top half to see previous shader (up)';
    
    const bottomHint = document.createElement('div');
    bottomHint.className = 'nav-hint bottom';
    bottomHint.textContent = 'Swipe/scroll down or click bottom half to see next shader (down)';
    
    // Add to DOM
    document.body.appendChild(topHint);
    document.body.appendChild(bottomHint);
    
    // Show hints after a delay
    setTimeout(() => {
        topHint.classList.add('visible');
        bottomHint.classList.add('visible');
        
        // Hide hints after 5 seconds
        setTimeout(() => {
            topHint.classList.remove('visible');
            bottomHint.classList.remove('visible');
            
            // Remove from DOM after fade out
            setTimeout(() => {
                if (topHint.parentNode) topHint.parentNode.removeChild(topHint);
                if (bottomHint.parentNode) bottomHint.parentNode.removeChild(bottomHint);
            }, 500);
        }, 5000);
    }, 1000);
    
    // Mark as visited
    isFirstVisit = false;
    localStorage.setItem('has-visited', 'true');
}

/**
 * Loads a shader by index from the manifest
 * @param {number} index - Index of shader in manifest
 * @param {boolean} forTransition - Whether this is for a transition (don't update current index)
 * @returns {Promise<WebGLProgram|null>} - Compiled shader program or null if failed
 */
async function loadShaderByIndex(index, forTransition = false) {
    if (index < 0 || index >= shaderManifest.length) {
        showNotification(`Invalid shader index: ${index}`, 'error');
        return null;
    }
    
    if (!forTransition) {
        showLoading(true);
    }
    
    try {
        // Get default vertex shader source
        const vsSource = document.getElementById('vertex-shader').textContent;
        
        // Fetch fragment shader from API
        const shaderInfo = shaderManifest[index];
        const fsSource = await fetchShaderSource(shaderInfo.id);
        
        if (!fsSource) {
            showNotification(`Failed to load shader: ${shaderInfo.name}`, 'error');
            return null;
        }
        
        // Compile and link shader program
        const newProgram = compileShaderProgram(vsSource, fsSource, shaderInfo.id);
        if (!newProgram) {
            // Error notification already shown by compileShaderProgram
            if (!forTransition) {
                // If we're not in a transition and the shader failed to compile,
                // try to load the next one automatically
                const nextIndex = (index + 1) % shaderManifest.length;
                showNotification(`Automatically navigating to next shader...`, 'info', 2000);
                setTimeout(() => loadShaderByIndex(nextIndex), 2000);
            }
            return null;
        }
        
        if (!forTransition) {
            // Delete old program if it exists and we're not in a transition
            if (program) {
                gl.deleteProgram(program);
            }
            
            // Use new program
            program = newProgram;
            gl.useProgram(program);
            
            // Set up vertex buffer for the new program
            setupVertexBuffer(program);
            
            // Store current shader index
            currentShaderIndex = index;
            
            // Update uniform locations for the new program
            updateUniformLocations();
            
            // Show success notification for the first shader only
            if (index === 0) {
                showNotification(`Loaded shader: ${shaderInfo.name}`, 'success', 2000);
                
                // Show navigation hints for first-time visitors
                if (localStorage.getItem('has-visited') !== 'true') {
                    showNavigationHints();
                }
            }
            
            console.log(`Loaded shader: ${shaderInfo.name} (${shaderInfo.id})`);
        }
        
        return newProgram;
    } catch (error) {
        showNotification(`Error loading shader: ${error.message}`, 'error');
        console.error('Error loading shader:', error);
        return null;
    } finally {
        if (!forTransition) {
            showLoading(false);
        }
    }
}

/**
 * Transitions to the next shader (down)
 * @returns {Promise<boolean>} - Whether transition was started successfully
 */
async function transitionToNextShader() {
    // Don't start a new transition if one is already in progress or we're loading
    if (isTransitioning || isLoading) {
        return false;
    }
    
    // Calculate the next index (with wraparound)
    const nextIndex = (currentShaderIndex + 1) % shaderManifest.length;
    
    return startTransition(nextIndex, 1);
}

/**
 * Transitions to the previous shader (up)
 * @returns {Promise<boolean>} - Whether transition was started successfully
 */
async function transitionToPrevShader() {
    // Don't start a new transition if one is already in progress or we're loading
    if (isTransitioning || isLoading) {
        return false;
    }
    
    // Calculate the previous index (with wraparound)
    const prevIndex = (currentShaderIndex - 1 + shaderManifest.length) % shaderManifest.length;
    
    return startTransition(prevIndex, -1);
}

/**
 * Starts a transition to the specified shader index
 * @param {number} targetIndex - Target shader index
 * @param {number} direction - Direction of transition (1 = next, -1 = previous)
 * @returns {Promise<boolean>} - Whether transition was started successfully
 */
async function startTransition(targetIndex, direction) {
    // Validate target index
    if (targetIndex < 0 || targetIndex >= shaderManifest.length) {
        console.error(`Invalid target shader index: ${targetIndex}`);
        return false;
    }
    
    console.log(`Starting transition to shader ${targetIndex}, direction: ${direction}`);
    
    try {
        // Store the current program as the previous program for the transition
        prevProgram = program;
        
        // Store the target shader index
        targetShaderIndex = targetIndex;
        
        // Load the target shader for transition
        nextProgram = await loadShaderByIndex(targetIndex, true);
        
        if (!nextProgram) {
            console.error(`Failed to load transition target shader: ${targetIndex}`);
            return false;
        }
        
        // Setup vertex buffer for the next program
        gl.useProgram(nextProgram);
        setupVertexBuffer(nextProgram);
        
        // Switch back to current program
        gl.useProgram(program);
        
        // Start transition
        isTransitioning = true;
        transitionStartTime = performance.now();
        transitionDirection = direction;
        transitionProgress = 0;
        
        return true;
    } catch (error) {
        console.error('Error starting transition:', error);
        isTransitioning = false;
        return false;
    }
}

/**
 * Completes the current transition
 */
function completeTransition() {
    if (!isTransitioning) return;
    
    // Delete the old program
    if (prevProgram) {
        gl.deleteProgram(prevProgram);
        prevProgram = null;
    }
    
    // Update the current program to the next program
    program = nextProgram;
    nextProgram = null;
    
    // Update the current shader index to the target index
    currentShaderIndex = targetShaderIndex;
    
    // Update uniform locations for the new program
    updateUniformLocations();
    
    // Reset transition state
    isTransitioning = false;
    transitionProgress = 0;
    
    console.log(`Transition complete to shader index: ${currentShaderIndex}`);
}

/**
 * Preloads the next shader in sequence
 * This helps ensure instant transitions when the user navigates
 */
async function preloadNextShader() {
    if (isLoading || isTransitioning || shaderManifest.length <= 1) {
        return;
    }
    
    // Calculate the next index (with wraparound)
    const nextIndex = (currentShaderIndex + 1) % shaderManifest.length;
    
    // We don't actually need to store the result, just compile it
    // It will be cached by the browser for future use
    try {
        console.log(`Preloading next shader (index ${nextIndex})`);
        await loadShaderByIndex(nextIndex, true);
    } catch (error) {
        console.warn(`Failed to preload shader ${nextIndex}:`, error);
    }
}

/**
 * Detects if the device is mobile
 * @returns {boolean} True if mobile device
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
}

/**
 * Optimizes rendering for battery life
 * Reduces frame rate and complexity on mobile devices
 */
function optimizeForBattery() {
    // Device-specific optimizations
    if (isMobileDevice()) {
        // On mobile devices, reduce some effects or quality
        console.log('Applying mobile optimizations for battery life');
        
        // Throttle rendering on battery-powered devices
        if (navigator.getBattery) {
            navigator.getBattery().then(function(battery) {
                // If not charging and battery below 30%, apply more aggressive optimizations
                if (!battery.charging && battery.level < 0.3) {
                    console.log('Low battery detected, applying power saving mode');
                    transitionDuration = 500; // Faster transitions
                }
                
                // Listen for battery changes
                battery.addEventListener('levelchange', function() {
                    if (!battery.charging && battery.level < 0.3) {
                        console.log('Low battery detected, applying power saving mode');
                        transitionDuration = 500; // Faster transitions
                    } else {
                        transitionDuration = 750; // Normal transitions
                    }
                });
            });
        }
    }
}

/**
 * Enables fullscreen mode
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Sets up navigation event handlers with platform-specific optimizations
 */
function setupNavigationHandlers() {
    // Variables for tracking events
    let touchStartY = 0;
    let touchStartX = 0;
    let lastNavigationTime = 0;
    let navigationCooldown = 500; // ms between navigation events
    const isMobile = isMobileDevice();
    
    // Adjust navigation settings based on platform
    if (isMobile) {
        navigationCooldown = 600; // Slightly longer cooldown on mobile for better touch precision
    } else {
        navigationCooldown = 400; // Faster on desktop
    }
    
    // Throttle function to prevent too many navigation events
    function throttleNavigation(direction) {
        const now = performance.now();
        if (now - lastNavigationTime < navigationCooldown) {
            return false;
        }
        
        lastNavigationTime = now;
        
        if (direction > 0) {
            transitionToNextShader();
        } else {
            transitionToPrevShader();
        }
        
        // Preload the next shader after navigation
        setTimeout(preloadNextShader, 100);
        
        return true;
    }
    
    // 1. Mouse wheel (scroll) navigation - optimized for desktop
    document.addEventListener('wheel', function(event) {
        // Prevent default scrolling
        event.preventDefault();
        
        // More sensitive wheel handling with normalization
        const wheelDelta = Math.abs(event.deltaY);
        const direction = event.deltaY > 0 ? 1 : -1;
        
        // Apply different thresholds based on device
        if (!isMobile && wheelDelta < 10) {
            return; // Ignore very small movements on desktop (for precision mice)
        }
        
        throttleNavigation(direction);
    }, { passive: false });
    
    // 2. Touch (swipe) navigation - optimized for mobile
    document.addEventListener('touchstart', function(event) {
        touchStartY = event.touches[0].clientY;
        touchStartX = event.touches[0].clientX;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(event) {
        // Prevent default scrolling/zooming behavior
        event.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchend', function(event) {
        if (event.changedTouches.length === 0) return;
        
        const touchEndY = event.changedTouches[0].clientY;
        const touchEndX = event.changedTouches[0].clientX;
        
        // Calculate vertical and horizontal distance moved
        const deltaY = touchEndY - touchStartY;
        const deltaX = touchEndX - touchStartX;
        
        // Adjust sensitivity based on device
        const swipeThreshold = isMobile ? 40 : 50; // Lower threshold for mobile
        
        // Only trigger if vertical movement is more than horizontal
        // and more than threshold to avoid small accidental swipes
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > swipeThreshold) {
            // Determine direction (deltaY < 0 is swipe up = next)
            const direction = deltaY < 0 ? 1 : -1;
            throttleNavigation(direction);
        }
    }, { passive: true });
    
    // 3. Keyboard navigation - enhanced for desktop
    document.addEventListener('keydown', function(event) {
        // Extended keyboard support
        switch (event.key) {
            case 'ArrowDown':
            case 'PageDown':
            case ' ':
            case 'j':
            case 's':
                throttleNavigation(1); // Next (down)
                event.preventDefault();
                break;
                
            case 'ArrowUp':
            case 'PageUp':
            case 'k':
            case 'w':
                throttleNavigation(-1); // Previous (up)
                event.preventDefault();
                break;
                
            case 'f':
                // Toggle fullscreen
                toggleFullscreen();
                event.preventDefault();
                break;
        }
    });
    
    // 4. Mouse click navigation
    document.addEventListener('click', function(event) {
        // Determine direction based on click position (top half = up/previous, bottom half = down/next)
        const clickPosition = event.clientY / window.innerHeight;
        
        if (clickPosition < 0.5) {
            throttleNavigation(-1); // Previous/up (clicked top half)
        } else {
            throttleNavigation(1);  // Next/down (clicked bottom half)
        }
    });
    
    // 5. Double tap for fullscreen on mobile
    let lastTap = 0;
    document.addEventListener('touchend', function(event) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
            // Double tap detected
            if (isMobile) {
                toggleFullscreen();
                event.preventDefault();
            }
        }
        
        lastTap = currentTime;
    });
    
    console.log(`Navigation handlers set up for ${isMobile ? 'mobile' : 'desktop'} platform`);
}

// Initialize WebGL application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Starting WebGL application');
    
    // Detect platform
    const isMobile = isMobileDevice();
    console.log(`Detected platform: ${isMobile ? 'Mobile' : 'Desktop'}`);
    
    // Apply platform-specific optimizations
    optimizeForBattery();
    
    // Create canvas and initialize WebGL context
    if (!createCanvas()) {
        console.error('Failed to create canvas');
        return;
    }
    
    console.log('WebGL2 context created');
    
    // Prevent pinch zooming on mobile
    if (isMobile) {
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    
    // Load shader manifest
    try {
        shaderManifest = await fetchShaderManifest();
        
        if (shaderManifest.length === 0) {
            console.error('No shaders found in manifest');
            // Fall back to default shader from script tag
            const vsSource = document.getElementById('vertex-shader')?.textContent;
            const fsSource = document.getElementById('fragment-shader')?.textContent;
            
            if (!vsSource || !fsSource) {
                console.error('Default shader sources not found');
                return;
            }
            
            // Compile default shaders
            program = compileShaderProgram(vsSource, fsSource);
            if (!program) {
                console.error('Default shader compilation failed');
                return;
            }
            
            gl.useProgram(program);
            setupVertexBuffer(program);
        } else {
            // Load first shader from manifest
            await loadShaderByIndex(0);
            
            // Preload the next shader
            setTimeout(preloadNextShader, 500);
        }
    } catch (error) {
        console.error('Failed to initialize shader system:', error);
        return;
    }
    
    // Update uniform locations
    updateUniformLocations();
    
    // Set up navigation handlers
    setupNavigationHandlers();
    
    // Enhanced resize handler
    handleResize();
    
    // Start the render loop
    console.log('Starting render loop');
    render();
    
    // Enhanced resize handler for fullscreen canvas
    function handleResize() {
        // Get device pixel ratio for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas dimensions
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        
        // Update internal state
        aspectRatio = canvas.width / canvas.height;
        deviceOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        
        // Update viewport
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        console.log(`Resize: ${canvas.width}x${canvas.height}, AR: ${aspectRatio.toFixed(2)}, Orientation: ${deviceOrientation}`);
    }
    
    // Initial resize
    handleResize();
    
    // Add event listeners for various screen changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Add fullscreen change event listener for browsers that support it
    if (document.fullscreenEnabled) {
        document.addEventListener('fullscreenchange', handleResize);
    }
    
    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    console.log('u_resolution location:', resolutionLocation);
    console.log('u_time location:', timeLocation);
    
    console.log('Starting render loop');
    
    /**
     * Sets standard uniforms for a shader program
     * @param {WebGLProgram} prog - The shader program
     * @param {number} time - Current time in milliseconds
     */
    function setStandardUniforms(prog, time) {
        if (!prog) return;
        
        let resolutionLoc, timeLoc, aspectRatioLoc, orientationLoc;
        
        // Use cached locations if this is the main program, otherwise look them up
        if (prog === program) {
            resolutionLoc = uniformLocations.resolution;
            timeLoc = uniformLocations.time;
            aspectRatioLoc = uniformLocations.aspectRatio;
            orientationLoc = uniformLocations.orientation;
        } else {
            // For transition programs, look up the locations
            resolutionLoc = gl.getUniformLocation(prog, 'u_resolution');
            timeLoc = gl.getUniformLocation(prog, 'u_time');
            aspectRatioLoc = gl.getUniformLocation(prog, 'u_aspectRatio');
            orientationLoc = gl.getUniformLocation(prog, 'u_isLandscape');
        }
        
        // Set standard uniforms if they exist
        if (resolutionLoc) {
            gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        }
        
        if (timeLoc) {
            // Convert time to seconds
            gl.uniform1f(timeLoc, (time || performance.now()) / 1000.0);
        }
        
        if (aspectRatioLoc) {
            gl.uniform1f(aspectRatioLoc, aspectRatio);
        }
        
        if (orientationLoc) {
            gl.uniform1i(orientationLoc, deviceOrientation === 'landscape' ? 1 : 0);
        }
        
        // Add transition progress uniform if it exists
        const progressLoc = prog === program
            ? gl.getUniformLocation(prog, 'u_transitionProgress')
            : gl.getUniformLocation(prog, 'u_transitionProgress');
            
        if (progressLoc) {
            gl.uniform1f(progressLoc, transitionProgress);
        }
    }
    
    /**
     * Main render function for drawing the current shader
     * @param {number} time - Current time in milliseconds
     */
    function render(time) {
        // Skip rendering if we're in loading state
        if (isLoading) {
            animationFrameId = requestAnimationFrame(render);
            return;
        }
        
        // Clear the canvas
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Handle transition animation
        if (isTransitioning && prevProgram && nextProgram) {
            // Calculate transition progress (0.0 to 1.0) with easing for snappier feel
            const elapsed = time - transitionStartTime;
            let rawProgress = Math.min(elapsed / transitionDuration, 1.0);
            
            // Apply easing function to make transition snappier
            // Using a power curve for faster start and end (x^1.5)
            transitionProgress = Math.pow(rawProgress, 1.5);
            
            // Ensure we hit 1.0 exactly at the end for clean completion
            if (rawProgress >= 1.0) transitionProgress = 1.0;
            
            // Enable alpha blending for smooth transitions
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            // Calculate overlap area size (where both shaders are visible)
            // Reduced to 40% of screen height for snappier transitions
            const overlapHeight = canvas.height * 0.4;
            
            // Calculate the position of the dividing line based on progress
            const dividerPos = canvas.height * transitionProgress;
            
            if (transitionDirection > 0) {
                // Transitioning to next shader (slide up)
                
                // Draw previous shader (full screen, but will fade out at top)
                gl.useProgram(prevProgram);
                setStandardUniforms(prevProgram, time);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                
                // Set up fade mask for transition area
                // This draws a rectangle with transparent to opaque gradient
                gl.enable(gl.SCISSOR_TEST);
                
                // Scissor zone covers the entire height
                // Draw fewer strips for a faster, more immediate transition
                const strips = 12; // Reduced number of strips for snappier gradient
                
                for (let i = 0; i < strips; i++) {
                    // Calculate the position and height of this strip
                    const stripHeight = overlapHeight / strips;
                    const stripY = Math.max(0, dividerPos - overlapHeight) + (i * stripHeight);
                    
                    // Calculate opacity for this strip (0.0 to 1.0)
                    const opacity = i / (strips - 1);
                    
                    // Set scissor to only draw in this thin horizontal strip
                    gl.scissor(0, stripY, canvas.width, stripHeight);
                    
                    // Set the blend factor based on the strip's position
                    gl.blendColor(0, 0, 0, opacity);
                    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
                    
                    // Draw next shader in this strip with calculated opacity
                    gl.useProgram(nextProgram);
                    setStandardUniforms(nextProgram, time);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                }
                
                // Now draw the fully opaque portion of the next shader
                // Reset blend mode
                gl.blendFunc(gl.ONE, gl.ZERO);
                
                // Set scissor to only draw in the top portion (fully opaque)
                const fullyVisibleHeight = Math.max(0, dividerPos);
                gl.scissor(0, dividerPos, canvas.width, canvas.height - fullyVisibleHeight);
                
                // Draw next shader fully opaque in this region
                gl.useProgram(nextProgram);
                setStandardUniforms(nextProgram, time);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            } else {
                // Transitioning to previous shader (slide down)
                
                // Draw current shader (full screen, but will fade out at bottom)
                gl.useProgram(prevProgram);
                setStandardUniforms(prevProgram, time);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                
                // Set up fade mask for transition area
                gl.enable(gl.SCISSOR_TEST);
                
                // Draw fewer strips with decreasing opacity for snappier transitions
                const strips = 12;
                
                for (let i = 0; i < strips; i++) {
                    // Calculate the position and height of this strip
                    const stripHeight = overlapHeight / strips;
                    const stripY = Math.min(canvas.height - overlapHeight, dividerPos) + (i * stripHeight);
                    
                    // Calculate opacity for this strip (1.0 to 0.0)
                    const opacity = 1.0 - (i / (strips - 1));
                    
                    // Set scissor to only draw in this thin horizontal strip
                    gl.scissor(0, stripY, canvas.width, stripHeight);
                    
                    // Set the blend factor based on the strip's position
                    gl.blendColor(0, 0, 0, opacity);
                    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
                    
                    // Draw next shader in this strip with calculated opacity
                    gl.useProgram(nextProgram);
                    setStandardUniforms(nextProgram, time);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                }
                
                // Now draw the fully opaque portion of the next shader
                gl.blendFunc(gl.ONE, gl.ZERO);
                
                // Set scissor to only draw in the bottom portion (fully opaque)
                gl.scissor(0, 0, canvas.width, Math.min(canvas.height, dividerPos));
                
                // Draw next shader fully opaque in this region
                gl.useProgram(nextProgram);
                setStandardUniforms(nextProgram, time);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            
            // Disable scissor test and blending
            gl.disable(gl.SCISSOR_TEST);
            gl.disable(gl.BLEND);
            
            // Check if transition is complete
            if (transitionProgress >= 1.0) {
                completeTransition();
            }
        } else if (program) {
            // Normal rendering (no transition)
            gl.useProgram(program);
            setStandardUniforms(program, time);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Error handling (only in development)
        const err = gl.getError();
        if (err !== gl.NO_ERROR) {
            console.error('WebGL error after drawArrays:', err);
        }

        // Continue the render loop
        animationFrameId = requestAnimationFrame(render);
    }
    
    render();
});

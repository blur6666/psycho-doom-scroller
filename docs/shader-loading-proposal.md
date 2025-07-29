# Proposal: Bulk Shader Loading and Caching

This document outlines a new strategy for loading and managing shaders to improve performance and user experience. The current approach fetches shaders one by one, which can introduce delays during transitions. Since the total size of all shaders is small (~80 KB), we can fetch them all at once during initialization.

## 1. Bulk Shader Fetching at Initialization

We will introduce a new function to fetch all shader sources concurrently when the application starts.

### Proposed Changes:

- **New Function: `fetchAllShaderSources()`**
  - This `async` function will be called once after the shader manifest is fetched.
  - It will use `Promise.all()` to send requests for all shaders in the manifest in parallel.
  - The fetched shader sources will be stored in a new cache object.

- **New State Variable: `shaderSourceCache`**
  - A new object `let shaderSourceCache = {};` will be added to the global state to store the shader sources, with shader IDs as keys.

- **Updated Initialization in `DOMContentLoaded`**
  - After `shaderManifest = await fetchShaderManifest();`, we will call `await fetchAllShaderSources();`.

```javascript
// New state variable
let shaderSourceCache = {};

/**
 * Fetches all shader sources from the manifest and populates the cache.
 */
async function fetchAllShaderSources() {
    if (!shaderManifest || shaderManifest.length === 0) {
        return;
    }
    console.log('Fetching all shader sources...');
    showLoading(true);
    try {
        const fetchPromises = shaderManifest.map(shaderInfo =>
            fetch(`/api/shaders/${encodeURIComponent(shaderInfo.id)}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Failed to fetch ${shaderInfo.id}`);
                    }
                    return res.text();
                })
                .then(source => {
                    shaderSourceCache[shaderInfo.id] = source;
                })
        );
        await Promise.all(fetchPromises);
        console.log(`All ${shaderManifest.length} shader sources have been cached.`);
    } catch (error) {
        console.error('Error fetching all shader sources:', error);
        showNotification('Could not load all shaders.', 'error');
    } finally {
        showLoading(false);
    }
}

// In DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function() {
    // ... (existing code to fetch manifest)
    shaderManifest = await fetchShaderManifest();
    if (shaderManifest.length > 0) {
        await fetchAllShaderSources(); // New call
        // ... (rest of initialization)
    }
    // ...
});
```

## 2. Decouple Fetching from Compilation

With all shader sources cached, we can simplify the `loadShaderByIndex` function. It will no longer need to fetch the source; it will just retrieve it from the cache and proceed with compilation.

### Proposed Changes:

- **Modify `loadShaderByIndex()`**
  - Remove the `await fetchShaderSource(shaderInfo.id)` call.
  - Get the fragment shader source directly from `shaderSourceCache[shaderInfo.id]`.
  - The function will no longer need to be `async`.

```javascript
/**
 * Loads a shader by index from the manifest by getting the source from the cache.
 * @param {number} index - Index of shader in manifest
 * @returns {WebGLProgram|null} - Compiled shader program or null if failed
 */
function loadShaderByIndex(index) { // No longer async
    if (index < 0 || index >= shaderManifest.length) {
        showNotification(`Invalid shader index: ${index}`, 'error');
        return null;
    }

    try {
        const vsSource = document.getElementById('vertex-shader').textContent;
        const shaderInfo = shaderManifest[index];
        const fsSource = shaderSourceCache[shaderInfo.id]; // Get from cache

        if (!fsSource) {
            showNotification(`Shader source not found in cache: ${shaderInfo.name}`, 'error');
            return null;
        }

        const newProgram = compileShaderProgram(vsSource, fsSource, shaderInfo.id);
        // ... (rest of the function remains similar, but without async/await)

        return newProgram;
    } catch (error) {
        showNotification(`Error loading shader: ${error.message}`, 'error');
        console.error('Error loading shader:', error);
        return null;
    }
}
```

- **Modify `startTransition()`**
  - The call to `loadShaderByIndex` will no longer need `await`.

```javascript
// In startTransition function
// ...
nextProgram = loadShaderByIndex(targetIndex, true); // No longer needs await
// ...
```

## 3. Pre-compilation Strategy

The existing preloading mechanism (`processShaderQueue`) will now become a pre-compilation queue. Since fetching is already done, this process will be much faster and will only involve CPU-bound work (shader compilation), which can still be spread across frames to avoid stuttering.

No significant changes are needed for the queue logic itself, but its performance characteristics will be improved.

## Benefits of this Approach

1.  **Faster Transitions:** Transitions will be quicker because the shader source is immediately available from the cache, eliminating network latency at the time of the transition.
2.  **Improved User Experience:** The main loading happens upfront, and subsequent interactions are smoother.
3.  **Simplified Code:** The `loadShaderByIndex` function becomes simpler and synchronous.
4.  **Robustness:** If a shader fails to fetch during the initial bulk load, we can handle it gracefully without affecting the application's runtime stability.

This design separates the concerns of network I/O (fetching) from CPU-bound work (compilation), leading to a more responsive and predictable application.
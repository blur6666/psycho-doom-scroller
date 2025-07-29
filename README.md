# Psychodoom Scroller

## Product Overview
This application is an interactive, cross-platform (mobile and desktop browser only) experience for exploring a curated collection of beautiful GLSL shaders. Users can seamlessly scroll, swipe, or click through shaders, enjoying a visually immersive and distraction-free environment. The experience is designed to be fast, smooth, and intuitive, with minimal UI and instant shader transitions.

## User Experience
### General
- The app launches directly into a fullscreen shader view.
- The background is animated by the current shader, filling the entire screen.
- The interface is minimal, with only essential overlays (such as a loading indicator).
- The app is fully responsive and works on both mobile and desktop browsers.

### Navigation
- Users can scroll (mouse wheel), swipe (touch), use arrow keys, or mouse click to move to the next or previous shader.
- Navigation is smooth, with slide transitions between shaders.
- The next shader is preloaded for instant switching.
- If a shader fails to load or compile, the app skips to the next one and displays an error message.

### Mobile Experience
- Touch gestures (swipe, tap) are optimized for one-handed use.
- The app supports fullscreen mode and hides browser UI for immersion.
- Performance is optimized for battery and memory.

### Desktop Experience
- The app is available only via browser (no desktop app or installable version).
- Mouse wheel, mouse click, and keyboard navigation are supported.
- The app resizes gracefully with the window.
- Drag-and-drop support for loading custom shaders (optional).

## Software Behavior
- On launch, the app fetches a manifest of available shaders from the backend.
- The app loads and compiles the first shader, displaying it in the canvas.
- As the user scrolls, swipes, clicks, or uses the keyboard, the app fetches, compiles, and displays the next/previous shader.
- The backend ensures only valid, pre-compiled shaders are included in the manifest.
- All navigation and UI actions are instant and non-blocking.
- The app handles errors gracefully, never leaving the user stuck on a broken shader.

## Out of Scope
- User accounts, comments, or social features (unless specified later).
- Shader editing or live coding.
- Backend admin UI (for now).
- Shader library management is manual and performed by the project maintainer.
- Music (audio playback or sound integration).

## Success Criteria
- Users can scroll, swipe, or click through shaders with no visible lag.
- The app works and looks great on both mobile and desktop browsers.
- Only valid shaders are shown; errors are handled gracefully.
- The experience is visually immersive and distraction-free.

---

## Architecture Overview

### System Components

#### Frontend (Browser)
- **WebGL Canvas**: Renders the current shader fullscreen.
- **Navigation Handler**: Listens for scroll up/down, mouse click, and arrow key events to trigger shader changes.
- **Shader Loader**: Fetches shader code from the backend and compiles it in the browser.
- **Preloader**: Preloads the next shader in the background for instant switching.
- **Loading Indicator**: Shows when a shader is being loaded/compiled.
- **Error Handler**: Skips to the next shader if a load/compile error occurs.

#### Backend (Node.js/Express)
- **Manifest Endpoint**: Serves a JSON list of shaders (id, name).
- **Shader Endpoint**: Serves the GLSL code for a given shader id.
- **Static File Server**: Serves frontend assets and shaders.
- **(Optional) Shader Validator**: Validates shaders before adding to manifest (can be manual for MVP).

### Data Flow
1. On load, frontend fetches the manifest from `/api/shaders/manifest`.
2. Frontend loads and compiles the first shader.
3. On scroll/click/arrow, frontend fetches and compiles the next/prev shader.
4. Preloader fetches the next shader in advance.
5. If a shader fails, error handler skips to the next.

### Deployment
- **Backend**: Node.js/Express server (serves API and static files).
- **Frontend**: Static files built and served from `/dist`.
- **No database**: All shader management is manual for MVP.

---

## Product Decisions

### Shader Metadata
- Only `id` and `name` are required for each shader. No additional metadata is needed for now.

### Shader Preloading
- The app should be able to preload the next shader quickly, as users are expected to scroll every ~2 seconds. Preloading must be fast and reliable.

### Transition Animation
- Only translation/scroll (slide) transitions will be implemented for shader changes. No fade or other effects in MVP.

### Gestures
- Only two gestures are supported: scroll down (next shader) and scroll up (previous shader). This follows standard scrolling conventions for both mobile and desktop. No other gestures will be implemented in the MVP or foreseeable future.

### Runtime Shader Compilation Strategy
- We will test runtime shader compilation with the current shader folder structure to determine viability
- Keep current /shaders/ folder organization for MVP - mixed extensions (.frag/.glsl) and complex filenames are acceptable
- Load shaders randomly from folder initially, without database or complex relationships
- Performance analysis needed to determine if shaders need simplification or pre-processing

### Error Handling Philosophy
- No fallback shaders for compilation/compatibility errors - if it breaks, user gets nothing (expected behavior)
- All target browsers implement WebGL, so compatibility should be default
- Network failures should fail gracefully but no retry mechanisms needed for MVP
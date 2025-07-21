# Product Requirements Document: Psychodoom Scroller

## Overview
This application is an interactive, cross-platform (mobile and desktop browser only) experience for exploring a curated collection of beautiful GLSL shaders. Users can seamlessly scroll, swipe, or click through shaders, enjoying a visually immersive and distraction-free environment. The experience is designed to be fast, smooth, and intuitive, with minimal UI and instant shader transitions.

## User Experience
### General
- The app launches directly into a fullscreen shader view.
- The background is animated by the current shader, filling the entire screen.
- The interface is minimal, with only essential overlays (such as a loading indicator).
- The app is fully responsive and works on both mobile and desktop browsers.

### Navigation
- Users can scroll (mouse wheel), swipe (touch), use arrow keys, or mouse click to move to the next or previous shader.
- Navigation is smooth, with fade or slide transitions between shaders.
- The next shader is preloaded for instant switching.
- If a shader fails to load or compile, the app skips to the next one and displays an error message.

### Shader Info
- (Omitted in MVP) An overlay with shader name and author may be added in future versions.

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

Feedback and further requirements are welcome before development begins.

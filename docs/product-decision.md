# Product Decision Log: Psychodoom Scroller

This document records key decisions made during the development of Psychodoom Scroller.

---

**2025-07-21**

1. **Shader Metadata**
   - Only `id` and `name` are required for each shader. No additional metadata is needed for now.

2. **Shader Preloading**
   - The app should be able to preload the next shader quickly, as users are expected to scroll every ~2 seconds. Preloading must be fast and reliable.

3. **Transition Animation**
   - Only translation/scroll (slide) transitions will be implemented for shader changes. No fade or other effects in MVP.

4. **Gestures**
   - Only two gestures are supported: scroll down (next shader) and scroll up (previous shader). This follows standard scrolling conventions for both mobile and desktop. No other gestures will be implemented in the MVP or foreseeable future.

5. **Runtime Shader Compilation Strategy**
   - We will test runtime shader compilation with the current shader folder structure to determine viability
   - Keep current /shaders/ folder organization for MVP - mixed extensions (.frag/.glsl) and complex filenames are acceptable
   - Load shaders randomly from folder initially, without database or complex relationships
   - Performance analysis needed to determine if shaders need simplification or pre-processing

6. **Error Handling Philosophy**
   - No fallback shaders for compilation/compatibility errors - if it breaks, user gets nothing (expected behavior)
   - All target browsers implement WebGL, so compatibility should be default
   - Network failures should fail gracefully but no retry mechanisms needed for MVP

---

This log will be updated as further decisions are made.

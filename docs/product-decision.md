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
   - Only two gestures are supported: scroll up (next shader) and scroll down (previous shader). No other gestures will be implemented in the MVP or foreseeable future.

---

This log will be updated as further decisions are made.

# Psychodoom Scroller Development Guide

This document provides development information, plans, and task tracking for the Psychodoom Scroller project.

## Development Plan for MVP Beta Release

### Success Criteria

#### Phase 1: Analysis and Backend Development
- All shaders in the MVP collection compile successfully in a browser/WebGL2 context.
- Shader compilation times are measured and documented with at least 5 decimal places.
- No critical compilation errors or warnings remain unresolved.
- Backend serves a manifest of all shaders and individual shader files via API endpoints.
- Manifest and shader endpoints are accessible and return correct data for all shaders.
- Documentation of findings and recommendations is complete.

#### Phase 2: Frontend Development
- Frontend fetches the shader manifest dynamically from the backend.
- Navigation (scroll down = next, scroll up = previous) works as specified.
- Shader switching is smooth and preloading is implemented.
- UI is responsive and canvas resizes correctly on all devices.

#### Phase 3: Testing and Optimization
- Navigation between shaders is smooth (~60 FPS) on target devices.
- No major performance bottlenecks or crashes during shader execution.
- Mobile and desktop performance are validated and documented.

#### Phase 4: Release Preparation
- User and developer documentation is complete and up to date.
- MVP beta package is built and deployable.
- All features and requirements are verified as complete.

---

## Implementation Tasks

### Phase 1: Analysis and Backend Development
1. **Implement Runtime Shader Compilation Analysis Task**  
   - **Goal**: Test shader compilation times, memory usage, and performance on various devices.  
   - **Challenges**:  
     - Complex shaders (e.g., kaleidoscope effects) may require simplification or pre-processing.  
     - Mobile performance could be a bottleneck.  

2. **Develop Backend Endpoints**  
   - **Tasks**:  
     - `/api/shaders/manifest`: Serve a list of shaders.  
     - `/api/shaders/:id`: Serve GLSL code for a given shader ID.  
   - **Challenges**:  
     - Handling mixed file extensions (.frag/.glsl).  
     - Ensuring manifest generation is efficient for large shader collections.  

### Phase 2: Frontend Development
3. **Refactor Frontend for Dynamic Shader Loading and Navigation**  
   - **Tasks**:  
     - Fetch shader manifest dynamically.  
     - Implement navigation (scroll down = next, scroll up = previous).  
   - **Challenges**:  
     - Ensuring smooth transitions between shaders.  
     - Preloading shaders for instant switching.  

4. **Implement Error Handling and Loading Indicators**  
   - **Tasks**:  
     - Gracefully handle shader compilation and network errors.  
     - Display loading indicators during shader transitions.  
   - **Challenges**:  
     - Debugging runtime errors in WebGL.  

### Phase 3: Testing and Optimization
5. **Test and Optimize Shader Performance**  
   - **Tasks**:  
     - Ensure smooth navigation (~60 FPS).  
     - Optimize shaders for mobile devices.  
   - **Challenges**:  
     - Balancing visual quality with performance.  
     - Identifying and resolving bottlenecks in shader execution.  

6. **Conduct Final Integration and User Testing**  
   - **Tasks**:  
     - Integrate backend and frontend.  
     - Perform usability testing with real users.  
   - **Challenges**:  
     - Debugging cross-platform issues.  

### Phase 4: Release Preparation
7. **Prepare Documentation and Release MVP Beta**  
   - **Tasks**:  
     - Write user and developer documentation.  
     - Package and deploy the application.  
   - **Challenges**:  
     - Ensuring all features are well-documented.  

---

## Task Tracking

### TO DO
- **ANALYSIS: Runtime Shader Compilation Viability** - Test current shader collection for runtime compilation performance. Analyze compilation times, memory usage, and mobile performance. Determine if shaders need simplification or pre-processing. Answer: Can complex kaleidoscope shaders compile fast enough for smooth navigation? Should we implement performance tiers for different devices?
- **Backend: Shader Manifest Endpoint** - Implement `/api/shaders/manifest` to serve a list of available shaders with only `id` and `name`. Load shaders randomly from current /shaders/ folder structure.
- **Backend: Serve Shader Files** - Implement `/api/shaders/:id` to serve the GLSL code for a given shader id. Support mixed file extensions (.frag/.glsl) and current filenames.
- **Backend: Shader Validation** - Add logic to validate shaders before they are included in the manifest (manual validation is acceptable for MVP).
- **Frontend: Dynamic Shader Loader** - Refactor frontend to fetch manifest and load shaders dynamically by id from current folder structure.
- **Frontend: Navigation Actions** - Implement scroll down (next), scroll up (previous), and mouse click navigation following standard scrolling conventions. Only these gestures and click are supported.
- **Frontend: Preload Next Shader** - Preload the next shader for instant switching, ensuring readiness for users scrolling every ~2 seconds.
- **Frontend: Responsive Canvas** - Ensure the canvas resizes perfectly on all devices and orientations.
- **Frontend: Transition Effects** - Implement only translation/scroll (slide) transitions between shaders.
- **Frontend: Error Handling** - Handle shader compile and network errors gracefully. No fallback shaders - if compilation fails, user gets nothing (expected behavior). Network failures should fail gracefully.
- **Frontend: Loading Indicator** - Show a loading indicator while switching shaders.
- **Frontend: Touch & Keyboard Support** - Ensure gestures and keyboard navigation work on all platforms.

### Pending Decisions
- **Shader Preloading Strategy** - Decide if we want to preload only the next shader or also the previous one for even faster navigation.
- **Manifest Source** - Decide if the manifest will be a static JSON file or generated by a backend script.

---

## Key Technical Considerations

1. **Shader Compilation Performance**
   - Optimize compilation time for smooth transitions
   - Consider preprocessing shaders if needed

2. **API Design**
   - Keep endpoints simple and efficient
   - Ensure proper error handling

3. **Frontend Responsiveness**
   - Focus on smooth transitions between shaders
   - Ensure consistent performance across devices

4. **User Experience**
   - Prioritize immediate feedback and smooth navigation
   - Implement intuitive gesture and keyboard controls
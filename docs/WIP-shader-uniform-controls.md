# [WIP] Shader Uniform Controls Feature

**Status: Work In Progress - For Future Implementation**

## Overview

This document outlines the planned implementation for real-time shader uniform controls in the Psychodoom Scroller application. This feature will allow users to interactively adjust shader parameters through a dynamic UI panel.

## Architecture Plan

### 1. Backend Enhancements

The server will be extended to extract and serve uniform metadata from shader files:

```javascript
// Planned modification to server.js
app.get('/api/shaders/manifest', (req, res) => {
  function collectShaders(dir, base = '') {
    // Current implementation...
    
    // Future: Extract uniform metadata from shader file comments
    // Read YAML-formatted metadata blocks like:
    /*
    uniforms:
    - name: u_speed
      type: float
      label: Animation Speed
      default: 1.0
      min: 0.1
      max: 5.0
    */
  }
  // Return enhanced manifest with uniforms array
});
```

### 2. Frontend Components

#### New Module: UIController.js

```javascript
// Planned new file: static/UIController.js
class UIController {
  constructor() {
    this.container = null;
    this.currentUniforms = {};
  }
  
  init(uniforms) {
    // Initialize panel with uniform metadata
  }
  
  renderPanel() {
    // Generate input controls based on uniform types
  }
  
  destroyPanel() {
    // Remove panel when switching shaders
  }
}
```

#### WebGL Integration

The `webgl.js` file will be enhanced to:
1. Initialize the UI controller when a shader with uniforms is loaded
2. Listen for uniform change events
3. Apply uniform values in the render loop

## UI Design Concepts

The uniform control panel will:
- Appear as a collapsible sidebar
- Provide appropriate controls based on uniform type (sliders, color pickers, etc.)
- Support presets and value sharing

## Future Considerations

- Shader preset system for saving favorite combinations
- Exportable uniform configurations
- Mobile-friendly UI layout for touch devices

---

**Note:** This feature is currently on hold. Refer to the complete technical specification in `DESIGN_DOC.md` for more details when implementation begins.
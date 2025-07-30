# WebGL Modular Application

A modular WebGL application for shader visualization with smooth transitions, user interaction, and performance optimization.

## Project Structure

The application follows a modular architecture with the following main components:

### Core Modules

- **WebGLCore** (`src/modules/webgl-core.js`): Manages WebGL context, basic rendering operations, and core WebGL functionality.
- **ShaderManager** (`src/modules/shader-manager.js`): Handles shader loading, compilation, and management of the shader library.
- **Material** (`src/modules/material.js`): Abstracts shader uniforms and provides an interface for managing shader parameters.
- **RenderingFacade** (`src/modules/rendering-facade.js`): Provides a simplified interface for rendering operations.

### Extension Modules

- **TransitionEngine** (`src/modules/transition-engine.js`): Manages transitions between shaders with various effects and timing controls.
- **EventHandler** (`src/modules/event-handler.js`): Handles user inputs (mouse, keyboard, touch) and navigation between shaders.
- **UIController** (`src/modules/ui-controller.js`): Manages UI elements like notifications, navigation hints, and loading indicators.
- **PerformanceOptimizer** (`src/modules/performance-optimizer.js`): Handles shader compilation queues, FPS monitoring, and performance optimizations.

### Main Application

- **Main Application** (`src/modules/index.js`): Initializes and coordinates all modules, providing a central integration point.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd webgl-modular-application
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server:

```bash
npm run dev
```

This will build the application and start a local development server at http://localhost:3000.

### Development Scripts

- **Build the application**:
  ```bash
  npm run build
  ```

- **Start the development server**:
  ```bash
  npm run start
  ```

- **Watch for changes and rebuild automatically**:
  ```bash
  npm run watch
  ```

- **Build and start the application**:
  ```bash
  npm run dev
  ```

## Testing

The application includes comprehensive unit tests for all modules. Tests are located in the `src/modules/test/unit` directory.

### Running Tests

To run all tests:

```bash
npm test
```

This will execute all tests and generate a coverage report in the `coverage` directory.

### Test Structure

- `mock-webgl-context.js`: A comprehensive mock implementation of the WebGL context for unit testing without a browser environment.
- Unit tests for individual modules:
  - `transition-engine.test.js`: Tests for the TransitionEngine module
  - `event-handler.test.js`: Tests for the EventHandler module
  - `ui-controller.test.js`: Tests for the UIController module
  - `performance-optimizer.test.js`: Tests for the PerformanceOptimizer module

## Module Details

### TransitionEngine

The TransitionEngine module manages transitions between shaders with various effects:

- Fade transitions between shaders
- Slide transitions (horizontal)
- Custom transition duration and easing functions
- Event emission for transition lifecycle events

```javascript
// Example usage:
transitionEngine.startTransition(targetShaderId, direction, {
  duration: 1000,
  defaultEffect: 'fade'
});
```

### EventHandler

The EventHandler module manages user interaction:

- Keyboard navigation (arrow keys, page up/down)
- Mouse wheel navigation
- Touch gestures (swipe up/down)
- Click navigation (left/right areas of the canvas)
- Event throttling to prevent rapid transitions

```javascript
// Example setup:
eventHandler.setupNavigationHandlers();
eventHandler.setupResizeHandler();
```

### UIController

The UIController module manages user interface elements:

- Notification system with different types (info, success, error)
- Navigation hints for first-time users
- Loading indicators for shader compilation
- Customizable styles and animations

```javascript
// Example usage:
uiController.showNotification('Shader loaded successfully', 'success');
uiController.showLoading(true, 'Compiling shader...');
```

### PerformanceOptimizer

The PerformanceOptimizer module handles performance optimization:

- Shader compilation queue management
- FPS monitoring and quality adjustment
- Battery status detection and optimization
- Inactivity detection for power saving
- Resource usage tracking

```javascript
// Example usage:
performanceOptimizer.preloadShaders(2);
performanceOptimizer.optimizeForBattery();
```

## Build System

The project uses Rollup for bundling and includes:

- ES module output format
- Development builds with source maps
- Minified production builds
- Watch mode for development

## License

[MIT License](LICENSE)
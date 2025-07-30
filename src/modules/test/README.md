# WebGL Modular Application Tests

This directory contains test files for the WebGL modular application. Tests are organized into different categories to ensure comprehensive coverage of the application's functionality.

## Test Structure

- `mock-webgl-context.js`: A comprehensive mock implementation of the WebGL context for unit testing without a browser environment.
- `unit/`: Contains unit tests for individual modules.

## Test Files

The following unit tests have been implemented:

- `transition-engine.test.js`: Tests for the TransitionEngine module, including transitions between shaders, transition effects, and state management.
- `event-handler.test.js`: Tests for the EventHandler module, including handling of user inputs (mouse, keyboard, touch) and navigation functionality.
- `ui-controller.test.js`: Tests for the UIController module, including notifications, navigation hints, and loading indicators.
- `performance-optimizer.test.js`: Tests for the PerformanceOptimizer module, including shader preloading, FPS monitoring, and battery optimizations.

## Testing Approach

Our testing strategy uses the following approach:

1. **Mocking Dependencies**: We use a custom MockWebGLContext to simulate WebGL operations without requiring a browser environment.
2. **Unit Testing**: Each module is tested in isolation with mocked dependencies.
3. **Test Coverage**: Tests aim to cover core functionality, error handling, and edge cases.
4. **Event Testing**: We verify that custom events are properly emitted at appropriate times.

## Running Tests

To run the tests, use the following command from the project root:

```bash
npm test
```

This will execute all tests and generate a coverage report.

To run a specific test file:

```bash
npm test -- src/modules/test/unit/transition-engine.test.js
```

## Test Coverage

The tests aim to cover:

- Module initialization and configuration
- Core functionality of each module
- Error handling and edge cases
- Event emission and handling
- Resource management and cleanup

## Mock WebGL Context

The `MockWebGLContext` class provides a comprehensive simulation of WebGL functionality, allowing testing of rendering operations without a browser. Key features include:

- State tracking for WebGL operations
- Call counting for verification
- Configurable success/failure states for compilation and linking
- Support for common WebGL operations
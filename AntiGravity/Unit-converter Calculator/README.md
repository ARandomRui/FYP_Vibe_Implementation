# CalcConvert - Documentation

## Overview
CalcConvert is a modern, client-side web application built with React and Vite. It serves dual purposes as an advanced calculator with an interactive history system and a real-time unit converter. The architecture strictly enforces Separation of Concerns, maintaining mathematical logic outside of user interface components.

---

## Core Features & How They Run

### 1. Interactive Calculator & Cascade History
- **File**: `src/CalculatorTab.jsx`
- **How it works**:
  - Maintains state for current expressions, the numeric value of `lastAnswer`, and an array holding the object-based mathematical history.
  - **Smart Clearing**: History persists visually as long as new expressions chain from the previous one via the `ANS` variable. Entering a completely new equation naturally replaces the visual history queue.
  - **Inline Editing (Cascade Re-evaluation)**: Users can click any equation within the history display to edit it inline. The custom `recalcFromIndex` function will immediately recalculate that individual entry, then loop forward through all subsequent equations, using the new downstream result for future `ANS` calculations.

### 2. Math Syntactical Evaluator
- **File**: `src/mathEvaluator.js`
- **How it works**:
  - Handles string-to-math evaluation via the `evaluateExpression(expr, ansValue)` function.
  - Injects the prior calculation by replacing the text `"ANS"` with the provided numeric `ansValue`. Negative answers are safely wrapped in parentheses (e.g. `(-5)`) so chaining expressions like `5 + ANS` won't result in invalid syntax errors (like `5 + -5` missing parenthesis).
  - Employs Regex validation `(/^[0-9+\-*/().\sANS]+$/)` to sanitize inputs before using the JavaScript engine (`new Function()`) to evaluate the math.

### 3. Unit Converter State System
- **Files**: `src/ConverterTab.jsx`, `src/unitConversions.js`
- **How it works**:
  - Completely decouples the user interface from math formulas. `unitCategories` holds the visual descriptors for the categories (Length vs Temperature) while the `convert(value, type)` acts as a pure utility function.
  - The User Interface (`ConverterTab`) uses React's dynamic state binding to update results instantaneously. Typing a number into the input box triggers a reactive event that routes the input directly into the `convert` pure function.

### 4. Glassmorphic Styling & Layout
- **File**: `src/index.css`
- **How it works**:
  - Centralized CSS file using native Custom Properties (`:root { --var }`) to enforce a dark-mode palette.
  - The container architecture utilizes conditional `backdrop-filter: blur(12px)` and translucent backgrounds (`rgba(255,255,255,0.05)`) to achieve depth and a "glass" motif.
  - Adds tactile feedback via CSS animations (`@keyframes slideIn`) to trigger short transitions each time the user creates a new calculation history.

---

## Project Structure

```text
/src
├── index.css            -> Centralized design system
├── App.jsx              -> Master wrapper and Tab state router
├── CalculatorTab.jsx    -> Calculator presentation and history states
├── ConverterTab.jsx     -> Unit conversion selection state
├── mathEvaluator.js     -> Mathematical logic execution
├── unitConversions.js   -> Pure formulas for unit mathematics
```

## How to Run Local Environment
1. Ensure Node.js is installed.
2. In the project root, download dependencies: `npm install`
3. Spin up the development environment: `npm run dev`
4. The terminal will log a `localhost` URL for you to open in your browser.

## How to Run Automated Tests
This project uses **Vitest** alongside `@testing-library/react` to enforce comprehensive test coverage across both dynamic UI interactions and core mathematical logic.

- To run the entire test suite once (standard CI/CD validation):
  ```bash
  npm run test
  ```
- To run the test suite in interactive watch mode (automatically re-runs tests whenever you save a file):
  ```bash
  npm run test:watch
  ```

For explicit documentation mapping what each test evaluates, please read the `testing_phase/test_cases.md` directory located in the project root.

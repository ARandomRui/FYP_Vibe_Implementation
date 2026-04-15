# Application Test Cases

This document defines the comprehensive list of scenarios that must be evaluated to ensure the CalcConvert application functions correctly across all domains.

## 1. Mathematical Logic State Tests
These tests ensure `mathEvaluator.js` correctly evaluates expressions while suppressing JavaScript floating-point errors.

- **TC-MATH-01 (Basic Arithmetic):** Ensure `5 + 5` equals `10`, `10 / 2` equals `5`, and `2 * (3 + 4)` equals `14`.
- **TC-MATH-02 (Division by Zero):** Ensure `1 / 0` throws a handled Math Error string rather than crashing the application or returning `Infinity`.
- **TC-MATH-03 (Floating Point Precision):** Ensure `0.1 + 0.2` returns `0.3` exactly, preventing standard JavaScript precision bloat (e.g., `0.30000000000000004`).
- **TC-MATH-04 (Negative Roots):** Evaluate behaviour for syntax edge cases (e.g., ensure `5 + -5` evaluates properly due to parenthesis sanitation).

## 2. History & ANS Variable Interoperability Tests
These tests ensure the React history state in `CalculatorTab.jsx` persists correctly.

- **TC-ANS-01 (Empty Start):** Pressing `ANS * 5 =` on a completely fresh load string should evaluate mathematically as `0 * 5 = 0`.
- **TC-ANS-02 (History Append):** Executing `5 + 5 =` followed by `ANS + 5 =` must append the history log stack, showing both entries instead of clearing.
- **TC-ANS-03 (History Clear):** Executing `5 + 5 =` followed by pressing `6 + 6 =` must visually replace/clear the history log because `ANS` is unreferenced.
- **TC-ANS-04 (Operator Auto-Link):** Entering `5 + 5 =` and immediately pressing the `+` keypad button must auto-prepend `ANS` to the display.

## 3. History Cascade Editing Tests
- **TC-EDIT-01 (UI Activation):** Clicking a history label transforms the span into a focused text input.
- **TC-EDIT-02 (Cascade Propagation):** Given three chained history states (`A`, `B`, `C`), editing the evaluation expression of `A` and hitting Enter must re-evaluate `B` and `C` chronologically with the new ANS payload.
- **TC-EDIT-03 (Edit Discards):** Given a history array, editing an expression but hitting `Escape` must revert to the original value without running the evaluator cascade.

## 4. Unit Conversion Tests
These tests validate isolated mapping arrays in `unitConversions.js` and real-time state linkage.

- **TC-UNIT-01 (F to C Base):** Selecting Fahrenheit to Celsius and typing `32` should instantaneously output `0`.
- **TC-UNIT-02 (C to F Base):** Selecting Celsius to Fahrenheit and typing `100` should instantaneously output `212`.
- **TC-UNIT-03 (Mi to Km Base):** Selecting Miles to Kilometers and typing `1` should immediately output `1.60934`.
- **TC-UNIT-04 (Empty/NaN Fields):** Deleting all inputs inside the unit converter must gracefully fallback the result to `0`.

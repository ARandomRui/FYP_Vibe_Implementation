# Manual Testing Procedures

This document outlines the step-by-step procedures required to execute the test cases defined in `test_cases.md`.

## Prerequisites
1. Ensure dependencies are installed (`npm install`).
2. Boot the development environment (`npm run dev`).
3. Open a browser and navigate to the localhost port (usually `http://localhost:5173`).

---

## Procedure 1: Math & History Continuity
**Goal:** Verify basic math evaluation and that `ANS` chaining correctly accumulates history visually.

1. **Step:** Click the `C` (Clear) button to ensure a totally blank slate.
2. **Step:** Click `5`, then `+`, then `5`, then `=`.
   - **Expectation:** Display reads `10`. History panel shows `5+5 = 10`.
3. **Step:** Press the `*` operator on the keypad.
   - **Expectation:** The display automatically prepends `ANS`, now reading `ANS*`.
4. **Step:** Click `2`, then `=`.
   - **Expectation:** Display reads `20`. History panel now stacks TWO equations: `5+5 = 10` and `ANS*2 = 20`.
5. **Step:** Click `3`, then `+`, then `3`, then `=`. (Deliberately omitting `ANS`).
   - **Expectation:** The history panel CLEARS out the old data and now only shows the single entry `3+3 = 6`.

---

## Procedure 2: History Cascade Edit Testing
**Goal:** Verify that modifying past equations re-evaluates future queries dependent on them.

1. **Step:** Enter a chain: `10 + 10 =` (Result: 20).
2. **Step:** Chain it: `ANS / 2 =` (Result: 10).
3. **Step:** Click the `10 + 10 =` text inside the history log.
   - **Expectation:** It turns into an inline input box.
4. **Step:** Delete `10 + 10` and type `100 + 100`, then press Enter.
   - **Expectation:** The first line updates to `100 + 100 = 200`. The second line IMMEDIATELY cascades so it says `ANS / 2 = 100`. The main display now shows `100`. 
5. **Step:** Make an invalid edit. Click `100 + 100 =` and replace it with `100 + /`. Press Enter.
   - **Expectation:** The first history result says `Error` in red text. The downstream `ANS/2` evaluates securely to `0` (using the 0 fallback mechanism) and prevents the app from crashing.

---

## Procedure 3: Real-Time Unit Conversion
**Goal:** Verify the React state linkages for unit conversions instantly evaluate data maps.

1. **Step:** At the top of the UI, click the `Unit Converter` tab.
2. **Step:** Ensure `Category` is set to `Length`, and `Conversion Type` is `Miles to Kilometers`.
3. **Step:** In the `Value` input, type `5`.
   - **Expectation:** The result window immediately registers `8.0467`.
4. **Step:** Change `Category` dropdown to `Temperature`.
   - **Expectation:** The inputs clear automatically and revert to `Fahrenheit to Celsius` formatting.
5. **Step:** Type `32` into the value field. 
   - **Expectation:** The result immediately evaluates to `0`.

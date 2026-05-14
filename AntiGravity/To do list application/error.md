# Error Log
**Error**: Playwright test `BC-01 & BC-02: Submit empty or whitespace task` failed.
**Reason**: Expected string "Task cannot be empty!" in `#error-container` but received `""`. This happened because the HTML input element has the `required` attribute, causing the browser to block the form submission natively before our JS validation could run.
**Attempted Fix**: Remove the `required` attribute from the `<input>` element in `index.html` so that our custom JavaScript error handling and UI take over.

# Test Design Specification: To-Do List Application

## 1. Functional Tests (Core Logic)

| Test ID | Scenario | Pre-conditions | Actions | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| FT-01 | Add a standard task | App loaded | 1. Enter "Buy milk" <br> 2. Click "Add" button | "Buy milk" appears at the top of the list. Input field clears. | |
| FT-02 | Add task via "Enter" key | App loaded | 1. Enter "Read book" <br> 2. Press 'Enter' key | "Read book" appears at the top. Input field clears. | |
| FT-03 | Mark task as completed | List has "Buy milk" | 1. Click checkbox next to "Buy milk" | Task text gets a strikethrough. Checkbox shows checked state. Item opacity decreases. | |
| FT-04 | Unmark a completed task | "Buy milk" is checked | 1. Click checkbox next to "Buy milk" | Strikethrough is removed. Checkbox is unchecked. Opacity returns to normal. | |
| FT-05 | Delete a task | List has "Read book" | 1. Hover over "Read book" <br> 2. Click Delete button | "Read book" is removed from the list entirely. | |

## 2. Boundary & Edge Case Tests

| Test ID | Scenario | Pre-conditions | Actions | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| BC-01 | Submit empty task | App loaded | 1. Leave input blank <br> 2. Click "Add" | Error message "Task cannot be empty!" displays. No task added. | |
| BC-02 | Submit whitespace task | App loaded | 1. Enter "   " (spaces) <br> 2. Click "Add" | Error message displays. No task added. | |
| BC-03 | Submit extremely long task | App loaded | 1. Enter string > 500 characters <br> 2. Click "Add" | Task is added. Text wraps neatly within the list item without breaking the container width. | |
| BC-04 | Rapid additions | App loaded | 1. Enter "1", click add, "2", click add, "3", click add quickly | All 3 tasks are added in correct order without JS errors. | |

## 3. Security Tests (OWASP Considerations)

| Test ID | Scenario | Pre-conditions | Actions | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| SEC-01 | XSS Injection in task name | App loaded | 1. Enter `<script>alert("XSS")</script>` <br> 2. Click "Add" | Task is added safely displaying exact string. Alert does NOT execute. | |
| SEC-02 | HTML element injection | App loaded | 1. Enter `<img src=x onerror=alert(1)>` | Task displays exact text. No image is rendered. No script executed. | |

## 4. Data Persistence & Storage Tests

| Test ID | Scenario | Pre-conditions | Actions | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| ST-01 | Refresh retains tasks | App has 2 tasks (1 checked) | 1. Reload the browser page | Same 2 tasks appear, with the correct checked/unchecked states. | |
| ST-02 | Corrupted localStorage | App closed | 1. Manually edit `vibe_tasks_v1` in DevTools to `{invalid_json}` <br> 2. Open App | App handles error gracefully, loads an empty list, and logs error to console. | |
| ST-03 | Deleted tasks do not return | App has "Task A" | 1. Delete "Task A" <br> 2. Reload page | "Task A" remains deleted and does not reappear. | |

## 5. UI/UX & Responsive Tests

| Test ID | Scenario | Pre-conditions | Actions | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| UI-01 | Dark theme background | App loaded | 1. Observe background | Animated dark gradient is running. Container has glassmorphism blur effect. | |
| UI-02 | Mobile viewport rendering | Open in mobile view (<480px) | 1. Resize browser or use mobile dev tools | App container padding reduces. Delete button becomes permanently visible (not just on hover). | |
| UI-03 | Hover animations | App loaded | 1. Hover over a task item | Task item shifts slightly to the right (`translateX(4px)`), background slightly brightens. | |

## 6. Accessibility Tests (a11y)

| Test ID | Scenario | Pre-conditions | Actions | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| A11Y-01 | Keyboard navigation | App loaded | 1. Press Tab repeatedly | Focus moves logically: Input field -> Add button -> Checkboxes -> Delete buttons. | |
| A11Y-02 | Error Announcer | App loaded | 1. Submit empty task | Screen readers announce the dynamic error message (`aria-live="polite"`). | |

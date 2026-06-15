# Test Cases

## Automated Coverage

### Unit tests
1. `parseItems` returns an empty array when storage is empty.
2. `parseItems` returns an empty array when storage contains invalid JSON.
3. `parseItems` returns an empty array when storage contains valid non-array JSON.
4. `loadItems` reads valid task data from storage.
5. `saveItems` writes task data back to storage.
6. `createItem` trims whitespace and creates an incomplete task.
7. `createItem` preserves special characters as plain text.
8. `createItem` rejects blank input.
9. `addItem` inserts new tasks at the top of the list.
10. `addItem` allows duplicate names as separate tasks.
11. `addItem` does not change the list for blank input.
12. `toggleItem` updates only the selected task.
13. `toggleItem` leaves the list unchanged when the task id is missing.
14. `deleteItem` removes only the selected task.
15. `deleteItem` leaves the list unchanged when the task id is missing.

### Browser tests
1. Empty state is shown when there are no tasks.
2. Blank task submissions are ignored and do not write to localStorage.
3. New tasks are trimmed, inserted at the top, and persisted after reload.
4. The input is cleared and refocused after adding a task.
5. The `maxlength` limit is enforced for long task text.
6. Duplicate task names are allowed and stored as separate items.
7. Special characters render safely as text and persist correctly.
8. Completed tasks stay completed after reload.
9. A task can be toggled on and back off without corrupting state.
10. Deleting one task leaves the others intact.
11. Deleting the last task restores the empty state.
12. Newest-first ordering is preserved across several rapid additions.
13. Pre-seeded localStorage tasks render correctly in the UI.
14. Invalid localStorage data safely falls back to an empty list.
15. Valid non-array localStorage data safely falls back to an empty list.

## Manual UI Cases

### TC-01 Add a task
- Precondition: App is open and task list can be empty or populated.
- Steps: Enter `Buy groceries` and click `Add`.
- Expected result: A new task named `Buy groceries` appears at the top of the list.

### TC-02 Prevent blank tasks
- Precondition: App is open.
- Steps: Enter only spaces and submit the form.
- Expected result: No new task is added.

### TC-03 Complete a task
- Precondition: At least one task exists.
- Steps: Click the checkbox for a task.
- Expected result: The task is marked completed and its text shows the completed style.

### TC-04 Delete a task
- Precondition: At least one task exists.
- Steps: Click `Delete` on a task.
- Expected result: Only that task is removed from the list.

### TC-05 Persist tasks after reload
- Precondition: At least one task exists.
- Steps: Refresh or reopen the page.
- Expected result: Existing tasks remain visible because they are loaded from localStorage.

### TC-06 Empty state visibility
- Precondition: No tasks exist.
- Steps: Open the app, then add one task, then delete it.
- Expected result: The empty-state message is shown only when there are no tasks left.

/**
 * UI manipulation module.
 * Why is this implemented: Encapsulating DOM updates isolates rendering logic from state management,
 * ensuring that XSS prevention and element creation are handled safely in one place.
 */

export const UIModule = {
    createTaskElement: (task, toggleCallback, deleteCallback) => {
        try {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.dataset.id = task.id;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'task-content';
            
            // Why use event delegation on contentDiv: Increases click area for the checkbox.
            contentDiv.addEventListener('click', () => toggleCallback(task.id));

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            // Prevent event bubbling so contentDiv click handles the toggle smoothly
            checkbox.addEventListener('click', (e) => e.stopPropagation());
            checkbox.addEventListener('change', () => toggleCallback(task.id));

            const span = document.createElement('span');
            span.className = 'task-text';
            // Why use textContent: Critical for XSS prevention. Never use innerHTML for user-generated content.
            span.textContent = task.text;

            contentDiv.appendChild(checkbox);
            contentDiv.appendChild(span);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'task-delete';
            deleteBtn.setAttribute('aria-label', 'Delete Task');
            deleteBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            deleteBtn.addEventListener('click', () => deleteCallback(task.id));

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);

            return li;
        } catch (error) {
            // Why catch: DOM manipulation can fail if browser environment is strictly limited.
            console.error("Error creating task DOM element:", error);
            throw new Error("Failed to render a task.");
        }
    },

    showError: (message) => {
        // Why is this implemented: To give users immediate visual feedback on validation or system errors.
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            setTimeout(() => { errorContainer.textContent = ''; }, 3000);
        }
    }
};

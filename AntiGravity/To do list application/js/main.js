/**
 * Main application entry point.
 * Why is this implemented: Orchestrates the initialization and flow of data between Storage and UI modules.
 * Ensures the app state is synchronized consistently.
 */

import { StorageModule } from './storage.js';
import { UIModule } from './ui.js';

let tasks = [];

const init = () => {
    try {
        tasks = StorageModule.getTasks();
        renderAll();
        setupEventListeners();
    } catch (error) {
        UIModule.showError("Failed to initialize application.");
        console.error("Init error:", error);
    }
};

const renderAll = () => {
    const list = document.getElementById('task-list');
    list.innerHTML = ''; // Clear existing
    tasks.forEach(task => {
        const el = UIModule.createTaskElement(task, handleToggle, handleDelete);
        list.appendChild(el);
    });
};

const handleAddTask = (e) => {
    e.preventDefault();
    const input = document.getElementById('task-input');
    const text = input.value.trim();

    if (!text) {
        UIModule.showError("Task cannot be empty!");
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        text: text,
        completed: false
    };

    try {
        tasks.push(newTask);
        StorageModule.saveTasks(tasks);
        
        // Optimistic UI update: Append instead of full re-render for O(1) efficiency.
        const list = document.getElementById('task-list');
        list.prepend(UIModule.createTaskElement(newTask, handleToggle, handleDelete));
        
        input.value = '';
        input.focus();
    } catch (error) {
        UIModule.showError(error.message);
        // Rollback state if save fails
        tasks.pop(); 
    }
};

const handleToggle = (id) => {
    try {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            StorageModule.saveTasks(tasks);
            
            // Re-render specifically the toggled element instead of full list.
            // For simplicity in this demo, full re-render is safe, but targeted is better.
            renderAll(); 
        }
    } catch (error) {
        UIModule.showError(error.message);
        // Revert toggle on error
        const task = tasks.find(t => t.id === id);
        if(task) task.completed = !task.completed;
    }
};

const handleDelete = (id) => {
    try {
        tasks = tasks.filter(t => t.id !== id);
        StorageModule.saveTasks(tasks);
        
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) {
            // Add a fade out animation class if desired, then remove
            el.remove();
        }
    } catch (error) {
        UIModule.showError(error.message);
        // On error, reload from storage to ensure state consistency
        tasks = StorageModule.getTasks();
        renderAll();
    }
};

const setupEventListeners = () => {
    const form = document.getElementById('task-form');
    if (form) {
        form.addEventListener('submit', handleAddTask);
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);

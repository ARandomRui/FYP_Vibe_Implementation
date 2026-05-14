/**
 * LocalStorage management module for tasks.
 * Why is this implemented: Abstracting data persistence ensures that the core application
 * logic does not tightly couple with browser-specific APIs, making it easier to mock during testing
 * or replace with an actual backend API later.
 */

const STORAGE_KEY = 'vibe_tasks_v1';

export const StorageModule = {
    getTasks: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            // Why catch: JSON.parse can fail if local storage is corrupted by another script or manual editing.
            console.error("Storage parse error, returning empty array:", error);
            return [];
        }
    },
    
    saveTasks: (tasks) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (error) {
            // Why catch: localStorage might throw QuotaExceededError if full.
            console.error("Failed to save tasks to local storage:", error);
            throw new Error("Unable to save data. Local storage might be full or disabled.");
        }
    }
};

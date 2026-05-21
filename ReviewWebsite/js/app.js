// Mock Data for Projects
const projectsData = [
    {
        id: 'anti-todo',
        agent: 'antigravity',
        title: 'To-Do List Application',
        description: 'A lightweight, clean-interface web-based to-do list application with LocalStorage persistence.',
        link: 'https://[your-github-username].github.io/[your-repo-name]/', // Placeholder for GitHub Pages link
        implementationPlan: '../AntiGravity/To do list application/implementation_plan/20260513_223439_plan.md',
        testCase: '../AntiGravity/To do list application/test.md',
        summary: '../AntiGravity/To do list application/summary.md'
    },
    {
        id: 'codex-spaceship',
        agent: 'codex',
        title: 'Spaceship Titanic Predictor',
        description: 'Machine learning pipeline to predict the "Transported" target variable in the Spaceship Titanic dataset.',
        link: 'https://github.com/example/codex-spaceship', // Placeholder link
        implementationPlan: `
# Implementation Plan

## Objective
Initiate a machine learning project to predict the "Transported" target variable.

## Tech Stack
- Python
- Pandas, Scikit-Learn
- Jupyter Notebooks

## Pipeline
1. **Data Loading**: Ingest \`train.csv\` and \`test.csv\`.
2. **Preprocessing**: Handle missing values, encode categorical variables.
3. **Feature Engineering**: Create new features based on existing ones.
4. **Modeling**: Train a Random Forest Classifier.
5. **Evaluation**: Validate using cross-validation.
        `,
        testCase: `
# Test Cases

## TC01: Data Ingestion
- **Action**: Run data loading script.
- **Expected**: DataFrames are created without errors.

## TC02: Missing Value Imputation
- **Action**: Check for nulls post-preprocessing.
- **Expected**: Zero null values in the DataFrame.

## TC03: Model Training
- **Action**: Execute \`model.fit()\`.
- **Expected**: Model trains successfully and returns a training score > 0.75.
        `,
        summary: `
# Summary and Opinions

## Model Selection
Random Forest provided a strong baseline, but XGBoost might yield better accuracy for this tabular dataset.

## Data Quality
The dataset required significant imputation, particularly for cabin and age features.

## Next Steps
Experiment with deep learning models and hyperparameter tuning.
        `
    }
];

// DOM Elements
const antigravityGrid = document.getElementById('antigravity-grid');
const codexGrid = document.getElementById('codex-grid');
const modalOverlay = document.getElementById('detail-overlay');
const closeModalBtn = document.getElementById('close-modal');
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

// Modal Elements
const detailAgentBadge = document.getElementById('detail-agent-badge');
const detailTitle = document.getElementById('detail-title');
const detailDesc = document.getElementById('detail-desc');
const detailLink = document.getElementById('detail-link');
const planContent = document.getElementById('plan-content');
const testContent = document.getElementById('test-content');
const summaryContent = document.getElementById('summary-content');

// Initialize Application
function init() {
    renderProjects();
    setupEventListeners();
}

// Render Project Cards
function renderProjects() {
    projectsData.forEach((project, index) => {
        const cardHTML = `
            <div class="project-card" data-agent="${project.agent}" onclick="openProjectDetails('${project.id}')" style="animation-delay: ${index * 0.1}s">
                <div class="card-icon">
                    <i class="${project.agent === 'antigravity' ? 'fa-solid fa-rocket' : 'fa-solid fa-code'}"></i>
                </div>
                <h3>${project.title}</h3>
                <p>${project.description}</p>
            </div>
        `;
        
        if (project.agent === 'antigravity') {
            antigravityGrid.insertAdjacentHTML('beforeend', cardHTML);
        } else {
            codexGrid.insertAdjacentHTML('beforeend', cardHTML);
        }
    });
}

// Open Project Details
window.openProjectDetails = function(projectId) {
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;

    // Set Header Data
    detailAgentBadge.textContent = project.agent;
    detailAgentBadge.className = `agent-badge ${project.agent}`;
    detailTitle.textContent = project.title;
    detailDesc.textContent = project.description;
    
    // Set Link
    detailLink.href = project.link;

    // Async function to load markdown either from URL or direct string
    async function loadMarkdownContent(content, element) {
        element.innerHTML = '<p>Loading...</p>';
        try {
            let text = content;
            // If it ends with .md, assume it is a URL
            if (content.trim().endsWith('.md')) {
                const response = await fetch(content);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                text = await response.text();
            }
            element.innerHTML = DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            console.error("Error loading markdown:", e);
            element.innerHTML = "<p>Error loading content.</p>";
        }
    }

    // Load content dynamically
    loadMarkdownContent(project.implementationPlan, planContent);
    loadMarkdownContent(project.testCase, testContent);
    loadMarkdownContent(project.summary, summaryContent);

    // Reset Tabs to first one
    switchTab('link-tab');

    // Show Modal
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
};

// Close Modal
function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

// Tab Switching Logic
function switchTab(tabId) {
    // Update Tabs
    navTabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update Panes
    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Close Modal Events
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Tab Click Events
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
}

// Run init when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

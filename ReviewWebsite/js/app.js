// Mock Data for Projects
const projectsData = [
    {
        id: 'anti-todo',
        agent: 'antigravity',
        title: 'To-Do List Application',
        description: 'A lightweight, clean-interface web-based to-do list application with LocalStorage persistence.',
        link: 'https://arandomrui.github.io/FYP_Vibe_Implementation/AntiGravity/To-do_List_Application/index.html',
        implementationPlan: '../AntiGravity/To-do_List_Application/implementation_plan/20260513_223439_plan.md',
        testCase: '../AntiGravity/To-do_List_Application/test.md',
        summary: '../AntiGravity/To-do_List_Application/developer_notes.md',
        chat: '../AntiGravity/To-do_List_Application/chat/VC_chat.md'
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
        summary: '../Codex/Spaceship_Titanic_Predictor/developer_notes.md'
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
const chatTimeline = document.getElementById('chat-timeline');

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
            if (content.trim().endsWith('.md')) {
                const response = await fetch(content);
                if (response.status === 404) {
                    element.innerHTML = '<p class="empty-state-text">Summary notes are empty.</p>';
                    return;
                }
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                text = await response.text();
            }
            element.innerHTML = DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            console.error("Error loading markdown:", e);
            element.innerHTML = "<p>Error loading content.</p>";
        }
    }

    // Load standard markdown contents
    loadMarkdownContent(project.implementationPlan, planContent);
    loadMarkdownContent(project.testCase, testContent);
    loadMarkdownContent(project.summary, summaryContent);

    // Show/Hide Chat Tab depending on if it has a conversation transcript
    const chatTabBtn = document.querySelector('[data-tab="chat-tab"]');
    if (project.chat) {
        chatTabBtn.style.display = 'block';
        loadChatContent(project.chat, project.agent);
    } else {
        chatTabBtn.style.display = 'none';
    }

    // Reset Tabs to first one (Application link)
    switchTab('link-tab');

    // Show Modal
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
};

// Async function to load and parse Chat Markdown content
async function loadChatContent(chatPath, agentName) {
    chatTimeline.innerHTML = '<p>Loading conversation...</p>';
    try {
        const response = await fetch(chatPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        const timeline = parseChatMarkdown(text, agentName);
        renderChatTimeline(timeline, agentName);
    } catch (e) {
        console.error("Error loading chat:", e);
        chatTimeline.innerHTML = "<p>Error loading chat conversation.</p>";
    }
}

// Custom Markdown Chat Parser for VC_chat.md format
function parseChatMarkdown(text, agentName) {
    const timeline = [];
    const headerRegex = /###\s+(User Input|Planner Response)/g;
    let match;
    const segments = [];
    
    // Collect segment positions
    while ((match = headerRegex.exec(text)) !== null) {
        segments.push({
            type: match[1],
            index: match.index,
            length: match[0].length
        });
    }
    
    // Parse individual segments between headers
    for (let i = 0; i < segments.length; i++) {
        const current = segments[i];
        const next = segments[i + 1];
        const start = current.index + current.length;
        const end = next ? next.index : text.length;
        
        let content = text.slice(start, end).trim();
        
        if (current.type === 'User Input') {
            parseUserContent(content, agentName, timeline);
        } else if (current.type === 'Planner Response') {
            parsePlannerContent(content, agentName, timeline);
        }
    }
    
    return timeline;
}

// Parse User input block and separate intermediate agent action logs
function parseUserContent(content, agentName, timeline) {
    const lines = content.split('\n');
    let currentBubbleText = [];
    
    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            const textContent = currentBubbleText.join('\n').trim();
            if (textContent) {
                timeline.push({
                    sender: 'user',
                    text: textContent
                });
            }
            currentBubbleText = [];
            
            timeline.push({
                sender: 'agent-action',
                agent: agentName,
                text: trimmed.slice(1, -1).trim()
            });
        } else {
            currentBubbleText.push(line);
        }
    }
    
    const textContent = currentBubbleText.join('\n').trim();
    if (textContent) {
        timeline.push({
            sender: 'user',
            text: textContent
        });
    }
}

// Parse Agent Response block (includes Deep Think thought-process extraction)
function parsePlannerContent(content, agentName, timeline) {
    const thoughtHeaderIdx = content.indexOf('### Thought Process');
    let thoughtText = '';
    let responseText = content;
    
    if (thoughtHeaderIdx !== -1) {
        const dividerIdx = content.indexOf('---', thoughtHeaderIdx);
        const thoughtStart = thoughtHeaderIdx + '### Thought Process'.length;
        
        if (dividerIdx !== -1) {
            thoughtText = content.slice(thoughtStart, dividerIdx).trim();
            responseText = content.slice(dividerIdx + 3).trim();
        } else {
            thoughtText = content.slice(thoughtStart).trim();
            responseText = '';
        }
    }
    
    const lines = responseText.split('\n');
    let currentBubbleText = [];
    
    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            const textContent = currentBubbleText.join('\n').trim();
            if (textContent || thoughtText) {
                timeline.push({
                    sender: 'agent',
                    agent: agentName,
                    thought: thoughtText,
                    text: textContent
                });
                thoughtText = ''; // Clear thought so it only links to first bubble
                currentBubbleText = [];
            }
            timeline.push({
                sender: 'agent-action',
                agent: agentName,
                text: trimmed.slice(1, -1).trim()
            });
        } else {
            currentBubbleText.push(line);
        }
    }
    
    const textContent = currentBubbleText.join('\n').trim();
    if (textContent || thoughtText) {
        timeline.push({
            sender: 'agent',
            agent: agentName,
            thought: thoughtText,
            text: textContent
        });
    }
}

// Render dynamic parsed bubbles inside the timeline DOM
function renderChatTimeline(timeline, agentName) {
    chatTimeline.innerHTML = '';
    
    timeline.forEach(msg => {
        if (msg.sender === 'system' || msg.sender === 'agent-action') {
            const el = document.createElement('div');
            if (msg.sender === 'agent-action') {
                el.className = `chat-action-log agent-action ${msg.agent}`;
                const iconClass = msg.agent === 'antigravity' ? 'fa-solid fa-rocket' : 'fa-solid fa-code';
                const formattedAgentName = msg.agent === 'antigravity' ? 'Antigravity' : 'Codex';
                el.innerHTML = `<i class="${iconClass}"></i> <span><strong>${formattedAgentName}</strong>: ${msg.text}</span>`;
            } else {
                el.className = 'chat-action-log';
                el.innerHTML = `<i class="fa-solid fa-gears"></i> <span>${msg.text}</span>`;
            }
            chatTimeline.appendChild(el);
        } else if (msg.sender === 'user') {
            const el = document.createElement('div');
            el.className = 'chat-message user';
            el.innerHTML = `
                <div class="chat-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="chat-bubble">
                    ${DOMPurify.sanitize(marked.parse(msg.text))}
                </div>
            `;
            chatTimeline.appendChild(el);
        } else if (msg.sender === 'agent') {
            const el = document.createElement('div');
            el.className = 'chat-message agent';
            el.setAttribute('data-agent', msg.agent);
            
            let thoughtHTML = '';
            if (msg.thought) {
                thoughtHTML = `
                    <div class="think-block">
                        <div class="think-header" onclick="toggleThought(this)">
                            <span><i class="fa-solid fa-brain"></i> Thought Process</span>
                            <i class="fa-solid fa-chevron-down chevron"></i>
                        </div>
                        <div class="think-content">
                            ${DOMPurify.sanitize(marked.parse(msg.thought))}
                        </div>
                    </div>
                `;
            }
            
            const iconClass = msg.agent === 'antigravity' ? 'fa-solid fa-rocket' : 'fa-solid fa-code';
            el.innerHTML = `
                <div class="chat-avatar"><i class="${iconClass}"></i></div>
                <div class="chat-bubble">
                    ${thoughtHTML}
                    <div class="message-content">
                        ${DOMPurify.sanitize(marked.parse(msg.text || '*Silence*'))}
                    </div>
                </div>
            `;
            chatTimeline.appendChild(el);
        }
    });
}

// Accordion toggle function for Gemini/o1 Deep Think sections
window.toggleThought = function(headerElement) {
    const block = headerElement.parentElement;
    block.classList.toggle('expanded');
};

// Close Modal
function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

// Tab Switching Logic
function switchTab(tabId) {
    navTabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

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
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
            closeModal();
        }
    });

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
}

// Run init when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

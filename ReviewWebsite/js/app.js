// Mock Data for Projects
const projectsData = [
    // AntiGravity Projects
    {
        id: 'anti-chrome-dino',
        agent: 'antigravity',
        title: 'Chrome Dinosaur Game',
        description: 'A clone of the classic Chrome Dinosaur Game.',
        link: '../AntiGravity/ChromeDinosaurGame/index.html',
        implementationPlan: '../AntiGravity/ChromeDinosaurGame/implementation_plan/plan.md',
        testCase: '../AntiGravity/ChromeDinosaurGame/tests/test_cases.md',
        summary: '',
        chat: '../AntiGravity/ChromeDinosaurGame/Chat/chat.md'
    },
    {
        id: 'anti-news-sentiment',
        agent: 'antigravity',
        title: 'News Sentiment With Stock',
        description: 'Stock sentiment analysis dashboard based on news.',
        link: '../AntiGravity/NewsSentimentWithStock/index.html',
        implementationPlan: '../AntiGravity/NewsSentimentWithStock/implementation_plan/plan.md',
        testCase: '../AntiGravity/NewsSentimentWithStock/stock-sentiment/tests/test_cases.md',
        summary: '../AntiGravity/NewsSentimentWithStock/Stock Sentiment Analysis Dashboard.md',
        chat: '../AntiGravity/NewsSentimentWithStock/chat/chat.md'
    },
    {
        id: 'anti-pdf-website',
        agent: 'antigravity',
        title: 'PDF Website',
        description: 'A website for interacting with and viewing PDFs.',
        link: '../AntiGravity/PDFWebsite/pdfwebsite/index.html',
        implementationPlan: '../AntiGravity/PDFWebsite/implementation_plan/plan.md',
        testCase: '../AntiGravity/PDFWebsite/test.cases.md',
        summary: '../AntiGravity/PDFWebsite/README.md',
        chat: '../AntiGravity/PDFWebsite/Chat/chat.md'
    },
    {
        id: 'anti-tts-app',
        agent: 'antigravity',
        title: 'Text-to-Speech Application',
        description: 'A tool to convert text into spoken audio.',
        link: '../AntiGravity/TTS_Application/index.html',
        implementationPlan: '../AntiGravity/TTS_Application/implementation_plan/plan.md',
        testCase: '../AntiGravity/TTS_Application/Tests/test_case.md',
        summary: '',
        chat: '../AntiGravity/TTS_Application/Chat/chat.md'
    },
    {
        id: 'anti-todo',
        agent: 'antigravity',
        title: 'To-Do List Application',
        description: 'A lightweight, clean-interface web-based to-do list application.',
        link: '../AntiGravity/TodoListApplication/To-do_List_Application/index.html',
        implementationPlan: '../AntiGravity/TodoListApplication/implementation_plan/plan.md',
        testCase: '../AntiGravity/TodoListApplication/To-do_List_Application/test.md',
        summary: '../AntiGravity/TodoListApplication/To-do_List_Application/summary.md',
        chat: '../AntiGravity/TodoListApplication/chat/chat.md'
    },
    // Codex Projects
    {
        id: 'codex-chrome-dino',
        agent: 'codex',
        title: 'Chrome Dinosaur Game',
        description: 'A clone of the classic Chrome Dinosaur Game.',
        link: '../Codex/ChromeDinosaurGame/index.html',
        implementationPlan: '../Codex/ChromeDinosaurGame/plan.md',
        testCase: '../Codex/ChromeDinosaurGame/tests/TEST_CASES.md',
        summary: '../Codex/ChromeDinosaurGame/README.md',
        chat: '../Codex/ChromeDinosaurGame/Chat/chat.md'
    },
    {
        id: 'codex-news-sentiment',
        agent: 'codex',
        title: 'News Sentiment With Stock',
        description: 'Stock sentiment analysis dashboard based on news.',
        link: '../Codex/NewsSentimentWithStock/index.html',
        implementationPlan: '../Codex/NewsSentimentWithStock/plan.md',
        testCase: '../Codex/NewsSentimentWithStock/test-cases.md',
        summary: '../Codex/NewsSentimentWithStock/documentation.md',
        chat: '../Codex/NewsSentimentWithStock/Chat/chat.md'
    },
    {
        id: 'codex-pdf-website',
        agent: 'codex',
        title: 'PDF Website',
        description: 'A website for interacting with and viewing PDFs.',
        link: '../Codex/PDFWebsite/Online PDF Viewer/index.html',
        implementationPlan: '../Codex/PDFWebsite/plan.md',
        testCase: '',
        summary: '../Codex/PDFWebsite/README.md',
        chat: '../Codex/PDFWebsite/Chat/chat.md'
    },
    {
        id: 'codex-tts-app',
        agent: 'codex',
        title: 'Text-to-Speech Application',
        description: 'A tool to convert text into spoken audio.',
        link: '../Codex/TTS_Application/index.html',
        implementationPlan: '../Codex/TTS_Application/plan/implementation-plan.md',
        testCase: '',
        summary: '',
        chat: '../Codex/TTS_Application/chat/chat.md'
    },
    {
        id: 'codex-todo',
        agent: 'codex',
        title: 'To-Do List Application',
        description: 'A lightweight, clean-interface web-based to-do list application.',
        link: '../Codex/TodoListApplication/To-do list Web Application/index.html',
        implementationPlan: '../Codex/TodoListApplication/docs/requirements.md',
        testCase: '../Codex/TodoListApplication/tests/TEST_CASES.md',
        summary: '../Codex/TodoListApplication/docs/README.md',
        chat: '../Codex/TodoListApplication/Chat/chat.md'
    }
];

// DOM Elements
const antigravityGrid = document.getElementById('antigravity-grid');
const codexGrid = document.getElementById('codex-grid');
const projectViewContainer = document.getElementById('project-view-container');
const backBtn = document.getElementById('back-to-dashboard');
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

// Modal Elements
const detailAgentBadge = document.getElementById('detail-agent-badge');
const detailTitle = document.getElementById('detail-title');
const detailDesc = document.getElementById('detail-desc');
const detailLink = document.getElementById('detail-link');
const planContent = document.getElementById('plan-content');
const testContent = document.getElementById('test-content');
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
        if (!content || content.trim() === '') {
            element.innerHTML = '<p class="empty-state-text">Summary notes are empty.</p>';
            return;
        }

        element.innerHTML = '<p>Loading...</p>';
        try {
            let text = content;
            if (content.trim().endsWith('.md')) {
                const response = await fetch(content + '?t=' + new Date().getTime());
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
            if (e.message === 'Failed to fetch' && window.location.protocol === 'file:') {
                element.innerHTML = '<p class="error-text">Error: Browser security prevents loading local files via the file:// protocol. Please run a local web server (e.g. using VS Code Live Server).</p>';
            } else {
                element.innerHTML = `<p class="error-text">Error loading content: ${e.message}</p>`;
            }
        }
    }

    // Load standard markdown contents
    loadMarkdownContent(project.implementationPlan, planContent);
    loadMarkdownContent(project.testCase, testContent);

    // Show/Hide Chat Tab depending on if it has a conversation transcript
    const chatTabBtn = document.querySelector('[data-tab="chat-tab"]');
    if (project.chat && project.chat.trim() !== '') {
        chatTabBtn.style.display = 'block';
        loadChatContent(project.chat, project.agent);
    } else {
        chatTabBtn.style.display = 'none';
    }

    // Reset Tabs to first one (Application link)
    switchTab('link-tab');

    // Show Project View
    document.querySelector('.app-header').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    projectViewContainer.classList.remove('hidden');
    window.scrollTo(0, 0);
};

// Async function to load and parse Chat Markdown content
async function loadChatContent(chatPath, agentName) {
    chatTimeline.innerHTML = '<p>Loading conversation...</p>';
    try {
        const response = await fetch(chatPath + '?t=' + new Date().getTime());
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
    const headerRegex = /#{2,3}\s+(?:\[#\d+\]\s+)?(User Input|Planner Response|User|Assistant)/g;
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
        
        if (current.type === 'User Input' || current.type === 'User') {
            parseUserContent(content, agentName, timeline);
        } else if (current.type === 'Planner Response' || current.type === 'Assistant') {
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
        let dividerIdx = content.indexOf('---', thoughtHeaderIdx);
        if (dividerIdx === -1) {
            dividerIdx = content.indexOf('***', thoughtHeaderIdx);
        }
        
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

// Close Project View
function closeProjectDetails() {
    projectViewContainer.classList.add('hidden');
    document.querySelector('.app-header').classList.remove('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
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
    backBtn.addEventListener('click', closeProjectDetails);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !projectViewContainer.classList.contains('hidden')) {
            closeProjectDetails();
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

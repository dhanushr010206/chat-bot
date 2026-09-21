let currentSession = { messages: [] };
let useWebSearch = false;
let fileContext = "";
let attachedFilename = "";

document.addEventListener('DOMContentLoaded', () => {
    // Top Nav
    const webSearchBtn = document.getElementById('web-search-toggle');
    if(webSearchBtn) {
        webSearchBtn.addEventListener('click', () => {
            useWebSearch = !useWebSearch;
            webSearchBtn.style.color = useWebSearch ? 'var(--accent-glow)' : '';
            webSearchBtn.title = useWebSearch ? 'Web Search: ON' : 'Web Search: OFF';
        });
    }

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
        });
    }

    // Chat
    const promptTextarea = document.getElementById('prompt-textarea');
    const sendBtn = document.getElementById('send-prompt-btn');
    
    if (promptTextarea) {
        promptTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    if(sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Settings API Key
    const saveKeyBtn = document.getElementById('save-key-btn');
    if(saveKeyBtn) {
        saveKeyBtn.addEventListener('click', async () => {
            const key = document.getElementById('settings-api-key').value;
            const res = await fetch('/api/settings/key', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({api_key: key})
            });
            const data = await res.json();
            alert(data.message || data.error);
        });
    }

    // File Upload
    const triggerFileBtn = document.getElementById('trigger-file-upload-btn');
    const fileInput = document.getElementById('file-upload-input');
    if(triggerFileBtn && fileInput) {
        triggerFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if(e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('file', file);
                
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if(data.success) {
                    fileContext = data.extracted_text;
                    attachedFilename = data.filename;
                    alert(`Attached: ${attachedFilename}`);
                } else {
                    alert(data.error);
                }
            }
        });
    }

    // Data Analyst
    const analyzeDataBtn = document.getElementById('analyze-data-btn');
    const dataUploadInput = document.getElementById('data-upload-input');
    if(analyzeDataBtn && dataUploadInput) {
        analyzeDataBtn.addEventListener('click', async () => {
            if(dataUploadInput.files.length === 0) return alert("Select a file first.");
            const formData = new FormData();
            formData.append('file', dataUploadInput.files[0]);
            
            const res = await fetch('/api/data/analyze', { method: 'POST', body: formData });
            const data = await res.json();
            if(data.error) return alert(data.error);
            
            const resultsDiv = document.getElementById('data-analysis-results');
            resultsDiv.innerHTML = `<pre>${JSON.stringify(data.metadata, null, 2)}</pre>`;
            // Add charts rendering logic here if needed
        });
    }

    // Fetch Tasks & Expenses initially
    loadTasks();
    loadExpenses();
    
    document.getElementById('add-task-btn')?.addEventListener('click', async () => {
        const title = document.getElementById('task-title').value;
        const category = document.getElementById('task-category').value;
        if(!title) return;
        await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, category})
        });
        document.getElementById('task-title').value = '';
        loadTasks();
    });

    document.getElementById('add-exp-btn')?.addEventListener('click', async () => {
        const title = document.getElementById('exp-title').value;
        const amount = document.getElementById('exp-amount').value;
        const category = document.getElementById('exp-cat').value;
        if(!title || !amount) return;
        await fetch('/api/expenses', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, amount, category})
        });
        document.getElementById('exp-title').value = '';
        document.getElementById('exp-amount').value = '';
        document.getElementById('exp-cat').value = '';
        loadExpenses();
    });
});

async function sendMessage() {
    const promptTextarea = document.getElementById('prompt-textarea');
    const text = promptTextarea.value.trim();
    if (!text && !fileContext) return;
    
    promptTextarea.value = '';
    
    const mode = document.getElementById('global-mode-select').value;
    const lang = document.getElementById('global-language-select').value;
    
    currentSession.messages.push({role: "user", content: text});
    appendMessage("user", text);

    const thinkingState = document.getElementById('thinking-state');
    thinkingState.style.display = 'block';

    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: currentSession.messages,
                mode: mode,
                language: lang,
                use_web_search: useWebSearch,
                file_context: fileContext
            })
        });

        // Clear file context after one use
        fileContext = "";
        attachedFilename = "";
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        let assistantMsg = "";
        const msgId = "msg-" + Date.now();
        appendMessage("assistant", "", msgId);
        
        const contentDiv = document.getElementById(msgId).querySelector('.msg-content');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, {stream: true});
            const lines = chunk.split('\n\n');
            
            for (let line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '');
                    try {
                        const payload = JSON.parse(dataStr);
                        if (payload.type === 'chunk') {
                            assistantMsg += payload.content;
                            contentDiv.innerHTML = marked.parse(assistantMsg);
                        } else if (payload.type === 'error') {
                            assistantMsg += payload.content;
                            contentDiv.innerHTML = marked.parse(assistantMsg);
                        }
                    } catch(e) {}
                }
            }
            scrollToBottom();
        }
        
        currentSession.messages.push({role: "assistant", content: assistantMsg});
        Prism.highlightAll();

    } catch (e) {
        console.error(e);
    } finally {
        thinkingState.style.display = 'none';
    }
}

function appendMessage(role, text, id=null) {
    const list = document.getElementById('messages-list');
    const wrap = document.createElement('div');
    wrap.className = `message-wrap ${role}`;
    if (id) wrap.id = id;
    
    wrap.innerHTML = `
        <div class="msg-avatar">
            <i class="${role === 'user' ? 'fa-solid fa-user-astronaut' : 'fa-solid fa-shapes'}"></i>
        </div>
        <div class="msg-bubble">
            <div class="msg-content">${marked.parse(text)}</div>
        </div>
    `;
    list.appendChild(wrap);
    scrollToBottom();
}

function scrollToBottom() {
    const anchor = document.getElementById('scroll-anchor');
    if(anchor) anchor.scrollIntoView({behavior: 'smooth'});
}

async function loadTasks() {
    const res = await fetch('/api/tasks');
    const tasks = await res.json();
    const list = document.getElementById('tasks-list');
    if(!list) return;
    list.innerHTML = tasks.map(t => `<div class="task-card">
        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}', this.checked)">
        <span>${t.title} <small>[${t.category}]</small></span>
        <button onclick="deleteTask('${t.id}')">X</button>
    </div>`).join('');
}

window.toggleTask = async function(id, completed) {
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({completed})
    });
}
window.deleteTask = async function(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
}

async function loadExpenses() {
    const res = await fetch('/api/expenses');
    const exps = await res.json();
    const list = document.getElementById('expenses-list');
    if(!list) return;
    list.innerHTML = exps.map(e => `<div class="exp-card">
        <span>${e.title} - ${e.amount} ${e.currency} <small>[${e.category}]</small></span>
        <button onclick="deleteExp('${e.id}')">X</button>
    </div>`).join('');
    
    const statsRes = await fetch('/api/expenses/stats');
    const stats = await statsRes.json();
    const statsDiv = document.getElementById('expense-stats');
    if(statsDiv) statsDiv.innerHTML = `<strong>Total Spent: ${stats.total}</strong>`;
}

window.deleteExp = async function(id) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    loadExpenses();
}

// DOM elements cache for better performance
const domElements = {
    // View buttons
    kanbanViewBtn: document.getElementById('kanbanViewBtn'),
    taskViewBtn: document.getElementById('taskViewBtn'),
    ganttViewBtn: document.getElementById('ganttViewBtn'),
    // settingsViewBtn: document.querySelector('.settings-access'),

    
    // View containers
    kanbanView: document.getElementById('kanbanView'),
    taskView: document.getElementById('taskView'),
    ganttView: document.getElementById('ganttView'),
    detailedTaskView: document.getElementById('detailedTaskView'),
    
    // Gantt elements
    ganttTimelineHeader: document.getElementById('ganttTimelineHeader'),
    ganttChart: document.getElementById('ganttChart'),
    ganttStartDateElem: document.getElementById('ganttStartDate'),
    ganttEndDateElem: document.getElementById('ganttEndDate'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    
    // Sidebar elements
    workspaceList: document.getElementById('workspaceList'),
    teamMembers: document.getElementById('teamMembers'),
    workspaceInput: document.getElementById('workspaceInput'),
    addWorkspaceBtn: document.getElementById('addWorkspaceBtn'),
    addTeamMemberBtn: document.getElementById('addTeamMemberBtn'),
    currentUserAvatar: document.getElementById('currentUserAvatar'),
    currentUserName: document.getElementById('currentUserName'),
    
    // Main content elements
    kanbanBoard: document.getElementById('kanbanBoard'),
    taskListView: document.getElementById('taskListView'),
    currentWorkspace: document.getElementById('currentWorkspace'),
    currentProject: document.getElementById('currentProject'), 
    
    // Task input elements
    taskInput: document.getElementById('taskInput'),
    assigneeSelect: document.getElementById('assigneeSelect'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    
    // Connection status elements (ADDED - Required for backend integration)
    connectionIndicator: document.getElementById('connectionIndicator'),
    retryConnectionBtn: document.getElementById('retryConnectionBtn'),
    offlineModeBtn: document.getElementById('offlineModeBtn'),
    connectionErrorModal: document.getElementById('connectionErrorModal'),
    
    // Modals
    taskDetailModal: document.getElementById('taskDetailModal'),
    teamMemberModal: document.getElementById('teamMemberModal'),
    projectModal: document.getElementById('projectModal'),
    
    // Task detail modal elements
    modalTaskTitle: document.getElementById('modalTaskTitle'),
    taskDescription: document.getElementById('taskDescription'),
    taskStatus: document.getElementById('taskStatus'),
    taskDueDate: document.getElementById('taskDueDate'),
    taskAssignees: document.getElementById('taskAssignees'),
    commentsList: document.getElementById('commentsList'),
    commentInput: document.getElementById('commentInput'),
    addCommentBtn: document.getElementById('addCommentBtn'),
    saveTaskBtn: document.getElementById('saveTaskBtn'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    addAssigneeBtn: document.getElementById('addAssigneeBtn'),
    
    // Team member modal elements
    memberFirstName: document.getElementById('memberFirstName'),
    memberLastName: document.getElementById('memberLastName'),
    memberEmail: document.getElementById('memberEmail'),
    memberPhoneNumber: document.getElementById('memberPhoneNumber'),
    saveTeamMemberBtn: document.getElementById('saveTeamMemberBtn'),
    cancelTeamMemberBtn: document.getElementById('cancelTeamMemberBtn'),
    closeTeamModal: document.getElementById('closeTeamModal'),
    
    // Project modal elements (Fixed naming: was 'project' inconsistent)
    projectNameInput: document.getElementById('projectNameInput'),
    projectDescriptionInput: document.getElementById('projectDescriptionInput'),
    saveProjectBtn: document.getElementById('saveProjectBtn'), 
    cancelProjectBtn: document.getElementById('cancelProjectBtn'),
    closeProjectModal: document.getElementById('closeProjectModal'), 

    settingsAccess: document.querySelector('.settings-access'),

    chatForm: document.getElementById('chatForm'),
    messageInput: document.getElementById('chatInput'),
    fileInput: document.getElementById('fileInput'),
    chatBox: document.getElementById('chatMessages'),

    extensionFilter: document.getElementById('extensionFilter'),
    fileCount: document.getElementById('fileCount'),
    searchInput: document.getElementById('searchInput'),
    fileTableBody: document.getElementById('fileTableBody'),

    logSearchInput: document.getElementById('logSearchInput'),
    logTypeFilter: document.getElementById('logTypeFilter'),
    logCount: document.getElementById('logCount'),
    logTableBody: document.getElementById('logTableBody'),

    timeSpent: document.getElementById('timeSpent'),

    profileViewBtn: document.getElementById('profileViewBtn'),
    
    get settingsOverlay() {
        return document.getElementById('settingsOverlay');
    },
    get backFromSettingsBtnFull() {
        return document.getElementById('backFromSettingsBtnFull');
    },
    get saveSettingsBtnFull() {
        return document.getElementById('saveSettingsBtnFull');
    },
    get cancelSettingsBtnFull() {
        return document.getElementById('cancelSettingsBtnFull');
    },
    get statusTemplatesGrid() {
        return document.querySelector('.status-templates-grid');
    },
    get selectedTemplateDescriptionFull() {
        return document.getElementById('selectedTemplateDescriptionFull');
    },
    get selectedTemplateStatusesFull() {
        return document.getElementById('selectedTemplateStatusesFull');
    },
    get specialStatesInfoFull() {
        return document.getElementById('specialStatesInfoFull');
    },
};

// DOM utility functions
const domUtils = {
    /**
     * Create an element with classes and attributes
     */
    createElement: (tag, className = '', attributes = {}) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.keys(attributes).forEach(key => {
            element.setAttribute(key, attributes[key]);
        });
        return element;
    },

    /**
     * Add event listener with error handling
     */
    addEventListenerSafe: (element, event, handler) => {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);
        } else {
            console.warn('Invalid element or handler for event:', event, element);
        }
    },

    /**
     * Remove all children from an element
     */
    clearChildren: (element) => {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    },

    /**
     * Show element
     */
    show: (element) => {
        if (element) {
            element.style.display = '';
            element.classList.add('active');
        }
    },

    /**
     * Hide element
     */
    hide: (element) => {
        if (element) {
            element.style.display = 'none';
            element.classList.remove('active');
        }
    },

    /**
     * Toggle element visibility
     */
    toggle: (element) => {
        if (element) {
            element.classList.toggle('active');
        }
    },

    /**
     * Set element text content safely
     */
    setText: (element, text) => {
        if (element) {
            element.textContent = text || '';
        }
    },

    /**
     * Set element HTML content safely
     */
    setHTML: (element, html) => {
        if (element) {
            element.innerHTML = html || '';
        }
    },

    /**
     * Get element value safely
     */
    getValue: (element) => {
        return element ? element.value : '';
    },

    /**
     * Set element value safely
     */
    setValue: (element, value) => {
        if (element) {
            element.value = value || '';
        }
    },

    /**
     * Add class to element
     */
    addClass: (element, className) => {
        if (element && className) {
            element.classList.add(className);
        }
    },

    /**
     * Remove class from element
     */
    removeClass: (element, className) => {
        if (element && className) {
            element.classList.remove(className);
        }
    },

    /**
     * Check if element has class
     */
    hasClass: (element, className) => {
        return element ? element.classList.contains(className) : false;
    },

    /**
     * Create task card element
     */
    createTaskCard: (task) => {
        const card = domUtils.createElement('div', 'task-card', { 'data-task-id': task.id });
        
        const assigneeAvatars = (task.assignees || []).map(assignee => {
            // const member = getTeamMemberById(assigneeId);
            return assignee ? `
                <div class="assignee-avatar" style="background-color: ${assignee.avatar_color}" title="${`${assignee.first_name} ${assignee.last_name}`}">
                    ${getInitials(`${assignee.first_name} ${assignee.last_name}`)}
                </div>
            ` : '';
        }).join('');

        const priorityClass = getTaskPriority(task);
        const dueDateText = task.endDate ? formatDate(task.endDate) : '';

        card.innerHTML = `
            <div class="task-title">${sanitizeHTML(task.title)}</div>
            ${task.description ? `<div class="task-description">${sanitizeHTML(task.description)}</div>` : ''}
            <div class="task-meta">
                <div class="task-assignees">${assigneeAvatars}</div>
                <div class="task-due-date ${priorityClass}">${dueDateText}</div>
            </div>
        `;

        return card;
    },

    /**
     * Create team member element
     */
    createTeamMember: (member) => {
        const memberEl = domUtils.createElement('div', 'team-member');
        memberEl.innerHTML = `
            <div class="member-avatar" style="background-color: ${member.color}">
                ${getInitials(member.name)}
            </div>
            <div class="member-name">${sanitizeHTML(member.name)}</div>
        `;
        return memberEl;
    },

    /**
     * Create workspace item element
     */
    createWorkspaceItem: (workspace, isActive = false) => {
        const workspaceEl = domUtils.createElement('li');
        const isCurrentWorkspace = workspace.id === appState.currentWorkspace;
        
        workspaceEl.innerHTML = `
            <div class="workspace-item ${isCurrentWorkspace ? 'active' : ''}" 
                 onclick="app.selectWorkspace(${workspace.id})">
                ${sanitizeHTML(workspace.name)}
            </div>
            <div class="project-list">
                ${(workspace.projects || []).map(project => `
                    <div class="project-item ${project.id === appState.currentProject ? 'active' : ''}"
                         onclick="app.selectProject(${project.id})">
                        ${sanitizeHTML(project.name)}
                    </div>
                `).join('')}
            </div>
        `;
        
        return workspaceEl;
    },

    /**
     * Show loading state
     */
    showLoading: (element, message = 'Loading...') => {
        if (element) {
            element.innerHTML = `<div class="loading-state">${message}</div>`;
        }
    },

    /**
     * Show empty state
     */
    showEmptyState: (element, message = 'No items found') => {
        if (element) {
            element.innerHTML = `<div class="empty-state">${message}</div>`;
        }
    },

    /**
     * Show error state
     */
    showError: (element, message = 'An error occurred') => {
        if (element) {
            element.innerHTML = `<div class="error-state">${message}</div>`;
        }
    }
};

// Initialize DOM utilities when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM utilities initialized');
    
    // Verify critical elements exist
    const criticalElements = [
        'kanbanBoard', 'taskInput', 'addTaskBtn', 'currentWorkspace', 'currentProject'
    ];
    
    const missingElements = criticalElements.filter(elementName => !domElements[elementName]);
    
    if (missingElements.length > 0) {
        console.warn('Missing critical DOM elements:', missingElements);
    }
    
    // Add global modal event handlers
    document.addEventListener('click', (e) => {
        // Close modal when clicking the close button
        if (e.target.classList.contains('close-modal')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                domUtils.hide(modal);
            }
        }
        
        if (e.target.classList.contains('modal')) {
            domUtils.hide(e.target);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="block"], .modal.active');
            openModals.forEach(modal => domUtils.hide(modal));
        }
    });
});

window.domElements = domElements;
window.domUtils = domUtils;
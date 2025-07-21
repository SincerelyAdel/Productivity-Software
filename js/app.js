const app = {
    currentView: 'kanban',
    isInitialized: false,
    currentWorkspace: 1,
    currentWorkflow: 1,
    currentTask: 1,
    workspaces: [],
    workflows: [],
    teamMembers: [],
    currentWorkflowTasks: [],
    currentUserId: 0,
    access_token: '',
    currentUser: {},
    
    ganttDayWidth: 60,

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    },

    /**
     * Initialize the application with backend data
     */
    init: async () => {
        
        try {
            if (sessionStorage.getItem("access_token")) {
                
                app.showGlobalLoading();
                
                const initSuccess = await initializeApp();
                
                if (!initSuccess) {
                    throw new Error('Failed to initialize backend connection');
                }
                
                modals.init();
                kanbanView.init();
                taskView.init();
                ganttView.init();
                detailedTaskView.init();
                settingsManager.init();
    
                app.workspaces = await get_workspaces_data();
                app.workflows = await get_workflows_data();
                app.teamMembers = await get_members_data();
                app.currentUserId = sessionStorage.getItem("member_id");
                app.access_token = sessionStorage.getItem("access_token");
                app.currentUser = await API.members.get(app.currentUserId);

                console.log(app.access_token);
                console.log(app.currentUserId);
                
                
                sessionStorage.clear();
                
                app.setupEventListeners();
                
                app.updateUI();
                
                app.isInitialized = true;
                app.switchView('kanban');
                
                app.hideGlobalLoading();    
            }
        } catch (error) {
            console.error('❌ Failed to initialize WorkspaceFlow:', error);
            app.showErrorMessage('Failed to initialize application. Please refresh the page.');
            app.hideGlobalLoading();
        }
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners: () => {
        // View switching
        domUtils.addEventListenerSafe(domElements.kanbanViewBtn, 'click', () => app.switchView('kanban'));
        domUtils.addEventListenerSafe(domElements.taskViewBtn, 'click', () => app.switchView('task'));
        domUtils.addEventListenerSafe(domElements.ganttViewBtn, 'click', () => app.switchView('gantt'));
        domUtils.addEventListenerSafe(domElements.settingsAccess, 'click', () => app.openSettings());
        domUtils.addEventListenerSafe(domElements.backFromSettingsBtnFull, 'click', () => app.closeSettings());
        domUtils.addEventListenerSafe(domElements.cancelSettingsBtnFull, 'click', () => app.cancelSettingsChanges());
        domUtils.addEventListenerSafe(domElements.saveSettingsBtnFull, 'click', () => app.applyTemplate());
        domUtils.addEventListenerSafe(domElements.profileViewBtn, 'click', () => app.accessProfilePage())

        // Task creation
        domUtils.addEventListenerSafe(domElements.addTaskBtn, 'click', app.handleAddTask);
        domUtils.addEventListenerSafe(domElements.taskInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                app.handleAddTask();
            }
        });

        // Workspace creation
        domUtils.addEventListenerSafe(domElements.addWorkspaceBtn, 'click', app.handleAddWorkspace);
        domUtils.addEventListenerSafe(domElements.workspaceInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                app.handleAddWorkspace();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', app.handleKeyboardShortcuts);

        // Auto-refresh functionality
        setInterval(app.autoRefresh, 30000); // Auto-refresh every 30 seconds

        // Window beforeunload handler
        window.addEventListener('beforeunload', app.handleBeforeUnload);

        // Handle window resize
        window.addEventListener('resize', debounce(app.handleResize, 250));
    },

    /**
     * Handle view switching with data loading
     */
    switchView: async (viewName) => {
        
        if (!app.isInitialized) {
            console.warn('App not fully initialized yet');
            return;
        }
        
        try {            
            await refreshTasksIfNeeded();
            
            if (viewName !== 'detailedTask') {
                document.querySelectorAll('.view-btn').forEach(btn => {
                    domUtils.removeClass(btn, 'active');
                });
                
                const viewBtn = document.getElementById(`${viewName}ViewBtn`);
                if (viewBtn) {
                    domUtils.addClass(viewBtn, 'active');
                }
            }

            document.querySelectorAll('.view-container').forEach(container => {
                domUtils.removeClass(container, 'active');
            });
            
            const viewContainer = document.getElementById(`${viewName}View`);
            if (viewContainer) {
                domUtils.addClass(viewContainer, 'active');
            }

            app.currentView = viewName;

            app.renderCurrentView();
            
            app.hideViewLoading();
        } catch (error) {
            console.error('Error switching view:', error);
            app.showErrorMessage(`Failed to load ${viewName} view`);
            app.hideViewLoading();
        }
    },

    /**
     * Render the current view
     */
    renderCurrentView: () => {
        switch(app.currentView) {
            case 'kanban':
                kanbanView.render();
                break;
            case 'task':
                taskView.render();
                break;
            case 'gantt':
                ganttView.render();
                break;
            case 'detailedTask':
                break;
            case 'settings':
                settingsManager.render();
                break;
            default:
                console.warn('Unknown view:', app.currentView);
        }
    },

    /**
     * Refresh current view (used after data changes)
     */
    refreshCurrentView: () => {
        app.renderCurrentView();
        app.updateHeaderInfo();
        app.updateAssigneeSelect();
    },

    /**
     * Handle adding new task with backend integration
     */
    handleAddTask: async () => {
        const taskTitle = domUtils.getValue(domElements.taskInput).trim();
        if (!taskTitle) {
            domElements.taskInput.focus();
            return;
        }

        const workflow = await API.workflows.get(app.currentWorkflow);

        if (!workflow) {
            app.showErrorMessage('Please select a workflow first.');
            return;
        }

        const assigneeId = domUtils.getValue(domElements.assigneeSelect);
        
        try {
            app.setTaskInputLoading(true);


            
            const taskData = {
                title: taskTitle,
                status: kanbanView.columns[0].id,
                startDate: new Date().toISOString().split('T')[0],
                assignee_ids: assigneeId ? [parseInt(assigneeId)] : [],
                workflow_id: app.currentWorkflow,
                column_id: 1
            };

            const newTask = await API.tasks.create(taskData, app.getCurrentUserId());

            if (newTask) {
                domUtils.setValue(domElements.taskInput, '');
                domUtils.setValue(domElements.assigneeSelect, '');
                
                app.refreshCurrentView();
                
                app.showSuccessMessage(`Task "${taskTitle}" added successfully!`);
                
                domElements.taskInput.focus();
            }
            
        } catch (error) {
            console.error('Failed to create task:', error);
            app.showErrorMessage('Failed to create task. Please try again.');
        } finally {
            app.setTaskInputLoading(false);
        }
    },

    /**
     * Handle adding new workspace with backend integration
     */
    handleAddWorkspace: async () => {
        const workspaceName = domUtils.getValue(domElements.workspaceInput).trim();
        if (!workspaceName) {
            domElements.workspaceInput.focus();
            return;
        }

        //TODO: check for duplicity later

        try {
            const workspaceData = {
                name: workspaceName
            };

            const newWorkspace = await API.workspaces.create(workspaceData, app.getCurrentUserId());
            
            if (newWorkspace) {                
                domUtils.setValue(domElements.workspaceInput, '');
                
                app.currentWorkspace = newWorkspace.id;

                app.updateUI();
                app.showSuccessMessage(`Workspace "${workspaceName}" created successfully!`);
            }
            
        } catch (error) {
            console.error('Failed to create workspace:', error);
            app.showErrorMessage('Failed to create workspace. Please try again.');
        }
    },

    /**
     * Update main UI components
     */
    updateUI: () => {
        app.updateHeaderInfo();
        app.renderWorkspaces();
        app.renderTeamMembers();
        app.updateAssigneeSelect();
        app.refreshCurrentView();
        app.renderProfilePlaque();
    },

    /**
     * Update header information
     */
    updateHeaderInfo: async () => {
        // Use cached data from app state instead of async API calls
        const workspace = await API.workspaces.get(app.currentWorkspace);
        const project = await API.workflows.get(app.currentWorkflow);

        if (project) {
            try {
                app.currentWorkflowTasks = await backendBridge.loadTasks(app.currentWorkflow); 
            } catch (error) {
                console.error('Failed to load tasks:', error);
                app.currentWorkflowTasks = [];
            }
        }

        domUtils.setText(domElements.currentWorkspace, workspace ? workspace.name : 'No workspace');
        domUtils.setText(domElements.currentProject, project ? project.name : 'No project');
    },

    /**
     * Render workspaces in sidebar
     */
    renderWorkspaces: async () => {
        if (!domElements.workspaceList) return;

        const workspaces = await API.workspaces.getAll();

        const workflowsByWorkspace = await Promise.all(
            workspaces.map(workspace => API.workflows.getAll(workspace.id))
        );

        console.log(workflowsByWorkspace);

        const workspacesHtml = workspaces.map((workspace, index) => {
            const isCurrentWorkspace = workspace.id === app.currentWorkspace;
            const projects = workflowsByWorkspace[index]; // ✅ workflows for this workspace

            const projectsHtml = projects.map(project => `
                <div class="project-item ${project.id === app.currentWorkflow ? 'active' : ''}"
                    onclick="app.selectProject(${project.id})">
                    ${sanitizeHTML(project.name)}
                </div>
            `).join('');

            return `
                <li>
                    <div class="workspace-item ${isCurrentWorkspace ? 'active' : ''}" 
                        onclick="app.selectWorkspace(${workspace.id})">
                        ${sanitizeHTML(workspace.name)}
                    </div>
                    <div class="project-list">
                        ${projectsHtml}
                        <div class="add-workflow-btn" onclick="modals.openProjectModal(${workspace.id})">
                            Add Workflow
                        </div>
                    </div>
                </li>
            `;
        }).join('');

        domUtils.setHTML(domElements.workspaceList, workspacesHtml);
    },

    /**
     * Render team members in sidebar
     */
    async renderTeamMembers() {
        if (!domElements.teamMembers) return;

        const teamMembers = await API.members.getAll();

        console.log(teamMembers);

        const membersHtml = teamMembers.map(member => {
            const avatarUrl = `${BASE_URL}/member/${member.id}/profile-picture?t=${Date.now()}`;
            const initials = getInitials(`${member.first_name} ${member.last_name}`);
            const safeAvatarUrl = this.escapeHtml(avatarUrl);
            const safeName = sanitizeHTML(`${member.first_name} ${member.last_name}`);

            return `
                <div class="team-member">
                    <div class="assignee-avatar" style="background-color: ${member.avatar_color}; position: relative; overflow: hidden;">
                        <img src="${safeAvatarUrl}"
                            alt="${safeName}"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                            style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                        <span style="display: none; color: ${this.getContrastColor(member.avatar_color)};">
                            ${initials}
                        </span>
                    </div>
                    <div class="member-name">${sanitizeHTML(`${member.first_name} ${member.last_name}`)}</div>
                </div>
            `;
        }).join('');

        domUtils.setHTML(domElements.teamMembers, membersHtml);
    },

    /**
     * Update assignee select dropdown
     */
    updateAssigneeSelect: () => {
        if (!domElements.assigneeSelect) return;

        const optionsHtml = '<option value="">Assign to...</option>' +
            app.teamMembers.map(member => 
                `<option value="${member.id}">${sanitizeHTML(`${member.first_name} ${member.last_name}`)}</option>`
            ).join('');

        domUtils.setHTML(domElements.assigneeSelect, optionsHtml);
    },

    /**
     * Select workspace with backend loading
     */
    selectWorkspace: async (workspaceId) => {
        try {
            app.showViewLoading();
            app.currentWorkspace = workspaceId;
            
            const workspace = API.workspaces.get(workspaceId);
            if (workspace && workspace.projects && workspace.projects.length > 0) {
                await app.selectProject(workspace.projects[0].id);
            }
            
            app.updateUI();
            app.hideViewLoading();
            
        } catch (error) {
            console.error('Failed to select workspace:', error);
            app.showErrorMessage('Failed to load workspace data');
            app.hideViewLoading();
        }
    },

    /**
     * Select project with backend loading
     */
    selectProject: async (workflowId) => {
        try {
            app.showViewLoading();
            
            const workflow = await API.workflows.get(workflowId);
            if (!workflow) throw new Error('workflow not found');

            app.currentWorkflow = workflow.id;
            app.currentWorkspace = workflow.workspace_id;
            app.currentWorkflowTasks = await backendBridge.loadTasks(workflow.id);
            app.updateUI();
            app.showSuccessMessage('Project loaded successfully');
            
            app.hideViewLoading();
            
        } catch (error) {
            console.error('Failed to select project:', error);
            app.showErrorMessage('Failed to load project data');
            app.hideViewLoading();
        }
    },

    /**
     * Auto-refresh data periodically
     */
    autoRefresh: async () => {
        try {
            // Only refresh if data is stale and no user is actively typing
            if (!app.isUserActivelyTyping()) {
                await refreshTasksIfNeeded(true); // Force refresh
                app.refreshCurrentView();
            }
        } catch (error) {
            console.warn('Auto-refresh failed:', error);
        }
    },

    /**
     * Check if user is actively typing
     */
    isUserActivelyTyping: () => {
        const activeElement = document.activeElement;
        return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    },

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts: (e) => {
        // Only handle shortcuts when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + key combinations
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    app.switchView('kanban');
                    break;
                case '2':
                    e.preventDefault();
                    app.switchView('task');
                    break;
                case '3':
                    e.preventDefault();
                    app.switchView('gantt');
                    break;
                case 'n':
                    e.preventDefault();
                    domElements.taskInput.focus();
                    break;
                case 'r':
                    e.preventDefault();
                    app.forceRefresh();
                    break;
            }
        }

        // Single key shortcuts
        switch (e.key) {
            case 'Escape':
                // Close any open modals
                document.querySelectorAll('.modal.active').forEach(modal => {
                    domUtils.hide(modal);
                });
                break;
        }
    },

    /**
     * Force refresh all data
     */
    forceRefresh: async () => {
        try {
            app.showViewLoading();
            await refreshTasksIfNeeded(true); // Force refresh
            app.refreshCurrentView();
            app.showSuccessMessage('Data refreshed successfully');
            app.hideViewLoading();
        } catch (error) {
            console.error('Force refresh failed:', error);
            app.showErrorMessage('Failed to refresh data');
            app.hideViewLoading();
        }
    },

    /**
     * Handle window resize
     */
    handleResize: () => {
        // Refresh current view to handle responsive changes
        app.refreshCurrentView();
    },

    /**
     * Handle before unload (page refresh/close)
     */
    handleBeforeUnload: (e) => {
        // No need to save data since it's handled by backend
    },

    

    /**
     * Get current user ID (placeholder - implement based on your auth system)
     */
    getCurrentUserId: () => {
        return app.currentUserId;
    },

    // ============ UI STATE MANAGEMENT ============

    /**
     * Show global loading spinner
     */
    showGlobalLoading: () => {
        let spinner = document.getElementById('globalLoadingSpinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'globalLoadingSpinner';
            spinner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-size: 18px;
                font-weight: 600;
                color: #4a6fa5;
            `;
            spinner.innerHTML = `
                <div>
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4a6fa5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                    <div>Loading WorkspaceFlow...</div>
                </div>
            `;
            document.body.appendChild(spinner);
            
            // Add spinner animation CSS
            if (!document.getElementById('spinnerStyles')) {
                const style = document.createElement('style');
                style.id = 'spinnerStyles';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        spinner.style.display = 'flex';
    },

    /**
     * Hide global loading spinner
     */
    hideGlobalLoading: () => {
        const spinner = document.getElementById('globalLoadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    },

    /**
     * Show view loading indicator
     */
    showViewLoading: () => {
        const activeView = document.querySelector('.view-container.active');
        if (activeView) {
            let loader = activeView.querySelector('.view-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.className = 'view-loader';
                loader.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    z-index: 100;
                `;
                loader.innerHTML = `
                    <div class="spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #4a6fa5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
                    <div>Loading...</div>
                `;
                activeView.style.position = 'relative';
                activeView.appendChild(loader);
            }
            loader.style.display = 'block';
        }
    },

    /**
     * Hide view loading indicator
     */
    hideViewLoading: () => {
        document.querySelectorAll('.view-loader').forEach(loader => {
            loader.style.display = 'none';
        });
    },

    /**
     * Set task input loading state
     */
    setTaskInputLoading: (isLoading) => {
        const button = domElements.addTaskBtn;
        const input = domElements.taskInput;
        
        if (button) {
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Adding...' : 'Add Task';
        }
        
        if (input) {
            input.disabled = isLoading;
        }
    },

    /**
     * Show success message
     */
    showSuccessMessage: (message) => {
        app.showNotification(message, 'success');
    },

    /**
     * Show error message
     */
    showErrorMessage: (message) => {
        app.showNotification(message, 'error');
    },

    /**
     * Show notification
     */
    showNotification: (message, type = 'info') => {
        // Remove existing notifications
        document.querySelectorAll('.app-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#4a6fa5'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: 600;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Get application statistics
     */
    getStats: () => {
        const allTasks = app.currentWorkflowTasks || [];

        return {
            workspaces: appState.workspaces.length,
            projects: appState.workspaces.reduce((count, ws) => count + (ws.projects?.length || 0), 0),
            tasks: allTasks.length,
            teamMembers: appState.teamMembers.length,
            completedTasks: allTasks.filter(t => t.status === 'completed').length,
            overdueTasks: allTasks.filter(t => getTaskPriority && getTaskPriority(t) === 'overdue').length
        };
    },

    openSettings: () => {
        if (window.settingsManager) {
            window.settingsManager.openSettings();
        } else {
            console.error('❌ Settings manager not available');
            app.showErrorMessage('Settings not available. Please refresh the page.');
        }
    },

    closeSettings: () => {
        if (window.settingsManager) {
            window.settingsManager.closeSettings();
        } else {
            console.error('❌ Settings manager not available');
        }
    },

    applyTemplate: () => {
        settingsManager.applySettings();
        app.closeSettings();
    },

    cancelSettingsChanges: () => {
        if (window.settingsManager) {
            window.settingsManager.cancelSettings();
        } else {
            console.error('❌ Settings manager not available');
        }
    },

    accessProfilePage: () => {
        sessionStorage.setItem("member_id", `${app.currentUserId}`);
        sessionStorage.setItem("access_token", `${app.access_token}`);

        window.location.href = "profile.html";
    },

    renderProfilePlaque() {
        if (!app.currentUser) return;

        const fullName = `${app.currentUser.first_name} ${app.currentUser.last_name}`;
        const initials = getInitials(fullName);
        const bgColor = app.currentUser.avatar_color || '#4a6fa5';
        const contrastColor = this.getContrastColor(bgColor);

        // Set name text
        const nameEl = document.getElementById('currentUserName');
        if (nameEl) nameEl.textContent = fullName;

        // Avatar image and fallback initials
        const avatarImg = document.getElementById('userAvatarImg');
        const initialsSpan = avatarImg?.nextElementSibling;
        const avatarWrapper = avatarImg?.parentElement;

        if (avatarImg && initialsSpan && avatarWrapper) {
            avatarWrapper.style.backgroundColor = bgColor;

            avatarImg.alt = fullName;
            avatarImg.src = `http://localhost:8000/member/${app.currentUser.id}/profile-picture?t=${Date.now()}`;

            initialsSpan.textContent = initials;
            initialsSpan.style.color = contrastColor;
        }
    }


};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});


window.app = app;

window.openSettings = app.openSettings();
window.closeSettings = app.closeSettings();
window.applyTemplate = app.applyTemplate();
window.cancelSettingsChanges = app.cancelSettingsChanges();

window.addEventListener('unhandledrejection', (event) => {
    console.error('🔥 Unhandled Promise Rejection:', event.reason);
});
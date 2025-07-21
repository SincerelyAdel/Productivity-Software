// ============ FULL-HEIGHT DETAILED TASK VIEW - BACKEND INTEGRATED ============

const detailedTaskView = {
    // Current state
    currentTaskId: null,
    previousView: 'kanban',
    timerInterval: null,
    startTime: null,
    isLoading: false,
    formData: new FormData(),
    
    // DOM elements
    elements: {},

    // File elements
    files: [],
    filteredFiles: [],

    // Log elements
    activityLogs: [],
    filteredLogs: [],

    fieldLabels: {
        title: "Title",
        description: "Description",
        start_date: "Start Date",
        end_date: "End Date",
        status: "Status",
        time_spent_seconds: "Time Spent"
    },

    /**
     * Initialize the detailed task view
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.addTaskClickListeners();
        this.initFileUpload();
    },

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        const elementIds = [
            'detailedTaskView', 'backToViewBtn', 'taskStatusBadge',
            'subtaskProgress', 'newSubtaskInput', 'addSubtaskBtn', 'subtasksList',
            'taskTitle', 'taskDescription', 'taskStartDate', 'taskEndDate',
            'taskStatusSelect', 'taskProgressBar', 'taskProgressText',
            'timeSpent', 'taskAssignees',
            'taskCreated', 'taskUpdated', 'subtaskStats',
            'saveTaskBtn', 'deleteTaskBtn',
            'messageCount', 'chatMessages', 'chatInput', 'sendMessageBtn',
            'assigneeDropdown', 'fileInput'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        this.mainContent = document.querySelector('.main-content');
        this.boardHeader = document.querySelector('.board-header');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const { elements } = this;

        // Navigation
        elements.backToViewBtn?.addEventListener('click', () => this.close());

        // Subtasks
        elements.addSubtaskBtn?.addEventListener('click', () => this.addSubtask());
        elements.newSubtaskInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSubtask();
        });

        // Task info auto-save
        const autoSaveFields = [
            'taskTitle', 'taskDescription', 'taskStartDate', 
            'taskEndDate', 'taskStatusSelect'
        ];
        
        autoSaveFields.forEach(fieldId => {
            const element = elements[fieldId];
            if (element) {
                element.addEventListener('input', this.debounce(() => this.autoSave(), 1000));
                // element.addEventListener('change', () => this.autoSave());
            }
        });
        
        // Actions
        elements.saveTaskBtn?.addEventListener('click', () => this.saveTask());
        elements.deleteTaskBtn?.addEventListener('click', () => this.deleteTask());

        // Chat
        elements.sendMessageBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        elements.chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // prevent newline
                this.sendMessage(); // only send if it's Enter without Shift
            }
        });

        elements.assigneeDropdown?.addEventListener('change', async (e) => {
            const selectedId = parseInt(e.target.value);
            if (!selectedId) return;

            const task = await backendBridge.loadTaskDetails(this.currentTaskId);
            if (!task) return;

            if (!task.assignees.some(member => member.id === selectedId)) {
                const assignee = await API.members.get(selectedId);
                task.assignees.push(assignee);

                try {
                    await API.tasks.assign(task.id, assignee.id);
                } catch (err) {
                    console.error('Failed to update assignees:', err);
                    detailedTaskView.showNotification('Failed to assign user', 'error');
                    return;
                }

                const activityLogData = {
                    action: "member_assigned",
                    entity_type: "member",
                    entity_id: assignee.id,
                    description: `Assigned member: ${assignee.first_name} ${assignee.last_name}`,
                    member_id: app.getCurrentUserId(),
                    workspace_id: app.currentWorkspace,
                    task_id: this.currentTaskId
                };

                await API.activities.create(activityLogData);

                await this.loadActivityLogs(app.currentTask);
                this.renderLogTable();

                detailedTaskView.renderAssignees(task.assignees);
                detailedTaskView.showNotification('Assignee added!', 'success');
            }

            e.target.value = '';
        });


        // Handle escape key to close detailed view
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDetailedViewActive()) {
                this.close();
            }
        });
    },

    /**
     * Add click listeners to all task cards across different views
     */
    addTaskClickListeners() {
        // Observer to watch for dynamically added task cards
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.attachTaskCardListeners(node);
                    }
                });
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Attach listeners to existing task cards
        this.attachTaskCardListeners(document.body);
    },

    /**
     * Attach click listeners to task cards within a container
     */
    async attachTaskCardListeners(container) {
        // Kanban task cards
        const kanbanCards = container.querySelectorAll('.task-card:not([data-detailed-listener])');
        kanbanCards.forEach(card => {
            card.setAttribute('data-detailed-listener', 'true');
            card.addEventListener('click', async (e) => {
                // Prevent opening if clicking on buttons or interactive elements
                if (e.target.closest('button, select, input, .subtask-action-btn')) {
                    return;
                }
                
                const taskId = card.getAttribute('data-task-id');
                if (taskId && !card.classList.contains('creating')) {
                    app.currentTask = taskId;

                    await this.open(taskId, this.getCurrentActiveView());
                }
            });
        });

        // Task list view items
        const taskListItems = container.querySelectorAll('.task-list-item:not([data-detailed-listener])');
        taskListItems.forEach(item => {
            item.setAttribute('data-detailed-listener', 'true');
            item.addEventListener('click', async (e) => {
                if (e.target.closest('button, select, input, .task-action-btn')) {
                    return;
                }
                
                const taskId = item.getAttribute('data-task-id');
                if (taskId) {
                    await this.open(taskId, 'taskView');
                }
            });
        });

        // Gantt chart items
        const ganttItems = container.querySelectorAll('.gantt-task-bar:not([data-detailed-listener])');
        ganttItems.forEach(item => {
            item.setAttribute('data-detailed-listener', 'true');
            item.addEventListener('click', async (e) => {
                if (e.target.closest('button, select, input')) {
                    return;
                }
                
                const taskId = item.getAttribute('data-task-id');
                if (taskId) {
                    await this.open(taskId, 'ganttView');
                }
            });
        });
    },

    /**
     * Get currently active view
     */
    getCurrentActiveView() {
        if (document.getElementById('kanbanView')?.classList.contains('active')) {
            return 'kanban';
        } else if (document.getElementById('taskView')?.classList.contains('active')) {
            return 'taskView';
        } else if (document.getElementById('ganttView')?.classList.contains('active')) {
            return 'ganttView';
        }
        return 'kanban'; // fallback
    },

    /**
     * Check if detailed view is currently active
     */
    isDetailedViewActive() {
        return this.elements.detailedTaskView?.classList.contains('active');
    },

    /**
     * Open detailed task view with backend data loading
     */
    async open(taskId, fromView = 'kanban') {
        debugger;
        if (this.isLoading) {
            return;
        }

        try {
            this.isLoading = true;
            this.showLoadingState();

            const taskDetails = await loadTaskDetails(taskId);
            console.log(taskDetails);
            
            
            if (!taskDetails) {
                throw new Error('Task not found or failed to load');
            }
            console.log(app.currentTask); 
            this.currentTaskId = taskId;
            this.previousView = fromView;

            // Hide header and prepare full-height layout
            this.activateFullHeightMode();

            // Hide all other views
            this.hideAllViews();

            // Populate data and show detailed view
            this.populateTaskData(taskDetails);
            this.renderSubtasks(taskDetails.subtasks || []);
            this.updateProgress(taskDetails.status);
            console.log(taskDetails);

            const member = await API.members.get(app.getCurrentUserId())
            
            console.log(member);
            
            await this.renderChat(taskDetails.messages || []);
            this.updateStatusOptions();
            
            await this.populateFiles()
            this.initFileManager();
            
            await this.loadActivityLogs(taskId);
            this.initLogManager();

            // Show the detailed task view
            this.showView();
            
            this.hideLoadingState();

        } catch (error) {
            console.error('Failed to open task details:', error);
            this.showErrorMessage('Failed to load task details');
            this.hideLoadingState();
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Close detailed task view and return to previous view
     */
    close() {
        this.stopTimer();
        
        // Restore normal layout
        this.deactivateFullHeightMode();
        
        // Hide detailed view
        this.hideView();
        
        // Show previous view
        this.showPreviousView();
        
        this.currentTaskId = null;
        
    },

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.elements.detailedTaskView) {
            let loader = this.elements.detailedTaskView.querySelector('.detailed-task-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.className = 'detailed-task-loader';
                loader.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    font-size: 16px;
                    font-weight: 600;
                    color: #4a6fa5;
                `;
                loader.innerHTML = `
                    <div>
                        <div class="spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #4a6fa5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                        <div>Loading task details...</div>
                    </div>
                `;
                this.elements.detailedTaskView.style.position = 'relative';
                this.elements.detailedTaskView.appendChild(loader);
            }
            loader.style.display = 'flex';
        }
    },

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loader = this.elements.detailedTaskView?.querySelector('.detailed-task-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    },

    /**
     * Activate full-height mode (hide header)
     */
    activateFullHeightMode() {
        if (this.mainContent) {
            this.mainContent.classList.add('detailed-task-active');
        }
    },

    /**
     * Deactivate full-height mode (show header)
     */
    deactivateFullHeightMode() {
        if (this.mainContent) {
            this.mainContent.classList.remove('detailed-task-active');
        }
    },

    /**
     * Show detailed task view
     */
    showView() {
        // Hide all other views
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show detailed task view
        this.elements.detailedTaskView.classList.add('active');
        
        // Remove active state from all view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    },

    /**
     * Hide detailed task view
     */
    hideView() {
        this.elements.detailedTaskView.classList.remove('active');
    },

    /**
     * Hide all views
     */
    hideAllViews() {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
    },

    /**
     * Show previous view using main app's view system
     */
    showPreviousView() {
        // Map internal view names to actual view IDs and button IDs
        const viewMap = {
            'kanban': { viewId: 'kanbanView', buttonId: 'kanbanViewBtn' },
            'taskView': { viewId: 'taskView', buttonId: 'taskViewBtn' },
            'ganttView': { viewId: 'ganttView', buttonId: 'ganttViewBtn' }
        };
        
        const mapping = viewMap[this.previousView] || viewMap['kanban'];
        const viewElement = document.getElementById(mapping.viewId);
        const viewButton = document.getElementById(mapping.buttonId);
        
        if (viewElement) {
            viewElement.classList.add('active');
        }
        
        if (viewButton) {
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            viewButton.classList.add('active');
        }
        
        // Trigger any view-specific render methods
        this.triggerViewRefresh(this.previousView);
    },

    /**
     * Trigger refresh for specific views
     */
    triggerViewRefresh(viewName) {
        switch(viewName) {
            case 'kanban':
                if (window.kanbanView && window.kanbanView.render) {
                    setTimeout(() => window.kanbanView.render(), 100);
                }
                break;
            case 'taskView':
                if (window.taskListView && window.taskListView.render) {
                    setTimeout(() => window.taskListView.render(), 100);
                }
                break;
            case 'ganttView':
                if (window.ganttView && window.ganttView.render) {
                    setTimeout(() => window.ganttView.render(), 100);
                }
                break;
        }
    },

    /**
     * Update status options based on current template
     */
    updateStatusOptions() {
        if (!window.settingsManager) return;
        
        const template = window.settingsManager.getCurrentStatusTemplate();
        if (!template) return;
        
        const statusSelect = this.elements.taskStatusSelect;
        if (!statusSelect) return;
        
        const currentValue = statusSelect.value;
        statusSelect.innerHTML = '';
        
        template.statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status.key;
            option.textContent = status.label;
            option.selected = status.key === currentValue;
            
            if (status.special) {
                option.textContent += ' (Approval Required)';
                option.style.fontStyle = 'italic';
            }
            
            statusSelect.appendChild(option);
        });
    },

    /**
     * Populate task data in the middle section
     */
    populateTaskData(task) {
        const { elements } = this;

        // Basic info
        if (elements.taskTitle.tagName === 'INPUT') {
            elements.taskTitle.value = task.title || '';
        } else {
            elements.taskTitle.textContent = task.title || '';
        }
        elements.taskDescription.value = task.description || '';
        elements.taskStartDate.value = this.toDateInputValue(task.start_date || task.created_at);
        elements.taskEndDate.value = this.toDateInputValue(task.end_date);
        elements.taskStatusSelect.value = task.status || 'not_started';

        // Status badge
        this.updateStatusBadge(task.status);

        // Progress
        this.updateProgress(task);

        // Counter
        this.startCountUpTimer(task.created_at);

        // Assignees
        this.renderAssignees(task.assignees || []);

        this.populateAssigneeDropdown(task.assignees || []);

        // Stats
        elements.taskCreated.textContent = this.formatDate(task.created_at);
        elements.taskUpdated.textContent = this.formatDate(task.updated_at || task.created_at);
    },

    /**
     * Render subtasks in the left section
     */
    renderSubtasks(subtasks) {
        const { elements } = this;
        
        if (!subtasks || subtasks.length === 0) {
            elements.subtasksList.innerHTML = `
                <div class="no-subtasks">
                    <div>📝</div>
                    <div>No subtasks yet</div>
                    <div>Add some to break down this task into smaller steps</div>
                </div>
            `;
            elements.subtaskProgress.textContent = '0/0';
            elements.subtaskStats.textContent = '0/0';
            return;
        }

        const completedCount = subtasks.filter(st => st.completed).length;
        
        // Update progress indicators
        elements.subtaskProgress.textContent = `${completedCount}/${subtasks.length}`;
        elements.subtaskStats.textContent = `${completedCount}/${subtasks.length}`;

        const subtasksHtml = subtasks.map((subtask, index) => `
            <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-index="${index}">
                <input type="checkbox" 
                       class="subtask-checkbox" 
                       ${subtask.completed ? 'checked' : ''}
                       onchange="detailedTaskView.toggleSubtask(${index})">
                <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${this.escapeHtml(subtask.text)}</span>
                <div class="subtask-actions">
                    <button class="subtask-action-btn" onclick="detailedTaskView.deleteSubtask(${index})" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');

        elements.subtasksList.innerHTML = subtasksHtml;
        
    },

    /**
     * Toggle subtask completion with backend integration
     */
    async toggleSubtask(index) {
        const task = await backendBridge.loadTask(app.currentTask);
        if (!task?.subtasks?.[index]) return;

        try {
            const subtask = task.subtasks[index];
            const newCompletedState = !subtask.completed;

            await API.subtasks.update(subtask.id, { completed: newCompletedState });

            subtask.completed = newCompletedState;

            const activityLogData = {
                action: newCompletedState? "subtask_completed": "subtask_reverted",
                entity_type: "subtask",
                entity_id: subtask.id,
                description: newCompletedState? `Subtask completed: ${subtask.text}` : `Subtask reverted: ${subtask.text}`,
                member_id: app.getCurrentUserId(),
                workspace_id: app.currentWorkspace,
                task_id: this.currentTaskId
            };

            await API.activities.create(activityLogData);

            await this.loadActivityLogs(this.currentTaskId);
            this.renderLogTable();
            
            this.renderSubtasks(task.subtasks);

            const completedCount = task.subtasks.filter(st => st.completed).length;
            this.elements.subtaskStats.textContent = `${completedCount}/${task.subtasks.length}`;
            
            const message = newCompletedState ? 'Subtask completed!' : 'Subtask reopened!';
            const type = newCompletedState ? 'success' : 'info';
            this.showNotification(message, type);

        } catch (error) {
            console.error('Failed to toggle subtask:', error);
            this.showNotification('Failed to update subtask', 'error');
        }
    },

    /**
     * Edit subtask text with backend integration
     */
    async editSubtask(index) {
        const task = this.getCurrentTask();
        if (!task?.subtasks?.[index]) return;

        const currentText = task.subtasks[index].text;
        const newText = prompt('Edit subtask:', currentText);
        
        if (newText && newText.trim() && newText !== currentText) {
            try {
                const subtask = task.subtasks[index];
                
                // Update via backend
                await update_subtask_data(subtask.id, { text: newText.trim() });
                
                // Update local state
                subtask.text = newText.trim();
                
                this.renderSubtasks(task.subtasks);
                this.showNotification('Subtask updated!', 'success');

            } catch (error) {
                console.error('Failed to update subtask:', error);
                this.showNotification('Failed to update subtask', 'error');
            }
        }
    },

    /**
     * Delete subtask with backend integration
     */
    async deleteSubtask(index) {

        const task = await backendBridge.loadTaskDetails(this.currentTaskId);
        if (!task?.subtasks?.[index]) return;

        if (confirm('Are you sure you want to delete this subtask?')) {
            try {
                const subtask = task.subtasks[index];

                if (subtask) {
                    const activityLogData = {
                        action: "subtask_deleted",
                        entity_type: "subtask",
                        entity_id: subtask.id,
                        description: `Deleted subtask: ${subtask.text}`,
                        member_id: app.getCurrentUserId(),
                        workspace_id: app.currentWorkspace,
                        task_id: this.currentTaskId
                    };

                    await API.activities.create(activityLogData);

                    await API.subtasks.delete(subtask.id);
                    
                    await this.loadActivityLogs(this.currentTaskId);
                    this.renderLogTable();

                    task.subtasks.splice(index, 1);
    
                    this.renderSubtasks(task.subtasks);
                    this.showNotification('Subtask deleted!', 'success');
                }
                
            } catch (error) {
                console.error('Failed to delete subtask:', error);
                this.showNotification('Failed to delete subtask', 'error');
            }
        }
    },

    /**
     * Update task progress based on subtasks and status
     */
    updateProgress(newStatus) {
        let progress = 0;

        const statusProgress = {
            'not_started': 0,
            'in_progress': 25,
            'under_review': 75,
            'completed': 100,
            'on_hold': 10,
        };
        progress = statusProgress[newStatus] || 0;


        // Update progress bar
        this.elements.taskProgressBar.style.width = `${progress}%`;
        this.elements.taskProgressText.textContent = `${progress}%`;
    },

    /**
     * Render chat messages
     */
    async renderChat(messages) {
        const { elements } = this;

        if (!messages || messages.length === 0) {
            elements.chatMessages.innerHTML = `
                <div class="no-messages">
                    <div>No messages yet</div>
                    <div>Start the conversation!</div>
                </div>
            `;
            elements.messageCount.textContent = '0 messages';
            return;
        }

        elements.messageCount.textContent = `${messages.length} message${messages.length !== 1 ? 's' : ''}`;

        const messagesHtmlArray = await Promise.all(messages.map(async message => {
            debugger;
            const member = await API.members.get(message.author_id);
            const authorId = member?.id || 'Unknown';
            const authorName = member?.first_name && member?.last_name
                ? `${member.first_name} ${member.last_name}`
                : `User ${authorId}`;

            const time = this.getRelativeTime(message.created_at);
            const content = message.content || '';
            const initials = this.getInitials(authorName);
            const safeAuthor = this.escapeHtml(authorName);
            const safeContent = this.escapeHtml(content).replace(/\n/g, '<br>');
            const avatarUrl = `${BASE_URL}/member/${member.id}/profile-picture?t=${Date.now()}`;
            const safeAvatarUrl = this.escapeHtml(avatarUrl);
            const avatarColor = member.avatar_color;

            if (message.is_attachment) {
                return `
                    <div class="chat-message attachment-message">
                        <div class="assignee-avatar" style="background-color: ${avatarColor}; position: relative; overflow: hidden;">
                            <img src="${safeAvatarUrl}"
                                alt="${safeAuthor}"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                            <span style="display: none; color: ${this.getContrastColor(avatarColor)};">
                                ${initials}
                            </span>
                        </div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">${safeAuthor}</span>
                                <span class="message-time">${time}</span>
                            </div>
                            <div class="message-text">
                                <button class="attachment-download-btn" data-id="${message.id}">
                                    ${safeContent}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="chat-message">
                        <div class="assignee-avatar" style="background-color: ${avatarColor}; position: relative; overflow: hidden;">
                            <img src="${safeAvatarUrl}"
                                alt="${safeAuthor}"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                            <span style="display: none; color: ${this.getContrastColor(avatarColor)};">
                                ${initials}
                            </span>
                        </div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">${safeAuthor}</span>
                                <span class="message-time">${time}</span>
                            </div>
                            <div class="message-text">${safeContent}</div>
                        </div>
                    </div>
                `;
            }
        }));

        const messagesHtml = messagesHtmlArray.join('');
        elements.chatMessages.innerHTML = messagesHtml;

        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        elements.chatMessages.querySelectorAll('.attachment-download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attachmentId = e.currentTarget.dataset.id;
                this.downloadFile(attachmentId);
            });
        });
    },

    sendMessage: async function(isAttachment = false, attachmentId = null, attachmentName = null) {
        debugger;
        const { elements } = this;
        const text = elements.chatInput.value.trim();
        
        if (!text || text === "") return;

        const task = this.getCurrentTask();
        if (!task) return;


        try {
            elements.sendMessageBtn.disabled = true;
            elements.sendMessageBtn.textContent = 'Sending...';
            elements.chatInput.disabled = true;

            const messageData = {
                content: text,
                task_id: task.id,
                is_attachment: isAttachment
            };

            const newMessage = await API.messages.create(messageData, app.getCurrentUserId());
            
            if (newMessage) {
                elements.chatInput.value = '';
                
                const updatedMessages = await API.messages.getAll(task.id);

                if (isAttachment) {
                    const activityLogData = {
                        action: "attachment_uploaded",
                        entity_type: "attachment",
                        entity_id: attachmentId,
                        description: `Uploaded attachment: ${attachmentName}`,
                        member_id: app.getCurrentUserId(),
                        workspace_id: app.currentWorkspace,
                        task_id: this.currentTaskId
                    };

                    await API.activities.create(activityLogData);

                    await this.loadActivityLogs(this.currentTaskId);
                    this.renderLogTable();
                } else {
                    const activityLogData = {
                        action: "message_sent",
                        entity_type: "message",
                        entity_id: newMessage.id,
                        description: `Sent message: ${newMessage.content}`,
                        member_id: app.getCurrentUserId(),
                        workspace_id: app.currentWorkspace,
                        task_id: this.currentTaskId
                    };

                    await API.activities.create(activityLogData);

                    await this.loadActivityLogs(this.currentTaskId);
                    this.renderLogTable();
                }

                const member = await API.members.get(app.getCurrentUserId())
                
                task.comments = updatedMessages;
                await this.renderChat(task.comments);
                
                this.showNotification('Message sent!', 'success');
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            this.showNotification('Failed to send message', 'error');
        } finally {
            elements.sendMessageBtn.disabled = false;
            elements.sendMessageBtn.textContent = 'Send';
            elements.chatInput.disabled = false;
        }
    },

    /**
     * Fix for addSubtask function (same issue)
     */
    addSubtask: async function() {
        const { elements } = this;
        const text = elements.newSubtaskInput.value.trim();
        
        if (!text) return;


        const task = await backendBridge.loadTaskDetails(this.currentTaskId);
        if (!task) return;

        try {
            // Disable input while saving
            elements.addSubtaskBtn.disabled = true;
            elements.addSubtaskBtn.textContent = 'Adding...';
            elements.newSubtaskInput.disabled = true;

            const subtaskData = {
                text: text,
                task_id: task.id,
                completed: false
            };


            const newSubtask = await API.subtasks.create(subtaskData, app.getCurrentUserId());

            if (newSubtask) {
                elements.newSubtaskInput.value = '';
                
                const updatedSubtasks = await API.subtasks.getAll(task.id);
                task.subtasks = updatedSubtasks;

                const activityLogData = {
                    action: "subtask_added",
                    entity_type: "subtask",
                    entity_id: newSubtask.id,
                    description: `Added subtask: ${newSubtask.text}`,
                    member_id: app.getCurrentUserId(),
                    workspace_id: app.currentWorkspace,
                    task_id: this.currentTaskId
                };

                

                await API.activities.create(activityLogData);

                await this.loadActivityLogs(this.currentTaskId);
                this.renderLogTable();
                
                this.renderSubtasks(task.subtasks);
                this.showNotification('Subtask added!', 'success');
            }

        } catch (error) {
            console.error('Failed to create subtask:', error);
            this.showNotification('Failed to add subtask', 'error');
        } finally {
            // Re-enable controls
            elements.addSubtaskBtn.disabled = false;
            elements.addSubtaskBtn.textContent = 'Add';
            elements.newSubtaskInput.disabled = false;
        }
    },

    /**
     * Render assignees
     */
    renderAssignees(assignees) {
        const assigneesHtml = (assignees || []).map(assignee => {
            const avatarUrl = `${BASE_URL}/member/${assignee.id}/profile-picture?t=${Date.now()}`;
            const safeAvatarUrl = this.escapeHtml(avatarUrl);

            return assignee ? `
                <div class="assignee-item" style="background-color: ${this.lightenColor(assignee.avatar_color, 0.8)}; border: 1px solid ${this.lightenColor(assignee.avatar_color, 0.6)};">
                    <div class="assignee-avatar" style="background-color: ${assignee.avatar_color}; position: relative; overflow: hidden;">
                        <img src="${safeAvatarUrl}"
                            alt="${`${assignee.first_name} ${assignee.last_name}`}"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                            style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                        <span style="display: none; color: ${this.getContrastColor(assignee.avatar_color)};">
                            ${this.getInitials(`${assignee.first_name} ${assignee.last_name}`)}
                        </span>
                    </div>
                    <span class="assignee-name">${this.escapeHtml(`${assignee.first_name} ${assignee.last_name}`)}</span>
                    <button class="remove-assignee-btn" onclick="detailedTaskView.removeAssignee(${assignee.id})" title="Remove assignee">
                        ×
                    </button>
                </div>
            ` : '';
        }).join('');

        this.elements.taskAssignees.innerHTML = assigneesHtml || 
            '<div class="assignee-item">👤 No assignees</div>';
    },

    /**
     * Update status badge using settings manager
     */
    updateStatusBadge(status) {
        const badge = this.elements.taskStatusBadge;
        
        if (window.settingsManager) {
            const statusLabel = window.settingsManager.getStatusLabel(status);
            const statusColor = window.settingsManager.getStatusColor(status);
            
            badge.textContent = statusLabel;
            badge.style.backgroundColor = statusColor;
            badge.style.color = this.getContrastColor(statusColor);
        } else {
            // Fallback
            badge.textContent = this.formatStatus(status);
        }
        
        badge.className = `status-badge ${status}`;
    },

    /**
     * Auto-save task changes with backend integration
     */
    async autoSave() {
        const task = await backendBridge.loadTaskDetails(this.currentTaskId);
        if (!task) return;

        try {
            const { elements } = this;

            const updates = {
                title: elements.taskTitle.value,
                description: elements.taskDescription.value,
                start_date: elements.taskStartDate.value || null,
                end_date: elements.taskEndDate.value || null,
                status: elements.taskStatusSelect.value,
                time_spent_seconds: task.timeSpent || 0
            };

            const changedFields = {};

            const isDifferent = (a, b) => {
                // Normalize empty string and null
                if ((a === null && b === '') || (a === '' && b === null)) return false;
                return a !== b;
            };

            if (isDifferent(updates.description, task.description)) changedFields.description = { from: task.description, to: updates.description };
            if (isDifferent(updates.start_date, task.start_date)) changedFields.start_date = { from: task.start_date, to: updates.start_date };
            if (isDifferent(updates.end_date, task.end_date)) changedFields.end_date = { from: task.end_date, to: updates.end_date };
            if (isDifferent(updates.status, task.status)) changedFields.status = { from: task.status, to: updates.status };
            if ((updates.time_spent_seconds || 0) !== (task.timeSpent || 0)) {
                changedFields.time_spent_seconds = { from: task.timeSpent || 0, to: updates.time_spent_seconds };
            }

            if (Object.keys(changedFields).length === 0) {
                console.log('No meaningful changes detected.');
                return;
            }

            // Update the task
            await backendBridge.updateTask(this.currentTaskId, updates);

            // Log each meaningful change
            for (const [field, { from, to }] of Object.entries(changedFields)) {
                let description;
                const label = this.fieldLabels[field] || field;

                if (from === null || from === undefined || from === '') {
                    description = `${label} set to "${to}"`;
                } else if (to === null || to === undefined || to === '') {
                    description = `${label} cleared (was "${from}")`;
                } else {
                    description = `${label} changed from "${from}" to "${to}"`;
                }

                const activityLogData = {
                    action: `${label}_modified`,
                    entity_type: "task",
                    entity_id: app.currentTask,
                    title: `${label} modified`,
                    description,
                    member_id: app.getCurrentUserId(),
                    workspace_id: app.currentWorkspace,
                    task_id: app.currentTask
                };

                await API.activities.create(activityLogData);
            }

            // Refresh UI
            await this.loadActivityLogs(app.currentTask);
            this.renderLogTable();
            this.updateStatusBadge(updates.status);
            this.updateProgress(updates.status);
            this.elements.taskUpdated.textContent = this.formatDate(new Date().toISOString());

        } catch (error) {
            console.error('Auto-save failed:', error);
            this.showNotification('Failed to save changes', 'error');
        }
    },

    /**
     * Manual save
     */
    saveTask() {
        this.autoSave();
        this.showNotification('Task saved successfully!', 'success');
    },

    /**
     * Delete task with backend integration
     */
    async deleteTask() {
        debugger;
        const task = await backendBridge.loadTaskDetails(this.currentTaskId);
        console.log(task);
        
        if (!task) return;


        if (confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
            try {
                await deleteTaskWithState(task.id);

                this.showNotification('Task deleted successfully!', 'success');
                this.close();
                
                setTimeout(() => {
                    this.triggerViewRefresh(this.previousView);
                }, 100);

            } catch (error) {
                console.error('Failed to delete task:', error);
                this.showNotification('Failed to delete task', 'error');
            }
        }
    },

    // ============ UTILITY METHODS ============

    getCurrentTask() {
        return getTaskById(this.currentTaskId);
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    },

    getRelativeTime(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    },

    formatStatus(status) {
        const statusMap = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'under_review': 'Under Review',
            'completed': 'Completed',
            'on_hold': 'On Hold'
        };
        return statusMap[status] || status;
    },

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2);
    },

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

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showNotification(message, type = 'info') {        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#4a6fa5'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 600;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    },

    initFileUpload() {
        if (!domElements.chatForm || !domElements.messageInput || !domElements.fileInput || !domElements.chatBox) {
            console.warn('🚫 One or more chat elements not found');
            return;
        }

        domElements.fileInput.addEventListener('change', async () => {
            if (domElements.fileInput.files.length > 0) {
                console.log('📂 File attached:', domElements.fileInput.files[0].name);
                this.formData.append('task_id', app.currentTask);
                this.formData.append('user_id', app.getCurrentUserId());
                this.formData.append('workspace_id', app.currentWorkspace);
                this.formData.append('workflow_id', app.currentWorkflow);
                this.formData.append('attachment', domElements.fileInput.files[0]);
                domElements.messageInput.value = `Attachment - ${domElements.fileInput.files[0].name}`;

                try {
                    const response = await fetch('http://127.0.0.1:8000/api/messages', {
                        method: 'POST',
                        body: this.formData
                    });

                    if (!response.ok) throw new Error('Upload failed');

                    const result = await response.json();
                    this.sendMessage(true, result.attachment_id, domElements.fileInput.files[0].name);

                    console.log('✅ Upload success:', result);
                } catch (error) {
                    alert('Failed to send message.');
                    console.error('❌ Upload error:', error);
                }


                await this.populateFiles();
                this.renderTable();
            } else {
                console.log('📭 No file selected');
            }
        });
    },

    startCountUpTimer(created_atString) {
        const created_at = new Date(created_atString);

        const updateDisplay = (elapsedSeconds) => {
            const days = Math.floor(elapsedSeconds / (24 * 3600));
            elapsedSeconds %= 24 * 3600;

            const hours = Math.floor(elapsedSeconds / 3600);
            elapsedSeconds %= 3600;

            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;

            this.elements.timeSpent.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            const now = new Date();
            const elapsedSeconds = Math.floor((now - created_at) / 1000);
            updateDisplay.call(this, elapsedSeconds);
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    toDateInputValue(dateString) {
        if (!dateString) return '';
        const iso = new Date(dateString).toISOString();
        return iso.split('T')[0];
    },

    /**
     * Populates the extension filter with file extensions from the files member
     */
    populateExtensionFilter() {
        const extensions = [...new Set(this.files.map(file => file.extension))].sort();
        const filterSelect = domElements.extensionFilter;
        
        extensions.forEach(ext => {
            const option = document.createElement('option');
            option.value = ext;
            option.textContent = ext.toUpperCase();
            filterSelect.appendChild(option);
        });
    },

    /**
     * Creates an icon based on the extension name
     * @param {string} extension The extension name
     * @returns The created extension icon 
     */
    createFileIcon(extension) {
        const icon = document.createElement('div');
        icon.className = `file-icon ext-${extension}`;
        icon.textContent = extension.toUpperCase().substring(0, 3);
        return icon;
    },

    //TODO: fix formatting for files
    formatFileSize(size) {
        return size;
    },

    async populateFiles() {
        this.files = await API.attachments.getAll(this.currentTaskId);
        this.filteredFiles = [...this.files];
    },


    renderTable() {
        const tbody = domElements.fileTableBody;
        tbody.innerHTML = '';

        if (this.filteredFiles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-results">
                        <div class="no-results-icon">📄</div>
                        <div>No files found matching your criteria</div>
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredFiles.forEach(file => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.className = 'file-name';
            nameCell.appendChild(this.createFileIcon(file.extension));
            nameCell.appendChild(document.createTextNode(file.name));
            
            const extCell = document.createElement('td');
            extCell.innerHTML = `<span class="extension">${file.extension}</span>`;

            const memberCell = document.createElement('td'); 
            memberCell.className = 'user-name';
            memberCell.textContent = file.member_name || 'Unknown'; 
                
            const sizeCell = document.createElement('td');
            sizeCell.className = 'size';
            sizeCell.textContent = this.formatFileSize(file.size);
            
            const actionCell = document.createElement('td');
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.innerHTML = 'Download';
            downloadBtn.onclick = () => this.downloadFile(file.id);
            actionCell.appendChild(downloadBtn);
            
            row.appendChild(nameCell);
            row.appendChild(extCell);
            row.appendChild(memberCell)
            row.appendChild(sizeCell);
            row.appendChild(actionCell);
            
            tbody.appendChild(row);
        });
    },

    downloadFile(attachment_id) {
        if (!attachment_id) {
            alert('Missing attachment ID - cannot download.');
            return;
        }

        window.open(`http://localhost:8000/attachments/${attachment_id}/download`, '_blank');
    },


    filterFiles() {
        const searchTerm = domElements.searchInput.value.toLowerCase();
        const selectedExtension = domElements.extensionFilter.value;
        
        this.filteredFiles = this.files.filter(file => {
            const matchesSearch = file.name.toLowerCase().includes(searchTerm);
            const matchesExtension = selectedExtension === '' || file.extension === selectedExtension;
            return matchesSearch && matchesExtension;
        });

        console.log(this.filteredFiles);
        
        this.renderTable();
        this.updateFileCount();
    },

    updateFileCount() {
        const count = this.filteredFiles.length;
        const fileCount = domElements.fileCount;
        fileCount.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    },

    addEventListeners() {
        domElements.searchInput.addEventListener('input', () => this.filterFiles());
        domElements.extensionFilter.addEventListener('change', () => this.filterFiles());
    },

    initFileManager() {
        this.populateExtensionFilter();
        this.renderTable();
        this.updateFileCount();
        this.addEventListeners();
    },

    async populateAssigneeDropdown() {
        this.elements.assigneeDropdown.innerHTML = '';
        
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        placeholderOption.textContent = 'Add assignee...';
        this.elements.assigneeDropdown.appendChild(placeholderOption);
        
        const members = await API.members.getAll();

        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.first_name} ${member.last_name}`;
            this.elements.assigneeDropdown.appendChild(option);
        });
    },

    async removeAssignee(assigneeId) {
        const task = await backendBridge.loadTaskDetails(this.currentTaskId);
        if (!task) return;

        try {
            await API.tasks.unassign(task.id, assigneeId);
            
            task.assignees = task.assignees.filter(assignee => assignee.id !== assigneeId);

            const assignee = await API.members.get(assigneeId);
            
            const activityLogData = {
                action: "member_unassigned",
                entity_type: "member",
                entity_id: assigneeId,
                description: `Unassigned member: ${assignee.first_name} ${assignee.last_name}`,
                member_id: app.getCurrentUserId(),
                workspace_id: app.currentWorkspace,
                task_id: this.currentTaskId
            };

            await API.activities.create(activityLogData);

            await this.loadActivityLogs(this.currentTaskId);
            this.renderLogTable();

            this.renderAssignees(task.assignees);
            this.showNotification('Assignee removed!', 'success');
            
        } catch (error) {
            console.error('Failed to remove assignee:', error);
            this.showNotification('Failed to remove assignee', 'error');
        }
    },

    lightenColor(color, amount) {
        color = color.replace('#', '');
        
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        const newR = Math.round(r + (255 - r) * amount);
        const newG = Math.round(g + (255 - g) * amount);
        const newB = Math.round(b + (255 - b) * amount);
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    },

    /**
     * Load activity logs for the current task
     */
    async loadActivityLogs(taskId) {
        try {
            this.activityLogs = await backendBridge.loadTaskLogs(taskId);
            console.log(this.activityLogs);
            
            this.filteredLogs = [...this.activityLogs];

            this.updateLogCount();
        } catch (error) {
            console.error('Failed to load activity logs:', error);
            this.activityLogs = [];
            this.filteredLogs = [];
        }
    },

    /**
     * Initialize the log manager
     */
    initLogManager() {
        this.renderLogTable();
        this.updateLogCount();
        this.addLogEventListeners();
    },

    /**
     * Render the activity log table
     */
    renderLogTable() {
        const tbody = domElements.logTableBody;
        tbody.innerHTML = '';

        if (this.filteredLogs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-results">
                        <div class="no-results-icon">📋</div>
                        <div>No activity found</div>
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredLogs.forEach(log => {
            const row = document.createElement('tr');
            
            const actionCell = document.createElement('td');
            actionCell.className = 'log-action';
            actionCell.innerHTML = this.formatActionText(log.action);

            const detailsCell = document.createElement('td');
            detailsCell.className = 'log-details';
            detailsCell.textContent = log.description || '-';

            const userCell = document.createElement('td');
            userCell.className = 'log-user';

            const avatarUrl = `${BASE_URL}/member/${log.member_id}/profile-picture?t=${Date.now()}`;
            const safeAvatarUrl = this.escapeHtml(avatarUrl);

            if (log.member_name && log.member_avatar_color) {
                const initials = this.getInitials(log.member_name);
                userCell.innerHTML = `
                    <div class="assignee-avatar" style="background-color: ${log.member_avatar_color}; position: relative; overflow: hidden;">
                        <img src="${safeAvatarUrl}"
                            alt="${log.member_name}"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                            style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                        <span style="display: none; color: ${this.getContrastColor(log.member_avatar_color)};">
                            ${initials}
                        </span>
                    </div>
                `;
            } else if (log.member_name) {
                const initials = this.getInitials(log.member_name);
                userCell.innerHTML = `
                    <div class="assignee-avatar log-user-avatar" 
                        style="background-color: #4a6fa5" 
                        title="${log.member_name}">
                        ${initials}
                    </div>
                `;
            }

            const timeCell = document.createElement('td');
            timeCell.className = 'log-time';
            timeCell.textContent = this.formatLogTime(log.created_at);
            
            row.appendChild(actionCell);
            row.appendChild(detailsCell);
            row.appendChild(userCell);
            row.appendChild(timeCell);
            
            tbody.appendChild(row);
        });
    },

    /**
     * Format log timestamp
     */
    formatLogTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffHours < 168) { // Less than a week
            return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    },

    /**
     * Format action text
     */
    formatActionText(action) {
        const texts = {
            'task_created': 'Task Created',
            'task_updated': 'Task Updated',
            'status_changed': 'Status Changed',
            'assignee_added': 'Assignee Added',
            'assignee_removed': 'Assignee Removed',
            'subtask_added': 'Subtask Added',
            'subtask_completed': 'Subtask Completed',
            'comment_added': 'Comment Added',
            'file_uploaded': 'File Uploaded'
        };
        return texts[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * Filter activity logs
     */
    filterLogs() {
        const searchTerm = domElements.logSearchInput.value.toLowerCase();
        const selectedType = domElements.logTypeFilter.value;
        
        this.filteredLogs = this.activityLogs.filter(log => {
            const matchesSearch = log.details?.toLowerCase().includes(searchTerm) || 
                                log.user_name?.toLowerCase().includes(searchTerm) ||
                                this.formatActionText(log.action).toLowerCase().includes(searchTerm);
            const matchesType = selectedType === '' || log.action === selectedType;
            return matchesSearch && matchesType;
        });
        
        this.renderLogTable();
        this.updateLogCount();
    },
    /**
     * Update log count display
     */
    updateLogCount() {
        const count = this.filteredLogs.length;
        domElements.logCount.textContent = `${count} activit${count !== 1 ? 'ies' : 'y'}`;
    },

    /**
     * Add event listeners for log functionality
     */
    addLogEventListeners() {
        domElements.logSearchInput?.addEventListener('input', () => this.filterLogs());
        domElements.logTypeFilter?.addEventListener('change', () => this.filterLogs());
    },

    /**
     * Add a new activity log entry (call this when actions happen)
     */
    async addActivityLog(action, details, userId = null) {
        try {
            const logEntry = {
                task_id: this.currentTaskId,
                action: action,
                details: details,
                user_id: userId || app.getCurrentUserId(),
                created_at: new Date().toISOString()
            };

            // Send to backend (replace with your actual API call)
            const savedLog = await API.activityLogs.create(logEntry);
            
            if (savedLog) {
                // Add to local arrays
                this.activityLogs.unshift(savedLog);
                this.filteredLogs = [...this.activityLogs];
                
                // Re-render the table
                this.renderLogTable();
                this.updateLogCount();
            }
        } catch (error) {
            console.error('Failed to add activity log:', error);
        }
    },
};

window.detailedTaskView = detailedTaskView;
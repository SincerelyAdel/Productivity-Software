// Kanban view functionality - Fixed for backend integration compatibility

const kanbanView = {
    // Column definitions - now dynamic, will be updated from settings
    columns: [
        { id: 'not_started', title: 'Not Started', color: '#95a5a6' },
        { id: 'in_progress', title: 'In Progress', color: '#4a6fa5' },
        { id: 'under_review', title: 'Under Review', color: '#f39c12' },
        { id: 'completed', title: 'Completed', color: '#2ecc71' },
        { id: 'on_hold', title: 'On Hold', color: '#e74c3c' }
    ],

    
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

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2);
    },

    /**
     * Update columns from settings manager and handle orphaned tasks - FIXED ASYNC
     */
    updateColumnsFromSettings: async function() {
        if (window.settingsManager && window.settingsManager.getCurrentStatusTemplate) {
            const template = window.settingsManager.getCurrentStatusTemplate();
            const newColumns = template.statuses.map(status => ({
                id: status.key,
                title: status.label,
                color: status.color,
                special: status.special || false,
                approvalRequired: status.approvalRequired || 0
            }));

            // Check for orphaned tasks and handle them - NOW PROPERLY AWAITED
            await this.handleOrphanedTasks(newColumns);
            
            this.columns = newColumns;
        }
    },

    /**
     * Handle tasks that have statuses not in the new template - FIXED ASYNC
     */
    handleOrphanedTasks: async function(newColumns) {
        try {
            
            const allTasks = app.currentWorkflowTasks;
            
            if (!Array.isArray(allTasks)) {
                console.warn('Tasks data is not an array:', allTasks);
                return;

            }
            const newStatusKeys = newColumns.map(col => col.id);
            const orphanedTasks = allTasks.filter(task => !newStatusKeys.includes(task.status));

            if (orphanedTasks.length > 0) {
                for (const task of app.currentWorkflowTasks) {
                    try {
                        await backendBridge.updateTask(task.id, {status: 'needs_redistribution'});
                        task.status = "needs_redistribution";
                    } catch (error) {
                        console.error('Failed to update orphaned task:', task.id, error);
                    }
                }

                this.showNotification(
                    `${orphanedTasks.length} task${orphanedTasks.length > 1 ? 's' : ''} moved to "Needs Redistribution" column`, 
                    'info'
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to handle orphaned tasks:', error);
        }
    },

    /**
     * Get current columns (with fallback to default and temporary column if needed) - FIXED ASYNC
     */
    getColumns: async function() {
        // await this.updateColumnsFromSettings();
        
        let allTasks = [];
        try {
            allTasks = app.currentWorkflowTasks;
            if (!Array.isArray(allTasks)) {
                console.warn('Tasks data is not an array, defaulting to empty array');
                allTasks = [];
            }
        } catch (error) {
            console.error('Failed to get tasks for column check:', error);
            allTasks = [];
        }
        
        const redistributionTasks = allTasks.filter(task => task.status === 'needs_redistribution');
        
        let columns = [...this.columns];
        
        if (redistributionTasks.length > 0) {
            const tempColumn = {
                id: 'needs_redistribution',
                title: 'Needs Redistribution',
                color: '#95a5a6',
                special: false,
                temporary: true
            };

            columns.unshift(tempColumn);
        }
        
        return columns;
    },

    /**
     * Create a task card element
     */
    createTaskCard(task) {
        const card = domUtils.createElement('div', 'task-card', { 'data-task-id': task.id });
        
        const assigneeAvatars = (task.assignees || []).map(assignee => {
            if (assignee) {
                const avatarUrl = `${BASE_URL}/member/${assignee.id}/profile-picture?t=${Date.now()}`;
                const safeAvatarUrl = this.escapeHtml(avatarUrl);

                return `
                    <div class="assignee-avatar" style="background-color: ${assignee.avatar_color}; position: relative; overflow: hidden;">
                        <img src="${safeAvatarUrl}"
                            alt="${`${assignee.first_name} ${assignee.last_name}`}"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                            style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                        <span style="display: none; color: ${this.getContrastColor(assignee.avatar_color)};">
                            ${this.getInitials(`${assignee.first_name} ${assignee.last_name}`)}
                        </span>
                    </div>
                `;
            }
            return '';
        }).join('');

        // Get priority and due date info
        const priority = getTaskPriority ? getTaskPriority(task) : 'normal';
        const dueDateText = task.endDate ? formatDate(task.endDate) : '';
        // const isOverdue = priority === 'overdue';
        // const isUrgent = priority === 'high';

        const isOverdue = true;
        const isUrgent = true;

        // Check if current status is special (requires approval)
        const currentColumn = kanbanView.columns.find(col => col.id === task.status);
        const isSpecialStatus = currentColumn && currentColumn.special;

        // Check if task is being created (optimistic update)
        const isCreating = task.isCreating || false;

        card.innerHTML = `
            <div class="task-header">
                <div class="task-title">${sanitizeHTML(task.title)}</div>
                ${isCreating ? '<span class="priority-badge creating">Creating...</span>' : ''}
                ${isOverdue && !isCreating ? '<span class="priority-badge overdue">Overdue</span>' : ''}
                ${isUrgent && !isOverdue && !isCreating ? '<span class="priority-badge urgent">Urgent</span>' : ''}
                ${isSpecialStatus && !isCreating ? '<span class="priority-badge special">Approval Required</span>' : ''}
            </div>
            ${task.description ? `<div class="task-description">${sanitizeHTML(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            <div class="task-meta">
                <div class="task-assignees">${assigneeAvatars}</div>
                <div class="task-due-date ${priority === 'overdue' ? 'overdue' : priority === 'high' ? 'urgent' : ''}">${dueDateText}</div>
            </div>
            ${task.comments && task.comments.length > 0 ? `<div class="task-stats"><span class="comment-count">${task.comments.length} comment${task.comments.length > 1 ? 's' : ''}</span></div>` : ''}
        `;

        // Add click event (only if not being created)
        if (!isCreating) {
            card.addEventListener('click', async () => {
                try {
                    // Load detailed task data and open detailed view
                    await loadTaskDetails(task.id);
                    if (window.detailedTaskView && window.detailedTaskView.open) {
                        window.detailedTaskView.open(task.id, 'kanban');
                    }
                } catch (error) {
                    console.error('Failed to open task details:', error);
                    kanbanView.showNotification('Failed to load task details', 'error');
                }
            });
        }

        // Add drag functionality (basic implementation, only if not being created)
        if (!isCreating) {
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.id.toString());
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        } else {
            card.classList.add('creating');
        }

        return card;
    },

    /**
     * Create a kanban column
     */
    createColumn: (columnDef, tasks) => {
        const column = domUtils.createElement('div', 'kanban-column', { 'data-status': columnDef.id });
        
        // Special status indicator
        const specialIndicator = columnDef.special ? 
            `<div class="column-special-indicator" title="This status requires approval">
                <span class="approval-icon">✓</span>
                ${columnDef.approvalRequired ? columnDef.approvalRequired : ''}
            </div>` : '';

        // Temporary column indicator
        const temporaryIndicator = columnDef.temporary ? 
            `<div class="column-temporary-indicator" title="This is a temporary column for task redistribution">
                <span class="temp-icon">⚠</span>
                Temporary
            </div>` : '';
        
        // Different styling and content for temporary column
        const isTemporary = columnDef.temporary;
        const columnClass = isTemporary ? 'kanban-column temporary-column' : 'kanban-column';
        column.className = columnClass;
        
        const addTaskSection = !isTemporary ? 
            `<div class="add-task-quick">
                <button class="add-task-btn" onclick="kanbanView.showQuickAddTask('${columnDef.id}')">
                    + Add task
                </button>
            </div>` : 
            `<div class="redistribution-help">
                <p class="redistribution-text">Drag these tasks to appropriate columns. This column will disappear when empty.</p>
            </div>`;
        
        column.innerHTML = `
            <div class="column-header" style="border-top: 3px solid ${columnDef.color}">
                <div class="column-title-container">
                    <span class="column-title">${columnDef.title}</span>
                    ${specialIndicator}
                    ${temporaryIndicator}
                </div>
                <span class="task-count">${tasks.length}</span>
            </div>
            <div class="task-list" id="tasks-${columnDef.id}">
                <!-- Tasks will be added here -->
            </div>
            ${addTaskSection}
        `;

        const taskList = column.querySelector('.task-list');
        
        // Add tasks to column
        tasks.forEach(task => {
            const taskCard = kanbanView.createTaskCard(task);
            taskList.appendChild(taskCard);
        });

        // Add drop functionality
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            taskList.classList.add('drag-over');
        });

        taskList.addEventListener('dragleave', () => {
            taskList.classList.remove('drag-over');
        });

        taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            taskList.classList.remove('drag-over');
            
            const taskId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStatus = columnDef.id;
            
            kanbanView.moveTask(taskId, newStatus);
        });

        return column;
    },

    /**
     * Move task to different status with backend integration - FIXED: Use async getTaskById
     */
    moveTask: async (taskId, newStatus) => {
        try {
            const task = await backendBridge.loadTask(taskId);
            if (!task) {
                console.error('Task not found:', taskId);
                return;
            }

            const oldStatus = task.status;
            if (oldStatus === newStatus) return;

            // Prevent moving tasks TO the temporary redistribution column
            if (newStatus === 'needs_redistribution') {
                kanbanView.showNotification('Cannot move tasks to the redistribution column', 'error');
                return;
            }

            // Update task status with backend integration
            await updateTaskWithState(taskId, { status: newStatus });

            // Show notification
            const oldColumnTitle = oldStatus === 'needs_redistribution' ? 'Needs Redistribution' : 
                                  (kanbanView.columns.find(col => col.id === oldStatus)?.title || oldStatus);
            const newColumnTitle = kanbanView.columns.find(col => col.id === newStatus)?.title || newStatus;
            
            if (oldStatus === 'needs_redistribution') {
                kanbanView.showNotification(`Task redistributed to "${newColumnTitle}"`);
            } else {
                kanbanView.showNotification(`Task moved from "${oldColumnTitle}" to "${newColumnTitle}"`);
            }

            // Re-render kanban view (this will hide temporary column if it's now empty)
            await kanbanView.render();

        } catch (error) {
            console.error('Failed to move task:', error);
            kanbanView.showNotification('Failed to move task', 'error');
        }
    },

    /**
     * Show quick add task form
     */
    showQuickAddTask: (status) => {
        const column = document.querySelector(`[data-status="${status}"] .task-list`);
        if (!column) return;

        // Remove existing quick add forms
        document.querySelectorAll('.quick-add-form').forEach(form => form.remove());

        const quickAddForm = domUtils.createElement('div', 'quick-add-form');
        quickAddForm.innerHTML = `
            <input type="text" class="quick-task-input" placeholder="Enter task title..." maxlength="100">
            <div class="quick-add-actions">
                <button class="save-quick-task" onclick="kanbanView.saveQuickTask('${status}', this)">Add</button>
                <button class="cancel-quick-task" onclick="kanbanView.cancelQuickTask(this)">Cancel</button>
            </div>
        `;

        column.appendChild(quickAddForm);
        
        const input = quickAddForm.querySelector('.quick-task-input');
        input.focus();

        // Handle enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                kanbanView.saveQuickTask(status, quickAddForm.querySelector('.save-quick-task'));
            }
        });

        // Handle escape key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                kanbanView.cancelQuickTask(quickAddForm.querySelector('.cancel-quick-task'));
            }
        });
    },

    /**
     * Save quick add task with backend integration
     */
    saveQuickTask: async (status, button) => {
        const form = button.closest('.quick-add-form');
        const input = form.querySelector('.quick-task-input');
        const title = input.value.trim();

        if (!title) {
            input.focus();
            return;
        }

        try {
            // Disable button while saving
            button.disabled = true;
            button.textContent = 'Adding...';

            const taskData = {
                title: title,
                status: status,
                startDate: new Date().toISOString().split('T')[0],
                workflow_id: app.currentWorkflow
            };

            // Create new task with backend integration
            const newTask = await createTaskWithState(taskData, app.getCurrentUserId());

            if (newTask) {
                kanbanView.showNotification('Task added successfully');
                form.remove();
                await kanbanView.render(); // Re-render with fresh data
            }

        } catch (error) {
            console.error('Failed to create quick task:', error);
            kanbanView.showNotification('Failed to create task', 'error');
            
            // Re-enable button on error
            button.disabled = false;
            button.textContent = 'Add';
        }
    },

    /**
     * Cancel quick add task
     */
    cancelQuickTask: (button) => {
        const form = button.closest('.quick-add-form');
        form.remove();
    },

    /**
     * Show notification
     */
    showNotification: (message, type = 'success') => {
        // Remove existing notifications
        document.querySelectorAll('.kanban-notification').forEach(n => n.remove());

        const notification = domUtils.createElement('div', `kanban-notification ${type}`);
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Filter tasks by search term
     */
    filterTasks: (tasks, searchTerm) => {
        if (!searchTerm) return tasks;

        const term = searchTerm.toLowerCase();
        return tasks.filter(task => 
            task.title.toLowerCase().includes(term) ||
            (task.description && task.description.toLowerCase().includes(term))
            // Note: Removed assignee filtering since it would require async team member lookup
        );
    },

    /**
     * Sort tasks within columns
     */
    sortTasks: (tasks, sortBy = 'created') => {
        const sortFunctions = {
            created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            priority: (a, b) => {
                const priorityOrder = { overdue: 0, high: 1, medium: 2, low: 3 };
                const aPriority = getTaskPriority ? getTaskPriority(a) : 'medium';
                const bPriority = getTaskPriority ? getTaskPriority(b) : 'medium';
                return priorityOrder[aPriority] - priorityOrder[bPriority];
            },
            dueDate: (a, b) => {
                if (!a.endDate && !b.endDate) return 0;
                if (!a.endDate) return 1;
                if (!b.endDate) return -1;
                return new Date(a.endDate) - new Date(b.endDate);
            }
        };

        return [...tasks].sort(sortFunctions[sortBy] || sortFunctions.created);
    },

    /**
     * Get task statistics
     */
    getTaskStats: (tasks) => {
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            overdue: tasks.filter(t => getTaskPriority && getTaskPriority(t) === 'overdue').length,
            urgent: tasks.filter(t => getTaskPriority && getTaskPriority(t) === 'high').length
        };
    },

    /**
     * Main render function for Kanban view - No loading states
     */
    render: async function() {
        if (!domElements.kanbanBoard) {
            console.error('Kanban board DOM element not found');
            return;
        }
        
        try {
            if (!app.currentWorkflow) {
                domUtils.clearChildren(domElements.kanbanBoard);
                domUtils.showEmptyState(domElements.kanbanBoard, 'No project selected');
                return;
            }

            const [allTasks, currentColumns] = await Promise.all([
                get_tasks_data(app.currentWorkflow),
                this.getColumns()
            ]);
            
            domUtils.clearChildren(domElements.kanbanBoard);
            
            if (!Array.isArray(allTasks)) {
                console.error('Tasks data is not an array:', allTasks);
                domUtils.showError(domElements.kanbanBoard, 'Invalid tasks data received');
                return;
            }
            
            if (allTasks.length === 0) {
                domUtils.showEmptyState(domElements.kanbanBoard, 'No tasks available. Click "Add Task" to get started!');
                return;
            }

            // Create columns
            currentColumns.forEach(columnDef => {
                const columnTasks = allTasks.filter(task => task.status === columnDef.id);
                const sortedTasks = this.sortTasks(columnTasks, 'priority');
                const column = this.createColumn(columnDef, sortedTasks);
                domElements.kanbanBoard.appendChild(column);
            });

            
        } catch (error) {
            console.error('❌ Failed to render kanban view:', error);
            domUtils.clearChildren(domElements.kanbanBoard);
            domUtils.showError(domElements.kanbanBoard, 'Failed to load tasks. Please try again.');
        }
    },

    /**
     * Refresh kanban view (called from settings manager) - FIXED ASYNC
     */
    refresh: async function() {
        await this.render();
    },

    /**
     * Initialize Kanban view - FIXED ASYNC
     */
    init: async function() {
        if (!sessionStorage.getItem("access_token")) return;
        // Update columns from settings on init - NOW PROPERLY AWAITED
        await this.updateColumnsFromSettings();
        
        // Add CSS for kanban-specific styles
        if (!document.getElementById('kanbanStyles')) {
            const style = document.createElement('style');
            style.id = 'kanbanStyles';
            style.textContent = `
                .kanban-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2ecc71;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 6px;
                    z-index: 1001;
                    animation: slideIn 0.3s ease-out;
                }
                
                .kanban-notification.error {
                    background: #e74c3c;
                }
                
                .kanban-notification.info {
                    background: #4a6fa5;
                }
                
                .kanban-notification.fade-out {
                    animation: slideOut 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                
                .task-card.dragging {
                    opacity: 0.5;
                    transform: rotate(5deg);
                }
                
                .task-card.creating {
                    opacity: 0.7;
                    border: 2px dashed #4a6fa5;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 0.7; }
                    50% { opacity: 0.9; }
                    100% { opacity: 0.7; }
                }
                
                .task-list.drag-over {
                    background-color: #f0f8ff;
                    border: 2px dashed #4a6fa5;
                    border-radius: 8px;
                }
                
                .loading-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    font-size: 16px;
                    color: #666;
                }
                
                .error-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    font-size: 16px;
                    color: #e74c3c;
                    text-align: center;
                }
                
                .empty-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    font-size: 16px;
                    color: #999;
                    text-align: center;
                }
                
                .quick-add-form {
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    margin-top: 10px;
                }
                
                .quick-task-input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-bottom: 8px;
                }
                
                .quick-add-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .quick-add-actions button {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .quick-add-actions button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .save-quick-task {
                    background: #4a6fa5;
                    color: white;
                }
                
                .cancel-quick-task {
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                }
                
                .add-task-quick {
                    margin-top: 10px;
                }
                
                .add-task-btn {
                    width: 100%;
                    padding: 8px;
                    background: transparent;
                    border: 2px dashed #ddd;
                    border-radius: 6px;
                    cursor: pointer;
                    color: #666;
                    transition: all 0.2s;
                }
                
                .add-task-btn:hover {
                    border-color: #4a6fa5;
                    color: #4a6fa5;
                }
                
                .priority-badge {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                
                .priority-badge.overdue {
                    background: #fee;
                    color: #e74c3c;
                }
                
                .priority-badge.urgent {
                    background: #fff3cd;
                    color: #f39c12;
                }
                
                .priority-badge.special {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                
                .priority-badge.creating {
                    background: #e8f4fd;
                    color: #4a6fa5;
                    animation: pulse 1.5s infinite;
                }
                
                .task-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                
                .task-description {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 8px;
                    line-height: 1.4;
                }
                
                .task-stats {
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #f0f0f0;
                }
                
                .comment-count {
                    font-size: 11px;
                    color: #999;
                }
                
                .task-due-date.overdue {
                    color: #e74c3c;
                    font-weight: 600;
                }
                
                .task-due-date.urgent {
                    color: #f39c12;
                    font-weight: 600;
                }
                
                .column-title-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .column-special-indicator {
                    display: flex;
                    align-items: center;
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 600;
                }
                
                .approval-icon {
                    margin-right: 2px;
                }
                
                .temporary-column {
                    background: #fff9e6 !important;
                    border: 2px dashed #f39c12 !important;
                    position: relative;
                }
                
                .temporary-column::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: repeating-linear-gradient(
                        90deg,
                        #f39c12,
                        #f39c12 10px,
                        #fff 10px,
                        #fff 20px
                    );
                }
                
                .column-temporary-indicator {
                    display: flex;
                    align-items: center;
                    background: #fff3cd;
                    color: #856404;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 600;
                    border: 1px solid #f39c12;
                }
                
                .temp-icon {
                    margin-right: 2px;
                }
                
                .redistribution-help {
                    margin-top: 10px;
                    padding: 10px;
                    background: #fff3cd;
                    border: 1px solid #f39c12;
                    border-radius: 6px;
                }
                
                .redistribution-text {
                    margin: 0;
                    font-size: 12px;
                    color: #856404;
                    text-align: center;
                    line-height: 1.4;
                }
                
                .temporary-column .task-card {
                    border-left: 3px solid #f39c12;
                    background: #fffbf0;
                }
                
                .temporary-column .column-header {
                    background: #fff3cd;
                }
            `;
            document.head.appendChild(style);
        }
    },
};

// Create a simple minimal app object if it doesn't exist
if (typeof app === 'undefined') {
    window.app = {
        currentProjectId: null,
        getCurrentUserId: () => 1 // Default user ID
    };
}

// Create minimal utility functions if they don't exist
if (typeof getTaskPriority === 'undefined') {
    window.getTaskPriority = function(task) {
        if (!task || !task.endDate) return 'low';
        
        const dueDate = new Date(task.endDate);
        const today = new Date();
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0 && task.status !== 'completed') {
            return 'overdue';
        } else if (diffDays <= 2 && task.status !== 'completed') {
            return 'high';
        } else if (diffDays <= 7) {
            return 'medium';
        }
        
        return 'low';
    };
}

if (typeof formatDate === 'undefined') {
    window.formatDate = function(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };
}

if (typeof getInitials === 'undefined') {
    window.getInitials = function(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
    };
}

if (typeof sanitizeHTML === 'undefined') {
    window.sanitizeHTML = function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
}

// Export for global access
window.kanbanView = kanbanView;
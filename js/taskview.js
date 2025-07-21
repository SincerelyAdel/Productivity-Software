// Task list view functionality

const taskView = {
    // Current sort and filter settings
    currentSort: 'created',
    currentSortDirection: 'desc',
    currentFilter: 'all',
    searchTerm: '',


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
     * Create table header with sorting
     */
    createTableHeader: () => {
        const sortIcon = (column) => {
            if (taskView.currentSort !== column) return '';
            return taskView.currentSortDirection === 'asc' ? ' ↑' : ' ↓';
        };

        return `
            <thead>
                <tr>
                    <th onclick="taskView.sortBy('title')" class="sortable">
                        Task${sortIcon('title')}
                    </th>
                    <th onclick="taskView.sortBy('status')" class="sortable">
                        Status${sortIcon('status')}
                    </th>
                    <th onclick="taskView.sortBy('priority')" class="sortable">
                        Priority${sortIcon('priority')}
                    </th>
                    <th onclick="taskView.sortBy('assignee')" class="sortable">
                        Assignees${sortIcon('assignee')}
                    </th>
                    <th onclick="taskView.sortBy('startDate')" class="sortable">
                        Start Date${sortIcon('startDate')}
                    </th>
                    <th onclick="taskView.sortBy('endDate')" class="sortable">
                        Due Date${sortIcon('endDate')}
                    </th>
                    <th>Actions</th>
                </tr>
            </thead>
        `;
    },

    /**
     * Create table row for a task
     */
    createTaskRow(task) {
        const priority = getTaskPriority(task);
        const priorityClass = priority === 'overdue' ? 'overdue' : priority === 'high' ? 'urgent' : priority;
        
        // Get assignee avatars
        const assigneeAvatars = task.assignees.map(assignee => {
            const avatarUrl = `${BASE_URL}/member/${assignee.id}/profile-picture?t=${Date.now()}`;
            const initials = getInitials(`${assignee.first_name} ${assignee.last_name}`);
            const safeAvatarUrl = this.escapeHtml(avatarUrl);
            const safeName = sanitizeHTML(`${assignee.first_name} ${assignee.last_name}`);

            return assignee ? `
                <div class="assignee-avatar" style="background-color: ${assignee.avatar_color}; position: relative; overflow: hidden;">
                    <img src="${safeAvatarUrl}"
                        alt="${safeName}"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                        style="display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                    <span style="display: none; color: ${this.getContrastColor(assignee.avatar_color)};">
                        ${initials}
                    </span>
                </div>
            ` : '';
        }).join('');

        const progress = calculateTaskProgress(task);

        return `
            <tr onclick="detailedTaskView.open(${task.id}, 'task')" class="task-row ${priorityClass}" data-task-id="${task.id}">
                <td class="task-title-cell">
                    <div class="task-title-container">
                        <div class="task-title">${sanitizeHTML(task.title)}</div>
                        ${task.description ? `<div class="task-description-preview">${sanitizeHTML(task.description.substring(0, 80))}${task.description.length > 80 ? '...' : ''}</div>` : ''}
                        <div class="task-progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${getStatusColorClass(task.status)}">
                        ${formatStatus(task.status)}
                    </span>
                </td>
                <td>
                    <span class="priority-badge ${priorityClass}">
                        ${priority === 'overdue' ? 'Overdue' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                </td>
                <td>
                    <div class="assignees-cell">
                        <div class="task-assignees">${assigneeAvatars}</div>
                    </div>
                </td>
                <td class="date-cell">
                    ${task.startDate ? formatDate(task.startDate) : '-'}
                </td>
                <td class="date-cell ${priorityClass}">
                    ${task.endDate ? formatDate(task.endDate) : '-'}
                </td>
                <td class="actions-cell">
                    <div class="task-actions">
                        <button onclick="event.stopPropagation(); taskView.quickEdit(${task.id})" class="action-btn edit" title="Quick Edit">
                            ✏️
                        </button>
                        <button onclick="event.stopPropagation(); taskView.deleteTask(${task.id})" class="action-btn delete" title="Delete Task">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Create filter and search controls
     */
    createControls: () => {
        const stats = app.currentWorkflow ? taskView.getTaskStats(app.currentWorkflowTasks) : {};

        return `
            <div class="task-view-controls">
                <div class="search-controls">
                    <input type="text" id="taskSearch" placeholder="Search tasks..." value="${taskView.searchTerm}">
                    <button onclick="taskView.clearSearch()" class="clear-search">Clear</button>
                </div>
                
                <div class="filter-controls">
                    <select id="statusFilter" onchange="taskView.filterBy(this.value)">
                        <option value="all" ${taskView.currentFilter === 'all' ? 'selected' : ''}>All Tasks (${stats.total || 0})</option>
                        <option value="not_started" ${taskView.currentFilter === 'not_started' ? 'selected' : ''}>Not Started (${stats.notStarted || 0})</option>
                        <option value="in_progress" ${taskView.currentFilter === 'in_progress' ? 'selected' : ''}>In Progress (${stats.inProgress || 0})</option>
                        <option value="under_review" ${taskView.currentFilter === 'under_review' ? 'selected' : ''}>Under Review (${stats.underReview || 0})</option>
                        <option value="completed" ${taskView.currentFilter === 'completed' ? 'selected' : ''}>Completed (${stats.completed || 0})</option>
                        <option value="on_hold" ${taskView.currentFilter === 'on_hold' ? 'selected' : ''}>On Hold (${stats.onHold || 0})</option>
                        <option value="overdue" ${taskView.currentFilter === 'overdue' ? 'selected' : ''}>Overdue (${stats.overdue || 0})</option>
                    </select>
                </div>
            </div>
        `;
    },

    /**
     * Sort tasks by column
     */
    sortBy: (column) => {
        if (taskView.currentSort === column) {
            taskView.currentSortDirection = taskView.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            taskView.currentSort = column;
            taskView.currentSortDirection = 'asc';
        }
        taskView.render();
    },

    /**
     * Filter tasks by status
     */
    filterBy: (filter) => {
        taskView.currentFilter = filter;
        taskView.render();
    },

    /**
     * Handle search input
     */
    handleSearch: debounce((searchTerm) => {
        taskView.searchTerm = searchTerm;
        console.log(taskView.searchTerm);
        
        taskView.render();
    }, 300),

    /**
     * Clear search
     */
    clearSearch: () => {
        taskView.searchTerm = '';
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) searchInput.value = '';
        taskView.render();
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
     * Filter and sort tasks
     */
    async processedTasks(tasks) {
        // debugger;
        let filteredTasks = [...tasks];

        // Apply status filter
        if (taskView.currentFilter !== 'all') {
            if (taskView.currentFilter === 'overdue') {
                filteredTasks = filteredTasks.filter(task => getTaskPriority(task) === 'overdue');
            } else {
                filteredTasks = filteredTasks.filter(task => task.status === taskView.currentFilter);
            }
        }

        // Apply search filter
        if (taskView.searchTerm) {
            const term = taskView.searchTerm.toLowerCase();

            const results = [];
            for (const task of filteredTasks) {
                const matchesTitle = task.title.toLowerCase().includes(term);
                const matchesDesc = task.description && task.description.toLowerCase().includes(term);

                let matchesAssignee = false;
                for (const assignee of task.assignees || []) {
                    const fullName = `${assignee.first_name} ${assignee.last_name}`.toLowerCase();
                    if (fullName.includes(term)) {
                        matchesAssignee = true;
                        break;
                    }
                }


                if (matchesTitle || matchesDesc || matchesAssignee) {
                    results.push(task);
                }
            }

            filteredTasks = results;
        }

        // Apply sorting
        const sortFunctions = {
            title: (a, b) => a.title.localeCompare(b.title),
            status: (a, b) => a.status.localeCompare(b.status),
            priority: (a, b) => {
                const priorityOrder = { overdue: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[getTaskPriority(a)] - priorityOrder[getTaskPriority(b)];
            },
            assignee: (a, b) => {
                const aAssignee = a.assignees[0] ? getTeamMemberById(a.assignees[0])?.name || '' : '';
                const bAssignee = b.assignees[0] ? getTeamMemberById(b.assignees[0])?.name || '' : '';
                return aAssignee.localeCompare(bAssignee);
            },
            startDate: (a, b) => {
                if (!a.startDate && !b.startDate) return 0;
                if (!a.startDate) return 1;
                if (!b.startDate) return -1;
                return new Date(a.startDate) - new Date(b.startDate);
            },
            endDate: (a, b) => {
                if (!a.endDate && !b.endDate) return 0;
                if (!a.endDate) return 1;
                if (!b.endDate) return -1;
                return new Date(a.endDate) - new Date(b.endDate);
            },
            created: (a, b) => b.id - a.id
        };

        const sortFn = sortFunctions[taskView.currentSort] || sortFunctions.created;
        filteredTasks.sort(sortFn);

        if (taskView.currentSortDirection === 'desc') {
            filteredTasks.reverse();
        }

        return filteredTasks;
    },

    /**
     * Get task statistics
     */
    getTaskStats: (tasks) => {
        return {
            total: tasks.length,
            notStarted: tasks.filter(t => t.status === 'not_started').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            underReview: tasks.filter(t => t.status === 'under_review').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            onHold: tasks.filter(t => t.status === 'on_hold').length,
            overdue: tasks.filter(t => getTaskPriority(t) === 'overdue').length
        };
    },

    /**
     * Quick edit functionality
     */
    quickEdit: async (taskId) => {
        const task = await API.tasks.get(taskId);
        if (!task) return;

        const newTitle = prompt('Edit task title:', task.title);
        if (newTitle && newTitle.trim() && newTitle !== task.title) {
            await backendBridge.updateTask(taskId, { title: newTitle.trim() });
            taskView.render();
        }
    },

    /**
     * Toggle task status
     */
    toggleStatus: (taskId) => {
        const task = getTaskById(taskId);
        if (!task) return;

        const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
        updateTask(taskId, { status: newStatus });
        taskView.render();
    },

    /**
     * Delete task with confirmation
     */
    deleteTask: async (taskId) => {
        const task = await API.tasks.get(taskId);
        if (!task) return;

        if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
            await API.tasks.delete(taskId);
            taskView.render();
        }
    },

    /**
     * Toggle compact view
     */
    toggleCompactView: () => {
        document.body.classList.toggle('compact-task-view');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: () => {
        // Search input
        setTimeout(() => {
            const searchInput = document.getElementById('taskSearch');
            if (searchInput) {
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        taskView.handleSearch(e.target.value);
                    }
                });
            }
        }, 100);
    },

    /**
     * Main render function for Task view
     */
    render: async () => {
        if (!app.currentWorkflow) {
            domUtils.showEmptyState(domElements.taskListView, 'No project selected');
            return;
        }

        const allTasks = await backendBridge.loadTasks(app.currentWorkflow) || [];
        if (allTasks.length === 0) {
            domUtils.setHTML(domElements.taskListView, `
                ${taskView.createControls()}
                <div class="empty-state">No tasks available. Click "Add Task" to get started!</div>
            `);
            return;
        }

        const processedTasks = await taskView.processedTasks(allTasks);

        const tableHTML = `
            ${taskView.createControls()}
            <div class="task-table-scroll-wrapper">
                <table class="task-table">
                    ${taskView.createTableHeader()}
                    <tbody>
                        ${processedTasks.length > 0 
                            ? processedTasks.map(task => taskView.createTaskRow(task)).join('')
                            : '<tr><td colspan="7" class="no-results">No tasks match your filters</td></tr>'
                        }
                    </tbody>
                </table>
            </div>
        `;

        domUtils.setHTML(domElements.taskListView, tableHTML);
        taskView.setupEventListeners();

    },

    /**
     * Initialize Task view
     */
    init: () => {
        
        // Add CSS for task view specific styles
        const style = document.createElement('style');
        style.textContent = `
            .task-view-controls {
                display: flex;
                gap: 20px;
                align-items: center;
                margin-bottom: 20px;
                padding: 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                flex-wrap: wrap;
            }
            
            .search-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .search-controls input {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                width: 250px;
            }
            
            .clear-search {
                padding: 8px 12px;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .filter-controls select {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
            }
            
            .view-options {
                display: flex;
                gap: 8px;
                margin-left: auto;
            }
            
            .view-options button {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 12px;
            }
            
            .task-table-container {
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            
            .task-table th.sortable {
                cursor: pointer;
                user-select: none;
            }
            
            .task-table th.sortable:hover {
                background: #e9ecef;
            }
            
            .task-row {
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .task-row:hover {
                background: #f8f9fa;
            }
            
            .task-row.overdue {
                border-left: 4px solid #e74c3c;
            }
            
            .task-row.urgent {
                border-left: 4px solid #f39c12;
            }
            
            .task-title-container {
                max-width: 300px;
            }
            
            .task-title {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .task-description-preview {
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
            }
            
            .task-progress-bar {
                width: 100%;
                height: 4px;
                background: #f0f0f0;
                border-radius: 2px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4a6fa5, #2ecc71);
                transition: width 0.3s;
            }
            
            .assignees-cell {
                min-width: 120px;
            }
            
            .assignee-names {
                font-size: 11px;
                color: #666;
                margin-top: 4px;
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .date-cell {
                white-space: nowrap;
                font-size: 14px;
            }
            
            .date-cell.overdue {
                color: #e74c3c;
                font-weight: 600;
            }
            
            .date-cell.urgent {
                color: #f39c12;
                font-weight: 600;
            }
            
            .actions-cell {
                width: 120px;
            }
            
            .task-actions {
                display: flex;
                gap: 4px;
            }
            
            .action-btn {
                width: 30px;
                height: 30px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .action-btn.edit {
                background: #e3f2fd;
            }
            
            .action-btn.status {
                background: #e8f5e8;
            }
            
            .action-btn.delete {
                background: #ffebee;
            }
            
            .action-btn:hover {
                transform: scale(1.1);
            }
            
            .priority-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .priority-badge.low {
                background: #f8f9fa;
                color: #6c757d;
            }
            
            .priority-badge.medium {
                background: #fff3cd;
                color: #856404;
            }
            
            .priority-badge.high {
                background: #ffeaa7;
                color: #d68910;
            }
            
            .priority-badge.overdue {
                background: #ffebee;
                color: #c62828;
            }
            
            .no-results {
                text-align: center;
                padding: 40px;
                color: #666;
                font-style: italic;
            }
            
            /* Compact view styles */
            .compact-task-view .task-table {
                font-size: 12px;
            }
            
            .compact-task-view .task-table th,
            .compact-task-view .task-table td {
                padding: 8px;
            }
            
            .compact-task-view .task-description-preview,
            .compact-task-view .task-progress-bar {
                display: none;
            }
            
            @media (max-width: 768px) {
                .task-view-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .view-options {
                    margin-left: 0;
                }
                
                .search-controls input {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Export for global access
window.taskView = taskView;
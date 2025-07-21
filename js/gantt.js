// Gantt view functionality - Updated for backend integration

// Gantt view state
let ganttStartDate = null;
let ganttEndDate = null;

const ganttView = {
    /**
     * Ensure tasks have proper dates
     */
    ensureTaskDates: (tasks) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return tasks.map(task => {
            const taskWithDates = {...task};
            
            if (!taskWithDates.startDate) {
                taskWithDates.startDate = today.toISOString().split('T')[0];
            }
            
            if (!taskWithDates.endDate) {
                if (taskWithDates.startDate) {
                    const endDate = new Date(taskWithDates.startDate);
                    endDate.setDate(endDate.getDate() + 3);
                    taskWithDates.endDate = endDate.toISOString().split('T')[0];
                } else {
                    taskWithDates.endDate = tomorrow.toISOString().split('T')[0];
                }
            }
            
            return taskWithDates;
        });
    },

    /**
     * Calculate date range for the Gantt chart
     */
    calculateDateRange: (tasks) => {
        const tasksWithDates = ganttView.ensureTaskDates(tasks);
        
        const today = new Date();
        let earliest = new Date(today);
        let latest = new Date(today);
        
        // Set default range
        earliest.setDate(earliest.getDate() - 7);
        latest.setDate(latest.getDate() + 21);
        
        // Check all tasks for actual earliest and latest dates
        tasksWithDates.forEach(task => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            
            if (startDate < earliest) {
                earliest = startDate;
            }
            
            if (endDate > latest) {
                latest = endDate;
            }
        });
        
        // Add padding
        earliest.setDate(earliest.getDate() - 2);
        latest.setDate(latest.getDate() + 7);
        
        return { earliest, latest };
    },

    /**
     * Calculate position and width for a task bar
     */
    calculateTaskBarPosition: (task, earliestDate) => {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        
        const daysDiff = Math.floor((startDate - earliestDate) / (1000 * 60 * 60 * 24));
        const durationDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        
        const left = daysDiff * app.ganttDayWidth;
        const width = durationDays * app.ganttDayWidth;
        
        return { left, width };
    },

    /**
     * Get color for a task based on assignee or default
     */
    getTaskColor: (task, index) => {
        if (task.assignees && task.assignees.length > 0) {
            const assigneeId = task.assignees[0];
            const member = getTeamMemberById(assigneeId);
            if (member && member.color) {
                return member.color;
            }
        }
        
        const colors = ['#4a6fa5', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        return colors[index % colors.length];
    },

    /**
     * Generate timeline header
     */
    generateTimelineHeader: (startDate, endDate) => {
        domUtils.clearChildren(domElements.ganttTimelineHeader);
        
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            
            const headerCell = domUtils.createElement('div', 'timeline-header-cell');
            headerCell.style.width = `${app.ganttDayWidth}px`;
            
            const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            const dayName = getDayName ? getDayName(date) : date.toLocaleDateString('en', { weekday: 'short' });
            
            headerCell.innerHTML = `
                <div class="timeline-date">${formattedDate}</div>
                <div class="timeline-day">${dayName}</div>
            `;
            
            // Highlight weekends
            const day = date.getDay();
            if (day === 0 || day === 6) {
                headerCell.style.backgroundColor = '#f5f5f5';
            }
            
            // Highlight today
            if (isToday ? isToday(date) : ganttView.isToday(date)) {
                domUtils.addClass(headerCell, 'today');
            }
            
            domElements.ganttTimelineHeader.appendChild(headerCell);
        }
    },

    /**
     * Check if date is today
     */
    isToday: (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    /**
     * Generate a task bar in the Gantt chart
     */
    generateTaskBar: (task, index) => {
        const taskRow = domUtils.createElement('div', 'gantt-row');
        taskRow.style.height = '60px';
        
        // Task label
        const taskLabel = domUtils.createElement('div', 'gantt-task-label');
        taskLabel.textContent = task.title;
        taskRow.appendChild(taskLabel);
        
        // Calculate position and size
        const { left, width } = ganttView.calculateTaskBarPosition(task, ganttStartDate);
        const color = ganttView.getTaskColor(task, index);
        
        // Task bar
        const taskBar = domUtils.createElement('div', 'gantt-task-bar');
        taskBar.style.left = `${left}px`;
        taskBar.style.width = `${width}px`;
        taskBar.style.backgroundColor = color;
        taskBar.textContent = task.title;
        taskBar.setAttribute('data-task-id', task.id);
        
        // Add click event - updated for backend integration
        taskBar.addEventListener('click', async () => {
            try {
                // Load detailed task data and open detailed view
                await loadTaskDetails(task.id);
                detailedTaskView.open(task.id, 'gantt');
            } catch (error) {
                console.error('Failed to open task details:', error);
                ganttView.showNotification('Failed to load task details', 'error');
            }
        });
        
        // Add tooltip
        const statusText = formatStatus ? formatStatus(task.status) : task.status;
        taskBar.title = `${task.title}\n${formatDate ? formatDate(task.startDate) : task.startDate} - ${formatDate ? formatDate(task.endDate) : task.endDate}\nStatus: ${statusText}`;
        
        taskRow.appendChild(taskBar);
        domElements.ganttChart.appendChild(taskRow);
    },

    /**
     * Add today marker to the chart
     */
    addTodayMarker: () => {
        const today = new Date();
        
        if (today >= ganttStartDate && today <= ganttEndDate) {
            const daysDiff = Math.floor((today - ganttStartDate) / (1000 * 60 * 60 * 24));
            const left = daysDiff * app.ganttDayWidth;
            
            const todayMarker = domUtils.createElement('div', 'gantt-today-marker');
            todayMarker.style.left = `${left}px`;
            todayMarker.style.cssText += `
                position: absolute;
                top: 0;
                bottom: 0;
                width: 2px;
                background-color: #e74c3c;
                z-index: 10;
                pointer-events: none;
            `;
            
            domElements.ganttChart.appendChild(todayMarker);
        }
    },

    /**
     * Show notification
     */
    showNotification: (message, type = 'info') => {
        // Remove existing notifications
        document.querySelectorAll('.gantt-notification').forEach(n => n.remove());

        const notification = domUtils.createElement('div', `gantt-notification ${type}`);
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : '#4a6fa5'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Main render function for Gantt view - Updated for new state structure
     */
    render: () => {
        
        // Clear previous content
        domUtils.clearChildren(domElements.ganttTimelineHeader);
        domUtils.clearChildren(domElements.ganttChart);

        // Use the new state structure - appState.currentProjectTasks instead of appState.currentProjectTasks
        const allTasks = app.currentWorkflowTasks || [];
        
        if (!allTasks || allTasks.length === 0) {
            domUtils.showEmptyState(domElements.ganttChart, 'No tasks available');
            return;
        }
        
        const tasks = ganttView.ensureTaskDates([...allTasks]);
        
        // Calculate date range
        const { earliest, latest } = ganttView.calculateDateRange(tasks);
        ganttStartDate = earliest;
        ganttEndDate = latest;
        
        // Update date range display
        if (domElements.ganttStartDateElem) {
            domUtils.setText(domElements.ganttStartDateElem, ganttView.formatDisplayDate(ganttStartDate));
        }
        if (domElements.ganttEndDateElem) {
            domUtils.setText(domElements.ganttEndDateElem, ganttView.formatDisplayDate(ganttEndDate));
        }
        
        // Generate timeline header
        ganttView.generateTimelineHeader(ganttStartDate, ganttEndDate);
        
        // Set chart width
        const totalDays = Math.ceil((ganttEndDate - ganttStartDate) / (1000 * 60 * 60 * 24));
        const chartWidth = totalDays * app.ganttDayWidth;
        domElements.ganttChart.style.width = `${chartWidth}px`;
        domElements.ganttChart.style.position = 'relative'; // Ensure positioning context for today marker
        
        // Generate task bars
        tasks.forEach((task, index) => {
            ganttView.generateTaskBar(task, index);
        });
        
        // Add today marker
        ganttView.addTodayMarker();
        
    },

    /**
     * Format date for display
     */
    formatDisplayDate: (date) => {
        if (!date) return 'Loading...';
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },

    /**
     * Setup Gantt controls (zoom, etc.)
     */
    setupControls: () => {
        // Zoom in
        domUtils.addEventListenerSafe(domElements.zoomInBtn, 'click', () => {
            if (appState.ganttZoomLevel < 5) {
                appState.ganttZoomLevel++;
                appState.ganttDayWidth = 40 + (appState.ganttZoomLevel * 20);
                ganttView.render();
                ganttView.showNotification(`Zoomed in to level ${appState.ganttZoomLevel}`);
            }
        });

        // Zoom out
        domUtils.addEventListenerSafe(domElements.zoomOutBtn, 'click', () => {
            if (appState.ganttZoomLevel > 1) {
                appState.ganttZoomLevel--;
                appState.ganttDayWidth = 40 + (appState.ganttZoomLevel * 20);
                ganttView.render();
                ganttView.showNotification(`Zoomed out to level ${appState.ganttZoomLevel}`);
            }
        });
    },

    /**
     * Handle task updates from other views
     */
    onTaskUpdated: (taskId) => {
        // Re-render the gantt view when a task is updated
        ganttView.render();
    },

    /**
     * Refresh gantt view (called from other components)
     */
    refresh: () => {
        ganttView.render();
    },

    /**
     * Initialize Gantt view
     */
    init: () => {
        ganttView.setupControls();
        
        // Add CSS for gantt-specific styles
        if (!document.getElementById('ganttStyles')) {
            const style = document.createElement('style');
            style.id = 'ganttStyles';
            style.textContent = `
                .gantt-row {
                    position: relative;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    align-items: center;
                }
                
                .gantt-task-label {
                    position: absolute;
                    left: 10px;
                    z-index: 5;
                    background: white;
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #333;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .gantt-task-bar {
                    position: absolute;
                    height: 24px;
                    border-radius: 4px;
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    z-index: 3;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    top: 50%;
                    transform: translateY(-50%);
                }
                
                .gantt-task-bar:hover {
                    transform: translateY(-50%) scale(1.05);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    z-index: 4;
                }
                
                .gantt-today-marker {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background-color: #e74c3c;
                    z-index: 10;
                    pointer-events: none;
                    box-shadow: 0 0 4px rgba(231, 76, 60, 0.5);
                }
                
                .timeline-header-cell {
                    border-right: 1px solid #ddd;
                    padding: 8px 4px;
                    text-align: center;
                    font-size: 11px;
                    background: #f8f9fa;
                    min-height: 50px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                
                .timeline-header-cell.today {
                    background: #ffebee;
                    color: #e74c3c;
                    font-weight: 600;
                }
                
                .timeline-date {
                    font-weight: 600;
                    color: #333;
                }
                
                .timeline-day {
                    font-size: 10px;
                    color: #666;
                    margin-top: 2px;
                }
                
                .gantt-chart {
                    position: relative;
                    min-height: 300px;
                    background: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), #eee calc(100% - 1px));
                    background-size: ${60}px 100%;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
    }
};

// Export for global access
window.ganttView = ganttView;
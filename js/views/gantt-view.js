// gantt-view.js
// Gantt chart view functionality

import { domElements } from '../dom-elements.js';
import { 
    getCurrentProject, 
    ganttStartDate, 
    ganttEndDate, 
    dayWidth,
    zoomLevel,
    updateDayWidth
} from '../models.js';
import { getTeamMemberById } from '../team-manager.js';

// Will be set in modal-controller.js
let openTaskModal;

export const registerModalController = (modalOpener) => {
    openTaskModal = modalOpener;
};

// Function to add missing dates to tasks
function ensureTaskDates(tasks) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return tasks.map(task => {
        // Clone the task to avoid modifying the original
        const taskWithDates = {...task};
        
        // If no start date, set to today
        if (!taskWithDates.startDate) {
            taskWithDates.startDate = today.toISOString().split('T')[0];
        }
        
        // If no end date, set to a day after the start date or tomorrow
        if (!taskWithDates.endDate) {
            if (taskWithDates.startDate) {
                const endDate = new Date(taskWithDates.startDate);
                endDate.setDate(endDate.getDate() + 1);
                taskWithDates.endDate = endDate.toISOString().split('T')[0];
            } else {
                taskWithDates.endDate = tomorrow.toISOString().split('T')[0];
            }
        }
        
        return taskWithDates;
    });
}

// Function to calculate date range for Gantt chart
function calculateDateRange(tasks) {
    const tasksWithDates = ensureTaskDates(tasks);
    
    // Set initial values to today's date
    const today = new Date();
    let earliest = new Date(today);
    let latest = new Date(today);
    
    // Go back 3 days from today for earliest default
    earliest.setDate(earliest.getDate() - 3);
    
    // Go forward 14 days from today for latest default
    latest.setDate(latest.getDate() + 14);
    
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
    
    // Add some padding days
    earliest.setDate(earliest.getDate() - 1);
    latest.setDate(latest.getDate() + 1);
    
    return { earliest, latest };
}

// Function to format date for display
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Function to get day name
function getDayName(date) {
    const options = { weekday: 'short' };
    return date.toLocaleDateString(undefined, options);
}

// Function to calculate position and width for a task bar
function calculateTaskBarPosition(task, earliestDate) {
    const startDate = new Date(task.startDate || ganttStartDate);
    const endDate = new Date(task.endDate || new Date(startDate).setDate(startDate.getDate() + 1));
    
    // Calculate days from the start of the chart
    const daysDiff = Math.floor((startDate - earliestDate) / (1000 * 60 * 60 * 24));
    
    // Calculate task duration in days
    const durationDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    // Calculate position and width
    const left = daysDiff * dayWidth;
    const width = durationDays * dayWidth;
    
    return { left, width };
}

// Function to get color for a task
function getTaskColor(task, index) {
    // If task has assignees, use the first assignee's color
    if (task.assignees && task.assignees.length > 0) {
        const assigneeId = task.assignees[0];
        const member = getTeamMemberById(assigneeId);
        if (member && member.color) {
            return member.color;
        }
    }
    
    // Otherwise, use a color based on project or index
    const colorClasses = ['gantt-color-1', 'gantt-color-2', 'gantt-color-3', 'gantt-color-4', 'gantt-color-5', 'gantt-color-6'];
    return colorClasses[index % colorClasses.length];
}

// Function to generate timeline header
function generateTimelineHeader(startDate, endDate) {
    console.log(`Generating timeline header from ${startDate} to ${endDate}`);
    
    // Clear previous content
    domElements.ganttTimelineHeader.innerHTML = '';
    
    // Calculate total days
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Create a header cell for each day
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const headerCell = document.createElement('div');
        headerCell.className = 'timeline-header-cell';
        headerCell.style.width = `${dayWidth}px`;
        
        // Format date for display
        const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
        const dayName = getDayName(date);
        
        headerCell.innerHTML = `
            <div class="timeline-date">${formattedDate}</div>
            <div class="timeline-day">${dayName}</div>
        `;
        
        // Add weekend styling
        const day = date.getDay();
        if (day === 0 || day === 6) { // 0 = Sunday, 6 = Saturday
            headerCell.style.backgroundColor = '#f5f5f5';
        }
        
        domElements.ganttTimelineHeader.appendChild(headerCell);
    }
}

// Function to generate a task bar
function generateTaskBar(task, index) {
    // Create a row for the task
    const taskRow = document.createElement('div');
    taskRow.className = 'gantt-row';
    taskRow.style.height = '60px';
    domElements.ganttChart.appendChild(taskRow);
    
    // Create task label
    const taskLabel = document.createElement('div');
    taskLabel.className = 'gantt-task-label';
    taskLabel.textContent = task.title;
    taskRow.appendChild(taskLabel);
    
    // Calculate position and size
    const { left, width } = calculateTaskBarPosition(task, ganttStartDate);
    
    // Get color
    const colorClass = getTaskColor(task, index);
    
    // Create task bar
    const taskBar = document.createElement('div');
    taskBar.className = `gantt-task-bar ${typeof colorClass === 'string' && colorClass.startsWith('gantt-color') ? colorClass : ''}`;
    taskBar.style.left = `${left}px`;
    taskBar.style.width = `${width}px`;
    
    // If color is a hex value, apply it directly
    if (typeof colorClass === 'string' && colorClass.startsWith('#')) {
        taskBar.style.backgroundColor = colorClass;
    }
    
    taskBar.textContent = task.title;
    taskBar.setAttribute('data-task-id', task.id);
    
    // Add click event
    taskBar.addEventListener('click', () => {
        console.log(`Gantt task bar clicked: ${task.id}`);
        openTaskModal(task.id);
    });
    
    taskRow.appendChild(taskBar);
}

// Function to add a marker for today
function addTodayMarker() {
    const today = new Date();
    
    // Check if today is within the chart range
    if (today >= ganttStartDate && today <= ganttEndDate) {
        // Calculate position
        const daysDiff = Math.floor((today - ganttStartDate) / (1000 * 60 * 60 * 24));
        const left = daysDiff * dayWidth;
        
        // Create marker
        const todayMarker = document.createElement('div');
        todayMarker.className = 'gantt-today-marker';
        todayMarker.style.left = `${left}px`;
        
        domElements.ganttChart.appendChild(todayMarker);
    }
}

// Main function to render Gantt view
export const renderGanttView = () => {
    console.log('Rendering Gantt view');
    
    // Clear previous content
    domElements.ganttTimelineHeader.innerHTML = '';
    domElements.ganttChart.innerHTML = '';
    
    // Get current project
    const project = getCurrentProject();
    if (!project) {
        console.warn('⚠️ No current project found for Gantt view');
        domElements.ganttChart.innerHTML = '<div class="no-tasks">No project selected</div>';
        return;
    }
    
    // Get tasks
    const tasks = ensureTaskDates([...project.tasks]);
    if (!tasks || tasks.length === 0) {
        console.warn('⚠️ No tasks found for Gantt view');
        domElements.ganttChart.innerHTML = '<div class="no-tasks">No tasks available</div>';
        return;
    }
    
    console.log(`Found ${tasks.length} tasks for Gantt view`);
    
    // Calculate date range
    const { earliest, latest } = calculateDateRange(tasks);
    
    // Set global variables for use in other functions
    let ganttStartDate = earliest;
    let ganttEndDate = latest;
    
    // Update date range display
    domElements.ganttStartDateElem.textContent = formatDate(ganttStartDate);
    domElements.ganttEndDateElem.textContent = formatDate(ganttEndDate);
    
    // Generate timeline header
    generateTimelineHeader(ganttStartDate, ganttEndDate);
    
    // Set chart width
    const totalDays = Math.ceil((ganttEndDate - ganttStartDate) / (1000 * 60 * 60 * 24));
    const chartWidth = totalDays * dayWidth;
    domElements.ganttChart.style.width = `${chartWidth}px`;
    
    // Generate task bars
    tasks.forEach((task, index) => {
        generateTaskBar(task, index);
    });
    
    // Add today marker
    addTodayMarker();
    
    console.log('Gantt view rendering complete');
};

export const setupGanttControls = () => {
    // Zoom control event listeners
    if (domElements.zoomInBtn) {
        domElements.zoomInBtn.addEventListener('click', () => {
            if (zoomLevel < 5) {
                zoomLevel++;
                updateDayWidth();
                renderGanttView();
                console.log(`Zoomed in to level ${zoomLevel}, day width: ${dayWidth}px`);
            }
        });
    }
    
    if (domElements.zoomOutBtn) {
        domElements.zoomOutBtn.addEventListener('click', () => {
            if (zoomLevel > 1) {
                zoomLevel--;
                updateDayWidth();
                renderGanttView();
                console.log(`Zoomed out to level ${zoomLevel}, day width: ${dayWidth}px`);
            }
        });
    }
};
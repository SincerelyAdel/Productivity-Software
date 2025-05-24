// main.js
// Main application file that connects all modules

import { domElements } from './dom-elements.js';
import { statuses, updateCurrentView } from './models.js';
import { addTask } from './task-manager.js';
import { addWorkspace, addProject, switchWorkspace } from './workspace-manager.js';
import { 
    renderWorkspaces, 
    switchView, 
    renderTasks,
    registerRenderers
} from './controllers/view-controller.js';
import { 
    generateKanbanBoard, 
    renderKanbanBoard, 
    setupDragAndDrop,
    registerModalController as registerKanbanModalController 
} from './views/kanban-view.js';
import { 
    renderTaskListView,
    registerModalController as registerListModalController 
} from './views/list-view.js';
import { 
    renderGanttView,
    setupGanttControls,
    registerModalController as registerGanttModalController 
} from './views/gantt-view.js';
import { 
    setupTreeEventListeners,
    setupProjectModalTriggers 
} from './controllers/tree-controller.js';
import { 
    openTaskModal, 
    closeTaskModal,
    saveTaskFromModal,
    addCommentFromModal,
    addTaskAssigneeFromModal,
    closeProjectModal,
    getCurrentWorkspaceForProject
} from './controllers/modal-controller.js';
import { setupTeamModalController } from './controllers/team-modal-controller.js';
import { updateAssigneeDropdown } from './team-manager.js';

// Register controllers for views
registerKanbanModalController(openTaskModal);
registerListModalController(openTaskModal);
registerGanttModalController(openTaskModal);

// Register renderers for view controller
registerRenderers(renderKanbanBoard, renderTaskListView, renderGanttView, setupTreeEventListeners);

// Initialize the application
const initApp = () => {
    console.log('🚀 App initialization started');
        
    // Set up event listeners
    setupEventListeners();
    
    // Render initial UI
    renderWorkspaces();
    generateKanbanBoard();
    setupDragAndDrop();
    setupGanttControls();
    updateAssigneeDropdown();
    
    // Set initial view
    switchView('kanban');
    
    console.log('✅ App initialized successfully');
};

// Initialize sample data
const initSampleData = () => {
    // Add sample workspace with project
    const workspaceId = addWorkspace('My Workspace');
    const projectId = addProject(workspaceId, 'My Project');
    
    // Switch to new workspace and project
    switchWorkspace(workspaceId, projectId);
};

// Set up event listeners
const setupEventListeners = () => {
    // View switching
    domElements.kanbanViewBtn.addEventListener('click', () => {
        console.log('🖱️ Kanban view button clicked');
        switchView('kanban');
    });
    
    domElements.taskViewBtn.addEventListener('click', () => {
        console.log('🖱️ Task view button clicked');
        switchView('task');
    });
    
    domElements.ganttViewBtn.addEventListener('click', () => {
        console.log('🖱️ Gantt view button clicked');
        switchView('gantt');
    });
    
    // Add task
    domElements.addTaskBtn.addEventListener('click', () => {
        console.log('🖱️ Add task button clicked');
        addNewTask();
    });
    
    domElements.taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter pressed in task input');
            addNewTask();
        }
    });
    
    // Add workspace
    domElements.addWorkspaceBtn.addEventListener('click', () => {
        console.log('🖱️ Add workspace button clicked');
        addNewWorkspace();
    });
    
    domElements.workspaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter pressed in workspace input');
            addNewWorkspace();
        }
    });
    
    // Task modal controls
    domElements.closeModal.addEventListener('click', () => {
        console.log('🖱️ Close modal button clicked');
        closeTaskModal();
    });
    
    domElements.cancelTaskBtn.addEventListener('click', () => {
        console.log('🖱️ Cancel task button clicked');
        closeTaskModal();
    });
    
    domElements.saveTaskBtn.addEventListener('click', () => {
        console.log('🖱️ Save task button clicked');
        saveTaskFromModal();
    });
    
    // Comment functions
    domElements.addCommentBtn.addEventListener('click', () => {
        console.log('🖱️ Add comment button clicked');
        addCommentFromModal();
    });
    
    domElements.commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter pressed in comment input');
            addCommentFromModal();
        }
    });
    
    // Task assignee controls
    domElements.addAssigneeBtn.addEventListener('click', () => {
        console.log('🖱️ Add assignee button clicked');
        addTaskAssigneeFromModal();
    });
    
    // Project modal controls
    domElements.closeProjectModal.addEventListener('click', closeProjectModal);
    domElements.cancelProjectBtn.addEventListener('click', closeProjectModal);
    
    domElements.saveProjectBtn.addEventListener('click', () => {
        const projectName = domElements.projectNameInput.value.trim();
        
        if (!projectName) {
            alert('Please enter a project name');
            return;
        }
        
        const workspaceId = getCurrentWorkspaceForProject();
        if (!workspaceId) {
            console.warn('⚠️ No workspace selected for new project');
            closeProjectModal();
            return;
        }
        
        console.log(`➕ Adding new project: ${projectName} to workspace: ${workspaceId}`);
        
        // First add the project
        const projectId = addProject(workspaceId, projectName);
        
        // Then render the workspaces to update the tree
        renderWorkspaces();
        
        // Then switch to the new workspace and project with a small delay
        // to ensure the DOM has been updated
        setTimeout(() => {
            switchWorkspace(workspaceId, projectId);
        }, 10);
        
        closeProjectModal();
    });
    
    domElements.projectNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            domElements.saveProjectBtn.click();
        }
    });
    
    // Modal background click to close
    window.addEventListener('click', (e) => {
        if (e.target === domElements.taskDetailModal) {
            console.log('🖱️ Clicked outside modal to close');
            closeTaskModal();
        }
        
        if (e.target === domElements.projectModal) {
            closeProjectModal();
        }
    });
    
    // Setup team modal
    setupTeamModalController();
    
    // Setup project modal triggers
    setTimeout(() => {
        setupProjectModalTriggers();
    }, 100);
};

// Helper function to add new task
const addNewTask = () => {
    const taskTitle = domElements.taskInput.value.trim();
    if (!taskTitle) return;
    
    addTask(taskTitle, domElements.assigneeSelect.value);
    domElements.taskInput.value = '';
    renderTasks();
    domElements.taskInput.focus();
};

// Helper function to add new workspace
const addNewWorkspace = () => {
    const workspaceName = domElements.workspaceInput.value.trim();
    if (!workspaceName) return;
    
    const workspaceId = addWorkspace(workspaceName);
    domElements.workspaceInput.value = '';
    renderWorkspaces();
};

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
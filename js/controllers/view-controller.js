// view-controller.js
// View management and rendering

import { domElements } from '../dom-elements.js';
import { 
    getCurrentProject, 
    getCurrentWorkspace, 
    updateCurrentView, 
    workspaces, 
    activeWorkspace, 
    activeProject 
} from '../models.js';

export let renderKanbanBoard; // Will be defined in kanban-view.js
export let renderTaskListView; // Will be defined in list-view.js
export let renderGanttView; // Will be defined in gantt-view.js
export let setupTreeEventListeners; // Will be defined in tree-controller.js

// Function to register view renderers from other modules
export const registerRenderers = (kanbanRenderer, taskListRenderer, ganttRenderer, treeEventListener) => {
    renderKanbanBoard = kanbanRenderer;
    renderTaskListView = taskListRenderer;
    renderGanttView = ganttRenderer;
    setupTreeEventListeners = treeEventListener;
};

export const switchView = (view) => {
    console.log(`🔀 Switching to ${view} view`);
    
    updateCurrentView(view);
    
    domElements.kanbanViewBtn.classList.toggle('active', view === 'kanban');
    domElements.taskViewBtn.classList.toggle('active', view === 'task');
    domElements.ganttViewBtn.classList.toggle('active', view === 'gantt');
    
    domElements.kanbanView.classList.toggle('active', view === 'kanban');
    domElements.taskView.classList.toggle('active', view === 'task');
    domElements.ganttView.classList.toggle('active', view === 'gantt');
    
    if (view === 'gantt') {
        renderGanttView();
    }
};

export const renderTasks = () => {
    console.log('🔄 Rendering tasks');
    
    const currentWs = getCurrentWorkspace();
    const currentProj = getCurrentProject();
    
    if (currentWs) domElements.currentWorkspace.textContent = currentWs.name;
    if (currentProj) domElements.currentProject.textContent = currentProj.name;
    
    if (!currentProj) {
        console.warn('⚠️ No current project found to render tasks');
        return;
    }
    
    console.log(`📋 Rendering ${currentProj.tasks.length} tasks for project: ${currentProj.name}`);
    
    // Update all views
    renderKanbanBoard();
    renderTaskListView();
};

export const renderWorkspaces = () => {
    console.log('🔄 Rendering workspaces');
    domElements.workspaceList.innerHTML = '';
    
    workspaces.forEach(workspace => {
        const wsItem = document.createElement('li');
        wsItem.className = 'tree-item workspace-item';
        wsItem.setAttribute('data-id', workspace.id);
        
        const isActive = workspace.id === activeWorkspace;
        
        wsItem.innerHTML = `
            <div class="tree-header ${isActive ? 'active' : ''}">
                <span class="tree-toggle ${isActive ? 'open' : ''}">▶</span>
                ${workspace.name}
            </div>
            <ul class="tree-children ${isActive ? 'open' : ''}" data-parent="${workspace.id}">
                ${workspace.projects.map(project => `
                    <li class="tree-item project-item ${project.id === activeProject && isActive ? 'active' : ''}" data-id="${project.id}">
                        <div class="tree-header ${project.id === activeProject && isActive ? 'active' : ''}">
                            <span class="tree-toggle">▶</span>
                            ${project.name}
                        </div>
                        <ul class="tree-children" data-parent="${project.id}">
                            <li class="tree-item new-task-item">
                                <div class="tree-header">
                                    <span>+ Add Task</span>
                                </div>
                            </li>
                        </ul>
                    </li>
                `).join('')}
                <li class="tree-item new-project-item">
                    <div class="tree-header">
                        <span>+ Add Project</span>
                    </div>
                </li>
            </ul>
        `;
        
        domElements.workspaceList.appendChild(wsItem);
    });
    
    setupTreeEventListeners();
};
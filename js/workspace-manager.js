// workspace-manager.js
// Workspace and project management

import { workspaces, updateActiveWorkspace, updateActiveProject } from './models.js';
import { renderTasks, renderWorkspaces } from './controllers/view-controller.js';

export const addWorkspace = (workspaceName) => {
    if (!workspaceName) {
        console.warn('⚠️ Cannot add workspace with empty name');
        return null;
    }
    
    console.log(`➕ Adding new workspace: ${workspaceName}`);
    
    const newWorkspaceId = 'workspace-' + Date.now();
    
    const newWorkspace = {
        id: newWorkspaceId,
        name: workspaceName,
        projects: []
    };
    
    console.log('📋 New workspace created:', newWorkspace);
    
    workspaces.push(newWorkspace);
    
    // Render workspaces to update the DOM
    renderWorkspaces();
    
    // Ensure we can find the workspace element in the DOM
    setTimeout(() => {
        // Toggle the workspace to show it's expanded
        const wsItem = document.querySelector(`.workspace-item[data-id="${newWorkspaceId}"]`);
        if (wsItem) {
            const wsToggle = wsItem.querySelector('.tree-toggle');
            const wsChildren = wsItem.querySelector('.tree-children');
            
            wsToggle.classList.add('open');
            wsChildren.classList.add('open');
        }
    }, 10);
    
    return newWorkspaceId;
};

export const addProject = (workspaceId, projectName = 'New Project') => {
    console.log(`➕ Adding new project: ${projectName} to workspace: ${workspaceId}`);
    
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) {
        console.warn(`⚠️ Workspace ${workspaceId} not found when adding project`);
        return null;
    }
    
    const newProjectId = 'project-' + Date.now();
    const newProject = {
        id: newProjectId,
        name: projectName,
        tasks: []
    };
    
    console.log('📋 New project created:', newProject);
    
    workspace.projects.push(newProject);
    
    // First render workspaces to update the DOM
    renderWorkspaces();
    
    // Ensure we can find the project element in the DOM
    setTimeout(() => {
        // Make sure the workspace is expanded
        const wsItem = document.querySelector(`.workspace-item[data-id="${workspaceId}"]`);
        if (wsItem) {
            const wsToggle = wsItem.querySelector('.tree-toggle');
            const wsChildren = wsItem.querySelector('.tree-children');
            
            wsToggle.classList.add('open');
            wsChildren.classList.add('open');
        }
        
        // Toggle the project to show it's expanded
        const projItem = document.querySelector(`.project-item[data-id="${newProjectId}"]`);
        if (projItem) {
            const projToggle = projItem.querySelector('.tree-toggle');
            const projChildren = projItem.querySelector('.tree-children');
            
            projToggle.classList.add('open');
            if (projChildren) {
                projChildren.classList.add('open');
            }
        }
    }, 10);
    
    return newProjectId;
};

export const switchWorkspace = (workspaceId, projectId) => {
    console.log(`🔀 Switching to workspace: ${workspaceId}, project: ${projectId}`);
    
    updateActiveWorkspace(workspaceId);
    updateActiveProject(projectId);
    
    // Clear all active states first
    document.querySelectorAll('.tree-header').forEach(header => {
        header.classList.remove('active');
    });
    
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activate workspace
    const wsItem = document.querySelector(`.workspace-item[data-id="${workspaceId}"]`);
    if (wsItem) {
        const wsHeader = wsItem.querySelector('.tree-header');
        const wsToggle = wsItem.querySelector('.tree-toggle');
        const wsChildren = wsItem.querySelector('.tree-children');
        
        wsHeader.classList.add('active');
        wsToggle.classList.add('open');
        wsChildren.classList.add('open');
    } else {
        console.warn(`Workspace element with ID ${workspaceId} not found in the DOM`);
    }
    
    // Activate project
    const projItem = document.querySelector(`.project-item[data-id="${projectId}"]`);
    if (projItem) {
        const projHeader = projItem.querySelector('.tree-header');
        projItem.classList.add('active');
        projHeader.classList.add('active');
        
        // Also ensure project's children are visible
        const projToggle = projItem.querySelector('.tree-toggle');
        const projChildren = projItem.querySelector('.tree-children');
        
        if (projToggle) projToggle.classList.add('open');
        if (projChildren) projChildren.classList.add('open');
    } else {
        console.warn(`Project element with ID ${projectId} not found in the DOM`);
    }
    
    renderTasks();
};
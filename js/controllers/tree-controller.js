// tree-controller.js
// Workspace and project tree navigation

import { domElements } from '../dom-elements.js';
import { switchWorkspace } from '../workspace-manager.js';
import { addProject } from '../workspace-manager.js';
import { openProjectModal } from './modal-controller.js';

export const setupTreeEventListeners = () => {
    console.log('🔄 Adding tree event listeners');
    
    // Toggle workspace tree
    document.querySelectorAll('.workspace-item .tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const header = toggle.closest('.tree-header');
            const item = header.closest('.tree-item');
            const children = item.querySelector('.tree-children');
            const workspace = item.getAttribute('data-id');
            
            console.log(`🌳 Toggling workspace tree: ${workspace}`);
            
            toggle.classList.toggle('open');
            children.classList.toggle('open');
        });
    });
    
    // Toggle project tree
    document.querySelectorAll('.project-item .tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const header = toggle.closest('.tree-header');
            const item = header.closest('.tree-item');
            const children = item.querySelector('.tree-children');
            const project = item.getAttribute('data-id');
            
            console.log(`🌳 Toggling project tree: ${project}`);
            
            toggle.classList.toggle('open');
            children.classList.toggle('open');
        });
    });
    
    // Workspace click handler
    document.querySelectorAll('.workspace-item .tree-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.tree-item');
            const workspaceId = item.getAttribute('data-id');
            
            console.log(`🌳 Clicked on workspace: ${workspaceId}`);
            
            const workspaceProjects = item.querySelectorAll('.project-item');
            if (workspaceProjects.length > 0) {
                const firstProjectId = workspaceProjects[0].getAttribute('data-id');
                switchWorkspace(workspaceId, firstProjectId);
            }
        });
    });
    
    // Project click handler
    document.querySelectorAll('.project-item .tree-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.tree-item');
            const projectId = item.getAttribute('data-id');
            const workspaceItem = item.closest('.workspace-item');
            const workspaceId = workspaceItem.getAttribute('data-id');
            
            console.log(`🌳 Clicked on project: ${projectId} in workspace: ${workspaceId}`);
            
            switchWorkspace(workspaceId, projectId);
        });
    });
    
    // New project click handler
    document.querySelectorAll('.new-project-item').forEach(item => {
        item.addEventListener('click', () => {
            const parent = item.closest('.tree-children');
            const workspaceId = parent.getAttribute('data-parent');
            
            console.log(`🌳 Add new project clicked for workspace: ${workspaceId}`);
            
            openProjectModal(workspaceId);
        });
    });
    
    // New task click handler
    document.querySelectorAll('.new-task-item').forEach(item => {
        item.addEventListener('click', () => {
            console.log('🌳 Add new task clicked');
            domElements.taskInput.focus();
        });
    });
};

export const setupProjectModalTriggers = () => {
    document.querySelectorAll('.new-project-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', () => {
            const parent = newItem.closest('.tree-children');
            const workspaceId = parent.getAttribute('data-parent');
            
            console.log(`🌳 Add new project clicked for workspace: ${workspaceId}`);
            
            openProjectModal(workspaceId);
        });
    });
};
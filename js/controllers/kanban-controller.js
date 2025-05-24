// kanban-view.js
// Kanban board view functionality

import { domElements } from '../dom-elements.js';
import { getCurrentProject, statuses } from '../models.js';
import { getTeamMemberById } from '../team-manager.js';
import { moveTask, deleteTask } from '../task-manager.js';
import { renderTasks } from './view-controller.js';

// Will be set in modal-controller.js
let openTaskModal;

export const registerModalController = (modalOpener) => {
    openTaskModal = modalOpener;
};

export const generateKanbanBoard = () => {
    console.log('🔄 Generating Kanban board');
    domElements.kanbanBoard.innerHTML = '';
    
    statuses.forEach(status => {
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.setAttribute('data-status', status);
        
        column.innerHTML = `
            <h3 class="column-header">${status}</h3>
            <div class="task-cards" data-status="${status}"></div>
        `;
        
        domElements.kanbanBoard.appendChild(column);
    });
};

export const renderKanbanBoard = () => {
    console.log('🔄 Rendering Kanban board');
    
    document.querySelectorAll('.task-cards').forEach(column => {
        column.innerHTML = '';
    });
    
    const currentProj = getCurrentProject();
    if (!currentProj) return;
    
    currentProj.tasks.forEach(task => {
        const taskCard = createTaskCard(task);
        const column = document.querySelector(`.task-cards[data-status="${task.status}"]`);
        if (column) {
            column.appendChild(taskCard);
        } else {
            console.warn(`⚠️ Column not found for status: ${task.status}`);
        }
    });
};

const createTaskCard = (task) => {
    console.log(`🎴 Creating kanban card for task: ${task.id} - ${task.title}`);
    
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-id', task.id);
    
    let assigneesHTML = '';
    if (task.assignees && task.assignees.length > 0) {
        assigneesHTML = '<div class="card-assignees">';
        task.assignees.forEach(assigneeId => {
            const member = getTeamMemberById(assigneeId);
            if (member) {
                assigneesHTML += `
                    <div class="card-assignee">
                        <div class="assignee-avatar" style="background-color:${member.color}">${member.initials}</div>
                        ${member.name}
                    </div>
                `;
            }
        });
        assigneesHTML += '</div>';
    }
    
    card.innerHTML = `
        <h4>${task.title}</h4>
        <p>${task.description}</p>
        ${assigneesHTML}
        <div class="card-actions">
            <button class="edit-btn" title="Edit">✎</button>
            <button class="move-left-btn" title="Move Left">◀</button>
            <button class="delete-btn" title="Delete">🗑</button>
            <button class="move-right-btn" title="Move Right">▶</button>
        </div>
    `;
    
    const editBtn = card.querySelector('.edit-btn');
    const moveLeftBtn = card.querySelector('.move-left-btn');
    const moveRightBtn = card.querySelector('.move-right-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`🖊️ Edit button clicked for task: ${task.id}`);
        openTaskModal(task.id);
    });
    
    moveLeftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`⬅️ Move left button clicked for task: ${task.id}`);
        moveTask(task.id, 'left', statuses);
        renderTasks();
    });
    
    moveRightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`➡️ Move right button clicked for task: ${task.id}`);
        moveTask(task.id, 'right', statuses);
        renderTasks();
    });
    
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`🗑️ Delete button clicked for task: ${task.id}`);
        deleteTask(task.id);
        renderTasks();
    });
    
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        console.log(`🔄 Drag started for task: ${task.id}`);
    });
    
    card.addEventListener('click', () => {
        console.log(`🖱️ Card clicked for task: ${task.id}`);
        openTaskModal(task.id);
    });
    
    return card;
};

export const setupDragAndDrop = () => {
    console.log('🔄 Setting up drag and drop');
    
    domElements.kanbanBoard.addEventListener('dragover', (e) => {
        e.preventDefault();
        const column = e.target.closest('.task-cards');
        if (column) {
            column.classList.add('drag-over');
        }
    });
    
    domElements.kanbanBoard.addEventListener('dragleave', (e) => {
        const column = e.target.closest('.task-cards');
        if (column) {
            column.classList.remove('drag-over');
        }
    });
    
    domElements.kanbanBoard.addEventListener('drop', (e) => {
        e.preventDefault();
        const column = e.target.closest('.task-cards');
        if (!column) return;
        
        column.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = column.getAttribute('data-status');
        
        console.log(`🔄 Task ${taskId} dropped into ${newStatus} column`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found during drag and drop');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            renderTasks();
        } else {
            console.warn(`⚠️ Task ${taskId} not found during drag and drop`);
        }
    });
};
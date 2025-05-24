// list-view.js
// Task list view functionality

import { domElements } from '../dom-elements.js';
import { getCurrentProject } from '../models.js';
import { getTeamMemberById } from '../team-manager.js';
import { deleteTask } from '../task-manager.js';
import { renderTasks } from '../controllers/view-controller.js';

// Will be set in modal-controller.js
let openTaskModal;

export const registerModalController = (modalOpener) => {
    openTaskModal = modalOpener;
};

export const renderTaskListView = () => {
    console.log('🔄 Rendering task list view');
    
    domElements.taskListView.innerHTML = '';
    
    const currentProj = getCurrentProject();
    if (!currentProj) return;
    
    currentProj.tasks.forEach(task => {
        const taskDetailCard = createTaskDetailCard(task);
        domElements.taskListView.appendChild(taskDetailCard);
    });
};

const createTaskDetailCard = (task) => {
    console.log(`📝 Creating detail card for task: ${task.id} - ${task.title}`);
    
    const card = document.createElement('div');
    card.className = 'task-detail-card';
    card.setAttribute('data-id', task.id);
    
    let assigneesHTML = '';
    if (task.assignees && task.assignees.length > 0) {
        assigneesHTML = '<div class="detail-assignees">';
        task.assignees.forEach(assigneeId => {
            const member = getTeamMemberById(assigneeId);
            if (member) {
                assigneesHTML += `
                    <div class="assignee-avatar" style="background-color:${member.color}" title="${member.name}">
                        ${member.initials}
                    </div>
                `;
            }
        });
        assigneesHTML += '</div>';
    }
    
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date';
    
    card.innerHTML = `
        <div class="task-detail-header">
            <h3>${task.title}</h3>
            <span class="task-status-badge">${task.status}</span>
        </div>
        <div class="task-detail-body">
            <p class="task-description">${task.description}</p>
            <div class="task-detail-meta">
                <span>Due: ${dueDate}</span>
                <span>${task.comments ? task.comments.length : 0} comments</span>
            </div>
        </div>
        <div class="task-detail-footer">
            ${assigneesHTML}
            <div class="task-detail-actions">
                <button class="detail-edit-btn" title="Edit">Edit</button>
                <button class="detail-delete-btn" title="Delete">Delete</button>
            </div>
        </div>
    `;
    
    const editBtn = card.querySelector('.detail-edit-btn');
    const deleteBtn = card.querySelector('.detail-delete-btn');
    
    editBtn.addEventListener('click', () => {
        console.log(`🖊️ Detail edit button clicked for task: ${task.id}`);
        openTaskModal(task.id);
    });
    
    deleteBtn.addEventListener('click', () => {
        console.log(`🗑️ Detail delete button clicked for task: ${task.id}`);
        deleteTask(task.id);
        renderTasks();
    });
    
    return card;
};
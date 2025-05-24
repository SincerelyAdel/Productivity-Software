// modal-controller.js
// Handling modal dialogs and forms

import { domElements } from '../dom-elements.js';
import { getCurrentProject, statuses, teamMembers } from '../models.js';
import { saveTaskChanges, addComment, addTaskAssignee, removeTaskAssignee, getTaskById } from '../task-manager.js';
import { getTeamMemberById } from '../team-manager.js';
import { renderTasks } from './view-controller.js';

let currentWorkspaceForProject = null;

export const openTaskModal = (taskId) => {
    console.log(`🔳 Opening modal for task: ${taskId}`);
    
    const task = getTaskById(taskId);
    if (!task) {
        console.warn(`⚠️ Task ${taskId} not found when opening modal`);
        return;
    }
    
    console.log('📋 Task details:', task);
    
    domElements.modalTaskTitle.textContent = task.title;
    domElements.taskDescription.value = task.description;
    domElements.taskDueDate.value = task.dueDate || '';
    
    domElements.taskStatus.innerHTML = '';
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        if (status === task.status) {
            option.selected = true;
        }
        domElements.taskStatus.appendChild(option);
    });
    
    renderTaskAssignees(task);
    
    renderComments(task);
    
    domElements.saveTaskBtn.setAttribute('data-task-id', taskId);
    
    domElements.taskDetailModal.style.display = 'block';
};

export const closeTaskModal = () => {
    console.log('🔳 Closing task modal');
    domElements.taskDetailModal.style.display = 'none';
};

export const saveTaskFromModal = () => {
    const taskId = domElements.saveTaskBtn.getAttribute('data-task-id');
    console.log(`💾 Saving changes for task: ${taskId}`);
    
    saveTaskChanges(
        taskId, 
        domElements.taskDescription.value,
        domElements.taskStatus.value,
        domElements.taskDueDate.value
    );
    
    renderTasks();
    closeTaskModal();
};

export const addCommentFromModal = () => {
    const taskId = domElements.saveTaskBtn.getAttribute('data-task-id');
    const commentText = domElements.commentInput.value.trim();
    
    if (!commentText) {
        console.warn('⚠️ Cannot add empty comment');
        return;
    }
    
    // Use first team member as default author if available
    const authorId = teamMembers.length > 0 ? teamMembers[0].id : 'unknown';
    
    addComment(taskId, commentText, authorId);
    
    domElements.commentInput.value = '';
    
    const task = getTaskById(taskId);
    if (task) {
        renderComments(task);
    }
};

export const renderComments = (task) => {
    console.log(`💬 Rendering ${task.comments ? task.comments.length : 0} comments for task: ${task.id}`);
    
    domElements.commentsList.innerHTML = '';
    
    if (task.comments && task.comments.length > 0) {
        task.comments.forEach(comment => {
            const member = getTeamMemberById(comment.author);
            const commentDate = new Date(comment.timestamp).toLocaleString();
            
            const commentElem = document.createElement('div');
            commentElem.className = 'comment-item';
            commentElem.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${member ? member.name : 'Unknown'}</span>
                    <span class="comment-date">${commentDate}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            
            domElements.commentsList.appendChild(commentElem);
        });
    } else {
        domElements.commentsList.innerHTML = '<div class="no-comments">No comments yet</div>';
    }
};

export const renderTaskAssignees = (task) => {
    console.log(`👥 Rendering ${task.assignees ? task.assignees.length : 0} assignees for task: ${task.id}`);
    
    domElements.taskAssignees.innerHTML = '';
    
    if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach(assigneeId => {
            const member = getTeamMemberById(assigneeId);
            if (member) {
                const assigneeElem = document.createElement('div');
                assigneeElem.className = 'team-member';
                assigneeElem.innerHTML = `
                    <div class="team-member-avatar" style="background-color:${member.color}">${member.initials}</div>
                    ${member.name}
                    <button class="remove-assignee" data-id="${member.id}">×</button>
                `;
                
                const removeBtn = assigneeElem.querySelector('.remove-assignee');
                removeBtn.addEventListener('click', () => {
                    const taskId = domElements.saveTaskBtn.getAttribute('data-task-id');
                    console.log(`👤 Removing assignee: ${member.name} from task: ${taskId}`);
                    removeTaskAssignee(taskId, member.id);
                    renderTaskAssignees(getTaskById(taskId));
                });
                
                domElements.taskAssignees.appendChild(assigneeElem);
            }
        });
    }
};

export const addTaskAssigneeFromModal = () => {
    const taskId = domElements.saveTaskBtn.getAttribute('data-task-id');
    console.log(`👤 Adding assignee UI opened for task: ${taskId}`);
    
    const selectHTML = `
        <div class="assignee-select-container">
            <select id="modalAssigneeSelect">
                <option value="">Select a team member</option>
                ${teamMembers.map(member => `
                    <option value="${member.id}">${member.name}</option>
                `).join('')}
            </select>
            <button id="confirmAssigneeBtn">Add</button>
            <button id="cancelAssigneeBtn">Cancel</button>
        </div>
    `;
    
    const selectContainer = document.createElement('div');
    selectContainer.innerHTML = selectHTML;
    domElements.taskAssignees.appendChild(selectContainer);
    
    const modalAssigneeSelect = document.getElementById('modalAssigneeSelect');
    const confirmAssigneeBtn = document.getElementById('confirmAssigneeBtn');
    const cancelAssigneeBtn = document.getElementById('cancelAssigneeBtn');
    
    confirmAssigneeBtn.addEventListener('click', () => {
        const selectedMemberId = modalAssigneeSelect.value;
        if (selectedMemberId) {
            console.log(`👤 Adding assignee ${selectedMemberId} to task ${taskId}`);
            addTaskAssignee(taskId, selectedMemberId);
            renderTaskAssignees(getTaskById(taskId));
        } else {
            console.warn('⚠️ No team member selected');
        }
        selectContainer.remove();
    });
    
    cancelAssigneeBtn.addEventListener('click', () => {
        console.log('👤 Add assignee canceled');
        selectContainer.remove();
    });
};

// Project modal functions
export const openProjectModal = (workspaceId) => {
    console.log(`🔳 Opening project modal for workspace: ${workspaceId}`);
    currentWorkspaceForProject = workspaceId;
    domElements.projectNameInput.value = '';
    domElements.projectModal.style.display = 'block';
    domElements.projectNameInput.focus();
};

export const closeProjectModal = () => {
    console.log('🔳 Closing project modal');
    domElements.projectModal.style.display = 'none';
    currentWorkspaceForProject = null;
};

export const getCurrentWorkspaceForProject = () => {
    return currentWorkspaceForProject;
};
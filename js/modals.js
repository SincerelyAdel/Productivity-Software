// Modal functionality

const modals = {
    // Current task being edited
    currentTaskId: null,
    selectedTeamMemberColor: '#4a6fa5',

    /**
     * Open task detail modal
     */
    openTaskModal: (taskId) => {
        const task = getTaskById(taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return;
        }

        modals.currentTaskId = taskId;

        // Populate modal fields
        domUtils.setValue(domElements.modalTaskTitle, task.title);
        domUtils.setValue(domElements.taskDescription, task.description || '');
        domUtils.setValue(domElements.taskStatus, task.status);
        domUtils.setValue(domElements.taskDueDate, task.endDate || '');

        // Populate assignees
        modals.renderTaskAssignees(task.assignees);

        // Populate comments
        modals.renderTaskComments(task.comments || []);

        // Show modal
        domUtils.show(domElements.taskDetailModal);
    },

    /**
     * Render task assignees in modal
     */
    renderTaskAssignees: (assignees) => {
        const assigneeHtml = assignees.map(assignee => {
            // const member = getTeamMemberById(assignee);
            if (!assignee) return '';

            return `
                <div class="assignee-tag">
                    <div class="member-avatar" style="background-color: ${assignee.avatar_color}">
                        ${getInitials(`${assignee.first_name} ${assignee.last_name}`)}
                    </div>
                    <span>${`${assignee.first_name} ${assignee.last_name}`}</span>
                    <span class="remove-assignee" onclick="modals.removeAssignee(${assignee})">×</span>
                </div>
            `;
        }).join('');

        domUtils.setHTML(domElements.taskAssignees, assigneeHtml);
    },

    /**
     * Add assignee to task
     */
    addAssignee: () => {
        const availableMembers = appState.teamMembers.filter(member => {
            const task = getTaskById(modals.currentTaskId);
            return !task.assignees.includes(member.id);
        });

        if (availableMembers.length === 0) {
            alert('All team members are already assigned to this task.');
            return;
        }

        const memberOptions = availableMembers.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');

        const selectHtml = `
            <select id="assigneeSelector">
                <option value="">Select team member...</option>
                ${memberOptions}
            </select>
        `;

        const popup = modals.createPopup('Add Assignee', selectHtml, [
            {
                text: 'Add',
                action: () => {
                    const selector = document.getElementById('assigneeSelector');
                    const memberId = parseInt(selector.value);
                    if (memberId) {
                        const task = getTaskById(modals.currentTaskId);
                        task.assignees.push(memberId);
                        modals.renderTaskAssignees(task.assignees);
                    }
                    modals.closePopup();
                }
            },
            {
                text: 'Cancel',
                action: () => modals.closePopup()
            }
        ]);

        document.body.appendChild(popup);
    },

    /**
     * Remove assignee from task
     */
    removeAssignee: (assigneeId) => {
        const task = getTaskById(modals.currentTaskId);
        if (!task) return;

        task.assignees = task.assignees.filter(id => id !== assigneeId);
        modals.renderTaskAssignees(task.assignees);
    },

    /**
     * Render task comments
     */
    renderTaskComments: (comments) => {
        if (!comments || comments.length === 0) {
            domUtils.setHTML(domElements.commentsList, '<div class="no-comments">No comments yet.</div>');
            return;
        }

        const commentsHtml = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">${sanitizeHTML(comment.author)}</span>
                    <span class="comment-time">${comment.timestamp ? getRelativeTime(comment.timestamp) : 'Just now'}</span>
                </div>
                <div class="comment-text">${sanitizeHTML(comment.text)}</div>
            </div>
        `).join('');

        domUtils.setHTML(domElements.commentsList, commentsHtml);
    },

    /**
     * Add comment to task
     */
    addComment: () => {
        const commentText = domUtils.getValue(domElements.commentInput).trim();
        if (!commentText) return;

        const task = getTaskById(modals.currentTaskId);
        if (!task) return;

        const newComment = {
            id: generateId(),
            text: commentText,
            author: 'Current User', // In a real app, this would be the logged-in user
            timestamp: new Date().toISOString()
        };

        if (!task.comments) task.comments = [];
        task.comments.push(newComment);

        domUtils.setValue(domElements.commentInput, '');
        modals.renderTaskComments(task.comments);
    },

    /**
     * Save task changes
     */
    saveTask: () => {
        if (!modals.currentTaskId) return;

        const titleValue = domUtils.getValue(domElements.modalTaskTitle);
        const descriptionValue = domUtils.getValue(domElements.taskDescription);
        const statusValue = domUtils.getValue(domElements.taskStatus);
        const dueDateValue = domUtils.getValue(domElements.taskDueDate);

        // Validate that we got the values properly
        if (titleValue === undefined || titleValue === null) {
            console.error('Could not get task title value');
            modals.showNotification('Error: Could not save task title', 'error');
            return;
        }

        const updates = {
            title: titleValue,
            description: descriptionValue || '',
            status: statusValue,
            endDate: dueDateValue || null
        };

        // Validate required fields
        if (!updates.title.trim()) {
            alert('Task title is required.');
            domElements.modalTaskTitle.focus();
            return;
        }

        updateTask(modals.currentTaskId, updates);
        modals.closeTaskModal();
        
        // Refresh current view
        window.app.refreshCurrentView();

        // Show success message
        modals.showNotification('Task updated successfully!');
    },

    /**
     * Close task modal
     */
    closeTaskModal: () => {
        domUtils.hide(domElements.taskDetailModal);
        modals.currentTaskId = null;
    },

    /**
     * Open team member modal
     */
    openTeamMemberModal: () => {
        // Reset form
        domUtils.setValue(domElements.memberFirstName, '');
        domUtils.setValue(domElements.memberLastName, '');
        domUtils.setValue(domElements.memberEmail, '');
        domUtils.setValue(domElements.memberPhoneNumber, '');
        modals.selectedTeamMemberColor = '#4a6fa5';
        
        document.querySelectorAll('#teamMemberModal .color-option').forEach(option => {
            domUtils.removeClass(option, 'selected');
        });
        document.querySelector('#teamMemberModal .color-option[data-color="#4a6fa5"]')?.classList.add('selected');

        domUtils.show(domElements.teamMemberModal);
    },

    /**
     * Setup color picker for team member modal
     */
    setupTeamMemberColorPicker: () => {
        const colorOptions = document.querySelectorAll('#teamMemberModal .color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                colorOptions.forEach(opt => domUtils.removeClass(opt, 'selected'));
                
                // Add selected class to clicked option
                domUtils.addClass(option, 'selected');
                
                // Store selected color
                modals.selectedTeamMemberColor = option.dataset.color;
            });
        });
    },

    /**
     * Save team member
     */
    saveTeamMember: async () => {
        const firstName = domUtils.getValue(domElements.memberFirstName).trim();
        
        if (!firstName) {
            alert('Team member first name is required.');
            return;
        }

        const lastName = domUtils.getValue(domElements.memberLastName).trim();
        
        if (!lastName) {
            alert('Team member last name is required.');
            return;
        }

        const email = domUtils.getValue(domElements.memberEmail).trim();
        
        if (!email) {
            alert('Team member email is required.');
            return;
        }

        const phoneNumber = domUtils.getValue(domElements.memberPhoneNumber).trim();
        
        if (!phoneNumber) {
            alert('Team member phone number is required.');
            return;
        }

        //TODO: duplicity check

        const memberData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phoneNumber: phoneNumber,
            avatar_color: modals.selectedTeamMemberColor
        };

        const member = await API.members.create(memberData);
        
        if (member) {
            console.log('Member added!');
        }

        modals.closeTeamMemberModal();
        
        window.app.updateUI();
        
        modals.showNotification(`Team member "${name}" added successfully!`);
    },

    /**
     * Close team member modal
     */
    closeTeamMemberModal: () => {
        domUtils.hide(domElements.teamMemberModal);
    },

    /**
     * Open project modal
     */
    openProjectModal: () => {
        // Reset form
        domUtils.setValue(domElements.projectNameInput, '');
        domUtils.setValue(domElements.projectDescriptionInput, '');

        domUtils.show(domElements.projectModal);
    },

    /**
     * Save project
     */
    saveproject: async () => {
        const name = domUtils.getValue(domElements.projectNameInput).trim();
        const description = domUtils.getValue(domElements.projectDescriptionInput).trim();

        if (!name) {
            alert('project name is required.');
            return;
        }

        const workspace = await API.workspaces.get(app.currentWorkspace);

        console.log(workspace);

        if (!workspace) {
            alert('Please select a workspace first.');
            return;
        }

        //TODO: Implement API checks.

        const workflowData = {
            name: name,
            description: description,
            workspace_id: app.currentWorkspace
        };

        if (workflowData) {
            const workflow = await API.workflows.create(workflowData, app.getCurrentUserId());

            app.currentWorkflow = workflow.id;
            modals.closeprojectModal();
            
            window.app.updateUI();
            
            modals.showNotification(`project "${name}" created successfully!`);
        }
    },

    /**
     * Close project modal
     */
    closeprojectModal: () => {
        domUtils.hide(domElements.projectModal);
    },

    /**
     * Create a generic popup
     */
    createPopup: (title, content, buttons = []) => {
        const popup = domUtils.createElement('div', 'popup-overlay');
        
        const buttonHtml = buttons.map(button => 
            `<button class="popup-btn ${button.primary ? 'primary' : ''}" onclick="(${button.action.toString()})()">${button.text}</button>`
        ).join('');

        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>${title}</h3>
                    <span class="popup-close" onclick="modals.closePopup()">×</span>
                </div>
                <div class="popup-body">
                    ${content}
                </div>
                <div class="popup-footer">
                    ${buttonHtml}
                </div>
            </div>
        `;

        return popup;
    },

    /**
     * Close popup
     */
    closePopup: () => {
        const popup = document.querySelector('.popup-overlay');
        if (popup) popup.remove();
    },

    /**
     * Show notification
     */
    showNotification: (message, type = 'success', duration = 3000) => {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = domUtils.createElement('div', `notification ${type}`);
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    /**
     * Confirm dialog
     */
    confirm: (message, onConfirm, onCancel = null) => {
        const popup = modals.createPopup('Confirm', `<p>${message}</p>`, [
            {
                text: 'Yes',
                primary: true,
                action: () => {
                    modals.closePopup();
                    if (onConfirm) onConfirm();
                }
            },
            {
                text: 'No',
                action: () => {
                    modals.closePopup();
                    if (onCancel) onCancel();
                }
            }
        ]);

        document.body.appendChild(popup);
    },

    /**
     * Setup modal event listeners
     */
    setupEventListeners: () => {
        // Task modal events
        domUtils.addEventListenerSafe(domElements.saveTaskBtn, 'click', modals.saveTask);
        domUtils.addEventListenerSafe(domElements.cancelTaskBtn, 'click', modals.closeTaskModal);
        domUtils.addEventListenerSafe(domElements.addAssigneeBtn, 'click', modals.addAssignee);
        domUtils.addEventListenerSafe(domElements.addCommentBtn, 'click', modals.addComment);

        // Team member modal events
        domUtils.addEventListenerSafe(domElements.addTeamMemberBtn, 'click', modals.openTeamMemberModal);
        domUtils.addEventListenerSafe(domElements.saveTeamMemberBtn, 'click', modals.saveTeamMember);
        domUtils.addEventListenerSafe(domElements.cancelTeamMemberBtn, 'click', modals.closeTeamMemberModal);
        domUtils.addEventListenerSafe(domElements.closeTeamModal, 'click', modals.closeTeamMemberModal);

        // Project modal events
        domUtils.addEventListenerSafe(domElements.saveProjectBtn, 'click', modals.saveproject);
        domUtils.addEventListenerSafe(domElements.cancelProjectBtn, 'click', modals.closeprojectModal);

        // Add this to your setupEventListeners function in app.js
        domUtils.addEventListenerSafe(document.querySelector('.settings-access'), 'click', () => {
            if (window.settingsManager) {
                window.settingsManager.openSettings();
            } else {
                app.showErrorMessage('Settings not available. Please refresh the page.');
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('🔥 Unhandled Promise Rejection:', event.reason);
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    domUtils.hide(modal);
                }
            });
        });

        // Close modal on X click
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) domUtils.hide(modal);
            });
        });

        // Comment input enter key
        domUtils.addEventListenerSafe(domElements.commentInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                modals.addComment();
            }
        });

        // Setup color picker
        modals.setupTeamMemberColorPicker();
    },

    /**
     * Initialize modals
     */
    init: () => {
        modals.setupEventListeners();
        
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                z-index: 1001;
                animation: slideInRight 0.3s ease-out;
                max-width: 300px;
            }
            
            .notification.success {
                background: #2ecc71;
            }
            
            .notification.error {
                background: #e74c3c;
            }
            
            .notification.warning {
                background: #f39c12;
            }
            
            .notification.info {
                background: #4a6fa5;
            }
            
            .notification.fade-out {
                animation: slideOutRight 0.3s ease-out;
            }
            
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1002;
            }
            
            .popup-content {
                background: white;
                border-radius: 8px;
                min-width: 300px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            
            .popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .popup-header h3 {
                margin: 0;
                color: #333;
            }
            
            .popup-close {
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }
            
            .popup-close:hover {
                color: #333;
            }
            
            .popup-body {
                padding: 20px;
            }
            
            .popup-footer {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                padding: 20px;
                border-top: 1px solid #eee;
            }
            
            .popup-btn {
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
            }
            
            .popup-btn.primary {
                background: #4a6fa5;
                color: white;
                border-color: #4a6fa5;
            }
            
            .popup-btn:hover {
                opacity: 0.8;
            }
            
            .no-comments {
                text-align: center;
                color: #999;
                font-style: italic;
                padding: 20px;
            }
            
            .comment {
                margin-bottom: 15px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .comment-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .comment-author {
                font-weight: 600;
                color: #333;
            }
            
            .comment-time {
                font-size: 12px;
                color: #666;
            }
            
            .comment-text {
                line-height: 1.5;
                color: #555;
            }
            
            .assignee-tag {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                background: #f0f8ff;
                border-radius: 20px;
                font-size: 12px;
                margin: 2px;
            }
            
            .assignee-tag .member-avatar {
                width: 20px;
                height: 20px;
                font-size: 10px;
            }
            
            .remove-assignee {
                cursor: pointer;
                color: #e74c3c;
                font-weight: bold;
                margin-left: 4px;
            }
            
            .remove-assignee:hover {
                background: #ffebee;
                border-radius: 50%;
            }
            
            .color-option.selected {
                border-color: #333 !important;
                transform: scale(1.1);
                box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.3);
            }
            
            #assigneeSelector {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
        
        console.log('Modals initialized');
    }
};

// Export for global access
window.modals = modals;
window.openTaskModal = modals.openTaskModal;
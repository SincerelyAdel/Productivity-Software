/* app.js */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App initialization started');
    
    // Status columns for Kanban board
    const statuses = [
        'Backlog',
        'Planning',
        'To Do',
        'In Progress',
        'In Review',
        'Ready for QA',
        'Testing',
        'Ready for Deploy',
        'Completed'
    ];
    
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const assigneeSelect = document.getElementById('assigneeSelect');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const workspaceInput = document.getElementById('workspaceInput');
    const addWorkspaceBtn = document.getElementById('addWorkspaceBtn');
    const workspaceList = document.getElementById('workspaceList');
    const currentWorkspace = document.getElementById('currentWorkspace');
    const currentProject = document.getElementById('currentProject');
    const kanbanBoard = document.getElementById('kanbanBoard');
    const taskListView = document.getElementById('taskListView');
    const kanbanViewBtn = document.getElementById('kanbanViewBtn');
    const taskViewBtn = document.getElementById('taskViewBtn');
    const kanbanView = document.getElementById('kanbanView');
    const taskView = document.getElementById('taskView');
    const addTeamMemberBtn = document.getElementById('addTeamMemberBtn');
    const teamMembersContainer = document.getElementById('teamMembers');
    const teamMemberModal = document.getElementById('teamMemberModal');
    const closeTeamModal = document.getElementById('closeTeamModal');
    const memberNameInput = document.getElementById('memberName');
    const saveTeamMemberBtn = document.getElementById('saveTeamMemberBtn');
    const cancelTeamMemberBtn = document.getElementById('cancelTeamMemberBtn');
    const colorOptions = document.querySelectorAll('.color-option');

    let selectedColor = '#4a6fa5'; // Default color

    // Initialize color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update selected color
            selectedColor = option.getAttribute('data-color');
            console.log(`🎨 Color selected: ${selectedColor}`);
        });
    });

    // Select the first color by default
    if (colorOptions.length > 0) {
        colorOptions[0].classList.add('selected');
    }

    // Open team member modal
    addTeamMemberBtn.addEventListener('click', () => {
        console.log('🖱️ Add team member button clicked');
        memberNameInput.value = '';
        teamMemberModal.style.display = 'block';
        memberNameInput.focus();
    });

    const closeTeamMemberModal = () => {
        console.log('🔳 Closing team member modal');
        teamMemberModal.style.display = 'none';
    };

    closeTeamModal.addEventListener('click', closeTeamMemberModal);
    cancelTeamMemberBtn.addEventListener('click', closeTeamMemberModal);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === teamMemberModal) {
            console.log('🖱️ Clicked outside team modal to close');
            closeTeamMemberModal();
        }
    });

        // Save team member
    saveTeamMemberBtn.addEventListener('click', () => {
        const name = memberNameInput.value.trim();
        
        if (!name) {
            console.warn('⚠️ Cannot add team member with empty name');
            alert('Please enter a team member name');
            return;
        }
        
        console.log(`👥 Adding new team member: ${name} with color: ${selectedColor}`);
        
        // Generate initials from name
        const nameParts = name.split(' ');
        let initials = '';
        if (nameParts.length >= 2) {
            initials = nameParts[0][0] + nameParts[1][0];
        } else {
            initials = name.substring(0, 2);
        }
        initials = initials.toUpperCase();
        
        // Create new team member
        const newMemberId = 'user-' + Date.now();
        const newMember = {
            id: newMemberId,
            name: name,
            initials: initials,
            color: selectedColor
        };
        
        console.log('👤 New team member created:', newMember);
        
        teamMembers.push(newMember);
        renderTeamMembers();
        updateAssigneeDropdown();
        closeTeamMemberModal();
    });

    // Allow Enter key to submit in modal
    memberNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveTeamMemberBtn.click();
        }
    });

    // 2. Updated Team Members Rendering Function
    // Replace the existing renderTeamMembers function with this one
    const renderTeamMembers = () => {
        console.log(`👥 Rendering ${teamMembers.length} team members`);
        
        teamMembersContainer.innerHTML = '';
        
        teamMembers.forEach(member => {
            const memberElem = document.createElement('div');
            memberElem.className = 'team-member';
            memberElem.innerHTML = `
                <div class="team-member-avatar" style="background-color:${member.color}">${member.initials}</div>
                <div class="team-member-name">${member.name}</div>
            `;
            
            teamMembersContainer.appendChild(memberElem);
        });
        
    };
    
    // Check if DOM elements were found
    console.log('DOM Elements loaded:', {
        taskInput: !!taskInput,
        assigneeSelect: !!assigneeSelect,
        addTaskBtn: !!addTaskBtn,
        workspaceInput: !!workspaceInput,
        workspaceList: !!workspaceList,
        kanbanBoard: !!kanbanBoard,
        taskListView: !!taskListView,
        teamMembersContainer: !!teamMembersContainer
    });
    
    // Modal elements
    const taskDetailModal = document.getElementById('taskDetailModal');
    const modalTaskTitle = document.getElementById('modalTaskTitle');
    const taskDescription = document.getElementById('taskDescription');
    const taskStatus = document.getElementById('taskStatus');
    const taskAssignees = document.getElementById('taskAssignees');
    const taskDueDate = document.getElementById('taskDueDate');
    const addAssigneeBtn = document.getElementById('addAssigneeBtn');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    const closeModal = document.querySelector('.close-modal');
    const commentsList = document.getElementById('commentsList');
    const commentInput = document.getElementById('commentInput');
    const addCommentBtn = document.getElementById('addCommentBtn');

    
    // Initialize Data
    let workspaces = [];
    
    let teamMembers = [];
    
    let activeWorkspace = 'workspace-1';
    let activeProject = 'project-1';
    let currentView = 'kanban';
    
    const getCurrentWorkspace = () => {
        const workspace = workspaces.find(w => w.id === activeWorkspace);
        console.log('🔍 Getting current workspace:', workspace ? workspace.name : 'not found');
        return workspace;
    };
    
    // Get current project object
    const getCurrentProject = () => {
        const workspace = getCurrentWorkspace();
        if (!workspace) return null;
        
        const project = workspace.projects.find(p => p.id === activeProject);
        console.log('🔍 Getting current project:', project ? project.name : 'not found');
        return project;
    };
    
    // Generate the Kanban board columns
    const generateKanbanBoard = () => {
        console.log('🔄 Generating Kanban board');
        kanbanBoard.innerHTML = '';
        
        // Create a column for each status
        statuses.forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.setAttribute('data-status', status);
            
            column.innerHTML = `
                <h3 class="column-header">${status}</h3>
                <div class="task-cards" data-status="${status}"></div>
            `;
            
            kanbanBoard.appendChild(column);
        });
        
        // Populate the board with tasks
        renderTasks();
    };
    
    // Render tasks for the current project
    const renderTasks = () => {
        console.log('🔄 Rendering tasks');
        
        // Update workspace and project names in header
        const currentWs = getCurrentWorkspace();
        const currentProj = getCurrentProject();
        
        if (currentWs) currentWorkspace.textContent = currentWs.name;
        if (currentProj) currentProject.textContent = currentProj.name;
        
        if (!currentProj) {
            console.warn('⚠️ No current project found to render tasks');
            return;
        }
        
        console.log(`📋 Rendering ${currentProj.tasks.length} tasks for project: ${currentProj.name}`);
        
        // Clear all task cards first
        document.querySelectorAll('.task-cards').forEach(column => {
            column.innerHTML = '';
        });
        
        // Clear task list view
        taskListView.innerHTML = '';
        
        // Render tasks in appropriate columns
        currentProj.tasks.forEach(task => {
            // For Kanban view
            const taskCard = createTaskCard(task);
            const column = document.querySelector(`.task-cards[data-status="${task.status}"]`);
            if (column) {
                column.appendChild(taskCard);
            } else {
                console.warn(`⚠️ Column not found for status: ${task.status}`);
            }
            
            // For Task list view
            const taskDetailCard = createTaskDetailCard(task);
            taskListView.appendChild(taskDetailCard);
        });
        
        // Save to localStorage
    };
    
    // Create a task card element for Kanban view
    const createTaskCard = (task) => {
        console.log(`🎴 Creating kanban card for task: ${task.id} - ${task.title}`);
        
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('data-id', task.id);
        
        // Generate assignee HTML
        let assigneesHTML = '';
        if (task.assignees && task.assignees.length > 0) {
            assigneesHTML = '<div class="card-assignees">';
            task.assignees.forEach(assigneeId => {
                const member = teamMembers.find(m => m.id === assigneeId);
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
        
        // Event listeners for card buttons
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
            moveTask(task.id, 'left');
        });
        
        moveRightBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`➡️ Move right button clicked for task: ${task.id}`);
            moveTask(task.id, 'right');
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`🗑️ Delete button clicked for task: ${task.id}`);
            deleteTask(task.id);
        });
        
        // Make the card draggable
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            console.log(`🔄 Drag started for task: ${task.id}`);
        });
        
        // Open modal on card click
        card.addEventListener('click', () => {
            console.log(`🖱️ Card clicked for task: ${task.id}`);
            openTaskModal(task.id);
        });
        
        return card;
    };
    
    // Create task detail card for Task view
    const createTaskDetailCard = (task) => {
        console.log(`📝 Creating detail card for task: ${task.id} - ${task.title}`);
        
        const card = document.createElement('div');
        card.className = 'task-detail-card';
        card.setAttribute('data-id', task.id);
        
        // Generate assignee HTML
        let assigneesHTML = '';
        if (task.assignees && task.assignees.length > 0) {
            assigneesHTML = '<div class="detail-assignees">';
            task.assignees.forEach(assigneeId => {
                const member = teamMembers.find(m => m.id === assigneeId);
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
        
        // Format date
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
        
        // Event listeners
        const editBtn = card.querySelector('.detail-edit-btn');
        const deleteBtn = card.querySelector('.detail-delete-btn');
        
        editBtn.addEventListener('click', () => {
            console.log(`🖊️ Detail edit button clicked for task: ${task.id}`);
            openTaskModal(task.id);
        });
        
        deleteBtn.addEventListener('click', () => {
            console.log(`🗑️ Detail delete button clicked for task: ${task.id}`);
            deleteTask(task.id);
        });
        
        return card;
    };
    
    // Open task detail modal
    const openTaskModal = (taskId) => {
        console.log(`🔳 Opening modal for task: ${taskId}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when opening task modal');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`⚠️ Task ${taskId} not found in current project`);
            return;
        }
        
        console.log('📋 Task details:', task);
        
        // Fill modal with task data
        modalTaskTitle.textContent = task.title;
        taskDescription.value = task.description;
        taskDueDate.value = task.dueDate || '';
        
        // Populate status dropdown
        taskStatus.innerHTML = '';
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            if (status === task.status) {
                option.selected = true;
            }
            taskStatus.appendChild(option);
        });
        
        // Populate assignees
        renderTaskAssignees(task);
        
        // Populate comments
        renderComments(task);
        
        // Set data attribute for save button
        saveTaskBtn.setAttribute('data-task-id', taskId);
        
        // Show modal
        taskDetailModal.style.display = 'block';
    };
    
    // Render comments in task modal
    const renderComments = (task) => {
        console.log(`💬 Rendering ${task.comments ? task.comments.length : 0} comments for task: ${task.id}`);
        
        commentsList.innerHTML = '';
        
        if (task.comments && task.comments.length > 0) {
            task.comments.forEach(comment => {
                const member = teamMembers.find(m => m.id === comment.author);
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
                
                commentsList.appendChild(commentElem);
            });
        } else {
            commentsList.innerHTML = '<div class="no-comments">No comments yet</div>';
        }
    };
    
    // Add comment to task
    const addComment = () => {
        const taskId = saveTaskBtn.getAttribute('data-task-id');
        const commentText = commentInput.value.trim();
        
        if (!commentText) {
            console.warn('⚠️ Cannot add empty comment');
            return;
        }
        
        console.log(`💬 Adding comment to task: ${taskId}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when adding comment');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`⚠️ Task ${taskId} not found when adding comment`);
            return;
        }
        
        // Initialize comments array if it doesn't exist
        if (!task.comments) {
            task.comments = [];
        }
        
        // Add new comment (using first team member as author for simplicity)
        const newComment = {
            id: 'comment-' + Date.now(),
            author: teamMembers.length > 0 ? teamMembers[0].id : 'unknown',
            text: commentText,
            timestamp: new Date().toISOString()
        };
        
        task.comments.push(newComment);
        console.log('💬 Comment added:', newComment);
        
        // Clear input and re-render
        commentInput.value = '';
        renderComments(task);
    };
    
    // Render assignees in task modal
    const renderTaskAssignees = (task) => {
        console.log(`👥 Rendering ${task.assignees ? task.assignees.length : 0} assignees for task: ${task.id}`);
        
        taskAssignees.innerHTML = '';
        
        if (task.assignees && task.assignees.length > 0) {
            task.assignees.forEach(assigneeId => {
                const member = teamMembers.find(m => m.id === assigneeId);
                if (member) {
                    const assigneeElem = document.createElement('div');
                    assigneeElem.className = 'team-member';
                    assigneeElem.innerHTML = `
                        <div class="team-member-avatar" style="background-color:${member.color}">${member.initials}</div>
                        ${member.name}
                        <button class="remove-assignee" data-id="${member.id}">×</button>
                    `;
                    
                    // Remove assignee button
                    const removeBtn = assigneeElem.querySelector('.remove-assignee');
                    removeBtn.addEventListener('click', () => {
                        const taskId = saveTaskBtn.getAttribute('data-task-id');
                        console.log(`👤 Removing assignee: ${member.name} from task: ${taskId}`);
                        removeTaskAssignee(taskId, member.id);
                    });
                    
                    taskAssignees.appendChild(assigneeElem);
                }
            });
        }
    };
    
    // Remove assignee from task
    const removeTaskAssignee = (taskId, assigneeId) => {
        console.log(`👤 Removing assignee ${assigneeId} from task ${taskId}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when removing assignee');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`⚠️ Task ${taskId} not found when removing assignee`);
            return;
        }
        
        // Remove assignee
        task.assignees = task.assignees.filter(id => id !== assigneeId);
        
        // Re-render assignees
        renderTaskAssignees(task);
    };
    
    // Add assignee to task from modal
    const addTaskAssigneeFromModal = () => {
        const taskId = saveTaskBtn.getAttribute('data-task-id');
        console.log(`👤 Adding assignee UI opened for task: ${taskId}`);
        
        // For simplicity, create a dropdown with team members
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
        
        // Add select to DOM
        const selectContainer = document.createElement('div');
        selectContainer.innerHTML = selectHTML;
        taskAssignees.appendChild(selectContainer);
        
        // Event listeners
        const modalAssigneeSelect = document.getElementById('modalAssigneeSelect');
        const confirmAssigneeBtn = document.getElementById('confirmAssigneeBtn');
        const cancelAssigneeBtn = document.getElementById('cancelAssigneeBtn');
        
        confirmAssigneeBtn.addEventListener('click', () => {
            const selectedMemberId = modalAssigneeSelect.value;
            if (selectedMemberId) {
                console.log(`👤 Adding assignee ${selectedMemberId} to task ${taskId}`);
                addTaskAssignee(taskId, selectedMemberId);
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
    
    // Add assignee to task
    const addTaskAssignee = (taskId, assigneeId) => {
        console.log(`👤 Adding assignee ${assigneeId} to task ${taskId}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when adding assignee');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`⚠️ Task ${taskId} not found when adding assignee`);
            return;
        }
        
        // Initialize assignees array if it doesn't exist
        if (!task.assignees) {
            task.assignees = [];
        }
        
        // Check if assignee already exists
        if (task.assignees.includes(assigneeId)) {
            console.warn(`⚠️ Assignee ${assigneeId} already assigned to task ${taskId}`);
            return;
        }
        
        // Add assignee
        task.assignees.push(assigneeId);
        
        // Re-render assignees
        renderTaskAssignees(task);
    };
    
    // Close modal
    const closeTaskModal = () => {
        console.log('🔳 Closing task modal');
        taskDetailModal.style.display = 'none';
    };
    
    // Save task changes
    const saveTaskChanges = () => {
        const taskId = saveTaskBtn.getAttribute('data-task-id');
        console.log(`💾 Saving changes for task: ${taskId}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when saving task');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`⚠️ Task ${taskId} not found when saving changes`);
            return;
        }
        
        // Update task data
        task.description = taskDescription.value;
        task.status = taskStatus.value;
        task.dueDate = taskDueDate.value;
        
        console.log('📋 Updated task data:', {
            description: task.description,
            status: task.status,
            dueDate: task.dueDate
        });
        
        // Save and render
        renderTasks();
        closeTaskModal();
    };
    
    // Move a task left or right in the workflow
    const moveTask = (taskId, direction) => {
        console.log(`🔄 Moving task ${taskId} ${direction}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when moving task');
            return;
        }
        
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`⚠️ Task ${taskId} not found when moving ${direction}`);
            return;
        }
        
        const currentStatusIndex = statuses.indexOf(task.status);
        console.log(`🔄 Current status index: ${currentStatusIndex} (${task.status})`);
        
        if (direction === 'left' && currentStatusIndex > 0) {
            const newStatus = statuses[currentStatusIndex - 1];
            console.log(`🔄 Moving task to ${newStatus}`);
            task.status = newStatus;
        } else if (direction === 'right' && currentStatusIndex < statuses.length - 1) {
            const newStatus = statuses[currentStatusIndex + 1];
            console.log(`🔄 Moving task to ${newStatus}`);
            task.status = newStatus;
        } else {
            console.warn(`⚠️ Cannot move task ${direction} from current position`);
        }
        
        renderTasks();
    };
    
    // Delete a task
    const deleteTask = (taskId) => {
        console.log(`🗑️ Deleting task: ${taskId}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when deleting task');
            return;
        }
        
        // Remove the task
        const initialTaskCount = project.tasks.length;
        project.tasks = project.tasks.filter(t => t.id !== taskId);
        
        console.log(`🗑️ Deleted task: ${initialTaskCount - project.tasks.length} task removed`);
        
        renderTasks();
        
        // Close modal if open
        closeTaskModal();
    };
    
    // Add a new task
    const addTask = () => {
        const taskTitle = taskInput.value.trim();
        if (!taskTitle) {
            console.warn('⚠️ Cannot add task with empty title');
            return;
        }
        
        console.log(`➕ Adding new task: ${taskTitle}`);
        
        const project = getCurrentProject();
        if (!project) {
            console.warn('⚠️ No project found when adding task');
            return;
        }
        
        // Get assigned user
        let assignees = [];
        if (assigneeSelect.value) {
            assignees.push(assigneeSelect.value);
            console.log(`👤 Task assigned to: ${assigneeSelect.value}`);
        }
        
        // Create new task
        const newTaskId = 'task-' + Date.now();
        const newTask = {
            id: newTaskId,
            title: taskTitle,
            description: 'New task description',
            status: 'Backlog', // Default to first column
            dueDate: '',
            assignees: assignees,
            comments: []
        };
        
        console.log('📋 New task created:', newTask);
        
        // Add to project
        project.tasks.push(newTask);
        
        // Clear input and render
        taskInput.value = '';
        renderTasks();
        taskInput.focus();
    };
    
    // Add a new workspace
    const addWorkspace = () => {
        const workspaceName = workspaceInput.value.trim();
        if (!workspaceName) {
            console.warn('⚠️ Cannot add workspace with empty name');
            return;
        }
        
        console.log(`➕ Adding new workspace: ${workspaceName}`);
        
        const newWorkspaceId = 'workspace-' + Date.now();
        const newProjectId = 'project-' + Date.now();
        
        const newWorkspace = {
            id: newWorkspaceId,
            name: workspaceName,
            projects: [
                {
                    id: newProjectId,
                    name: 'New Project',
                    tasks: []
                }
            ]
        };
        
        console.log('📋 New workspace created:', newWorkspace);
        
        workspaces.push(newWorkspace);
        workspaceInput.value = '';
        
        renderWorkspaces();
        switchWorkspace(newWorkspaceId, newProjectId);
    };
    
    // Add a new project to active workspace
    const addProject = (workspaceId, projectName = 'New Project') => {
        console.log(`➕ Adding new project: ${projectName} to workspace: ${workspaceId}`);
        
        // Find the workspace
        const workspace = workspaces.find(w => w.id === workspaceId);
        if (!workspace) {
            console.warn(`⚠️ Workspace ${workspaceId} not found when adding project`);
            return;
        }
        
        // Create new project
        const newProjectId = 'project-' + Date.now();
        const newProject = {
            id: newProjectId,
            name: projectName,
            tasks: []
        };
        
        console.log('📋 New project created:', newProject);
        
        // Actually add the project to the workspace
        workspace.projects.push(newProject);
        
        // Render updates
        renderWorkspaces();
        
        // Switch to the new project
        switchWorkspace(workspaceId, newProjectId);
        
        return newProjectId; // Return new ID in case it's needed
    };

    // Update assignee dropdown
    const updateAssigneeDropdown = () => {
        console.log('🔄 Updating assignee dropdown');
        assigneeSelect.innerHTML = '<option value="">Assign to...</option>';
        
        teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            assigneeSelect.appendChild(option);
        });
    };
    
    // Set up drag and drop functionality
    const setupDragAndDrop = () => {
        console.log('🔄 Setting up drag and drop');
        
        // Add event listeners to the columns
        kanbanBoard.addEventListener('dragover', (e) => {
            e.preventDefault();
            const column = e.target.closest('.task-cards');
            if (column) {
                column.classList.add('drag-over');
            }
        });
        
        kanbanBoard.addEventListener('dragleave', (e) => {
            const column = e.target.closest('.task-cards');
            if (column) {
                column.classList.remove('drag-over');
            }
        });
        
        kanbanBoard.addEventListener('drop', (e) => {
            e.preventDefault();
            const column = e.target.closest('.task-cards');
            if (!column) return;
            
            column.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = column.getAttribute('data-status');
            
            console.log(`🔄 Task ${taskId} dropped into ${newStatus} column`);
            
            // Update task status
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
    
    // Event listeners
    addTaskBtn.addEventListener('click', () => {
        console.log('🖱️ Add task button clicked');
        addTask();
    });
    
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter pressed in task input');
            addTask();
        }
    });
    
    addWorkspaceBtn.addEventListener('click', () => {
        console.log('🖱️ Add workspace button clicked');
        addWorkspace();
    });
    
    workspaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter pressed in workspace input');
            addWorkspace();
        }
    });
    
    kanbanViewBtn.addEventListener('click', () => {
        console.log('🖱️ Kanban view button clicked');
        switchView('kanban');
    });
    
    taskViewBtn.addEventListener('click', () => {
        console.log('🖱️ Task view button clicked');
        switchView('task');
    });
    
    addTeamMemberBtn.addEventListener('click', () => {
        console.log('🖱️ Add team member button clicked');
        addTeamMember();
    });
    
    // Modal event listeners
    closeModal.addEventListener('click', () => {
        console.log('🖱️ Close modal button clicked');
        closeTaskModal();
    });
    
    cancelTaskBtn.addEventListener('click', () => {
        console.log('🖱️ Cancel task button clicked');
        closeTaskModal();
    });
    
    saveTaskBtn.addEventListener('click', () => {
        console.log('🖱️ Save task button clicked');
        saveTaskChanges();
    });
    
    // Comment functionality
    addCommentBtn.addEventListener('click', () => {
        console.log('🖱️ Add comment button clicked');
        addComment();
    });
    
    commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter pressed in comment input');
            addComment();
        }
    });
    
    // Add assignee button in modal
    addAssigneeBtn.addEventListener('click', () => {
        console.log('🖱️ Add assignee button clicked');
        addTaskAssigneeFromModal();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskDetailModal) {
            console.log('🖱️ Clicked outside modal to close');
            closeTaskModal();
        }
    });
    
    // Render workspaces and projects in sidebar
    const renderWorkspaces = () => {
        console.log('🔄 Rendering workspaces');
        workspaceList.innerHTML = '';
        
        workspaces.forEach(workspace => {
            // Create workspace tree item
            const wsItem = document.createElement('li');
            wsItem.className = 'tree-item workspace-item';
            wsItem.setAttribute('data-id', workspace.id);
            
            // Determine if workspace is active
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
            
            workspaceList.appendChild(wsItem);
        });
        
        // Add event listeners to tree items
        addTreeEventListeners();
        
        // Update assignee dropdown
        updateAssigneeDropdown();
        
        // Render team members
        renderTeamMembers();
    };
    
    // Add event listeners to tree items
    const addTreeEventListeners = () => {
        console.log('🔄 Adding tree event listeners');
        
        // Workspace toggles
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
        
        // Project toggles
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
        
        // Workspace headers
        document.querySelectorAll('.workspace-item .tree-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.closest('.tree-item');
                const workspaceId = item.getAttribute('data-id');
                const workspace = workspaces.find(w => w.id === workspaceId);
                
                console.log(`🌳 Clicked on workspace: ${workspaceId}`);
                
                if (workspace && workspace.projects.length > 0) {
                    switchWorkspace(workspaceId, workspace.projects[0].id);
                }
            });
        });
        
        // Project headers
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
        
        // New project items
        document.querySelectorAll('.new-project-item').forEach(item => {
            item.addEventListener('click', () => {
                const parent = item.closest('.tree-children');
                const workspaceId = parent.getAttribute('data-parent');
                
                console.log(`🌳 Add new project clicked for workspace: ${workspaceId}`);
                
                addProject(workspaceId);
            });
        });
        
        // New task items
        document.querySelectorAll('.new-task-item').forEach(item => {
            item.addEventListener('click', () => {
                console.log('🌳 Add new task clicked');
                // Focus the task input field
                taskInput.focus();
            });
        });
    };
    
    // Switch active workspace and project
    const switchWorkspace = (workspaceId, projectId) => {
        console.log(`🔀 Switching to workspace: ${workspaceId}, project: ${projectId}`);
        
        activeWorkspace = workspaceId;
        activeProject = projectId;
        
        // Update tree view (visual indicators)
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
        }
        
        // Activate project
        const projItem = document.querySelector(`.project-item[data-id="${projectId}"]`);
        if (projItem) {
            const projHeader = projItem.querySelector('.tree-header');
            projItem.classList.add('active');
            projHeader.classList.add('active');
        }
        
        // Render tasks for the new active project
        renderTasks();
    };
    
    // Switch between views (Kanban/Task)
    const switchView = (view) => {
        console.log(`🔀 Switching to ${view} view`);
        
        currentView = view;
        
        // Update view buttons
        kanbanViewBtn.classList.toggle('active', view === 'kanban');
        taskViewBtn.classList.toggle('active', view === 'task');
        
        // Show/hide view containers
        kanbanView.classList.toggle('active', view === 'kanban');
        taskView.classList.toggle('active', view === 'task');
    };
    
    // Initialize the app
    console.log('🚀 Initializing app...');
    renderWorkspaces();
    generateKanbanBoard();
    setupDragAndDrop();
    switchView('kanban');
    console.log('✅ App initialized successfully');
});

document.addEventListener('DOMContentLoaded', () => {
    // Other initialization code remains the same...
    
    // Initialize the first color as selected
    if (colorOptions && colorOptions.length > 0) {
        colorOptions[0].classList.add('selected');
        selectedColor = colorOptions[0].getAttribute('data-color');
    }
});
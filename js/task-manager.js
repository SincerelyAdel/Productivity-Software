import { getCurrentProject } from './models.js';

export const getTaskById = (taskId) => {
    const project = getCurrentProject();
    if (!project) return null;
    
    return project.tasks.find(t => t.id === taskId);
};

export const addTask = (taskTitle, assigneeId = null) => {
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
    
    let assignees = [];
    if (assigneeId) {
        assignees.push(assigneeId);
        console.log(`👤 Task assigned to: ${assigneeId}`);
    }
    
    const newTaskId = 'task-' + Date.now();
    const newTask = {
        id: newTaskId,
        title: taskTitle,
        description: 'New task description',
        status: 'Backlog',
        dueDate: '',
        assignees: assignees,
        comments: []
    };
    
    console.log('📋 New task created:', newTask);
    
    project.tasks.push(newTask);
    
    return newTaskId;
};

export const moveTask = (taskId, direction, statuses) => {
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
};

export const updateTaskStatus = (taskId, newStatus) => {
    const task = getTaskById(taskId);
    if (!task) {
        console.warn(`⚠️ Task ${taskId} not found when updating status`);
        return;
    }
    
    console.log(`🔄 Updating task ${taskId} status to ${newStatus}`);
    task.status = newStatus;
};

export const deleteTask = (taskId) => {
    console.log(`🗑️ Deleting task: ${taskId}`);
    
    const project = getCurrentProject();
    if (!project) {
        console.warn('⚠️ No project found when deleting task');
        return;
    }
    
    const initialTaskCount = project.tasks.length;
    project.tasks = project.tasks.filter(t => t.id !== taskId);
    
    console.log(`🗑️ Deleted task: ${initialTaskCount - project.tasks.length} task removed`);
};

export const saveTaskChanges = (taskId, description, status, dueDate) => {
    console.log(`💾 Saving changes for task: ${taskId}`);
    
    const task = getTaskById(taskId);
    if (!task) {
        console.warn(`⚠️ Task ${taskId} not found when saving changes`);
        return;
    }
    
    task.description = description;
    task.status = status;
    task.dueDate = dueDate;
    
    console.log('📋 Updated task data:', {
        description: task.description,
        status: task.status,
        dueDate: task.dueDate
    });
};

export const addComment = (taskId, commentText, authorId) => {
    if (!commentText) {
        console.warn('⚠️ Cannot add empty comment');
        return;
    }
    
    console.log(`💬 Adding comment to task: ${taskId}`);
    
    const task = getTaskById(taskId);
    if (!task) {
        console.warn(`⚠️ Task ${taskId} not found when adding comment`);
        return;
    }
    
    if (!task.comments) {
        task.comments = [];
    }
    
    const newComment = {
        id: 'comment-' + Date.now(),
        author: authorId || 'unknown',
        text: commentText,
        timestamp: new Date().toISOString()
    };
    
    task.comments.push(newComment);
    console.log('💬 Comment added:', newComment);
    
    return newComment;
};

export const addTaskAssignee = (taskId, assigneeId) => {
    console.log(`👤 Adding assignee ${assigneeId} to task ${taskId}`);
    
    const task = getTaskById(taskId);
    if (!task) {
        console.warn(`⚠️ Task ${taskId} not found when adding assignee`);
        return;
    }
    
    if (!task.assignees) {
        task.assignees = [];
    }
    
    if (task.assignees.includes(assigneeId)) {
        console.warn(`⚠️ Assignee ${assigneeId} already assigned to task ${taskId}`);
        return;
    }
    
    task.assignees.push(assigneeId);
};

export const removeTaskAssignee = (taskId, assigneeId) => {
    console.log(`👤 Removing assignee ${assigneeId} from task ${taskId}`);
    
    const task = getTaskById(taskId);
    if (!task) {
        console.warn(`⚠️ Task ${taskId} not found when removing assignee`);
        return;
    }
    
    task.assignees = task.assignees.filter(id => id !== assigneeId);
};
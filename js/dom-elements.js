export const domElements = {
    // Task elements
    taskInput: document.getElementById('taskInput'),
    assigneeSelect: document.getElementById('assigneeSelect'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    
    // Workspace elements
    workspaceInput: document.getElementById('workspaceInput'),
    addWorkspaceBtn: document.getElementById('addWorkspaceBtn'),
    workspaceList: document.getElementById('workspaceList'),
    currentWorkspace: document.getElementById('currentWorkspace'),
    currentProject: document.getElementById('currentProject'),
    
    // View elements
    kanbanBoard: document.getElementById('kanbanBoard'),
    taskListView: document.getElementById('taskListView'),
    kanbanViewBtn: document.getElementById('kanbanViewBtn'),
    taskViewBtn: document.getElementById('taskViewBtn'),
    kanbanView: document.getElementById('kanbanView'),
    taskView: document.getElementById('taskView'),
    
    // Team member elements
    addTeamMemberBtn: document.getElementById('addTeamMemberBtn'),
    teamMembersContainer: document.getElementById('teamMembers'),
    teamMemberModal: document.getElementById('teamMemberModal'),
    closeTeamModal: document.getElementById('closeTeamModal'),
    memberNameInput: document.getElementById('memberName'),
    saveTeamMemberBtn: document.getElementById('saveTeamMemberBtn'),
    cancelTeamMemberBtn: document.getElementById('cancelTeamMemberBtn'),
    colorOptions: document.querySelectorAll('.color-option'),
    
    // Task detail modal elements
    taskDetailModal: document.getElementById('taskDetailModal'),
    modalTaskTitle: document.getElementById('modalTaskTitle'),
    taskDescription: document.getElementById('taskDescription'),
    taskStatus: document.getElementById('taskStatus'),
    taskAssignees: document.getElementById('taskAssignees'),
    taskDueDate: document.getElementById('taskDueDate'),
    addAssigneeBtn: document.getElementById('addAssigneeBtn'),
    saveTaskBtn: document.getElementById('saveTaskBtn'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    closeModal: document.querySelector('.close-modal'),
    
    // Comment elements
    commentsList: document.getElementById('commentsList'),
    commentInput: document.getElementById('commentInput'),
    addCommentBtn: document.getElementById('addCommentBtn'),
    
    // Project modal elements
    projectModal: document.getElementById('projectModal'),
    closeProjectModal: document.getElementById('closeProjectModal'),
    projectNameInput: document.getElementById('projectNameInput'),
    saveProjectBtn: document.getElementById('saveProjectBtn'),
    cancelProjectBtn: document.getElementById('cancelProjectBtn'),
    
    // Gantt view elements
    ganttViewBtn: document.getElementById('ganttViewBtn'),
    ganttView: document.getElementById('ganttView'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    ganttTimelineHeader: document.getElementById('ganttTimelineHeader'),
    ganttChart: document.getElementById('ganttChart'),
    ganttStartDateElem: document.getElementById('ganttStartDate'),
    ganttEndDateElem: document.getElementById('ganttEndDate')
};
export const statuses = [
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

export let workspaces = [];
export let teamMembers = [];
export let activeWorkspace = 'workspace-1';
export let activeProject = 'project-1';
export let currentView = 'kanban';

export let zoomLevel = 3; 
export let dayWidth = 100;
export let ganttStartDate = new Date();
export let ganttEndDate = new Date();

export const updateActiveWorkspace = (workspaceId) => {
    activeWorkspace = workspaceId;
};

export const updateActiveProject = (projectId) => {
    activeProject = projectId;
};

export const updateCurrentView = (view) => {
    currentView = view;
};

export const updateZoomLevel = (newLevel) => {
    if (newLevel >= 1 && newLevel <= 5) {
        zoomLevel = newLevel;
    }
};

export const getCurrentWorkspace = () => {
    const workspace = workspaces.find(w => w.id === activeWorkspace);
    console.log('🔍 Getting current workspace:', workspace ? workspace.name : 'not found');
    return workspace;
};

export const getCurrentProject = () => {
    const workspace = getCurrentWorkspace();
    if (!workspace) return null;
    
    const project = workspace.projects.find(p => p.id === activeProject);
    console.log('🔍 Getting current project:', project ? project.name : 'not found');
    return project;
};

export const updateDayWidth = () => {
    switch (zoomLevel) {
        case 1: dayWidth = 30; break;  
        case 2: dayWidth = 60; break;  
        case 3: dayWidth = 100; break; 
        case 4: dayWidth = 150; break; 
        case 5: dayWidth = 200; break; 
    }
    return dayWidth;
};
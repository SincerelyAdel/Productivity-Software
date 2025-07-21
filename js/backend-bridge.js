// Minimal Backend Bridge - Compatible with existing app.js
const BASE_URL = 'http://localhost:8000';

// Core API wrapper
class API {
  static async request(method, endpoint, data = null, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(data && { body: JSON.stringify(data) })
    });
    
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json().catch(() => ({}));
  }

  // Direct API methods
  static members = {
    getAll: () => API.request('GET', '/members'),
    get: (id) => API.request('GET', `/members/${id}`),
    create: (data) => API.request('POST', '/members', data),
    update: (id, data) => API.request('PUT', `/members/${id}`, data),
    delete: (id) => API.request('DELETE', `/members/${id}`),
    profile: (id) => API.request('GET', `/member/${id}/profile-picture`)
  };

  static workspaces = {
    getAll: () => API.request('GET', '/workspaces'),
    get: (id) => API.request('GET', `/workspaces/${id}`),
    create: (data, createdBy) => API.request('POST', `/workspaces?created_by=${createdBy}`, data),
    update: (id, data) => API.request('PUT', `/workspaces/${id}`, data),
    delete: (id) => API.request('DELETE', `/workspaces/${id}`)
  };

  static workflows = {
    getAll: (workspaceId) => API.request('GET', '/workflows', null, { workspace_id: workspaceId }),
    get: (id) => API.request('GET', `/workflows/${id}`),
    create: (data, createdBy) => API.request('POST', `/workflows?created_by=${createdBy}`, data),
    update: (id, data) => API.request('PUT', `/workflows/${id}`, data),
    delete: (id) => API.request('DELETE', `/workflows/${id}`)
  };

  static tasks = {
    getAll: (workflowId) => API.request('GET', '/tasks', null, { workflow_id: workflowId }),
    get: (id) => API.request('GET', `/tasks/${id}`),
    create: (data, createdBy) => API.request('POST', `/tasks?created_by=${createdBy}`, data),
    update: (id, data) => API.request('PUT', `/tasks/${id}`, data),
    delete: (id) => API.request('DELETE', `/tasks/${id}`),
    assign: (taskId, memberId) => API.request('POST', `/tasks/${taskId}/assign/${memberId}`),
    unassign: (taskId, memberId) => API.request('DELETE', `/tasks/${taskId}/unassign/${memberId}`)
  };

  static subtasks = {
    getAll: (taskId) => API.request('GET', '/subtasks', null, { task_id: taskId }),
    create: (data, createdBy) => API.request('POST', `/subtasks?created_by=${createdBy}`, data),
    update: (id, data) => API.request('PUT', `/subtasks/${id}`, data),
    delete: (id) => API.request('DELETE', `/subtasks/${id}`)
  };

  static messages = {
      getAll: async (taskId) => {
        const messages = await API.request('GET', `/chat-messages/${taskId}`);

        const enrichedMessages = await Promise.all(
          messages.map(async (msg) => {
            try {
              const member = await API.members.get(msg.author_id);
              return {
                ...msg,
                author_name: member?.name || `User ${msg.author_id}`
              };
            } catch (e) {
              console.warn(`Failed to resolve author_id: ${msg.author_id}`, e);
              return {
                ...msg,
                author_name: `User ${msg.author_id}`
              };
            }
          })
        );

        return enrichedMessages;
      },
    create: (data, authorId) => API.request('POST', `/chat-messages?author_id=${authorId}`, data),
    delete: (id) => API.request('DELETE', `/chat-messages/${id}`)
  };

  static statusTemplates = {
    getAll: () => API.request('GET', '/status-templates'),
    create: (data, createdBy) => API.request('POST', `/status-templates?created_by=${createdBy}`, data)
  };

  static statusColumns = {
    getAll: (templateId = null) => API.request('GET', '/status-columns', null, { template_id: templateId }),
    create: (data) => API.request('POST', '/status-columns', data)
  };

  static activities = {
    getAll: (workspaceId, memberId, taskId, limit = 50) => 
      API.request('GET', '/activities', null, { workspace_id: workspaceId, member_id: memberId, task_id: taskId, limit }),
    create: (data) => API.request('POST', '/activities', data),
    delete: (activityLogId) => API.request('DELETE', '/activities', null, { activity_id: activityLogId })
  };

  static assignees = {
    getAll: (taskId) => API.request('GET', '/assignees', null, { task_id: taskId })
  }

  static attachments = {
    getAll: (taskId) => API.request('GET', '/attachments', null, { task_id: taskId }),
    download: (attachmentId) => {
      const url = `${BASE_URL}/attachments/${attachmentId}/download`;

      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}

const backendBridge = {
  statusColumns: [],

  async init() {
    try {
      await API.request('GET', '/'); // Test connection
      console.log('✅ Backend connected');

      this.statusColumns = await API.statusColumns.getAll();
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    } 
  },

  async loadWorkspaces() {
    try {
      const workspaces = await API.workspaces.getAll();
      
      const transformedWorkspaces = await Promise.all(
        workspaces.map(async workspace => {
          const workflows = await API.workflows.getAll(workspace.id);
          return {
            id: workspace.id,
            name: workspace.name,
            created_at: workspace.created_at,
            projects: workflows.map(workflow => ({
              id: workflow.id,
              name: workflow.name,
              description: workflow.description || ''
            }))
          };
        })
      );
      
      return transformedWorkspaces;
    } catch (error) {
      console.error('❌ Failed to load workspaces:', error);
      return [];
    }
  },

  async loadMembers() {
    try {
      return await API.members.getAll();
    } catch (error) {
      console.error('❌ Failed to load members:', error);
      return [];
    }
  },

  async loadTasks(workflowId) {
    try {
      const [tasks, templates] = await Promise.all([
        API.tasks.getAll(workflowId),
        API.statusTemplates.getAll()
      ]);

      if (templates.length > 0) {
        this.statusColumns = await API.statusColumns.getAll();
      }

      const assigneesPerTask = await Promise.all(
        tasks.map(task => API.assignees.getAll(task.id))
      );

      // Transform tasks
      return tasks.map((task, index) => ({
        id: task.id,
        title: task.title || '',
        description: task.description || '',
        status: this.getStatusByColumnId(task.column_id),
        startDate: task.start_date,
        endDate: task.end_date,
        dueDate: task.due_date,
        workflow_id: task.workflow_id,
        column_id: task.column_id,
        progress: task.progress_percentage || 0,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        subtasks: task.subtasks || [],
        comments: task.chat_messages || [],
        assignees: assigneesPerTask[index]
      }));
    } catch (error) {
      console.error('❌ Failed to load tasks:', error);
      return [];
    }
  },

  async loadTask(taskId) {
    try {
      const task = await API.tasks.get(taskId);
      const subtasks = await API.subtasks.getAll(taskId);
      const comments = await API.messages.getAll(taskId);

      return {
        id: task.id,
        title: task.title ?? '',
        description: task.description ?? '',
        status: this.getStatusByColumnId(task.column_id),
        startDate: task.start_date,
        endDate: task.end_date,
        dueDate: task.due_date,
        assignees: task.assignees?.map(member => member.id) ?? [],
        workflow_id: task.workflow_id,
        column_id: task.column_id,
        progress: task.progress_percentage ?? 0,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        subtasks: subtasks,
        comments: comments
      };
    } catch (error) {
      console.error(`❌ Failed to load task ${taskId}:`, error);
      return null;
    }
  },

  async createTask(taskData, createdBy) {
    try {
      const backendData = {
        title: taskData.title,
        description: taskData.description || '',
        workflow_id: taskData.workflow_id,
        column_id: this.getColumnIdByStatus(taskData.status),
        assignee_ids: taskData.assignees || []
      };

      const newTask = await API.tasks.create(backendData, createdBy);
      
      return {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description || '',
        status: taskData.status,
        workflow_id: newTask.workflow_id,
        assignees: taskData.assignees || [],
        createdAt: newTask.created_at
      };
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw error;
    }
  },

  async updateTask(taskId, updates) {
    try {
      const backendData = {};
      
      if (updates.title) backendData.title = updates.title;
      if (updates.description) backendData.description = updates.description;
      if (updates.status) backendData.column_id = this.getColumnIdByStatus(updates.status);
      if (updates.progress) backendData.progress_percentage = updates.progress;
      if (updates.start_date) backendData.start_date = updates.start_date;
      if (updates.end_date) backendData.end_date = updates.end_date;

      await API.tasks.update(taskId, backendData);
      return true;
    } catch (error) {
      console.error('❌ Failed to update task:', error);
      throw error;
    }
  },

  async deleteTask(taskId) {
    try {
      await API.tasks.delete(taskId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
      throw error;
    }
  },

  async loadTaskDetails(taskId) {
    try {
      const [task, subtasks, messages, assignees] = await Promise.all([
        API.tasks.get(taskId),
        API.subtasks.getAll(taskId),
        API.messages.getAll(taskId),
        API.assignees.getAll(taskId)
      ]);

      return {
        ...task,
        status: this.getStatusByColumnId(task.column_id),
        subtasks: subtasks || [],
        messages: messages || [],
        assignees: assignees || []
      };
    } catch (error) {
      console.error('❌ Failed to load task details:', error);
      return null;
    }
  },

  getColumnIdByStatus(status) {
    const column = this.statusColumns.find(col => 
      col.name.toLowerCase().replace(/\s+/g, '_') === status
    );    

    return column?.id;
  },

  getStatusByColumnId(columnId) {
    const column = this.statusColumns.find(col => col.id === columnId);
    return column ? column.name.toLowerCase().replace(/\s+/g, '_') : 'not_started';
  },

  async loadTaskLogs(taskId) {
    try {
      const logs = await API.activities.getAll(null, null, taskId);
      
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          let memberData = null;
          
          if (log.member_id) {
            try {
              memberData = await API.members.get(log.member_id);
            } catch (error) {
              console.warn(`Failed to fetch member ${log.member_id}:`, error);
            }
          }
          
          return {
            id: log.id,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            description: log.description,
            created_at: log.created_at,
            member_id: log.member_id,
            workspace_id: log.workspace_id,
            task_id: log.task_id,
            member_name: memberData ? 
              `${memberData.first_name} ${memberData.last_name}` : 
              (log.member_name || null),
            member_avatar_color: memberData?.avatar_color || null,
          };
        })
      );
      
      return enrichedLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
    } catch (error) {
      console.error('❌ Failed to load task logs:', error);
      return [];
    }
  },

};

// Legacy function names for backward compatibility with your existing code
window.initializeApp = async () => {
  return await backendBridge.init();
};

window.get_workspaces_data = () => backendBridge.loadWorkspaces();
window.get_members_data = () => backendBridge.loadMembers();
window.get_workflows_data = (workspaceId) => API.workflows.getAll(workspaceId);
window.get_tasks_data = (workflowId) => backendBridge.loadTasks(workflowId);
window.get_task_data = (taskId) => API.tasks.get(taskId);
window.create_workspace_data = (data, createdBy) => API.workspaces.create(data, createdBy);

// Synchronous data access for UI updates (uses cached app state)
window.get_workspace_data = (workspaceId) => {
  if (window.app && window.app.workspaces) {
    return window.app.workspaces.find(ws => ws.id === workspaceId);
  }
  return null;
};

window.get_workflow_data = (workflowId) => {
  if (window.app && window.app.workflows) {
    return window.app.workflows.find(wf => wf.id === workflowId);
  }
  // Fallback: look in current workspace projects
  if (window.app && window.app.workspaces) {
    for (const workspace of window.app.workspaces) {
      const project = workspace.projects?.find(p => p.id === workflowId);
      if (project) return project;
    }
  }
  return null;
};

window.createTaskWithState = async (taskData, createdBy) => {
  const newTask = await backendBridge.createTask(taskData, createdBy);
  // Update app state
  if (window.app && window.app.currentWorkflowTasks) {
    window.app.currentWorkflowTasks.push(newTask);
  }
  return newTask;
};

window.updateTaskWithState = async (taskId, updates) => {
  await backendBridge.updateTask(taskId, updates);

  if (window.app && window.app.currentWorkflowTasks) {
    const index = window.app.currentWorkflowTasks.findIndex(t => t.id == taskId);
    if (index >= 0) {
      window.app.currentWorkflowTasks[index] = { 
        ...window.app.currentWorkflowTasks[index], 
        ...updates 
      };
    }
  }
};

window.deleteTaskWithState = async (taskId) => {
  await backendBridge.deleteTask(taskId);
  // Update app state
  if (window.app && window.app.currentWorkflowTasks) {
    window.app.currentWorkflowTasks = window.app.currentWorkflowTasks.filter(t => t.id != taskId);
  }
};

window.loadTaskDetails = (taskId) => backendBridge.loadTaskDetails(taskId);

window.refreshTasksIfNeeded = async (forceRefresh = false) => {
  if (window.app && window.app.currentWorkflow && forceRefresh) {
    window.app.currentWorkflowTasks = await backendBridge.loadTasks(window.app.currentWorkflow);
  }
  return true;
};

window.getTaskById = (taskId) => {
  if (window.app && window.app.currentWorkflowTasks) {
    return window.app.currentWorkflowTasks.find(t => t.id == taskId);
  }
  return null;
};

// Utility functions for compatibility
window.formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

window.getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
};

window.sanitizeHTML = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

window.getTaskPriority = (task) => {
  if (!task?.dueDate) return 'low';
  
  const dueDate = new Date(task.dueDate);
  const today = new Date();
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0 && task.status !== 'completed') return 'overdue';
  if (diffDays <= 2 && task.status !== 'completed') return 'high';
  if (diffDays <= 7) return 'medium';
  return 'low';
};

// Export API for direct use if needed
window.API = API;
window.backendBridge = backendBridge;

console.log('🚀 Minimal Backend Bridge loaded - Compatible with existing app.js');
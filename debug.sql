-- Sample Activity Log Data
-- Assuming the following IDs exist:
-- Members: 1 (John Doe), 2 (Jane Smith), 3 (Mike Johnson)
-- Workspaces: 1 (Marketing Team), 2 (Development Team)
-- Tasks: 1 (Website Redesign), 2 (API Development), 3 (User Testing)

INSERT INTO activitylog (
    action, entity_type, entity_id, description, created_at, 
    member_id, workspace_id, task_id
) VALUES 

-- Task Creation Activities
('task_created', 'task', 1, 'Created new task: Website Redesign', '2024-01-15 09:30:00', 1, 1, 1),
('task_created', 'task', 2, 'Created new task: API Development', '2024-01-15 10:15:00', 2, 2, 2),
('task_created', 'task', 3, 'Created new task: User Testing', '2024-01-15 11:00:00', 3, 1, 3),

-- Status Change Activities  
('status_changed', 'task', 1, 'Status changed from "Not Started" to "In Progress"', '2024-01-15 14:20:00', 1, 1, 1),
('status_changed', 'task', 2, 'Status changed from "In Progress" to "Under Review"', '2024-01-16 09:45:00', 2, 2, 2),
('status_changed', 'task', 1, 'Status changed from "In Progress" to "Completed"', '2024-01-17 16:30:00', 1, 1, 1),

-- Task Update Activities
('task_updated', 'task', 1, 'Updated task description and added end date', '2024-01-15 15:10:00', 1, 1, 1),
('task_updated', 'task', 2, 'Modified task title and updated requirements', '2024-01-16 11:20:00', 2, 2, 2),
('task_updated', 'task', 3, 'Added detailed acceptance criteria', '2024-01-16 13:45:00', 3, 1, 3),

-- Assignee Management Activities
('assignee_added', 'task', 1, 'Added Jane Smith as assignee', '2024-01-15 12:00:00', 1, 1, 1),
('assignee_added', 'task', 2, 'Added Mike Johnson as assignee', '2024-01-15 14:30:00', 2, 2, 2),
('assignee_removed', 'task', 3, 'Removed John Doe from assignees', '2024-01-16 10:15:00', 3, 1, 3),
('assignee_added', 'task', 3, 'Added Jane Smith as assignee', '2024-01-16 10:20:00', 3, 1, 3),

-- Subtask Activities
('subtask_added', 'subtask', 1, 'Added subtask: Create wireframes for homepage', '2024-01-15 16:00:00', 1, 1, 1),
('subtask_added', 'subtask', 2, 'Added subtask: Design color scheme', '2024-01-15 16:05:00', 1, 1, 1),
('subtask_completed', 'subtask', 1, 'Completed subtask: Create wireframes for homepage', '2024-01-16 14:30:00', 1, 1, 1),
('subtask_added', 'subtask', 3, 'Added subtask: Set up database endpoints', '2024-01-16 08:15:00', 2, 2, 2),
('subtask_added', 'subtask', 4, 'Added subtask: Write API documentation', '2024-01-16 08:20:00', 2, 2, 2),
('subtask_completed', 'subtask', 3, 'Completed subtask: Set up database endpoints', '2024-01-17 12:45:00', 2, 2, 2),

-- Comment Activities
('comment_added', 'message', 1, 'Added comment: "Looking great so far! Can we adjust the color palette?"', '2024-01-16 15:20:00', 2, 1, 1),
('comment_added', 'message', 2, 'Added comment: "The API structure looks solid. Should we add rate limiting?"', '2024-01-16 16:45:00', 3, 2, 2),
('comment_added', 'message', 3, 'Added comment: "I''ve updated the wireframes based on feedback"', '2024-01-17 09:15:00', 1, 1, 1),
('comment_added', 'message', 4, 'Added comment: "Ready for testing phase"', '2024-01-17 14:20:00', 3, 1, 3),

-- File Upload Activities
('file_uploaded', 'attachment', 1, 'Uploaded file: homepage_wireframe.pdf', '2024-01-15 17:30:00', 1, 1, 1),
('file_uploaded', 'attachment', 2, 'Uploaded file: api_specification.docx', '2024-01-16 13:15:00', 2, 2, 2),
('file_uploaded', 'attachment', 3, 'Uploaded file: color_palette.png', '2024-01-16 18:00:00', 1, 1, 1),
('file_uploaded', 'attachment', 4, 'Uploaded file: test_results.xlsx', '2024-01-17 11:30:00', 3, 1, 3),

-- Priority Change Activities
('priority_changed', 'task', 2, 'Priority changed from "Medium" to "High"', '2024-01-16 12:00:00', 2, 2, 2),
('priority_changed', 'task', 3, 'Priority changed from "Low" to "Medium"', '2024-01-17 08:45:00', 3, 1, 3),

-- Due Date Activities
('due_date_updated', 'task', 1, 'Due date changed from 2024-01-20 to 2024-01-18', '2024-01-16 09:30:00', 1, 1, 1),
('due_date_updated', 'task', 2, 'Due date set to 2024-01-25', '2024-01-16 14:15:00', 2, 2, 2),

-- Workflow Activities
('workflow_updated', 'workflow', 1, 'Updated workflow settings and templates', '2024-01-15 08:45:00', 1, 1, NULL),
('workflow_created', 'workflow', 2, 'Created new workflow: Bug Tracking', '2024-01-16 07:30:00', 2, 2, NULL),

-- System Activities
('system_backup', 'system', 1, 'Automated system backup completed', '2024-01-17 02:00:00', NULL, NULL, NULL),
('data_export', 'workspace', 1, 'Exported workspace data', '2024-01-17 13:20:00', 1, 1, NULL),

-- Recent Activities (for realistic timeline)
('task_viewed', 'task', 1, 'Viewed task details', '2024-01-17 17:45:00', 2, 1, 1),
('task_viewed', 'task', 2, 'Viewed task details', '2024-01-17 17:50:00', 3, 2, 2),
('comment_added', 'message', 5, 'Added comment: "Excellent work team! Ready to deploy."', '2024-01-17 18:00:00', 1, 1, 1);
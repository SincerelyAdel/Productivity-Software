from sqlmodel import Session, select, delete
from datetime import datetime, date
from models import (
    StatusColumn, create_db_and_tables, engine,
    Workspace, Workflow, Task, Member, Subtask, ChatMessage,
    StatusTemplate, ActivityLog, 
    TaskMemberLink, WorkspaceMemberLink, WorkflowMemberLink,
    ksa_now
)

create_db_and_tables()

# Clear existing data
with Session(engine) as session:
    # Delete all records in reverse order to avoid foreign key constraints
    session.exec(delete(ActivityLog))
    session.exec(delete(ChatMessage))
    session.exec(delete(Subtask))
    session.exec(delete(TaskMemberLink))
    session.exec(delete(WorkflowMemberLink))
    session.exec(delete(WorkspaceMemberLink))
    session.exec(delete(Task))
    session.exec(delete(Workflow))
    session.exec(delete(Workspace))
    session.exec(delete(StatusTemplate))
    session.exec(delete(Member))
    session.commit()
    print("Cleared existing data...")

with Session(engine) as session:
    # Create team members matching the app state
    members = [
        Member(id=1, name="John Doe", email="john.doe@example.com", avatar_color="#4a6fa5"),
        Member(id=2, name="Jane Smith", email="jane.smith@example.com", avatar_color="#e74c3c"),
        Member(id=3, name="Mike Johnson", email="mike.johnson@example.com", avatar_color="#2ecc71"),
        Member(id=4, name="Sarah Wilson", email="sarah.wilson@example.com", avatar_color="#f39c12")
    ]
    session.add_all(members)
    session.commit()

    # Status Template

    templates_data = [
        {
            "name": "Default Business",
            "category": "General", 
            "description": "Standard business workflow statuses",
            "special_states": '["completed", "cancelled"]',
            "is_default": True,
            "is_system": True,
            "columns": [
                {"name": "Not Started", "position": 1},
                {"name": "In Progress", "position": 2},
                {"name": "Under Review", "position": 3},
                {"name": "Completed", "position": 4},
                {"name": "On Hold", "position": 5}
            ]
        },
        {
            "name": "Development",
            "category": "Software",
            "description": "Software development workflow", 
            "special_states": '["deployed", "cancelled"]',
            "is_default": False,
            "is_system": True,
            "columns": [
                {"name": "Backlog", "position": 1},
                {"name": "In Development", "position": 2},
                {"name": "Code Review", "position": 3},
                {"name": "Testing", "position": 4},
                {"name": "Deployed", "position": 5}
            ]
        },
        {
            "name": "Marketing",
            "category": "Marketing", 
            "description": "Marketing campaign workflow",
            "special_states": '["published", "cancelled"]',
            "is_default": False,
            "is_system": True,
            "columns": [
                {"name": "Ideation", "position": 1},
                {"name": "Creation", "position": 2},
                {"name": "Review", "position": 3},
                {"name": "Approval", "position": 4},
                {"name": "Published", "position": 5}
            ]
        }
    ]
    
    template_ids = []
    with Session(engine) as session:
        for template_data in templates_data:
            columns_data = template_data.pop("columns")
            template = StatusTemplate(created_by=1, **template_data)
            session.add(template)
            session.commit()
            session.refresh(template)
            
            for col_data in columns_data:
                column = StatusColumn(template_id=template.id, **col_data)
                session.add(column)
            
            session.commit()
            template_ids.append(template.id)
    

    workspaces = [
        Workspace(id=1, name="Development", created_by=1),
        Workspace(id=2, name="Marketing", created_by=2)
    ]
    session.add_all(workspaces)
    session.commit()

    # Add all members to all workspaces
    for workspace in workspaces:
        for member in members:
            workspace_link = WorkspaceMemberLink(
                workspace_id=workspace.id, 
                member_id=member.id, 
                role="member"
            )
            session.add(workspace_link)
    session.commit()

    # Create Workflows (Projects)
    workflows = [
        Workflow(
            id=1,
            name="Website Redesign",
            workspace_id=1,
            created_by=1,
            start_date=date(2024, 12, 1),
            end_date=date(2024, 12, 30),
            progress_percentage=65.0,
            status_template="default"
        ),
        Workflow(
            id=2,
            name="Mobile App",
            workspace_id=1,
            created_by=2,
            start_date=date(2024, 11, 15),
            end_date=date(2025, 1, 15),
            progress_percentage=40.0,
            status_template="default"
        ),
        Workflow(
            id=3,
            name="Q1 Campaign",
            workspace_id=2,
            created_by=1,
            start_date=date(2024, 12, 15),
            end_date=date(2025, 3, 31),
            progress_percentage=10.0,
            status_template="default"
        )
    ]
    session.add_all(workflows)
    session.commit()

    # Add members to workflows
    workflow_assignments = [
        (1, [1, 2, 3]),  # Website Redesign: John, Jane, Mike
        (2, [2, 3]),     # Mobile App: Jane, Mike  
        (3, [1, 4])      # Q1 Campaign: John, Sarah
    ]
    
    for workflow_id, member_ids in workflow_assignments:
        for member_id in member_ids:
            workflow_link = WorkflowMemberLink(
                workflow_id=workflow_id, 
                member_id=member_id
            )
            session.add(workflow_link)
    session.commit()

    # Create Tasks with detailed data
    tasks_data = [
        # Website Redesign Tasks
        {
            "id": 1, "title": "Design Homepage", "workflow_id": 1,
            "description": "Create new homepage design with modern UI/UX principles",
            "status": "IN_PROGRESS", "assignees": [1],
            "start_date": date(2024, 12, 1), "end_date": date(2024, 12, 15),
            "estimated_hours": 40.0, "actual_hours": 25.0, "progress": 60.0,
            "subtasks": [
                {"text": "Create wireframes", "completed": True},
                {"text": "Design color scheme", "completed": False},
                {"text": "Create mockups", "completed": False}
            ],
            "comments": ["Initial mockups completed", "Need feedback on color scheme"]
        },
        {
            "id": 2, "title": "Implement Navigation", "workflow_id": 1,
            "description": "Build responsive navigation menu with mobile support",
            "status": "NOT_STARTED", "assignees": [2],
            "start_date": date(2024, 12, 10), "end_date": date(2024, 12, 20),
            "estimated_hours": 20.0, "actual_hours": 0.0, "progress": 0.0,
            "subtasks": [
                {"text": "Create mobile menu component", "completed": False},
                {"text": "Add responsive breakpoints", "completed": False}
            ],
            "comments": []
        },
        {
            "id": 3, "title": "Add Contact Form", "workflow_id": 1,
            "description": "Create contact form with validation and spam protection",
            "status": "COMPLETED", "assignees": [1, 2],
            "start_date": date(2024, 11, 20), "end_date": date(2024, 11, 30),
            "estimated_hours": 15.0, "actual_hours": 18.0, "progress": 100.0,
            "subtasks": [
                {"text": "Design form layout", "completed": True},
                {"text": "Add form validation", "completed": True},
                {"text": "Implement spam protection", "completed": True},
                {"text": "Test form submissions", "completed": True}
            ],
            "comments": ["Form validation working perfectly", "All tests passed"]
        },
        {
            "id": 4, "title": "Mobile Optimization", "workflow_id": 1,
            "description": "Optimize site for mobile devices and improve performance",
            "status": "UNDER_REVIEW", "assignees": [3],
            "start_date": date(2024, 12, 15), "end_date": date(2024, 12, 25),
            "estimated_hours": 30.0, "actual_hours": 22.0, "progress": 80.0,
            "subtasks": [
                {"text": "Responsive design testing", "completed": True},
                {"text": "Image optimization", "completed": True},
                {"text": "Performance testing", "completed": False},
                {"text": "Cross-browser testing", "completed": False}
            ],
            "comments": ["Performance improvements needed"]
        },
        {
            "id": 5, "title": "SEO Implementation", "workflow_id": 1,
            "description": "Add meta tags, structured data, and improve search rankings",
            "status": "ON_HOLD", "assignees": [1, 3],
            "start_date": date(2024, 12, 20), "end_date": date(2025, 1, 5),
            "estimated_hours": 25.0, "actual_hours": 5.0, "progress": 20.0,
            "subtasks": [
                {"text": "Research target keywords", "completed": False},
                {"text": "Add meta descriptions", "completed": False},
                {"text": "Implement structured data", "completed": False},
                {"text": "Optimize page titles", "completed": False},
                {"text": "Create sitemap", "completed": False}
            ],
            "comments": []
        },
        # Mobile App Tasks
        {
            "id": 6, "title": "Setup React Native", "workflow_id": 2,
            "description": "Initialize React Native project with necessary dependencies",
            "status": "COMPLETED", "assignees": [2],
            "start_date": date(2024, 11, 15), "end_date": date(2024, 11, 18),
            "estimated_hours": 12.0, "actual_hours": 10.0, "progress": 100.0,
            "subtasks": [
                {"text": "Install React Native CLI", "completed": True},
                {"text": "Create new project", "completed": True},
                {"text": "Setup navigation library", "completed": True},
                {"text": "Configure build tools", "completed": True}
            ],
            "comments": ["Project setup completed successfully"]
        },
        {
            "id": 7, "title": "User Authentication", "workflow_id": 2,
            "description": "Implement login/signup with JWT tokens",
            "status": "IN_PROGRESS", "assignees": [2, 3],
            "start_date": date(2024, 12, 1), "end_date": date(2024, 12, 12),
            "estimated_hours": 35.0, "actual_hours": 20.0, "progress": 55.0,
            "subtasks": [
                {"text": "Design login screen", "completed": True},
                {"text": "Implement signup form", "completed": True},
                {"text": "Setup JWT authentication", "completed": False},
                {"text": "Add token storage", "completed": False},
                {"text": "Test authentication flow", "completed": False}
            ],
            "comments": ["UI components ready", "Backend integration in progress"]
        },
        # Marketing Task
        {
            "id": 8, "title": "Content Strategy", "workflow_id": 3,
            "description": "Develop content calendar and strategy for Q1",
            "status": "NOT_STARTED", "assignees": [1],
            "start_date": date(2024, 12, 15), "end_date": date(2024, 12, 30),
            "estimated_hours": 20.0, "actual_hours": 0.0, "progress": 0.0,
            "subtasks": [
                {"text": "Analyze competitor content", "completed": False},
                {"text": "Define target audience", "completed": False},
                {"text": "Create content pillars", "completed": False},
                {"text": "Plan Q1 content calendar", "completed": False},
                {"text": "Set content KPIs", "completed": False}
            ],
            "comments": []
        }
    ]

    # Create tasks with subtasks and comments
    for task_data in tasks_data:
        # Create the task
        task = Task(
            id=task_data["id"],
            title=task_data["title"],
            description=task_data["description"],
            workflow_id=task_data["workflow_id"],
            status=task_data["status"],
            start_date=task_data["start_date"],
            end_date=task_data["end_date"],
            estimated_hours=task_data["estimated_hours"],
            actual_hours=task_data["actual_hours"],
            progress_percentage=task_data["progress"],
            created_by=task_data["assignees"][0],
            position=task_data["id"],
            completed_at=ksa_now(),
            column_id=0
        )
        session.add(task)
        session.commit()

        # Add task assignees
        for assignee_id in task_data["assignees"]:
            task_link = TaskMemberLink(task_id=task.id, member_id=assignee_id)
            session.add(task_link)

        # Add subtasks
        for subtask_data in task_data["subtasks"]:
            subtask = Subtask(
                text=subtask_data["text"],
                completed=subtask_data["completed"],
                task_id=task.id,
                created_by=task_data["assignees"][0],
                completed_at=ksa_now() if subtask_data["completed"] else None
            )
            session.add(subtask)

        # Add comments
        for comment_text in task_data["comments"]:
            comment = ChatMessage(
                content=comment_text,
                task_id=task.id,
                author_id=task_data["assignees"][0]
            )
            session.add(comment)

        # Add activity log
        activity = ActivityLog(
            action="created",
            entity_type="task",
            entity_id=task.id,
            member_id=task.created_by,
            workspace_id=1 if task_data["workflow_id"] <= 2 else 2,
            description=f"Created task: {task.title}"
        )
        session.add(activity)

    # Add some additional activity logs for variety
    additional_activities = [
        {
            "action": "completed", "entity_type": "task", "entity_id": 3,
            "member_id": 1, "workspace_id": 1, "description": "Completed task: Add Contact Form"
        },
        {
            "action": "completed", "entity_type": "task", "entity_id": 6,
            "member_id": 2, "workspace_id": 1, "description": "Completed task: Setup React Native"
        },
        {
            "action": "updated", "entity_type": "task", "entity_id": 1,
            "member_id": 1, "workspace_id": 1, "description": "Updated task progress: Design Homepage"
        },
        {
            "action": "assigned", "entity_type": "task", "entity_id": 7,
            "member_id": 3, "workspace_id": 1, "description": "Assigned to User Authentication task"
        },
        {
            "action": "created", "entity_type": "workflow", "entity_id": 1,
            "member_id": 1, "workspace_id": 1, "description": "Created workflow: Website Redesign"
        },
        {
            "action": "created", "entity_type": "workflow", "entity_id": 2,
            "member_id": 2, "workspace_id": 1, "description": "Created workflow: Mobile App"
        },
        {
            "action": "created", "entity_type": "workflow", "entity_id": 3,
            "member_id": 1, "workspace_id": 2, "description": "Created workflow: Q1 Campaign"
        }
    ]

    for activity_data in additional_activities:
        activity = ActivityLog(**activity_data)
        session.add(activity)

    session.commit()
    print("Database populated successfully with realistic project data!")
    print(f"Created:")
    print(f"  - {len(members)} team members")
    print(f"  - {len(workspaces)} workspaces") 
    print(f"  - {len(workflows)} workflows")
    print(f"  - {len(tasks_data)} tasks")
    print(f"  - Multiple subtasks, comments, and activity logs")
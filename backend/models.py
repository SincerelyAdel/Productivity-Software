from sqlmodel import SQLModel, Field, Relationship, create_engine
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
import pytz



def ksa_now():
    return datetime.now(pytz.timezone('Asia/Riyadh'))
    

class WorkspaceMemberLink(SQLModel, table=True):
    workspace_id: int = Field(foreign_key="workspace.id", primary_key=True)
    member_id: int = Field(foreign_key="member.id", primary_key=True)
    role: str = Field(default="member")
    joined_at: datetime = Field(default_factory=ksa_now)


class WorkflowMemberLink(SQLModel, table=True):
    workflow_id: int = Field(foreign_key="workflow.id", primary_key=True)
    member_id: int = Field(foreign_key="member.id", primary_key=True)
    assigned_at: datetime = Field(default_factory=ksa_now)


class TaskMemberLink(SQLModel, table=True):
    task_id: int = Field(foreign_key="task.id", primary_key=True)
    member_id: int = Field(foreign_key="member.id", primary_key=True)
    assigned_at: datetime = Field(default_factory=ksa_now)


class Workspace(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)

    name: str = Field(max_length=255, index=True)
    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    created_by: Optional[int] = Field(foreign_key="member.id")

    workflows: List["Workflow"] = Relationship(back_populates="workspace")
    members: List["Member"] = Relationship(back_populates="workspaces", link_model=WorkspaceMemberLink)
    creator: Optional["Member"] = Relationship(back_populates="created_workspaces")
    activity_logs: List["ActivityLog"] = Relationship(back_populates="workspace")


class Member(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)

    first_name: str = Field(max_length=255, index=True)
    last_name: str = Field(max_length=255, index=True)
    email: str = Field(max_length=255, unique=True, index=True)
    phoneNumber: Optional[str] = Field(max_length=255, unique=True)
    avatar_color: str = Field(default="#4a6fa5", max_length=7)
    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    password: str = Field(max_length=255)

    profile_picture_url: Optional[str] = Field(default=None, max_length=500)
    profile_picture_filename: Optional[str] = Field(default=None, max_length=255)
    profile_picture_size: Optional[int] = Field(default=None)
    profile_picture_mime_type: Optional[str] = Field(default=None, max_length=100)

    workspaces: List[Workspace] = Relationship(back_populates="members", link_model=WorkspaceMemberLink)
    workflows: List["Workflow"] = Relationship(back_populates="members", link_model=WorkflowMemberLink)
    tasks: List["Task"] = Relationship(back_populates="assignees", link_model=TaskMemberLink)
    chat_messages: List["ChatMessage"] = Relationship(back_populates="author")
    created_workspaces: List[Workspace] = Relationship(back_populates="creator")
    created_workflows: List["Workflow"] = Relationship(back_populates="creator")
    created_tasks: List["Task"] = Relationship(back_populates="creator")
    subtasks_created: List["Subtask"] = Relationship(back_populates="creator")
    created_status_templates: List["StatusTemplate"] = Relationship(back_populates="creator")
    activity_logs: List["ActivityLog"] = Relationship(back_populates="member")


class Workflow(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)

    name: str = Field(max_length=255, index=True)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    status_template: str = Field(default="default", max_length=50)
    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    created_by: Optional[int] = Field(foreign_key="member.id")

    workspace_id: int = Field(foreign_key="workspace.id")

    workspace: Workspace = Relationship(back_populates="workflows")
    tasks: List["Task"] = Relationship(back_populates="workflow")
    members: List[Member] = Relationship(back_populates="workflows", link_model=WorkflowMemberLink)
    creator: Optional[Member] = Relationship(back_populates="created_workflows")


class Task(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)

    title: str = Field(max_length=500, index=True)
    description: Optional[str] = Field(max_length=5000)
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = Field(ge=0.0)
    actual_hours: Optional[float] = Field(ge=0.0, default=0.0)
    time_spent_seconds: int = Field(default=0, ge=0)
    timer_start_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    completed_at: Optional[datetime] = None

    created_by: Optional[int] = Field(foreign_key="member.id")
    workflow_id: int = Field(foreign_key="workflow.id")
    column_id: int = Field(foreign_key="statuscolumn.id")
    
    column: Optional["StatusColumn"] = Relationship(back_populates="tasks")
    workflow: Workflow = Relationship(back_populates="tasks")
    assignees: List[Member] = Relationship(back_populates="tasks", link_model=TaskMemberLink)
    chat_messages: List["ChatMessage"] = Relationship(back_populates="task")
    subtasks: List["Subtask"] = Relationship(back_populates="task")
    creator: Optional[Member] = Relationship(back_populates="created_tasks")
    attachments: List["Attachment"] = Relationship(back_populates="task")
    activity_logs: List["ActivityLog"] = Relationship(back_populates="task")


class Subtask(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)
    text: str = Field(max_length=500)
    completed: bool = Field(default=False)

    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    completed_at: Optional[datetime] = None

    created_by: Optional[int] = Field(foreign_key="member.id")
    task_id: int = Field(foreign_key="task.id")

    task: Task = Relationship(back_populates="subtasks")
    creator: Optional[Member] = Relationship(back_populates="subtasks_created")


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)

    content: str = Field(max_length=5000)
    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    is_attachment: bool = Field(default=False)

    task_id: int = Field(foreign_key="task.id")
    author_id: int = Field(foreign_key="member.id")

    task: Task = Relationship(back_populates="chat_messages")
    author: Member = Relationship(back_populates="chat_messages")


class StatusTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    name: str = Field(max_length=255, unique=True, index=True)
    category: str = Field(max_length=100, index=True)
    description: str = Field(max_length=1000)
    special_states: str = Field(default="[]")
    is_default: bool = Field(default=False)
    is_system: bool = Field(default=False)
    created_at: datetime = Field(default_factory=ksa_now)
    updated_at: datetime = Field(default_factory=ksa_now)
    
    created_by: Optional[int] = Field(foreign_key="member.id")
    
    columns: List["StatusColumn"] = Relationship(back_populates="template")
    creator: Optional[Member] = Relationship(back_populates="created_status_templates")

class StatusColumn(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    name: str  
    position: int  

    template_id: int = Field(foreign_key="statustemplate.id")

    template: Optional[StatusTemplate] = Relationship(back_populates="columns")
    tasks: List["Task"] = Relationship(back_populates="column")


class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)
    
    action: str = Field(max_length=100, index=True)
    entity_type: str = Field(max_length=50, index=True)
    entity_id: int = Field(index=True)
    description: Optional[str] = Field(max_length=1000)
    created_at: datetime = Field(default_factory=ksa_now)

    member_id: Optional[int] = Field(foreign_key="member.id")
    workspace_id: Optional[int] = Field(foreign_key="workspace.id")
    task_id: Optional[int] = Field(foreign_key="task.id")

    task: Optional[Task] = Relationship(back_populates="activity_logs")
    member: Optional[Member] = Relationship(back_populates="activity_logs")
    workspace: Optional[Workspace] = Relationship(back_populates="activity_logs")

class Attachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    unique_filename: str = Field(max_length=255)
    original_filename: str = Field(max_length=255)
    file_extension: str = Field(max_length=255) 
    file_path: str = Field(max_length=500)
    file_size: int
    uploaded_at: datetime = Field(default_factory=ksa_now)

    task_id: int = Field(foreign_key="task.id")
    uploaded_by: int = Field(foreign_key="member.id")

    task: Optional["Task"] = Relationship(back_populates="attachments")


DATABASE_URL = "sqlite:///./workspaceflow.db"
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_engine():
    return engine

if __name__ == "__main__":
    create_db_and_tables()
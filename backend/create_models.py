# Pydantic models for API requests/responses
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

from models import (
    Workspace, Member, Workflow, Task, Subtask, ChatMessage,
    StatusTemplate, ActivityLog, TaskMemberLink, WorkspaceMemberLink, 
    WorkflowMemberLink, create_db_and_tables, get_engine, StatusColumn, Attachment,
    ksa_now
)

class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phoneNumber: Optional[str] = None
    password: Optional[str] = None
    confirm_password: Optional[str] = None
    avatar_color: Optional[str] = "#4a6fa5"

class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phoneNumber: Optional[str] = None
    avatar_color: Optional[str] = None
    password: Optional[str] = None

class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None

class WorkflowCreate(BaseModel):
    name: str
    workspace_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None
    status_template: Optional[str] = "default"

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None
    progress_percentage: Optional[float] = None
    status_template: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    workflow_id: int
    column_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    time_spent_seconds: Optional[int] = None
    timer_start_time: Optional[datetime] = None
    progress_percentage: Optional[float] = None
    assignee_ids: Optional[List[int]] = []
    column_id: int

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    column_id: Optional[int] = None
    progress_percentage: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    time_spent_seconds: Optional[int] = None
    timer_start_time: Optional[datetime] = None
    position: Optional[int] = None

class SubtaskCreate(BaseModel):
    text: str
    task_id: int

class SubtaskUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None

class ChatMessageCreate(BaseModel):
    content: str
    task_id: int
    is_attachment: bool

class ChatMessageUpdate(BaseModel):
    content: Optional[str] = None

class StatusTemplateCreate(BaseModel):
    name: str
    category: str
    description: str
    special_states: Optional[str] = "[]"
    is_default: Optional[bool] = False
    is_system: Optional[bool] = False

class StatusTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    special_states: Optional[str] = None
    is_default: Optional[bool] = None
    is_system: Optional[bool] = None

class StatusColumnCreate(BaseModel):
    name: str
    position: int
    template_id: int

class StatusColumnUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None

class ActivityLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: int
    description: Optional[str] = None
    member_id: Optional[int] = None
    workspace_id: Optional[int] = None
    task_id: Optional[int] = None

# Response models (for better API documentation)
class MemberResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class WorkflowResponse(BaseModel):
    id: int
    name: str
    workspace_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    deadline: Optional[date] = None
    progress_percentage: float
    status_template: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    workflow_id: int
    column_id: int
    progress_percentage: float
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    time_spent_seconds: int
    timer_start_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class StatusTemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    description: str
    special_states: str
    is_default: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class StatusColumnResponse(BaseModel):
    id: int
    name: str
    position: int
    template_id: int

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class AttachmentCreate(BaseModel):
    task_id: int
    unique_filename: str
    original_filename: str
    file_path: str
    file_size: int

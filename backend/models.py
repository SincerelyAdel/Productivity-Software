from typing import List, Optional, ClassVar
from datetime import datetime
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship, create_engine


class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    UNDER_REVIEW = "under_review"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class TaskMember(SQLModel, table=True):
    task_id: Optional[int] = Field(
        default=None, foreign_key="task.id", primary_key=True
    )
    member_id: Optional[int] = Field(
        default=None, foreign_key="member.id", primary_key=True
    )


class WorkspaceMember(SQLModel, table=True):
    workspace_id: Optional[int] = Field(
        default=None, foreign_key="workspace.id", primary_key=True
    )
    member_id: Optional[int] = Field(
        default=None, foreign_key="member.id", primary_key=True
    )


class Member(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    workspaces: List["Workspace"] = Relationship(
        back_populates="members", 
        link_model=WorkspaceMember
    )
    tasks: List["Task"] = Relationship(
        back_populates="members", 
        link_model=TaskMember
    )
    comments: List["Comment"] = Relationship(back_populates="author")


class Workspace(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    members: List[Member] = Relationship(
        back_populates="workspaces", 
        link_model=WorkspaceMember
    )
    projects: List["Project"] = Relationship(back_populates="workspace")


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    workspace_id: int = Field(foreign_key="workspace.id")
    
    workspace: Workspace = Relationship(back_populates="projects")
    tasks: List["Task"] = Relationship(back_populates="project")




class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    status: TaskStatus = Field(default=TaskStatus.NOT_STARTED)
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    project_id: int = Field(foreign_key="project.id")
    
    project: Project = Relationship(back_populates="tasks")
    members: List[Member] = Relationship(
        back_populates="tasks", 
        link_model=TaskMember
    )
    comments: List["Comment"] = Relationship(back_populates="task")


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    task_id: int = Field(foreign_key="task.id")
    author_id: int = Field(foreign_key="member.id")
    
    task: Task = Relationship(back_populates="comments")
    author: Member = Relationship(back_populates="comments")


def setup_database(database_url: str = "sqlite:///productivity_app.db"):
    engine = create_engine(database_url, echo=True)
    SQLModel.metadata.create_all(engine)
    return engine


if __name__ == "__main__":
    engine = setup_database()
    print("Database created successfully!")
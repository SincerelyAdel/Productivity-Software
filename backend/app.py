from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, create_engine
from typing import List, Optional, Annotated
from datetime import datetime, timedelta
from passlib.context import CryptContext
from pyjwt import JWTError, jwt
from pydantic import BaseModel
import os
from contextlib import asynccontextmanager

# Import your existing models
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
    password_hash: str  # Added for authentication
    is_active: bool = Field(default=True)
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
    comments: List["Comment"] = Relationship(back_populates="comments")


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    task_id: int = Field(foreign_key="task.id")
    author_id: int = Field(foreign_key="member.id")
    
    task: Task = Relationship(back_populates="comments")
    author: Member = Relationship(back_populates="comments")


# Authentication models
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class TokenData(BaseModel):
    email: Optional[str] = None


class MemberCreate(BaseModel):
    name: str
    email: str
    password: str


class MemberLogin(BaseModel):
    email: str
    password: str


class MemberRead(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: int


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    project_id: int


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class CommentCreate(BaseModel):
    content: str
    task_id: int


# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///productivity_app.db")
engine = create_engine(DATABASE_URL, echo=True)


def create_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    yield
    # Shutdown
    pass


# FastAPI app
app = FastAPI(
    title="Productivity App API",
    description="A productivity app with workspaces, projects, and tasks",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Utility functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_member_by_email(session: Session, email: str) -> Optional[Member]:
    statement = select(Member).where(Member.email == email)
    return session.exec(statement).first()


def authenticate_member(session: Session, email: str, password: str) -> Optional[Member]:
    member = get_member_by_email(session, email)
    if not member or not verify_password(password, member.password_hash):
        return None
    return member


async def get_current_member(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> Member:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    member = get_member_by_email(session, email=token_data.email)
    if member is None:
        raise credentials_exception
    return member


# Authentication endpoints
@app.post("/auth/register", response_model=MemberRead)
def register(member_data: MemberCreate, session: Session = Depends(get_session)):
    # Check if member already exists
    existing_member = get_member_by_email(session, member_data.email)
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new member
    hashed_password = get_password_hash(member_data.password)
    member = Member(
        name=member_data.name,
        email=member_data.email,
        password_hash=hashed_password
    )
    session.add(member)
    session.commit()
    session.refresh(member)
    
    return member


@app.post("/auth/login", response_model=Token)
def login(member_data: MemberLogin, session: Session = Depends(get_session)):
    member = authenticate_member(session, member_data.email, member_data.password)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": member.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@app.get("/auth/me", response_model=MemberRead)
def get_current_member_info(current_member: Member = Depends(get_current_member)):
    return current_member


# Workspace endpoints
@app.post("/workspaces", response_model=Workspace)
def create_workspace(
    workspace_data: WorkspaceCreate,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    workspace = Workspace(**workspace_data.dict())
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    
    # Add current member to workspace
    workspace_member = WorkspaceMember(workspace_id=workspace.id, member_id=current_member.id)
    session.add(workspace_member)
    session.commit()
    
    return workspace


@app.get("/workspaces", response_model=List[Workspace])
def get_workspaces(
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    statement = select(Workspace).join(WorkspaceMember).where(WorkspaceMember.member_id == current_member.id)
    workspaces = session.exec(statement).all()
    return workspaces


@app.get("/workspaces/{workspace_id}", response_model=Workspace)
def get_workspace(
    workspace_id: int,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    # Check if member has access to workspace
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    workspace = session.get(Workspace, workspace_id)
    return workspace


# Project endpoints
@app.post("/projects", response_model=Project)
def create_project(
    project_data: ProjectCreate,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    # Check if member has access to workspace
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == project_data.workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    project = Project(**project_data.dict())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.get("/projects", response_model=List[Project])
def get_projects(
    workspace_id: Optional[int] = None,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    if workspace_id:
        # Check access to specific workspace
        statement = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.member_id == current_member.id
        )
        workspace_member = session.exec(statement).first()
        if not workspace_member:
            raise HTTPException(status_code=403, detail="Access denied to workspace")
        
        statement = select(Project).where(Project.workspace_id == workspace_id)
    else:
        # Get all projects from user's workspaces
        statement = (
            select(Project)
            .join(Workspace)
            .join(WorkspaceMember)
            .where(WorkspaceMember.member_id == current_member.id)
        )
    
    projects = session.exec(statement).all()
    return projects


# Task endpoints
@app.post("/tasks", response_model=Task)
def create_task(
    task_data: TaskCreate,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    # Verify access to project
    project = session.get(Project, task_data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == project.workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to project")
    
    task = Task(**task_data.dict())
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.get("/tasks", response_model=List[Task])
def get_tasks(
    project_id: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    # Base query for user's tasks
    statement = (
        select(Task)
        .join(Project)
        .join(Workspace)
        .join(WorkspaceMember)
        .where(WorkspaceMember.member_id == current_member.id)
    )
    
    if project_id:
        statement = statement.where(Task.project_id == project_id)
    
    if status:
        statement = statement.where(Task.status == status)
    
    tasks = session.exec(statement).all()
    return tasks


@app.get("/tasks/{task_id}", response_model=Task)
def get_task(
    task_id: int,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check access
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == task.project.workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    return task


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check access
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == task.project.workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    # Update task
    update_data = task_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(task, field, value)
        
        session.add(task)
        session.commit()
        session.refresh(task)
    
    return task


# Comment endpoints
@app.post("/comments", response_model=Comment)
def create_comment(
    comment_data: CommentCreate,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    # Verify access to task
    task = session.get(Task, comment_data.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == task.project.workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    comment = Comment(
        content=comment_data.content,
        task_id=comment_data.task_id,
        author_id=current_member.id
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


@app.get("/tasks/{task_id}/comments", response_model=List[Comment])
def get_task_comments(
    task_id: int,
    current_member: Member = Depends(get_current_member),
    session: Session = Depends(get_session)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check access
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == task.project.workspace_id,
        WorkspaceMember.member_id == current_member.id
    )
    workspace_member = session.exec(statement).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to task")
    
    statement = select(Comment).where(Comment.task_id == task_id).order_by(Comment.created_at)
    comments = session.exec(statement).all()
    return comments


# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
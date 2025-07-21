import os
from pathlib import Path
import shutil
import uuid
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, Depends, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select, delete, create_engine
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uvicorn
import jwt
from datetime import timedelta, datetime, UTC
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse

from create_models import *
from util import *

DATABASE_URL = "sqlite:///workspaceflow.db"
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

engine = create_engine(DATABASE_URL)

create_db_and_tables()

app = FastAPI(
    title="Workspace Management API",
    description="API for managing workspaces, workflows, tasks, and team collaboration",
    version="1.0.0"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_session():
    with Session(engine) as session:
        yield session

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(UTC) + expires_delta
    to_encode.update({"exp": expire})
    to_encode.update({"sub": str(to_encode.get("sub"))})
    print(to_encode)
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verify_access_token(token: str) -> Dict[str, Any]:
    try:
        decoded_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        return {"valid": True, "message": "Token is valid", "data": decoded_payload}
    
    except jwt.ExpiredSignatureError:
        return {"valid": False, "message": "Token has expired"}
    except jwt.InvalidTokenError as e:
        return {"valid": False, "message": f"Invalid token: {str(e)}"}


@app.post("/login", tags=["Authentication"])
def login(credentials: LoginRequest, session: Session = Depends(get_session)):
    email = credentials.email
    password = credentials.password
    
    s_email = sanitize_input(email)
    s_password = sanitize_input(password)
    
    statement = select(Member).filter(Member.email == s_email)
    member: Member | None = session.exec(statement).first()
    
    if member and verify_password(s_password, member.password):
        access_token = create_access_token({"sub": member.id}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {
            'success': True,
            'access_token': access_token, 
            'token_type': "Bearer", 
            "member_id": member.id,
            "email": member.email,
            "message": "Login successful"
        }
    else:
        raise HTTPException(status_code=401, detail={"message": "Invalid credentials"})

@app.post("/signup")
def signup(credentials: MemberCreate, session: Session = Depends(get_session)):
    s_email = sanitize_input(credentials.email)
    s_password = sanitize_input(credentials.password)
    s_confirm_password = sanitize_input(credentials.confirm_password)

    email_check = session.exec(select(Member).where(Member.email == s_email)).first()
    if email_check:
        raise HTTPException(status_code=401, detail="Invalid Email")
    
    if s_password == s_confirm_password:
        member = Member(
            first_name = credentials.first_name,
            last_name = credentials.last_name,
            email = s_email,
            password = hash_password(s_password)
        )

        session.add(member)
        session.commit()
        session.refresh(member)

        return member
    
    return {"Message": "Passwords dont match!"}

@app.get("/members", response_model=List[Member])
def get_members(session: Session = Depends(get_session)):
    """Get all members"""
    return session.exec(select(Member)).all()

@app.get("/members/{member_id}", response_model=Member)
def get_member(member_id: int, session: Session = Depends(get_session)):
    """Get a specific member"""
    member = session.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@app.post("/members", response_model=Member)
def create_member(member_data: MemberCreate, session: Session = Depends(get_session)):
    """Create a new member"""
    member = Member(**member_data.dict())
    session.add(member)
    session.commit()
    session.refresh(member)
    return member

@app.put("/members/{member_id}", response_model=Member)
def update_member(member_id: int, member_data: MemberUpdate, session: Session = Depends(get_session)):
    """Update a member"""
    member = session.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if not verify_password(member_data.password, member.password):
        raise HTTPException(status_code=403, detail="Incorrect password!")
    
    for field, value in member_data.dict(exclude_unset=True).items():
        if field == "password":
            continue
        setattr(member, field, value)
    
    member.updated_at = ksa_now()
    session.commit()
    session.refresh(member)
    return member

@app.delete("/members/{member_id}")
def delete_member(member_id: int, session: Session = Depends(get_session)):
    """Delete a member"""
    member = session.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    session.delete(member)
    session.commit()
    return {"message": "Member deleted successfully"}

@app.get("/workspaces", response_model=List[Workspace])
def get_workspaces(session: Session = Depends(get_session)):
    """Get all workspaces"""
    return session.exec(select(Workspace)).all()

@app.get("/workspaces/{workspace_id}", response_model=Workspace)
def get_workspace(workspace_id: int, session: Session = Depends(get_session)):
    """Get a specific workspace with workflows"""
    workspace = session.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@app.post("/workspaces", response_model=Workspace)
def create_workspace(workspace_data: WorkspaceCreate, created_by: int, session: Session = Depends(get_session)):
    """Create a new workspace"""
    workspace = Workspace(**workspace_data.dict(), created_by=created_by)
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    
    session.commit()
    session.refresh(workspace)
    
    return workspace

@app.put("/workspaces/{workspace_id}", response_model=Workspace)
def update_workspace(workspace_id: int, workspace_data: WorkspaceUpdate, session: Session = Depends(get_session)):
    """Update a workspace"""
    workspace = session.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    for field, value in workspace_data.dict(exclude_unset=True).items():
        setattr(workspace, field, value)
    
    workspace.updated_at = ksa_now()
    session.commit()
    session.refresh(workspace)
    return workspace

@app.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, session: Session = Depends(get_session)):
    """Delete a workspace"""
    workspace = session.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    session.delete(workspace)
    session.commit()
    return {"message": "Workspace deleted successfully"}

@app.get("/workflows", response_model=List[Workflow])
def get_workflows(workspace_id: Optional[int] = Query(None), session: Session = Depends(get_session)):
    """Get workflows, optionally filtered by workspace"""
    query = select(Workflow)
    if workspace_id:
        query = query.where(Workflow.workspace_id == workspace_id)
    return session.exec(query).all()

@app.get("/workflows/{workflow_id}", response_model=Workflow)
def get_workflow(workflow_id: int, session: Session = Depends(get_session)):
    """Get a specific workflow with tasks"""
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@app.post("/workflows", response_model=Workflow)
def create_workflow(workflow_data: WorkflowCreate, created_by: int, session: Session = Depends(get_session)):
    """Create a new workflow"""
    workspace = session.get(Workspace, workflow_data.workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    workflow = Workflow(**workflow_data.dict(), created_by=created_by)
    session.add(workflow)
    session.commit()
    session.refresh(workflow)
    
    session.commit()
    session.refresh(workflow)
    
    return workflow

@app.put("/workflows/{workflow_id}", response_model=Workflow)
def update_workflow(workflow_id: int, workflow_data: WorkflowUpdate, session: Session = Depends(get_session)):
    """Update a workflow"""
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    for field, value in workflow_data.dict(exclude_unset=True).items():
        setattr(workflow, field, value)
    
    workflow.updated_at = ksa_now()
    session.commit()
    session.refresh(workflow)
    return workflow

@app.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: int, session: Session = Depends(get_session)):
    """Delete a workflow"""
    workflow = session.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    session.delete(workflow)
    session.commit()
    return {"message": "Workflow deleted successfully"}

@app.get("/tasks", response_model=List[Task])
def get_tasks(workflow_id: Optional[int] = Query(None), session: Session = Depends(get_session)):
    """Get tasks, optionally filtered by workflow"""
    query = select(Task)

    if workflow_id:
        query = query.where(Task.workflow_id == workflow_id)
    return session.exec(query).all()

@app.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: int, session: Session = Depends(get_session)):
    """Get a specific task with subtasks and messages"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/tasks", response_model=Task)
def create_task(task_data: TaskCreate, created_by: int, session: Session = Depends(get_session)):
    """Create a new task"""
    workflow = session.get(Workflow, task_data.workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    task_dict = task_data.dict()
    assignee_ids = task_dict.pop('assignee_ids', [])
    
    task = Task(**task_dict, created_by=created_by)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    for assignee_id in assignee_ids:
        member = session.get(Member, assignee_id)
        if member:
            task_link = TaskMemberLink(task_id=task.id, member_id=assignee_id)
            session.add(task_link)
    
    session.commit()
    session.refresh(task)
    
    return task

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_data: TaskUpdate, session: Session = Depends(get_session)):
    """Update a task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in task_data.dict(exclude_unset=True).items():
        setattr(task, field, value)

    task.updated_at = ksa_now()

    if task_data.progress_percentage == 100.0:
        task.completed_at = ksa_now()

    session.commit()
    session.refresh(task)

    return JSONResponse(status_code=200, content=jsonable_encoder(task))


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    """Delete a task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    session.exec(delete(Subtask).filter(Subtask.task_id == task_id))
    session.exec(delete(ChatMessage).filter(ChatMessage.task_id == task_id))
    session.exec(delete(ActivityLog).filter(ActivityLog.task_id == task_id))
    session.exec(delete(Attachment).filter(Attachment.task_id == task_id))
    session.exec(delete(TaskMemberLink).filter(TaskMemberLink.task_id == task_id))
    session.commit()
    
    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully"}

@app.post("/tasks/{task_id}/assign/{member_id}")
def assign_task(task_id: int, member_id: int, session: Session = Depends(get_session)):
    """Assign a member to a task"""
    task = session.get(Task, task_id)
    member = session.get(Member, member_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    existing = session.exec(
        select(TaskMemberLink).where(
            TaskMemberLink.task_id == task_id,
            TaskMemberLink.member_id == member_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Member already assigned to task")
    
    task_link = TaskMemberLink(task_id=task_id, member_id=member_id)
    session.add(task_link)
    session.commit()
    
    return {"message": f"Member {member.id} assigned to task {task.title}"}

@app.delete("/tasks/{task_id}/unassign/{member_id}")
def unassign_task(task_id: int, member_id: int, session: Session = Depends(get_session)):
    """Unassign a member from a task"""
    task_link = session.exec(
        select(TaskMemberLink).where(
            TaskMemberLink.task_id == task_id,
            TaskMemberLink.member_id == member_id
        )
    ).first()
    
    if not task_link:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    session.delete(task_link)
    session.commit()
    
    return {"message": "Member unassigned from task"}

@app.get("/assignees", response_model=List[Member])
def get_assignees(task_id: int, session: Session = Depends(get_session)):
    """Get assignees of a task"""
    members = session.exec(
        select(Member)
        .join(TaskMemberLink)
        .where(TaskMemberLink.task_id == task_id)
    ).all()
    return members

@app.get("/subtasks", response_model=List[Subtask])
def get_subtasks(task_id: Optional[int] = Query(None), session: Session = Depends(get_session)):
    """Get subtasks, optionally filtered by task"""
    query = select(Subtask)
    if task_id:
        query = query.where(Subtask.task_id == task_id)
    return session.exec(query).all()

@app.post("/subtasks", response_model=Subtask)
def create_subtask(subtask_data: SubtaskCreate, created_by: int, session: Session = Depends(get_session)):
    """Create a new subtask"""
    task = session.get(Task, subtask_data.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    subtask = Subtask(**subtask_data.dict(), created_by=created_by)
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    return subtask

@app.put("/subtasks/{subtask_id}", response_model=Subtask)
def update_subtask(subtask_id: int, subtask_data: SubtaskUpdate, session: Session = Depends(get_session)):
    """Update a subtask"""
    subtask = session.get(Subtask, subtask_id)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    for field, value in subtask_data.dict(exclude_unset=True).items():
        setattr(subtask, field, value)
    
    subtask.updated_at = ksa_now()
    
    # Set completed_at if marking as completed
    if subtask_data.completed is True:
        subtask.completed_at = ksa_now()
    elif subtask_data.completed is False:
        subtask.completed_at = None
    
    session.commit()
    session.refresh(subtask)
    return subtask

@app.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: int, session: Session = Depends(get_session)):
    """Delete a subtask"""
    subtask = session.get(Subtask, subtask_id)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    session.delete(subtask)
    session.commit()
    return {"message": "Subtask deleted successfully"}

@app.get("/chat-messages/{task_id}", response_model=List[ChatMessage])
def get_messages(task_id: int, session: Session = Depends(get_session)):
    """Get chat messages"""
    query = select(ChatMessage).where(ChatMessage.task_id == task_id)
    return session.exec(query.order_by(ChatMessage.created_at)).all()

@app.post("/chat-messages", response_model=ChatMessage)
def create_message(message_data: ChatMessageCreate, author_id: int, session: Session = Depends(get_session)):
    """Create a new chat message"""
    task = session.get(Task, message_data.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    message = ChatMessage(**message_data.dict(), author_id=author_id)
    session.add(message)
    session.commit()
    session.refresh(message)
    return message

@app.delete("/chat-messages/{message_id}")
def delete_message(message_id: int, session: Session = Depends(get_session)):
    """Delete a chat message"""
    message = session.get(ChatMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    session.delete(message)
    session.commit()
    return {"message": "Message deleted successfully"}

@app.get("/status-templates", response_model=List[StatusTemplate])
def get_status_templates(session: Session = Depends(get_session)):
    """Get all status templates"""
    return session.exec(select(StatusTemplate)).all()

@app.post("/status-templates", response_model=StatusTemplate)
def create_status_template(template_data: StatusTemplateCreate, created_by: int, session: Session = Depends(get_session)):
    """Create a new status template"""
    template = StatusTemplate(**template_data.dict(), created_by=created_by)
    session.add(template)
    session.commit()
    session.refresh(template)
    return template

@app.get("/status-columns")
def get_status_columns(template_id: Optional[int] = Query(None), session: Session = Depends(get_session)):
    """Get Status Columns, Optionally filtered by status templates"""
    query = select(StatusColumn)

    if template_id:
        query = query.where(StatusColumn.template_id == template_id)
    return session.exec(query).all()

@app.post("/status-columns")
def create_status_columns(column_data: StatusColumnCreate, session: Session = Depends(get_session)):
    """Create a new status Column"""
    column = StatusColumn(**column_data.dict())
    session.add(column)
    session.commit()
    session.refresh(column)
    return column

@app.put("/status-columns/{column_id}")
def update_status_columns(column_id: int, column_data: StatusColumnCreate, session: Session = Depends(get_session)):
    """Update a subtask"""
    column = session.get(StatusColumn, column_id)

    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    for field, value in column_data.dict(exclude_unset=True).items():
        setattr(column, field, value)
    
    session.commit()
    session.refresh(column)
    return column

@app.delete("/status-columns/{column_id}")
def delete_status_columns(column_id: int, session: Session = Depends(get_session)):
    """Delete a chat message"""
    column = session.get(StatusColumn, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="column not found")
    
    session.delete(column)
    session.commit()
    return {"Message": "Column deleted successfully"}

@app.get("/activities", response_model=List[ActivityLog])
def get_activities(
    workspace_id: Optional[int] = Query(None),
    member_id: Optional[int] = Query(None),
    task_id: Optional[int] = Query(None),
    limit: int = Query(50, le=100),
    session: Session = Depends(get_session)
):
    """Get activity logs with optional filters"""
    query = select(ActivityLog)
    
    if workspace_id:
        query = query.where(ActivityLog.workspace_id == workspace_id)

    if member_id:
        query = query.where(ActivityLog.member_id == member_id)

    if task_id:
        query = query.where(ActivityLog.task_id == task_id)
    
    query = query.order_by(ActivityLog.created_at).limit(limit)
    return session.exec(query).all()

@app.post("/activities")
def create_activities(activity_data: ActivityLogCreate, session: Session = Depends(get_session)):
    """Create a new activity log"""
    activity_log = ActivityLog(**activity_data.dict())
    session.add(activity_log)
    session.commit()
    session.refresh(activity_log)
    return activity_log

@app.delete("/activities")
def delete_activity(activity_id: int, session: Session = Depends(get_session)):
    """Delete an activity log"""
    activity = session.get(ActivityLog, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity log not found")
    
    session.delete(activity)
    session.commit()
    return {"message": "Activity log deleted successfully"}

#----------------------------------------------------------   File upload   -----------------------------------------------------------------------

UPLOAD_DIR = Path("./files")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

@app.post("/api/messages")
async def upload_message(
    task_id: int = Form(...),
    user_id: int = Form(...),
    workspace_id: int = Form(...),
    workflow_id: int = Form(...),
    attachment: UploadFile = File(None),
    session: Session = Depends(get_session)
):
    file_url = None

    print("📥 Received upload message request:")
    print("task_id:", task_id)
    print("user_id:", user_id)
    print("workspace_id:", workspace_id)
    print("workflow_id:", workflow_id)
    print("attachment:", attachment.filename if attachment else "None")

    if attachment:
        try:
            file_dir = UPLOAD_DIR / f"Workspace{workspace_id}" / f"Workflow{workflow_id}" / f"Task{task_id}"
            file_dir.mkdir(parents=True, exist_ok=True)

            extension = os.path.splitext(attachment.filename)[1]
            unique_name = f"{uuid.uuid4()}{extension}"
            file_path = file_dir / unique_name

            content = await attachment.read()  
            file_size = len(content)

            with file_path.open("wb") as buffer:
                buffer.write(content)

            attachment_record = Attachment(
                task_id=task_id,
                unique_filename=unique_name,
                original_filename=os.path.splitext(attachment.filename)[0],
                file_path=str(file_path),
                file_size=file_size,
                uploaded_by=user_id,
                file_extension=extension
            )

            session.add(attachment_record)
            session.commit()
            session.refresh(attachment_record)

            file_url = f"/api/attachments/{attachment_record.id}/download"

        except Exception as e:
            print("❌ File save or DB error:", e)
            raise HTTPException(status_code=500, detail="Failed to save attachment")

    return JSONResponse({
        "attachmentUrl": file_url,
        "attachment_id": attachment_record.id
    })

@app.get("/attachments", response_model=List[dict])
def get_attachments(task_id: Optional[int] = Query(None), session: Session = Depends(get_session)):
    """Get attachment metadata: name, extension, size, and uploader name"""
    query = select(Attachment, Member).join(Member, Attachment.uploaded_by == Member.id)
    if task_id:
        query = query.where(Attachment.task_id == task_id)

    results = session.exec(query).all()

    response = []
    for attachment, member in results:
        response.append({
            "id": attachment.id,
            "name": attachment.original_filename,
            "extension": attachment.file_extension,
            "size": format_size(attachment.file_size),
            "member_name": f"{member.first_name} {member.last_name}" if member else "Unknown"
        })

    return response

@app.post("/attachment", response_model=Attachment)
def create_attachment(attachment_data: AttachmentCreate, created_by: int, session: Session = Depends(get_session)):
    """Create a new Attachment"""
    task = session.get(Task, attachment_data.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    attachment = Attachment(**attachment_data.dict(), uploaded_by=created_by)
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    
    session.commit()
    session.refresh(attachment)
    
    return attachment

@app.put("/attachment/{attachment_id}", response_model=Workflow)
def update_attachment(attachment_id: int, attachment_data: WorkflowUpdate, session: Session = Depends(get_session)):
    """Update a workflow"""
    workflow = session.get(Workflow, attachment_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    for field, value in attachment_data.dict(exclude_unset=True).items():
        setattr(workflow, field, value)
    
    workflow.updated_at = ksa_now()
    session.commit()
    session.refresh(workflow)
    return workflow

@app.delete("/attachment/{attachment_id}")
def delete_attachment(attachment_id: int, session: Session = Depends(get_session)):
    """Delete a Attachment"""
    attachment = session.get(Attachment, attachment_id)
    if not Attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    session.delete(attachment)
    session.commit()
    return {"message": "Attachment deleted successfully"}

@app.get("/attachments/{attachment_id}/download", response_class=FileResponse)
def download_attachment(attachment_id: int, session: Session = Depends(get_session)):
    attachment = session.exec(select(Attachment).where(Attachment.id == attachment_id)).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not os.path.isfile(attachment.file_path):
        raise HTTPException(status_code=404, detail="File does not exist on disk")

    return FileResponse(
        path=attachment.file_path,
        filename=f"{attachment.original_filename}{attachment.file_extension}",
        media_type="application/octet-stream"
    )

#---------------------------------------------------------- Profile page -----------------------------------------------------------------------

PROFILE_DIR = Path("files/profile_pictures")
PROFILE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/member/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    member_id: int = Form(...),
    session: Session = Depends(get_session)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: JPG, JPEG, PNG, GIF, WebP"
        )
    
    current_member = session.exec(select(Member).where(Member.id == member_id)).first()
    if not current_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    if not _is_valid_image(contents):
        raise HTTPException(status_code=400, detail="File is not a valid image")
    
    unique_filename = f"member_{member_id}_{uuid.uuid4()}{file_extension}"
    file_path = PROFILE_DIR / unique_filename
    
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
        
        if current_member.profile_picture_filename:
            old_file_path = PROFILE_DIR / current_member.profile_picture_filename
            if old_file_path.exists():
                old_file_path.unlink()
        
        current_member.profile_picture_url = f"/api/user/{member_id}/profile-picture"
        current_member.profile_picture_filename = unique_filename
        current_member.profile_picture_size = len(contents)
        current_member.updated_at = ksa_now()
        
        session.add(current_member)
        session.commit()
        session.refresh(current_member)
        
        return {
            "success": True,
            "message": "Profile picture uploaded successfully",
            "image_url": current_member.profile_picture_url,
            "filename": unique_filename,
            "file_size": len(contents)
        }
        
    except Exception as e:
        session.rollback()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/member/{member_id}/profile-picture")
async def get_profile_picture_by_member_id(
    member_id: int,
    session: Session = Depends(get_session)
):
    member = session.exec(select(Member).where(Member.id == member_id)).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if not member.profile_picture_filename:
        raise HTTPException(status_code=404, detail="No profile picture found for this member")
    
    file_path = PROFILE_DIR / member.profile_picture_filename
    if not file_path.exists():
        member.profile_picture_filename = None
        member.profile_picture_url = None
        member.profile_picture_size = None
        session.add(member)
        session.commit()
        raise HTTPException(status_code=404, detail="Profile picture file not found")
    
    file_extension = Path(member.profile_picture_filename).suffix.lower()
    media_type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    media_type = media_type_map.get(file_extension, 'image/jpeg')
    
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Cache-Control": "max-age=3600",
            "Content-Disposition": f"inline; filename=profile_{member_id}{file_extension}"
        }
    )

@app.delete("/member/profile-picture")
async def delete_profile_picture(
    member_id: int = Form(...),
    session: Session = Depends(get_session)
):
    current_member = session.exec(select(Member).where(Member.id == member_id)).first()
    if not current_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if not current_member.profile_picture_filename:
        raise HTTPException(status_code=404, detail="No profile picture to delete")
    
    try:
        file_path = PROFILE_DIR / current_member.profile_picture_filename
        if file_path.exists():
            file_path.unlink()
        
        current_member.profile_picture_url = None
        current_member.profile_picture_filename = None
        current_member.profile_picture_size = None
        current_member.updated_at = ksa_now()
        
        session.add(current_member)
        session.commit()
        session.refresh(current_member)
        
        return {
            "success": True, 
            "message": "Profile picture deleted successfully"
        }
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

def _is_valid_image(file_contents: bytes) -> bool:
    """Check if file is a valid image by examining file signature"""
    if len(file_contents) < 12:
        return False
    
    signatures = {
        b'\xFF\xD8\xFF': 'jpeg',  # JPEG files start with these bytes
        b'\x89PNG\r\n\x1a\n': 'png',  # PNG files start with these bytes
        b'GIF87a': 'gif',  # GIF87a format
        b'GIF89a': 'gif',  # GIF89a format
        b'RIFF': 'webp',  # WebP files start with RIFF
    }
    
    for signature, format_type in signatures.items():
        if file_contents.startswith(signature):
            # Additional check for WebP (needs WEBP in bytes 8-12)
            if format_type == 'webp':
                return b'WEBP' in file_contents[8:12]
            return True
    
    return False


@app.get("/member/{member_id}/profile")
async def get_member_profile(
    member_id: int,
    session: Session = Depends(get_session)
):
    member = session.exec(select(Member).where(Member.id == member_id)).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {
        "id": member.id,
        "first_name": member.first_name,
        "last_name": member.last_name,
        "email": member.email,
        "phoneNumber": member.phoneNumber,
        "avatar_color": member.avatar_color,
        "profile_picture_url": f"/api/user/{member.id}/profile-picture" if member.profile_picture_filename else None,
        "has_profile_picture": bool(member.profile_picture_filename),
        "created_at": member.created_at,
        "updated_at": member.updated_at
    }

@app.post("/members/{member_id}/change-password")
def change_password(member_id: int, body: dict, session: Session = Depends(get_session)):
    member = session.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="User not found")

    old_password = body.get("old_password")
    new_password = body.get("new_password")

    if not verify_password(old_password, member.password):
        raise HTTPException(status_code=403, detail="Incorrect current password")

    member.password = hash_password(new_password)
    session.add(member)
    session.commit()
    session.refresh(member)

    return {"success": True, "message": "Password changed successfully"}

@app.get("/")
def root():
    return {"message": "Workspace Management API", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
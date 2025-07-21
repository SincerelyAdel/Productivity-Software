#!/usr/bin/env python3
"""
Simple script to run the FastAPI application
"""
import uvicorn
from models import create_db_and_tables

if __name__ == "__main__":
    # Ensure database tables exist
    create_db_and_tables()
    print("Database tables created/verified ✓")
    
    # Run the FastAPI application
    print("Starting FastAPI server...")
    print("API Documentation: http://localhost:8000/docs")
    print("Alternative docs: http://localhost:8000/redoc")
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
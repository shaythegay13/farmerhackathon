#!/usr/bin/env python3
"""
Yieldly Backend Startup Script
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    print("🚀 Starting Yieldly Backend...")
    print(f"📁 Working directory: {os.getcwd()}")
    
    # Check if requirements are installed
    try:
        import fastapi
        import sqlalchemy
        import pandas
        print("✅ Dependencies are installed")
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("📦 Installing requirements...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed")
    
    # Create data directories
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/exports", exist_ok=True)
    print("📁 Data directories created")
    
    # Start the server
    print("🌐 Starting FastAPI server on http://localhost:8000")
    print("📚 API docs available at http://localhost:8000/docs")
    print("🔧 Load sample data: POST http://localhost:8000/dev/load_sample_data")
    print("🤖 LLM status: GET http://localhost:8000/llm/status")
    print("\n💡 Optional: Set GEMINI_API_KEY for AI-powered features")
    print("="*50)
    
    # Run uvicorn
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "app.main:app", 
        "--reload", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ])

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Yieldly Backend Startup Script
"""

import os
import sys
import subprocess
from pathlib import Path


def _ensure_dependencies() -> None:
    """Install requirements when the packages the API imports are missing."""
    try:
        import fastapi  # noqa: F401
        import sqlalchemy  # noqa: F401
        import dotenv  # noqa: F401
        print("✅ Dependencies are installed")
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("📦 Installing requirements...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
            check=False,
        )
        print("✅ Requirements installed")


def main():
    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent
    os.chdir(backend_dir)

    _ensure_dependencies()

    from dotenv import load_dotenv

    load_dotenv(repo_root / ".env")
    load_dotenv(backend_dir / ".env", override=True)

    port = os.environ.get("PORT", "").strip() or "8000"

    print("🚀 Starting Yieldly Backend...")
    print(f"📁 Working directory: {os.getcwd()}")

    # Create data directories
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/exports", exist_ok=True)
    print("📁 Data directories created")

    # Start the server
    print(f"🌐 Starting FastAPI server on http://localhost:{port}")
    print(f"📚 API docs available at http://localhost:{port}/docs")
    print(f"🔧 Load sample data: POST http://localhost:{port}/dev/load_sample_data")
    print(f"🤖 LLM status: GET http://localhost:{port}/llm/status")
    print("\n💡 Optional: Set GEMINI_API_KEY for AI-powered features")
    print("=" * 50)

    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "app.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", port,
    ])


if __name__ == "__main__":
    main()

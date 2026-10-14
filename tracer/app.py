"""
LeakTrace Tracer — Root application entrypoint.
Imports and exposes the FastAPI `app` from app.main.

Supports:
- uvicorn app:app --port 8000 (from tracer directory)
- uvicorn app.main:app --port 8000 (monorepo standard)
- Vercel automatic Python function detection for root app.py
"""

from app.main import app

__all__ = ["app"]

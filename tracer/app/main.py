"""
LeakTrace Tracer — FastAPI application entry point.

This is the evidence zone: it ingests events, builds and verifies the
tamper-evident hash chain, stores canary tokens, and investigates leaks.

The tracer never calls the ERP and never sees real identities.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router

ORIGIN = os.environ.get("DASHBOARD_ORIGIN", "http://localhost:5173")

app = FastAPI(
    title="LeakTrace Tracer",
    description="Tamper-evident event log and leak investigation service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ORIGIN],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "x-read-key", "x-ingest-key"],
)

app.include_router(router)

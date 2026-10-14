"""
Database connection and helpers for the tracer.

Uses psycopg 3 with dict rows for clean JSON-friendly access.
All state lives in Postgres because Vercel functions have no persistent filesystem.
"""

import os
import psycopg
from psycopg.rows import dict_row

DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/leaktrace")


def get_connection():
    """Return a new psycopg connection with dict_row factory.
    
    Each call creates a fresh connection (acceptable for serverless).
    The caller should use it as a context manager:
    
        with get_connection() as conn:
            conn.execute(...)
    """
    return psycopg.connect(DSN, row_factory=dict_row)

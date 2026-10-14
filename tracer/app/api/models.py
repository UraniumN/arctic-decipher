"""
Pydantic models for API request/response validation.

These models enforce the contract's field names and types.
"""

from pydantic import BaseModel


class Event(BaseModel):
    """A single event in a batch ingest request."""
    event_id: str
    ts: int
    actor: str
    action: str
    target: str
    data_id: str | None = None
    status: int = 200


class EventBatch(BaseModel):
    """Batch ingest request body."""
    events: list[Event]


class Canary(BaseModel):
    """A single canary token registration."""
    token: str
    service: str


class CanaryBatch(BaseModel):
    """Batch canary registration request body."""
    canaries: list[Canary]


class InvestigateRequest(BaseModel):
    """Investigation request body.
    
    Only data_id is required. Other fields have sensible defaults.
    """
    data_id: str
    exposure: str = "public_bucket"
    leak_time: int | None = None
    leaked_text: str | None = None
    tau: float = 600

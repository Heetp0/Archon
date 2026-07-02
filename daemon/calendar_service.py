"""Google Calendar integration for Archon daemon.

Provides:
  • get_events(days=N) → list upcoming events
  • add_event(summary, start, end, description) → create event
  • delete_event(event_id) → remove event

Uses google-auth + google-api-python-client. Falls back to a mock schedule
if credentials are not configured so the UI always has data to show.
"""

import os
import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mock schedule — returned when Google credentials are missing
# ---------------------------------------------------------------------------
MOCK_EVENTS: List[Dict[str, Any]] = []


def _build_mock() -> List[Dict[str, Any]]:
    """Generate a realistic-looking weekly schedule."""
    now = datetime.now(timezone.utc)
    base = now.replace(hour=9, minute=0, second=0, microsecond=0)
    mock = []
    titles = [
        ("Stand-up", 0.5),
        ("Deep Research Sprint", 2.0),
        ("Agent Runtime Review", 1.0),
        ("Lunch", 1.0),
        ("Council Debate — API Design", 1.5),
        ("Vault Indexing", 1.0),
        ("Code Review", 1.0),
        ("Planning — Next Iteration", 1.0),
    ]
    for day_offset in range(7):
        day_base = base + timedelta(days=day_offset)
        for i, (title, duration_hours) in enumerate(titles):
            start = day_base + timedelta(hours=9 + i * 1.5)
            end = start + timedelta(hours=duration_hours)
            mock.append({
                "id": f"mock-{day_offset}-{i}",
                "summary": title,
                "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
                "description": "Auto-generated schedule entry",
                "location": "",
                "creator": {"email": "archon@local"},
                "status": "confirmed",
            })
    return mock


# ---------------------------------------------------------------------------
# Real Google Calendar client
# ---------------------------------------------------------------------------

class CalendarService:
    def __init__(self):
        self._client: Any = None
        self._calendar_id = "primary"
        self._mock = _build_mock()
        self._try_init()

    def _try_init(self) -> None:
        """Attempt to load credentials from environment or local file."""
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build

            creds_json = os.getenv("GOOGLE_CALENDAR_CREDENTIALS")
            if creds_json:
                info = json.loads(creds_json)
                creds = Credentials.from_authorized_user_info(info, scopes=[
                    "https://www.googleapis.com/auth/calendar.readonly",
                    "https://www.googleapis.com/auth/calendar.events",
                ])
            else:
                token_path = os.path.join(os.path.dirname(__file__), "token.json")
                if os.path.exists(token_path):
                    creds = Credentials.from_authorized_user_file(token_path, scopes=[
                        "https://www.googleapis.com/auth/calendar.readonly",
                        "https://www.googleapis.com/auth/calendar.events",
                    ])
                else:
                    logger.info("No Google Calendar credentials found — using mock schedule")
                    return

            self._client = build("calendar", "v3", credentials=creds)
            logger.info("Google Calendar client initialized")
        except Exception as e:
            logger.info(f"Google Calendar init failed: {e} — using mock schedule")

    # ── Public API ─────────────────────────────────────────────────

    def get_events(self, days: int = 7, max_results: int = 50) -> List[Dict[str, Any]]:
        """Return events from now through `days` ahead."""
        if self._client is None:
            return self._mock[:max_results]

        try:
            now = datetime.now(timezone.utc)
            time_min = now.isoformat()
            time_max = (now + timedelta(days=days)).isoformat()

            events_result = self._client.events().list(
                calendarId=self._calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            return events_result.get("items", [])
        except Exception as e:
            logger.error(f"Calendar fetch failed: {e}")
            return self._mock[:max_results]

    def add_event(
        self,
        summary: str,
        start_iso: str,
        end_iso: str,
        description: str = "",
        location: str = "",
    ) -> Optional[Dict[str, Any]]:
        if self._client is None:
            logger.warning("Cannot add event — no Google Calendar credentials")
            return None
        try:
            body = {
                "summary": summary,
                "description": description,
                "location": location,
                "start": {"dateTime": start_iso, "timeZone": "UTC"},
                "end": {"dateTime": end_iso, "timeZone": "UTC"},
            }
            return self._client.events().insert(calendarId=self._calendar_id, body=body).execute()
        except Exception as e:
            logger.error(f"Calendar add failed: {e}")
            return None

    def delete_event(self, event_id: str) -> bool:
        if self._client is None:
            logger.warning("Cannot delete event — no Google Calendar credentials")
            return False
        try:
            self._client.events().delete(calendarId=self._calendar_id, eventId=event_id).execute()
            return True
        except Exception as e:
            logger.error(f"Calendar delete failed: {e}")
            return False

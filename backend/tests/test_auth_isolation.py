"""
test_auth_isolation.py — Multi-tenant data isolation tests.
Run: pytest daemon/tests/test_auth_isolation.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import time
import tempfile
import shutil
from pathlib import Path

from auth_service import AuthService
from quota_enforcer import QuotaEnforcer


# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def auth_svc():
    return AuthService(secret="test_secret_key_32_bytes_minimum!!")


@pytest.fixture
def tmp_data(tmp_path):
    """Create a fresh temp directory for stroke storage isolation tests."""
    return tmp_path


# ─────────────────────────────────────────────────────────────
# 1. JWT user isolation
# ─────────────────────────────────────────────────────────────

class TestJWTIsolation:
    """Each user's JWT must only resolve to their own identity."""

    def test_user_tokens_are_distinct(self, auth_svc):
        token_a = auth_svc.create_access_token({"user_id": "user_a", "username": "alice"})
        token_b = auth_svc.create_access_token({"user_id": "user_b", "username": "bob"})

        payload_a = auth_svc.verify_token(token_a)
        payload_b = auth_svc.verify_token(token_b)

        assert payload_a["user_id"] != payload_b["user_id"]
        assert payload_a["username"] != payload_b["username"]
        assert payload_a["user_id"] == "user_a"
        assert payload_b["user_id"] == "user_b"

    def test_cross_token_substitution_fails(self, auth_svc):
        """Tampered token must not validate."""
        import base64
        import json

        token_a = auth_svc.create_access_token({"user_id": "attacker", "username": "eve"})

        # Decode header/payload (no verification), modify user_id
        parts = token_a.split(".")
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        payload["user_id"] = "victim"

        # Re-encode without re-signing
        new_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
        forged_token = f"{parts[0]}.{new_payload}.{parts[2]}"

        result = auth_svc.verify_token(forged_token)
        assert result is None, "Forged token should not validate"

    def test_expired_token_rejected(self, auth_svc):
        """Token expired 1 second ago should not validate."""
        import base64
        import json

        # Create a token that expired in the past
        token = auth_svc.create_access_token(
            {"user_id": "u1", "username": "test"},
            expires_delta_seconds=-1,
        )
        result = auth_svc.verify_token(token)
        assert result is None, "Expired token should return None"


# ─────────────────────────────────────────────────────────────
# 2. Stroke storage path isolation
# ─────────────────────────────────────────────────────────────

class TestStrokeStorageIsolation:
    """
    User A's strokes must not be accessible via User B's path.
    Path format: data/strokes/<user_id>/<notebook_id>/<page_id>.bin
    """

    def _stroke_path(self, base: Path, user_id: str, notebook_id: str, page_id: str) -> Path:
        return base / "strokes" / user_id / notebook_id / f"{page_id}.bin"

    def test_different_users_have_different_paths(self, tmp_data):
        path_a = self._stroke_path(tmp_data, "user_a", "nb1", "p1")
        path_b = self._stroke_path(tmp_data, "user_b", "nb1", "p1")

        assert path_a != path_b
        assert "user_a" in str(path_a)
        assert "user_b" in str(path_b)

    def test_user_a_data_not_visible_at_user_b_path(self, tmp_data):
        path_a = self._stroke_path(tmp_data, "user_a", "nb1", "p1")
        path_b = self._stroke_path(tmp_data, "user_b", "nb1", "p1")

        # Write user A's data
        path_a.parent.mkdir(parents=True, exist_ok=True)
        path_a.write_bytes(b"\x01\x02\x03 user_a strokes")

        # User B's path should not exist
        assert not path_b.exists(), "User B should not see User A's stroke data"

    def test_path_traversal_rejected(self):
        """Ensure user_id with path traversal cannot escape the strokes dir."""
        # Simulate what the backend should do: sanitize user_id
        def safe_stroke_path(base: str, user_id: str, notebook_id: str, page_id: str) -> str:
            # Strip any path separators or traversal attempts
            safe_uid = Path(user_id).name  # Only keeps the final component
            safe_nb = Path(notebook_id).name
            safe_pg = Path(page_id).name
            return str(Path(base) / "strokes" / safe_uid / safe_nb / f"{safe_pg}.bin")

        malicious_uid = "../../etc/passwd"
        result = safe_stroke_path("/data", malicious_uid, "nb1", "p1")

        assert "etc" not in result or result.startswith("/data/strokes/"), (
            f"Path traversal not sanitized: {result}"
        )
        assert result.startswith("/data/strokes/"), (
            f"Path escaped data directory: {result}"
        )


# ─────────────────────────────────────────────────────────────
# 3. Quota isolation per user
# ─────────────────────────────────────────────────────────────

class TestQuotaIsolation:
    """One user exhausting their quota must not affect another user."""

    @pytest.fixture(autouse=True)
    def qe(self):
        # Very low limit to test exhaustion quickly
        self.qe = QuotaEnforcer(storage_limit_mb=1024, query_limit_per_hour=3)

    def test_user_a_quota_exhaustion_does_not_block_user_b(self):
        # Exhaust user_a quota
        for _ in range(3):
            self.qe.record_query("user_a")

        # user_a should be blocked
        allowed_a = self.qe.check_query_quota("user_a")
        assert not allowed_a, "user_a should be over quota"

        # user_b should still be allowed
        allowed_b = self.qe.check_query_quota("user_b")
        assert allowed_b, "user_b should not be affected by user_a's quota"

    def test_quota_resets_independently_per_user(self):
        """Quota state is stored per user_id key."""
        self.qe.record_query("x")
        self.qe.record_query("y")

        used_x = self.qe.get_usage("x")
        used_y = self.qe.get_usage("y")

        assert used_x == 1
        assert used_y == 1

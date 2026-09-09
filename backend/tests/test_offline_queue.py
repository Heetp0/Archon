import os
import sys
import tempfile
import shutil
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
import offline_queue
from auth_service import encode_jwt

client = TestClient(app)

@pytest.fixture
def user_a():
    token = encode_jwt({"user_id": "user_alpha", "email": "alpha@archon.local", "role": "student"})
    return "user_alpha", {"Authorization": f"Bearer {token}"}

@pytest.fixture
def user_b():
    token = encode_jwt({"user_id": "user_beta", "email": "beta@archon.local", "role": "student"})
    return "user_beta", {"Authorization": f"Bearer {token}"}

class TestOfflineQueue:
    def test_queue_persistence_and_deduplication(self, user_a):
        uid, headers = user_a
        req_id = "offline_req_001"
        
        # 1. Queue a request
        payload = {
            "id": req_id,
            "endpoint": "/notebooks",
            "method": "POST",
            "payload": {"name": "Offline NB 1"},
            "user_id": uid
        }
        res = client.post("/offline/queue", json=payload, headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert res.json()["id"] == req_id

        # 2. Verify it exists in user's queue
        res_queue = client.get(f"/offline/queue/{uid}", headers=headers)
        assert res_queue.status_code == 200
        items = res_queue.json()
        matching = [item for item in items if item["id"] == req_id]
        assert len(matching) == 1
        assert matching[0]["payload"]["name"] == "Offline NB 1"
        assert matching[0]["status"] == "queued"

        # 3. Deduplication: Re-queuing same id with updated payload updates (INSERT OR REPLACE)
        payload["payload"]["name"] = "Offline NB 1 Updated"
        res_dedup = client.post("/offline/queue", json=payload, headers=headers)
        assert res_dedup.status_code == 200

        res_queue2 = client.get(f"/offline/queue/{uid}", headers=headers)
        assert res_queue2.status_code == 200
        items2 = res_queue2.json()
        matching2 = [item for item in items2 if item["id"] == req_id]
        assert len(matching2) == 1  # Deduplicated to 1 item
        assert matching2[0]["payload"]["name"] == "Offline NB 1 Updated"

        # 4. Deletion
        del_res = client.delete(f"/offline/queue/{req_id}", headers=headers)
        assert del_res.status_code == 200
        res_queue3 = client.get(f"/offline/queue/{uid}", headers=headers)
        assert not any(item["id"] == req_id for item in res_queue3.json())

    def test_user_isolation(self, user_a, user_b):
        uid_a, headers_a = user_a
        uid_b, headers_b = user_b

        req_id = "offline_req_user_a"
        client.post("/offline/queue", json={
            "id": req_id,
            "endpoint": "/settings",
            "method": "POST",
            "payload": {"key": "val"},
            "user_id": uid_a
        }, headers=headers_a)

        # User B cannot access User A's queue (403 Forbidden)
        res_forbidden = client.get(f"/offline/queue/{uid_a}", headers=headers_b)
        assert res_forbidden.status_code == 403

        # User B's own queue should not contain User A's item
        res_b = client.get(f"/offline/queue/{uid_b}", headers=headers_b)
        assert res_b.status_code == 200
        assert not any(item["id"] == req_id for item in res_b.json())

    @pytest.mark.asyncio
    async def test_process_sync_success_and_retry(self):
        req_id = "test_sync_direct_req"
        offline_queue.add_to_queue(
            req_id=req_id,
            endpoint="/models",
            method="GET",
            payload={},
            user_id="direct_user"
        )

        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_client.request = AsyncMock(return_value=mock_response)

        success = await offline_queue.process_sync(req_id, mock_client)
        assert success is True

        queue = offline_queue.get_user_queue("direct_user")
        item = next(i for i in queue if i["id"] == req_id)
        assert item["status"] == "synced"
        assert item["synced_at"] is not None

        # Test failure retry increment
        fail_id = "test_sync_fail_req"
        offline_queue.add_to_queue(
            req_id=fail_id,
            endpoint="/broken-endpoint",
            method="POST",
            payload={},
            user_id="direct_user"
        )
        mock_client.request = AsyncMock(side_effect=Exception("Connection refused"))
        fail_res = await offline_queue.process_sync(fail_id, mock_client)
        assert fail_res is False

        queue2 = offline_queue.get_user_queue("direct_user")
        item2 = next(i for i in queue2 if i["id"] == fail_id)
        assert item2["retry_count"] == 1
        assert item2["status"] == "queued"

    def test_batch_sync_endpoint(self, user_a):
        uid, headers = user_a
        batch_payload = {
            "requests": [
                {
                    "id": "sync_batch_1",
                    "endpoint": "/models",
                    "method": "GET",
                    "payload": {},
                    "user_id": uid
                },
                {
                    "id": "sync_batch_2",
                    "endpoint": "/calendar/events",
                    "method": "GET",
                    "payload": {},
                    "user_id": uid
                }
            ]
        }
        res = client.post("/offline/sync", json=batch_payload, headers=headers)
        assert res.status_code == 200
        results = res.json()["results"]
        assert len(results) == 2
        assert results[0]["id"] == "sync_batch_1"
        assert results[1]["id"] == "sync_batch_2"

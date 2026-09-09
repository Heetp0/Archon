import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app

client = TestClient(app)

def test_offline_queue_crud():
    req_payload = {
        'id': 'offline-test-uuid-1',
        'endpoint': '/chat',
        'method': 'POST',
        'payload': {'message': 'sync test'},
        'user_id': 'default_user'
    }
    
    # 1. Enqueue request
    post_res = client.post('/offline/queue', json=req_payload)
    assert post_res.status_code == 200
    assert post_res.json()['status'] == 'success'
    
    # 2. Get user queue
    get_res = client.get('/offline/queue/default_user')
    assert get_res.status_code == 200
    queue = get_res.json()
    assert isinstance(queue, list)
    matching = [item for item in queue if item['id'] == 'offline-test-uuid-1']
    assert len(matching) == 1
    assert matching[0]['endpoint'] == '/chat'
    
    # 3. Delete from queue
    del_res = client.delete('/offline/queue/offline-test-uuid-1')
    assert del_res.status_code == 200
    assert del_res.json()['status'] == 'deleted'

def test_offline_queue_unauthorized_user():
    # Attempt to read another user's queue with default_user credentials
    res = client.get('/offline/queue/another_user')
    assert res.status_code == 403

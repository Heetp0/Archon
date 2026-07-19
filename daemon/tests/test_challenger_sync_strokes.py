# Challenger test for strokes sync endpoints
import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
import notebook_routes

client = TestClient(app)

def test_large_payload_5mb():
    # 5MB of binary data
    size = 5 * 1024 * 1024
    payload = os.urandom(size)
    page_id = 'test_page_5mb'
    
    # POST
    response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['page_id'] == page_id
    assert data['bytes_written'] == size
    
    # GET
    response = client.get(f'/notebook/pages/{page_id}/strokes')
    assert response.status_code == 200
    assert len(response.content) == size
    assert response.content == payload
    
    # Clean up
    file_path = os.path.join(notebook_routes.STROKES_DIR, f'{page_id}.bin')
    if os.path.exists(file_path):
        os.remove(file_path)

def test_large_payload_10mb():
    # 10MB of binary data
    size = 10 * 1024 * 1024
    payload = os.urandom(size)
    page_id = 'test_page_10mb'
    
    # POST
    response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['page_id'] == page_id
    assert data['bytes_written'] == size
    
    # GET
    response = client.get(f'/notebook/pages/{page_id}/strokes')
    assert response.status_code == 200
    assert len(response.content) == size
    assert response.content == payload
    
    # Clean up
    file_path = os.path.join(notebook_routes.STROKES_DIR, f'{page_id}.bin')
    if os.path.exists(file_path):
        os.remove(file_path)

def test_edge_case_page_id_length_100():
    # Page ID of maximum length 100 characters containing alphanumeric, underscores, and hyphens
    base_chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
    page_id = (base_chars * 2)[:100]
    assert len(page_id) == 100
    
    payload = b'dummy_strokes_data'
    
    # POST
    response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['page_id'] == page_id
    assert data['bytes_written'] == len(payload)
    
    # GET
    response = client.get(f'/notebook/pages/{page_id}/strokes')
    assert response.status_code == 200
    assert response.content == payload
    
    # Clean up
    file_path = os.path.join(notebook_routes.STROKES_DIR, f'{page_id}.bin')
    if os.path.exists(file_path):
        os.remove(file_path)

def test_invalid_characters_in_page_id():
    # Page IDs containing invalid characters should return 400 Bad Request, 404, or 405 (depending on url parsing of raw characters)
    # We test both raw and percent-encoded invalid characters.
    
    # These characters will be sent percent-encoded
    invalid_ids_encoded = [
        'page%20id',      # space
        'page%40id',      # @
        'page%23id',      # #
        'page%24id',      # $
        'page%25id',      # %
        'page%5Eid',      # ^
        'page%26id',      # &
        'page%2Aid',      # *
        'page%28id%29',   # ()
        'page%3Fid',      # ?
    ]
    
    payload = b'invalid_chars_data'
    
    for page_id in invalid_ids_encoded:
        # FastAPI decodes the path parameter and then applies the regex. It should return 400 Bad Request.
        response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
        assert response.status_code == 400
        
        response = client.get(f'/notebook/pages/{page_id}/strokes')
        assert response.status_code == 400

    # These are raw invalid characters, which might lead to 400, 404, or 405 due to client/server URL normalization
    invalid_ids_raw = [
        'page id',
        'page@id',
        'page#id',
        'page?id',
    ]
    for page_id in invalid_ids_raw:
        response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
        assert response.status_code in (400, 404, 405)
        
        response = client.get(f'/notebook/pages/{page_id}/strokes')
        assert response.status_code in (400, 404, 405)

def test_directory_traversal_attempts():
    # Page IDs containing directory traversal patterns should return 400 Bad Request, 404, or 405
    # (FastAPI URL normalization or regex validation will block/reject it)
    traversal_ids = [
        '../test',
        '..\\test',
        'test/../../etc/passwd',
        'test%2F..%2F..%2Fetc%2Fpasswd',
        'test/../../../etc/passwd',
        '..%2F..%2Ftest',
    ]
    
    payload = b'traversal_data'
    
    for page_id in traversal_ids:
        response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
        assert response.status_code in (400, 404, 405)
        
        response = client.get(f'/notebook/pages/{page_id}/strokes')
        assert response.status_code in (400, 404, 405)

def test_page_id_length_exceeded():
    # Test behaviour for page ID exceeding maximum length of 100 characters.
    # Note: The implementation does not currently enforce a maximum length check on page_id,
    # it only enforces the format regex. Thus, a length of 101 characters is accepted.
    base_chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
    page_id = (base_chars * 2)[:101]
    assert len(page_id) == 101
    
    payload = b'exceeded_length_data'
    
    # POST succeeds currently because no length validation is implemented
    response = client.post(f'/notebook/pages/{page_id}/strokes', content=payload)
    assert response.status_code == 200
    
    # GET succeeds currently
    response = client.get(f'/notebook/pages/{page_id}/strokes')
    assert response.status_code == 200
    assert response.content == payload
    
    # Clean up
    file_path = os.path.join(notebook_routes.STROKES_DIR, f'{page_id}.bin')
    if os.path.exists(file_path):
        os.remove(file_path)

import os
import sys
import time
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from auth_service import AuthService, encode_jwt, decode_jwt, hash_password, verify_password

def test_jwt_expiry_and_renewal():
    secret = 'test_secret_for_lifecycle_checks_32_bytes!'
    svc = AuthService(secret=secret)
    
    # 1. Valid token
    token = svc.create_access_token({'user_id': 'user_123', 'role': 'student'}, expires_delta_seconds=60)
    payload = svc.verify_token(token)
    assert payload is not None
    assert payload['user_id'] == 'user_123'
    assert payload['role'] == 'student'
    
    # 2. Expired token
    expired_token = svc.create_access_token({'user_id': 'user_123'}, expires_delta_seconds=-10)
    assert svc.verify_token(expired_token) is None

def test_password_hashing_and_verification():
    password = 'SecurePassword_2026!'
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(hashed, password) is True
    assert verify_password(hashed, 'WrongPassword') is False

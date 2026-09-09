import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth_service import AuthService, encode_jwt, decode_jwt, hash_password, verify_password
from auth_middleware import UserContext, get_current_user
from main import app

client = TestClient(app)

class TestAuthLifecycle:
    # 1. Multi-tenant JWT generation, expiration, and decoding
    def test_jwt_generation_and_valid_decode(self):
        auth_svc = AuthService(secret="test_super_secret_lifecycle_2026")
        payload = {"user_id": "tenant_1", "email": "tenant1@school.edu", "role": "admin"}
        token = auth_svc.create_access_token(payload, expires_delta_seconds=3600)
        decoded = auth_svc.verify_token(token)

        assert decoded is not None
        assert decoded["user_id"] == "tenant_1"
        assert decoded["email"] == "tenant1@school.edu"
        assert decoded["role"] == "admin"
        assert "exp" in decoded

    def test_jwt_immediate_expiry(self):
        auth_svc = AuthService(secret="test_super_secret_lifecycle_2026")
        payload = {"user_id": "tenant_2", "email": "tenant2@school.edu", "role": "student"}
        token = auth_svc.create_access_token(payload, expires_delta_seconds=-1)
        decoded = auth_svc.verify_token(token)
        assert decoded is None, "Expired token must not validate"

    def test_jwt_tampered_payload_rejected(self):
        auth_svc = AuthService(secret="test_super_secret_lifecycle_2026")
        token = auth_svc.create_access_token({"user_id": "u1", "role": "student"})
        parts = token.split(".")
        # Tamper signature
        tampered = f"{parts[0]}.{parts[1]}.badsignature123"
        assert auth_svc.verify_token(tampered) is None

    # 2. Multi-tenant Role Checks & Auth Middleware Context
    def test_auth_me_endpoint_with_roles(self):
        # Student role
        student_token = encode_jwt({"user_id": "stud_01", "email": "stud@test.com", "role": "student"})
        res_student = client.get("/auth/me", headers={"Authorization": f"Bearer {student_token}"})
        assert res_student.status_code == 200
        data_s = res_student.json()
        assert data_s["user_id"] == "stud_01"
        assert data_s["role"] == "student"

        # Teacher / Admin role
        admin_token = encode_jwt({"user_id": "admin_01", "email": "admin@test.com", "role": "admin"})
        res_admin = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200
        data_a = res_admin.json()
        assert data_a["user_id"] == "admin_01"
        assert data_a["role"] == "admin"

    def test_expired_token_header_rejected_by_middleware(self):
        expired_token = encode_jwt({"user_id": "exp_user", "email": "exp@test.com", "role": "student"}, expires_in=-10)
        res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code == 401
        assert "Invalid or expired session token" in res.json()["detail"]

    # 3. Secure PBKDF2 Password Hashing & Verification
    def test_password_hashing_and_verification(self):
        password = "SecureSuperPassword_2026!#"
        hashed = hash_password(password)
        assert hashed != password
        assert len(hashed) > 20

        # Correct password verifies
        assert verify_password(hashed, password) is True

        # Incorrect password fails
        assert verify_password(hashed, "WrongPassword123") is False

    def test_hash_uniqueness_with_salts(self):
        password = "SamePasswordAcrossUsers"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        # Salts ensure distinct stored hashes
        assert hash1 != hash2
        assert verify_password(hash1, password) is True
        assert verify_password(hash2, password) is True

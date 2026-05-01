import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, AsyncMock
import json

client = TestClient(app)

@pytest.fixture
def mock_org_id():
    with patch('app.middleware.tenant.get_current_org_id', return_value='test_org'):
        yield

def test_admin_cannot_promote_to_owner(mock_org_id):
    """admin tries to promote member to owner → expect 403"""
    with patch('app.services.clerk_auth.get_current_user', return_value={
        'user_id': 'admin_user',
        'email': 'admin@example.com',
        'org_role': 'org:admin'
    }):
        response = client.post(
            '/members/change-role',
            json={'target_user_id': 'member_user', 'new_role': 'org:owner'}
        )
        assert response.status_code == 403

def test_admin_cannot_change_another_admin_role(mock_org_id):
    """admin tries to change another admin's role → expect 403"""
    with patch('app.services.clerk_auth.get_current_user', return_value={
        'user_id': 'admin_user1',
        'email': 'admin1@example.com',
        'org_role': 'org:admin'
    }):
        # Mock Clerk API to simulate another admin
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'public_metadata': {'role': 'org:admin'}
            }
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

            response = client.post(
                '/members/change-role',
                json={'target_user_id': 'admin_user2', 'new_role': 'org:member'}
            )
            assert response.status_code == 403

def test_admin_cannot_remove_another_admin(mock_org_id):
    """admin tries to remove another admin → expect 403"""
    with patch('app.services.clerk_auth.get_current_user', return_value={
        'user_id': 'admin_user1',
        'email': 'admin1@example.com',
        'org_role': 'org:admin'
    }):
        # Mock Clerk API
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'public_metadata': {'role': 'org:admin'}
            }
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

            response = client.delete('/members/remove', json={'target_user_id': 'admin_user2'})
            assert response.status_code == 403

def test_owner_can_remove_admin(mock_org_id):
    """owner removes an admin → expect 200"""
    with patch('app.services.clerk_auth.get_current_user', return_value={
        'user_id': 'owner_user',
        'email': 'owner@example.com',
        'org_role': 'org:owner'
    }):
        # Mock Clerk API and audit log
        with patch('httpx.AsyncClient') as mock_client, \
             patch('app.services.audit_service.log_role_change') as mock_log, \
             patch('app.services.database._async_db.org_role_audit.insert_one') as mock_insert:
            
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'public_metadata': {'role': 'org:admin'}
            }
            mock_client.return_value.__aenter__.return_value.delete.return_value = mock_response
            mock_log.return_value = None
            mock_insert.return_value = None

            response = client.delete('/members/remove', json={'target_user_id': 'admin_user'})
            assert response.status_code == 200

def test_owner_can_promote_member_to_admin(mock_org_id):
    """owner promotes member to admin → expect 200"""
    with patch('app.services.clerk_auth.get_current_user', return_value={
        'user_id': 'owner_user',
        'email': 'owner@example.com',
        'org_role': 'org:owner'
    }):
        # Mock Clerk API and audit log
        with patch('httpx.AsyncClient') as mock_client, \
             patch('app.services.audit_service.log_role_change') as mock_log, \
             patch('app.services.database._async_db.org_role_audit.insert_one') as mock_insert:
            
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'public_metadata': {'role': 'org:member'}
            }
            mock_client.return_value.__aenter__.return_value.patch.return_value = mock_response
            mock_log.return_value = None
            mock_insert.return_value = None

            response = client.post(
                '/members/change-role',
                json={'target_user_id': 'member_user', 'new_role': 'org:admin'}
            )
            assert response.status_code == 200

def test_audit_log_returns_max_50_records(mock_org_id):
    """GET /members/audit-log returns max 50 records → expect 200"""
    with patch('app.services.clerk_auth.get_current_user', return_value={
        'user_id': 'viewer_user',
        'email': 'viewer@example.com',
        'org_role': 'org:viewer'
    }):
        # Mock database to return 60 records
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [{'record': i} for i in range(60)]
        mock_cursor.sort.return_value = mock_cursor
        mock_cursor.limit.return_value = mock_cursor

        with patch('app.services.database._async_db.org_role_audit.find', return_value=mock_cursor):
            response = client.get('/members/audit-log')
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 50
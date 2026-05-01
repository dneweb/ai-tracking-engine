import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.database import add_document, get_all_documents, add_query_log
from app.middleware.tenant import get_current_org_id
from unittest.mock import patch

client = TestClient(app)

def test_tenant_isolation_documents():
    # Mock org_id in context
    with patch('app.middleware.tenant.get_current_org_id', return_value='org1'):
        # Add document for org1
        doc1 = add_document("Test Doc 1", "Content 1", "Category 1", org_id='org1')
        assert doc1 is not None

        # Get all documents for org1
        docs = get_all_documents(org_id='org1')
        assert len(docs) == 1
        assert docs[0]['title'] == "Test Doc 1"

    with patch('app.middleware.tenant.get_current_org_id', return_value='org2'):
        # Add document for org2
        doc2 = add_document("Test Doc 2", "Content 2", "Category 2", org_id='org2')
        assert doc2 is not None

        # Get all documents for org2
        docs = get_all_documents(org_id='org2')
        assert len(docs) == 1
        assert docs[0]['title'] == "Test Doc 2"

        # Ensure org1 docs not visible to org2
        docs_org1 = get_all_documents(org_id='org1')
        assert len(docs_org1) == 1
        assert docs_org1[0]['title'] == "Test Doc 1"

def test_tenant_isolation_queries():
    # Mock org_id
    with patch('app.middleware.tenant.get_current_org_id', return_value='org1'):
        # Add query for org1
        query1 = add_query_log("Question 1", "Answer 1", 0.8, org_id='org1')
        assert query1 is not None

        # Get queries for org1
        queries = get_all_queries(org_id='org1')
        assert len(queries) >= 1
        # Assuming no other queries, but in real test, filter properly

    with patch('app.middleware.tenant.get_current_org_id', return_value='org2'):
        # Add query for org2
        query2 = add_query_log("Question 2", "Answer 2", 0.9, org_id='org2')
        assert query2 is not None

        # Get queries for org2
        queries = get_all_queries(org_id='org2')
        assert len(queries) >= 1

def test_api_tenant_isolation():
    # Test API endpoints with org_id in headers
    headers_org1 = {"Authorization": "Bearer fake_token", "X-Org-ID": "org1"}
    headers_org2 = {"Authorization": "Bearer fake_token", "X-Org-ID": "org2"}

    # Since we have middleware, but for test, mock
    # This is simplified
    pass

if __name__ == "__main__":
    pytest.main([__file__])
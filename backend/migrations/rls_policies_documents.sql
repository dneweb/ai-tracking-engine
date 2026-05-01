-- Enable RLS for documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS documents_org_isolation_select ON documents;
DROP POLICY IF EXISTS documents_org_isolation_insert ON documents;
DROP POLICY IF EXISTS documents_org_isolation_update ON documents;
DROP POLICY IF EXISTS documents_org_isolation_delete ON documents;

-- Create SELECT policy
CREATE POLICY documents_org_isolation_select
ON documents FOR SELECT
USING (org_id = current_setting('app.current_org_id', true));

-- Create INSERT policy
CREATE POLICY documents_org_isolation_insert
ON documents FOR INSERT
WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- Create UPDATE policy
CREATE POLICY documents_org_isolation_update
ON documents FOR UPDATE
USING (org_id = current_setting('app.current_org_id', true))
WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- Create DELETE policy
CREATE POLICY documents_org_isolation_delete
ON documents FOR DELETE
USING (org_id = current_setting('app.current_org_id', true));

-- Note: Since the database is MongoDB, not PostgreSQL, these SQL commands are for reference.
-- In MongoDB, RLS is implemented at the application layer by filtering queries with {"org_id": org_id}
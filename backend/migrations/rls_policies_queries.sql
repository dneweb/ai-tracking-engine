-- Enable RLS for queries table
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS queries_org_isolation_select ON queries;
DROP POLICY IF EXISTS queries_org_isolation_insert ON queries;
DROP POLICY IF EXISTS queries_org_isolation_update ON queries;
DROP POLICY IF EXISTS queries_org_isolation_delete ON queries;

CREATE POLICY queries_org_isolation_select
ON queries FOR SELECT
USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY queries_org_isolation_insert
ON queries FOR INSERT
WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY queries_org_isolation_update
ON queries FOR UPDATE
USING (org_id = current_setting('app.current_org_id', true))
WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY queries_org_isolation_delete
ON queries FOR DELETE
USING (org_id = current_setting('app.current_org_id', true));
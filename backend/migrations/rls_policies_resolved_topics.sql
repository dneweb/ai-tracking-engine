-- Enable RLS for resolved_topics table
ALTER TABLE resolved_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resolved_topics_org_isolation_select ON resolved_topics;
DROP POLICY IF EXISTS resolved_topics_org_isolation_insert ON resolved_topics;
DROP POLICY IF EXISTS resolved_topics_org_isolation_update ON resolved_topics;
DROP POLICY IF EXISTS resolved_topics_org_isolation_delete ON resolved_topics;

CREATE POLICY resolved_topics_org_isolation_select
ON resolved_topics FOR SELECT
USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY resolved_topics_org_isolation_insert
ON resolved_topics FOR INSERT
WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY resolved_topics_org_isolation_update
ON resolved_topics FOR UPDATE
USING (org_id = current_setting('app.current_org_id', true))
WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY resolved_topics_org_isolation_delete
ON resolved_topics FOR DELETE
USING (org_id = current_setting('app.current_org_id', true));
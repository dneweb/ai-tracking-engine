-- Create BYPASSRLS role for backend service connections
-- This role can bypass RLS for migrations and admin tasks
-- DO NOT grant this role to the application database user

CREATE ROLE bypass_rls_role BYPASSRLS;

-- Grant to the migration runner / superuser
-- GRANT bypass_rls_role TO migration_user;  -- Adjust as needed

-- Note: In MongoDB, no such role exists; access control is different.
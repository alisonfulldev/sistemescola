CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
GRANT USAGE ON SCHEMA _realtime TO postgres, anon, authenticated, service_role, supabase_admin;

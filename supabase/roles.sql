\set pgpassword `echo "$POSTGRES_PASSWORD"`
ALTER USER authenticator WITH PASSWORD :'pgpassword';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpassword';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpassword';
ALTER USER supabase_admin WITH PASSWORD :'pgpassword';

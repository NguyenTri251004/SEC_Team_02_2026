-- Transaction management: We wrap the schema creation in a transaction 
-- so that if one part fails, the whole state rolls back.
BEGIN;

-- 1. Safe Clean-up (Optional)
-- Since this is a "temporary" setup, you might want to ensure a clean slate.
-- Uncomment the following lines if you want to wipe existing data on initialization.
-- DROP SCHEMA IF EXISTS app_schema CASCADE;
-- DROP ROLE IF EXISTS app_user;

-- 2. Create a dedicated application user
-- It is insecure to connect as 'postgres' (superuser) from your app.
-- We check if the role exists first to avoid errors on re-runs.
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'app_user') THEN
      CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_temp_password';
   END IF;
END
$do$;

-- 3. Create a specific schema
-- Using 'public' is common but using a named schema is better for organization.
CREATE SCHEMA IF NOT EXISTS app_schema AUTHORIZATION app_user;

-- 4. Set search path
-- This allows you to use 'tablename' instead of 'app_schema.tablename'
ALTER ROLE app_user SET search_path TO app_schema;

-- 5. Create a Sample Table
-- Using UUIDs for primary keys is a modern standard to prevent enumeration attacks,
-- but requires the 'pgcrypto' or 'uuid-ossp' extension.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS app_schema.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Insert Mock Data (for testing connectivity)
INSERT INTO app_schema.users (email, status)
VALUES 
    ('test_admin@example.com', 'admin'),
    ('test_user@example.com', 'active')
ON CONFLICT (email) DO NOTHING; -- Prevents errors if data already exists

-- 7. Grant Privileges
-- Ensure the app_user has full control over the schema they own.
GRANT ALL PRIVILEGES ON SCHEMA app_schema TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_schema TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_schema TO app_user;

COMMIT;
\set ON_ERROR_STOP on
-- Run on the maintenance database (postgres), never reset the development database.
SELECT 'CREATE ROLE mygarage_e2e LOGIN PASSWORD ''mygarage_e2e'' NOSUPERUSER NOCREATEDB NOCREATEROLE'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mygarage_e2e')
\gexec
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mygarage_e2e' AND (rolsuper OR rolcreatedb OR rolcreaterole)) THEN
    RAISE EXCEPTION 'Existing test role has unsafe privileges; stop and review';
  END IF;
END $$;
SELECT 'CREATE DATABASE mygarage_e2e OWNER mygarage_e2e'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='mygarage_e2e')
\gexec
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database d JOIN pg_roles r ON d.datdba=r.oid
                 WHERE d.datname='mygarage_e2e' AND r.rolname='mygarage_e2e') THEN
    RAISE EXCEPTION 'Existing test DB has an unexpected owner; stop and review';
  END IF;
END $$;
-- Never ALTER or DELETE existing development data or privileges.

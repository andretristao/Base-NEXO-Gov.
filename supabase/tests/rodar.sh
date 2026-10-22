#!/usr/bin/env bash
# Aplica as migrations num Postgres local descartável e roda os cenários de RLS.
# Uso: PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
DB="nexo_rls_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/stub_supabase.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -d "$DB" -f tests/rls_cenarios.sql 2>&1 | grep -E "esperado|ERROR"

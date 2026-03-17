#!/bin/sh
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
AUTH_URL="http://auth:9999"

echo "Aguardando GoTrue..."
until curl -sf "$AUTH_URL/health" > /dev/null 2>&1; do
  sleep 3
done
echo "GoTrue pronto. Criando usuarios..."

create_user() {
  UUID=$1; EMAIL=$2; PASS=$3; NOME=$4; PERFIL=$5
  curl -sf -X POST "$AUTH_URL/admin/users" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$UUID\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"email_confirm\":true,\"role\":\"authenticated\",\"user_metadata\":{\"nome\":\"$NOME\",\"perfil\":\"$PERFIL\"}}" \
    > /dev/null 2>&1 \
    && echo "OK: $EMAIL" \
    || echo "JA EXISTE: $EMAIL"
}

create_user "00000000-0000-0000-0000-000000000001" "admin@escola.com"        "Escola@123" "Administrador"       "admin"
create_user "00000000-0000-0000-0000-000000000002" "secretaria@escola.com"   "Escola@123" "Maria Silva"         "secretaria"
create_user "00000000-0000-0000-0000-000000000003" "prof.carlos@escola.com"  "Escola@123" "Prof. Carlos Santos" "professor"
create_user "00000000-0000-0000-0000-000000000004" "prof.ana@escola.com"     "Escola@123" "Prof. Ana Oliveira"  "professor"
create_user "00000000-0000-0000-0000-000000000005" "resp.roberto@escola.com" "Escola@123" "Roberto Lima"        "responsavel"

echo "Pronto!"

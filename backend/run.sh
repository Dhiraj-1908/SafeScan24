#!/bin/bash
echo "Loading environment variables..."
export $(cat ../.env | grep -v '#' | grep -v '^$' | xargs)
echo "SUPABASE_HOST = $SUPABASE_HOST"
echo "SUPABASE_PORT = $SUPABASE_PORT"
echo "JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo YES || echo NO)"
echo ""
echo "Starting Spring Boot..."
./mvnw spring-boot:run

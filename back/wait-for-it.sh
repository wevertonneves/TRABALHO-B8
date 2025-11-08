#!/usr/bin/env bash
set -e

host="$1"
shift
until nc -z "$host" 3306; do
  echo "⏳ Aguardando MySQL ($host:3306)..."
  sleep 2
done

echo "✅ MySQL pronto, iniciando aplicação!"
exec "$@"

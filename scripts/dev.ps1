Param(
  [ValidateSet('build','up','restart-api','restart-admin','migrate','seed','logs-api','logs-admin','health','test-e2e')]
  [string]$Task = 'up'
)

$compose = "docker compose -f $PSScriptRoot/../docker-compose.yml"

switch ($Task) {
  'build' {
    & $compose build --no-cache api
    & $compose build admin
  }
  'up' {
    & $compose up -d
  }
  'restart-api' {
    & $compose restart api
  }
  'restart-admin' {
    & $compose restart admin
  }
  'migrate' {
    docker exec netflow-api sh -lc "pnpm --filter api db:migrate:deploy"
  }
  'seed' {
    docker exec netflow-api sh -lc "pnpm --filter api db:seed"
  }
  'logs-api' {
    docker logs -f netflow-api
  }
  'logs-admin' {
    docker logs -f netflow-admin
  }
  'health' {
    try {
      $res = Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/v1/health | Select-Object -ExpandProperty Content
      Write-Output $res
    } catch {
      Write-Error $_
    }
  }
  'test-e2e' {
    $db = "postgresql://netflow:netflow_dev_password@postgres:5432/netflow_cms?schema=public"
    $redis = "redis://redis:6379"
    docker exec -e DATABASE_URL=$db -e REDIS_URL=$redis netflow-api sh -lc "pnpm --filter api test:e2e"
  }
}

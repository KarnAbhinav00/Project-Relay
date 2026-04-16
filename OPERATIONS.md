# Operations Guide

## Backups and retention

- Database backups: daily snapshot, retain 14 days minimum.
- Point-in-time recovery: enable where provider supports it.
- Restore drill: run at least once per quarter.

## Incident response

1. Detect via health checks and error-rate alerts.
2. Triage by severity (auth outage, messaging loss, partial degradation).
3. Roll back using last known good deployment if customer impact persists.
4. Capture timeline, root cause, and prevention items.

## Runtime SLO targets

- API availability: 99.9%
- Message send p95: < 300ms within region
- Error budget tracking: monthly

## Production checklist

- Required env vars set (`JWT_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`).
- Migrations applied before app traffic.
- CI pipeline green on target commit.
- Health (`/health`) and readiness (`/ready`) passing.

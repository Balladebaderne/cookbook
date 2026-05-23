# Service Level Agreement (SLA)

> Cookbook is a 4th-semester IT-Architecture exam project, not a commercial
> service. This SLA is a deliberate, documented target — realistic for the
> coursework context — so the team has taken a clear position on availability,
> performance, and support.

## Scope

Applies to the production deployment on Azure (three-VM blue/green topology:
public nginx + private backend + private PostgreSQL), reached at
`http://<NGINX_IP>`. The local development stack is out of scope.

## Availability

| Metric | Target |
| ------ | ------ |
| Monthly uptime | **99.0%** (≈ 7h 18m downtime/month allowed) |
| Planned maintenance | Announced ≥ 24h ahead; excluded from uptime |
| Measurement | Prometheus `up` metric + the Grafana "Container Up/Down" panel |

Blue/green deploys target **zero-downtime releases**: the new backend color is
health-checked before nginx switches traffic to it, and a failed health check
leaves the current color serving.

## Performance

| Metric | Target |
| ------ | ------ |
| API p95 latency | **< 500 ms** under normal load |
| `/health` response | 200 OK within 2s |
| Measurement | Prometheus `http_request_duration_seconds` histogram (Grafana "P95 Latency" panel) |

## Support window

| Item | Commitment |
| ---- | ---------- |
| Support hours | Weekdays 09:00–17:00 (CET), during term |
| Acknowledge a reported issue | Within 1 business day |
| Security vulnerabilities | Report via GitHub security advisory; triaged per [`SECURITY.md`](../SECURITY.md) |

## Backup & recovery

- PostgreSQL data persists in a Docker volume on the database VM.
- Rollback of a bad release: `deploy/blue-green/rollback-blue-green.sh` switches
  nginx back to the previous color — see [`deploy/README-blue-green.md`](../deploy/README-blue-green.md).

## Exclusions

- Azure platform / infrastructure outages outside our control.
- Issues caused by client networks or unsupported browsers.
- The local development stack (`docker compose --profile dev`).

## Review

This SLA is reviewed at the end of each project iteration. As a coursework
project we cannot guarantee these targets, but they represent the level of
service the team designs and operates toward.

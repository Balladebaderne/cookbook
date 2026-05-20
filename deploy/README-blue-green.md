# Blue/Green Deploys for Three VMs

This deploy path is selected when the repo variable is:

```text
DEPLOY_MODE=three-vms
```

It is designed for the Azure topology created by
`infrastructure/create_three_vms.sh`:

- public nginx/frontend VM
- private backend VM
- private database VM

The backend VM runs two backend containers:

- `cookbook-backend-blue`, published on backend VM port `3001`
- `cookbook-backend-green`, published on backend VM port `3002`

The nginx VM routes `/api` and `/apidocs` to the active backend through
`BACKEND_HOST`. Because nginx and backend run on separate VMs, nginx uses
`${BACKEND_PRIVATE_IP}:3001` or `${BACKEND_PRIVATE_IP}:3002`, not Docker
container names.

## Files

```text
deploy/blue-green/
├── active-color.env
├── backend-blue-green.yml
├── deploy-blue-green.sh
├── nginx-blue-green.yml
└── rollback-blue-green.sh
```

`active-color.env` stores the active color and the host/port nginx should
proxy to. CI preserves this file on the VMs and only updates nginx after the
inactive backend has passed its health check.

## Required GitHub Configuration

Secrets:

- `SSH_USER`
- `SSH_HOST_NGINX`
- `BACKEND_PRIVATE_IP`
- `DATABASE_PRIVATE_IP`
- `SSH_PRIVATE_KEY`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Optional secret:

- `POSTGRES_PORT`, defaults to `5432`

Repo variable:

- `DEPLOY_MODE=three-vms`

## Deploy Flow

1. CI builds and pushes backend/frontend images tagged as `sha-<commit-sha>`.
2. CI copies blue/green compose files and scripts to the nginx and backend VMs.
3. CI copies the current `active-color.env` from nginx to the backend VM.
4. The backend VM runs `deploy-blue-green.sh`.
5. The script deploys the inactive backend color with the SHA-tagged image.
6. The script polls `http://localhost:<inactive-port>/health`.
7. If healthy, the script writes a new `active-color.env`.
8. CI copies that file to nginx and recreates the nginx/frontend container.

If the inactive backend is unhealthy, CI fails before copying the new
`active-color.env` to nginx. Live traffic remains on the previous color.

## Rollback

On the nginx VM:

```bash
cd ~/app/blue-green
GITHUB_OWNER=<github-owner> sudo -E ./rollback-blue-green.sh
```

The rollback script switches `active-color.env` back to `PREVIOUS_COLOR` and
recreates nginx. It does not stop either backend color.

## Database Runtime

The backend still uses SQLite by default for local development and tests. In
production it switches to Postgres when either `DATABASE_URL` or the Postgres
environment variables are set:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

For the three-VM workflow, CI maps `DATABASE_PRIVATE_IP` to `POSTGRES_HOST`.

## Migration Rule

Blue/green means old and new backend versions can run at the same time. Any
production database change must be backwards compatible:

1. Add compatible tables/columns first.
2. Deploy an app version that can work with both the old and new schema shape.
3. Backfill data.
4. Remove old fields only in a later release after both colors run compatible
   code.

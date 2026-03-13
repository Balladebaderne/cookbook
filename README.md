# Cookbook - Recipe Management Application

A full-stack recipe management web application where users can browse, view, and manage recipes. Built by **Balladebaderne** as a DevOps demo project at KEA ITA, 4th semester.

---

## Live Deployment

**Frontend:**
http://172.189.59.40

**API:**
http://172.189.59.40/api

**API Documentation (Swagger):**
http://172.189.59.40/apidocs/

---

## Tech Stack

### Backend
- Node.js + Express.js
- SQLite3 (via better-sqlite3)
- OpenAPI 3.0 (Swagger UI)

### Frontend
- React + Vite
- Nginx (static file serving via Docker)

### Infrastructure
- Azure Virtual Machine (Ubuntu)
- Docker + Docker Compose (with profiles)
- GitHub Actions (CI/CD)
- GitHub Container Registry (GHCR)

---

## Project Structure

```text
cookbook/
├── backend/                  # Express backend API
│   ├── routes/
│   │   ├── api.js
│   │   ├── recipes.js
│   │   └── users.js
│   ├── db.js
│   ├── initDb.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RecipeList.jsx
│   │   │   ├── RecipeDetail.jsx
│   │   │   └── RecipeForm.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── legacy/                   # Legacy Flask app (deprecated)
├── .github/
│   └── workflows/
│       └── ci-cd.yml         # GitHub Actions pipeline
├── docker-compose.yml        # Unified compose file with dev/prod profiles
├── openapi.yaml              # OpenAPI specification
└── README.md
```

---

## Running Locally with Docker

### Requirements

- Docker
- Docker Compose

### Start (development — builds from source)

```bash
docker compose --profile dev up --build
```

### Stop

```bash
docker compose --profile dev down
```

### Stop and reset database

```bash
docker compose --profile dev down -v
```

### Access locally

Frontend: http://localhost

Backend API: http://localhost/api

Swagger docs: http://localhost/apidocs/

---

## CI/CD Pipeline

The pipeline is defined in [`.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml).

### Branch strategy

| Branch | CI (build + push images) | CD (deploy to Azure) |
|--------|--------------------------|----------------------|
| `dev` | ✅ | ❌ |
| `master` | ✅ | ✅ |

### How it works

1. A push to `dev` or `master` triggers the pipeline.
2. Docker images are built and pushed to GitHub Container Registry:
   - `ghcr.io/balladebaderne/cookbook-backend:latest`
   - `ghcr.io/balladebaderne/cookbook-frontend:latest`
3. On `master` only: the deploy job SSHs into the Azure VM, pulls the latest images and restarts the containers using the `prod` profile.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Private key for SSH access to the VM |
| `SSH_HOST` | Public IP of the VM (`172.189.59.40`) |
| `SSH_USER` | SSH username (`azureuser`) |
| `DEPLOY_PATH` | Directory on the VM where compose file lives |
| `GHCR_USERNAME` | GitHub username with package read access |
| `GHCR_PAT` | GitHub token with `read:packages` permission |

---

## Azure VM

**SSH access:**
```bash
ssh azureuser@172.189.59.40
```

### Manual deployment on VM

```bash
cd <DEPLOY_PATH>
echo "<GHCR_PAT>" | docker login ghcr.io -u "<GHCR_USERNAME>" --password-stdin
docker compose --profile prod pull
docker compose --profile prod up -d
```

### Inspect running containers

```bash
docker compose --profile prod ps
docker images | grep cookbook
```

---

## Repository

https://github.com/Balladebaderne/cookbook

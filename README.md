# Cookbook - Recipe Management Application

A full-stack recipe management web application where users can browse, view, and manage recipes.

The application is deployed on an Azure Virtual Machine using Docker and is accessible online.

---

## Live Deployment

**Frontend:**  
http://172.189.59.40

**Backend API:**  
http://172.189.59.40/api

**API Documentation (Swagger):**  
http://172.189.59.40/apidocs/

---

## Tech Stack

### Backend
- Node.js
- Express.js
- SQLite3
- OpenAPI 3.0 (Swagger)

### Frontend
- React
- Nginx (served via Docker)

### Infrastructure
- Azure Virtual Machine (Ubuntu)
- Docker
- Docker Compose
- GitHub Actions
- GitHub Container Registry (GHCR)

### DevOps & Version Control
- Git
- GitHub

---

## Project Structure

```text
cookbook/
|-- backend/                  # Express backend API
|   |-- index.js
|   |-- package.json
|   `-- Dockerfile
|-- frontend/                 # React frontend
|   |-- src/
|   |-- package.json
|   |-- nginx.conf
|   `-- Dockerfile
|-- docker-compose.yml        # Local development with image builds
|-- docker-compose.prod.yml   # Production deployment with GHCR images
|-- openapi.yaml              # OpenAPI specification
`-- README.md
```

---

## Running Locally with Docker

### Requirements

- Docker
- Docker Compose

### Start application

```bash
docker compose up -d --build
```

### Stop application

```bash
docker compose down
```

### Access locally

Frontend:  
http://localhost

Backend API:  
http://localhost:3000/api

Swagger docs:  
http://localhost:3000/apidocs

---

## Current Pipeline Overview

The repository currently deploys from GitHub Actions. The workflow is defined in [`.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml).

### How it works now

1. A push to `master` or `dev` starts the pipeline.
2. The `build` job installs dependencies and runs lint, tests, and build steps for both `backend` and `frontend`.
3. On `master`, the workflow publishes Docker images to GitHub Container Registry:
   - `ghcr.io/<owner>/cookbook-backend:latest`
   - `ghcr.io/<owner>/cookbook-frontend:latest`
4. The deploy job then SSHs into the VM using GitHub Secrets.
5. The VM logs into `ghcr.io`, pulls the latest images, and starts them with `docker compose -f docker-compose.prod.yml up -d`.

### Which secrets are involved

The pipeline still depends on GitHub Secrets for access:

- `SSH_PRIVATE_KEY`: private key used by GitHub Actions to SSH into the VM
- `SSH_HOST`: public IP or DNS name of the VM
- `SSH_USER`: SSH username on the VM, likely `azureuser`
- `DEPLOY_PATH`: directory on the VM where the production compose file lives
- `GHCR_USERNAME`: GitHub username or machine user with package read access
- `GHCR_PAT`: GitHub token with permission to read packages from GHCR

### Important difference

The VM no longer needs the full repository copied onto it for deployment. It only needs:

- Docker and Docker Compose installed
- access to `ghcr.io`
- the production compose file
- a GitHub token that can pull the package images

---

## Azure VM Access

### What we know from this repository

The repository documents:

- SSH user: `azureuser`
- public IP: `172.189.59.40`

That means the expected login command is:

```bash
ssh azureuser@172.189.59.40
```

### What is not stored in this repository

This repo does **not** contain Azure infrastructure files such as Terraform, Bicep, or ARM templates, so it does not tell us:

- the Azure resource group
- the VM name in Azure
- the Azure subscription
- whether a DNS name is configured

You would need to check one of these places for that:

- the Azure Portal
- repository or organization secrets in GitHub
- whoever created the VM

### If SSH fails

Common reasons:

- your local machine does not have the correct private key
- port `22` is blocked in the VM network security group
- `azureuser` is not the right user anymore
- the VM public IP has changed

---

## VM Deployment Layout

The production deployment now expects a directory like this on the VM:

```text
<DEPLOY_PATH>/
|-- .env
`-- docker-compose.prod.yml
```

The `.env` file is written by the workflow and includes:

```env
GITHUB_REPOSITORY_OWNER=<owner>
IMAGE_TAG=latest
```

---

## Manual Commands On The VM

If you SSH into the VM and want to update the running app manually:

```bash
cd <DEPLOY_PATH>
echo "<GHCR_PAT>" | docker login ghcr.io -u "<GHCR_USERNAME>" --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

To inspect what is running:

```bash
docker compose -f docker-compose.prod.yml ps
docker images | grep cookbook
```

---

## Repository

https://github.com/Balladebaderne/cookbook
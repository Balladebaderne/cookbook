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

### DevOps & Version Control
- Git
- GitHub

---

## Project Structure

```
cookbook/
│
├── backend/                # Express backend API
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── frontend/               # React frontend
│   ├── src/
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
│
├── openapi.yaml           # OpenAPI specification
├── docker-compose.yml     # Docker orchestration
└── README.md
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

## Deployment (Azure VM)

The application is deployed on an Azure Virtual Machine using Docker.

### Start application on VM

```bash
ssh azureuser@172.189.59.40
cd ~/cookbook
docker compose up -d
```

### Update application from GitHub

```bash
git pull origin dev
docker compose up -d --build
```

---

## 📖 API Documentation

Swagger UI is available at:

http://172.189.59.40/apidocs/

The OpenAPI specification is defined in:

```
openapi.yaml
```

---

## Team: BalladeBaderne

- Magnus Giemsa  
- Laurits Munk  
- Elias Garcia  
- Andreas Brandenborg  
- Jacob Bisgaard  

---

## Repository

https://github.com/Balladebaderne/cookbook

---

## Status

- Backend deployed and running on Azure VM  
- Frontend deployed and running on Azure VM  
- Swagger API documentation available  
- Dockerized full-stack deployment  
- GitHub integration configured  

---
heyhey

# Migration strategy Flask -> FastAPI
Here's a practical DevOps strategy for migrating Flask (Python 2.7) to FastAPI (Python 3.12+):

## Phase 1: Setup & Assessment (Week 1)

**Create parallel infrastructure:**
```bash
# New repo structure
/legacy-flask-app/       # Keep existing Flask app running
/new-fastapi-app/        # Build FastAPI version
/shared/                 # Shared database, configs
```

**Set up CI/CD pipeline:**
- Create separate pipelines for both apps
- Use GitHub Actions, GitLab CI, or Jenkins
- Implement automated testing for both versions

**Containerize everything:**
```dockerfile
# Dockerfile for FastAPI
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Phase 2: Strangler Fig Pattern (Weeks 2-6)

Gradually migrate endpoints while keeping Flask running:

**Use a reverse proxy (nginx/Traefik):**
```nginx
# Route old endpoints to Flask, new to FastAPI
location /api/v1/ {
    proxy_pass http://flask-app:5000;
}

location /api/v2/ {
    proxy_pass http://fastapi-app:8000;
}
```

**Migration order:**
1. Start with read-only endpoints (GET)
2. Move to simple CRUD operations
3. Handle complex business logic last
4. Keep authentication/auth for later

## Phase 3: Code Migration Strategy

**Port Python 2.7 → 3.12 changes:**
```python
# Old Flask (Python 2.7)
print "Hello"
dict.iteritems()
unicode()

# New FastAPI (Python 3.12+)
print("Hello")
dict.items()
str()
```

**Convert Flask routes to FastAPI:**
```python
# Flask
@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = db.query(User).filter(User.id == user_id).first()
    return jsonify(user.to_dict())

# FastAPI
@app.get('/users/{user_id}')
async def get_user(user_id: int):
    user = await db.query(User).filter(User.id == user_id).first()
    return user
```

## Phase 4: DevOps Implementation

**Infrastructure as Code:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  flask-legacy:
    build: ./legacy-flask-app
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
  
  fastapi-new:
    build: ./new-fastapi-app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
  
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

**CI/CD Pipeline Example:**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test-fastapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd new-fastapi-app
          pip install -r requirements.txt
          pytest
      
  deploy:
    needs: test-fastapi
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          docker-compose up -d fastapi-new
          # Run smoke tests
          # If passed, update nginx routing
```

## Phase 5: Monitoring & Rollback

**Set up observability:**
- Prometheus + Grafana for metrics
- ELK/Loki for logs
- Sentry for error tracking
- Compare Flask vs FastAPI performance side-by-side

**Feature flags:**
```python
# Gradually route traffic
if feature_flag('use_fastapi_users'):
    return fastapi_endpoint()
else:
    return flask_endpoint()
```

## Phase 6: Cutover Strategy

**Blue-Green Deployment:**
1. Run both apps in production (different ports)
2. Route 10% traffic to FastAPI → monitor
3. Increase to 50% → monitor
4. Route 100% to FastAPI
5. Keep Flask as backup for 2 weeks
6. Decommission Flask

**Database considerations:**
```python
# Use same database, just different connection
# Ensure FastAPI uses async drivers:
# SQLAlchemy 2.0 with asyncpg/aiomysql
```

## Timeline Example

- **Week 1:** Setup, containerization, CI/CD
- **Weeks 2-3:** Migrate 20% of endpoints (read-only)
- **Weeks 4-5:** Migrate 50% (CRUD operations)
- **Week 6:** Migrate remaining endpoints
- **Week 7:** Full testing, performance tuning
- **Week 8:** Gradual production rollout
- **Week 9-10:** Monitor, optimize, decommission Flask

## Key DevOps Practices

1. **Automated testing** at every step
2. **Canary deployments** for risk mitigation
3. **Database migrations** handled separately (Alembic)
4. **Rollback plan** always ready
5. **Documentation** updated continuously
6. **Team training** on FastAPI/async patterns

This approach lets you migrate incrementally while maintaining service availability and allows quick rollback if issues arise.

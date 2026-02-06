# Cookbook - Recipe Management Application

A full-stack web application for sharing and managing recipes built with Node.js, Express, React, and SQLite3.

**Repository**: https://github.com/cookbookio/awesome_recipe_cookbook

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React
- **Database**: SQLite3
- **Containerization**: Docker & Docker Compose
- **API Documentation**: OpenAPI 3.0 / Swagger
- **Version Control**: Git & GitHub

## Team: BalladeBaderne

- Magnus Giemsa (Team Lead)
- Laurits Munk (Backend Developer)
- Elias Garcia (Frontend Developer)
- Andreas Brandenborg (DevOps/Infrastructure)
- Jacob Bisgård (Backend Developer)

## Quick Start

### Using Docker (Recommended)

The easiest way to run the application is with Docker:

```bash
# Clone the repository
git clone https://github.com/cookbookio/awesome_recipe_cookbook.git
cd cookbook

# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:5000
# API Health Check: http://localhost:5000/health
```

**Note**: The first build may take a few minutes. Docker will automatically:
- Install all dependencies
- Build the frontend
- Start both backend and frontend services
- Create the SQLite database

To stop the application:

```bash
docker-compose down
```

To view logs:

```bash
docker-compose logs -f
```

### Local Development

For local development without Docker:

```bash
# Install dependencies for both backend and frontend
npm run install:all

# Start the backend development server (from project root)
npm run dev

# In another terminal, start the frontend development server
cd frontend
npm start
```

**Requirements**:
- Node.js 18.x or higher
- npm 9.x or higher

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Build

To build a production-ready Docker image:

```bash
# Build the image
docker build -t cookbook:latest .

# Run the container
docker run -p 5000:5000 -p 3000:3000 cookbook:latest
```

## API Documentation

The project includes comprehensive OpenAPI 3.0 documentation. View the specs:

- **OpenAPI Specs**: [openapi.yaml](./openapi.yaml)
- **Swagger UI**: Available at `http://localhost:5000/api-docs` (when running)

### API Endpoints

- `GET /health` - API health check
- `GET /api/recipes` - Get all recipes
- `POST /api/recipes` - Create a new recipe
- `GET /api/recipes/{id}` - Get recipe by ID
- `PUT /api/recipes/{id}` - Update a recipe
- `DELETE /api/recipes/{id}` - Delete a recipe
- `GET /api/recipes/search` - Search recipes

See [openapi.yaml](./openapi.yaml) for detailed specifications.

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
DATABASE_PATH=./data/cookbook.db
CORS_ORIGIN=http://localhost:3000
```

## Features

- 📖 View and search recipes
- ➕ Add new recipes with ingredients and instructions
- ⭐ Rate and review recipes
- 🔍 Advanced search functionality
- 📱 Responsive design
- 🐳 Containerized deployment with Docker Compose

## Project Structure

```
cookbook/
├── backend/                    # Express.js API server
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── middleware/
├── frontend/                   # React application
│   ├── src/
│   ├── public/
│   └── package.json
├── data/                       # SQLite database storage
├── docs/                       # Documentation
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose configuration
├── openapi.yaml               # API specification
├── groups.py                  # Team configuration
└── README.md                  # This file
```

## Development Workflow

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to your branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

## Contributing

Contributions are welcome! Please follow our development workflow guidelines.

## Troubleshooting

### Port Already in Use

If ports 3000 or 5000 are already in use:

```bash
# Change ports in docker-compose.yml or .env
# Or kill the process using the port
lsof -i :3000
kill -9 <PID>
```

### Database Issues

To reset the database:

```bash
rm -rf data/cookbook.db
docker-compose down
docker-compose up --build
```

### Build Failures

If Docker build fails:

```bash
# Clean up
docker-compose down --volumes
docker system prune -f

# Try again
docker-compose up --build
```

## License

MIT - See LICENSE file for details.

## Support & Questions

- 📧 GitHub Issues: Report bugs or request features
- 📖 Documentation: See `/docs` folder
- 🔗 Repository: https://github.com/cookbookio/awesome_recipe_cookbook

---

**Cookbook** - A project by BalladeBaderne Team | [GitHub Organization](https://github.com/cookbookio)

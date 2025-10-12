# BoklyAI Deployment Guide

This guide explains how to run BoklyAI locally with Docker Compose and how automated GitHub deployments keep hosted environments up to date.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Local Docker Compose workflow

1. Clone the repository (if not already done):
   ```bash
   git clone <repository-url>
   cd boklyai
   ```

2. Build and start the application:
   ```bash
   docker compose up -d --build
   ```

   This will start three services:
   - PostgreSQL database on port 5432
   - Backend API on port 3000
   - Frontend application on port 80

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:3000

## Stopping the application

To stop the application, run:
```bash
docker compose down
```

To stop the application and remove the database volumes, run:
```bash
docker compose down -v
```

## Configuration

You can modify the environment variables in the `docker-compose.yml` file to customize the deployment:

- Database credentials
- JWT secret for authentication
- Port mappings
- Container images via `BACKEND_IMAGE` and `FRONTEND_IMAGE` if you want to pull pre-built artifacts instead of building locally

### Frontend configuration

The frontend application uses environment variables for configuration:

- `REACT_APP_API_URL`: The URL to the backend API
  - In development: `http://localhost:3000`
  - In production (Docker): `/api` (uses nginx proxy)
- `REACT_APP_BASE_URL`: The base URL of the application
- `NODE_ENV`: The environment (development/production)

### Backend configuration

The backend application uses environment variables for configuration:

- `DATABASE_HOST`: Database host (default: database)
- `DATABASE_PORT`: Database port (default: 5432)
- `DATABASE_USERNAME`: Database username (default: boklyai)
- `DATABASE_PASSWORD`: Database password (default: boklyai_password)
- `DATABASE_NAME`: Database name (default: boklyai_db)
- `JWT_SECRET`: Secret for JWT token generation
- `NODE_ENV`: The environment (development/production)

## Notes

- The database data is persisted in a Docker volume named `postgres_data`.
- The application uses a custom bridge network named `boklyai_network`.
- In production, you should use a reverse proxy like Nginx or Traefik for SSL termination and load balancing.
- The frontend is configured to proxy API requests to the backend through nginx when running in Docker.

## GitHub Actions automation

A dedicated workflow defined in `.github/workflows/deploy.yml` keeps the GitHub repository buildable and deployable:

- **`verify` job** – runs on every push to `main` and on manual triggers. It installs dependencies, runs backend and frontend unit tests, builds the React bundle, and executes the Python AI service test suite.
- **`build-and-push-images` job** – builds Docker images for the backend, frontend, and AI services and publishes them to the GitHub Container Registry at `ghcr.io/<owner>/<repo>-<service>:(latest|<commit-sha>)`. GitHub automatically provisions the authentication token used by the workflow; no additional secrets are required for the push step.
- **`deploy-staging` job** – optionally connects to a remote server via SSH, pulls the latest code, and restarts the stack with `docker compose up -d --build`. Set the secrets `STAGING_HOST`, `STAGING_USER`, and `STAGING_SSH_KEY` in the GitHub repository to enable this job.

### Using the published images

Once the workflow has published images, a server can be updated without rebuilding locally:

```bash
docker login ghcr.io -u <github-username> -p <personal-access-token>
docker pull ghcr.io/<owner>/<repo>-backend:latest
docker pull ghcr.io/<owner>/<repo>-frontend:latest
docker pull ghcr.io/<owner>/<repo>-ai-services:latest
export BACKEND_IMAGE=ghcr.io/<owner>/<repo>-backend:latest
export FRONTEND_IMAGE=ghcr.io/<owner>/<repo>-frontend:latest
docker compose up -d
```

Replace `<owner>` and `<repo>` with your GitHub organisation and repository name. For automation, generate a fine-grained personal access token with `read:packages` scope and store it as a secret on the deployment host.

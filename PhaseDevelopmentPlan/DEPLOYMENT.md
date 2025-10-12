# BoklyAI Deployment Guide

This guide explains how to deploy the BoklyAI application using Docker and docker-compose.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Deployment Steps

1. Clone the repository (if not already done):
   ```
   git clone <repository-url>
   cd boklyai
   ```

2. Build and start the application using docker-compose:
   ```
   docker-compose up -d
   ```

This will start three services:
- PostgreSQL database on port 5432
- Backend API on port 3000
- Frontend application on port 80

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:3000

## Stopping the Application

To stop the application, run:
```
docker-compose down
```

To stop the application and remove the database volumes, run:
```
docker-compose down -v
```

## Configuration

You can modify the environment variables in the `docker-compose.yml` file to customize the deployment:

- Database credentials
- JWT secret for authentication
- Port mappings

### Frontend Configuration

The frontend application uses environment variables for configuration:

- `REACT_APP_API_URL`: The URL to the backend API
  - In development: `http://localhost:3000`
  - In production (Docker): `/api` (uses nginx proxy)
- `REACT_APP_BASE_URL`: The base URL of the application
- `NODE_ENV`: The environment (development/production)

### Backend Configuration

The backend application uses environment variables for configuration:

- `DATABASE_HOST`: Database host (default: database)
- `DATABASE_PORT`: Database port (default: 5432)
- `DATABASE_USERNAME`: Database username (default: boklyai)
- `DATABASE_PASSWORD`: Database password (default: boklyai_password)
- `DATABASE_NAME`: Database name (default: boklyai_db)
- `JWT_SECRET`: Secret for JWT token generation
- `NODE_ENV`: The environment (development/production)

## Notes

- The database data is persisted in a Docker volume named `postgres_data`
- The application uses a custom bridge network named `boklyai_network`
- In production, you should use a reverse proxy like Nginx or Traefik for SSL termination and load balancing
- The frontend is configured to proxy API requests to the backend through nginx when running in Docker
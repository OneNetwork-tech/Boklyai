# BoklyAI Frontend

This is the frontend application for BoklyAI, a Swedish accounting AI system.

## Technologies Used

- React with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- GraphQL for data fetching

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

The application will be available at http://localhost:3000

## Project Structure

```
src/
  components/     # Reusable UI components
  pages/          # Page components
  services/       # API service layer
  hooks/          # Custom React hooks
  context/        # React context providers
  assets/         # Static assets
  utils/          # Utility functions
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects the React scripts configuration

## Connecting to Backend

The frontend connects to the backend API running on http://localhost:3000 by default. You can change this by setting the `REACT_APP_API_URL` environment variable.
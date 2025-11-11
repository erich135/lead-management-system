# Environment Configuration

## Setup

1. Create a `.env` file in the root of the `lead-management-system` directory
2. Add the following environment variable:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Configuration

- **VITE_API_BASE_URL**: The base URL of your ARS backend API
  - Default: `http://localhost:5000`
  - Update this if your backend is running on a different port or domain

## Security Notes

- The `.env` file is already in `.gitignore` and will not be committed to version control
- Never commit sensitive API keys or tokens to the repository
- For production, set environment variables through your hosting platform's configuration


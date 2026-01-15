# Backend

This project was initialized as a Node.js project.

Steps performed:

- `npm init -y` created `package.json`
- `npm install` was run (no dependencies were present)

This repository now includes a starter Express + MongoDB backend scaffold.

Files added:

- `src/server.js` - entry point that connects to MongoDB and starts the server
- `src/app.js` - Express app configuration and route mounting
- `src/config/db.js` - mongoose connection helper
- `src/models/User.js` - example User model
- `src/controllers/authController.js` - auth handlers (register/login)
- `src/routes/auth.js` - auth routes
- `src/middlewares/errorHandler.js` - central error handler
- `src/middlewares/notFound.js` - 404 handler
- `src/utils/generateToken.js` - JWT helper
- `.env.example` - example env file

To run the project:

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Install dependencies (already installed if you asked me to):
  `npm install`
3. Start in development:
  `npm run dev` (requires `nodemon`) or `npm start`.

Managing secrets safely

- Do NOT commit real secrets to the repository. Use one of these safe approaches:
  - Set environment variables in your shell before running the server (recommended for quick tests).
  - Create a local-only `.env.local` file by copying `.env.local.example` and filling in real values; ensure `.env.local` is in `.gitignore` (already configured).

PowerShell example (temporary for current session):
```powershell
$env:OPENAI_API_KEY="sk-REPLACE_WITH_YOUR_KEY"
node realtime-client.js
```

Persistent local file example:
1. Copy `.env.local.example` to `.env.local`.
2. Edit `.env.local` and add your real `OPENAI_API_KEY`.
3. Run the server or scripts; dotenv will load `.env.local` if you configure it in your startup script, or copy it to `.env` for simplicity when developing locally.


Next steps:

- Add any dependencies you need, for example:
  - `npm install express` for a web server
  - `npm install dotenv` to manage environment variables
  - `npm install -D nodemon` to auto-restart during development

- Add project source files (e.g. `index.js`) and update `package.json` scripts.

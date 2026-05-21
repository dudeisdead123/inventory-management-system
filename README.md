# Inventory Management System (MERN)

Full-stack inventory app with multi-location stock, analytics, payments, and AI chat.

## Project structure

| Folder | Purpose |
|--------|---------|
| `Backend/` | Express API + PostgreSQL + Socket.io |
| `Frontend/inventory_management_system/` | React UI |

## Local development

```bash
# Terminal 1 — backend
cd Backend
npm install
npm run server

# Terminal 2 — frontend
cd Frontend/inventory_management_system
npm install
npm start
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001  

Copy `Backend/.env.example` → `Backend/.env` and `Frontend/inventory_management_system/.env.example` → `.env.local` and fill in values.

## Deploy

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for Neon + Render + Netlify.

## Utilities

- `Backend/schema.sql` — database tables  
- `Backend/db-init.js` — run schema against `DATABASE_URL`  
- `Backend/set-admin.js` — create/update admin user (edit email/password in file first)

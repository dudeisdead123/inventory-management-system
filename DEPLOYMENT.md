# Deploy IMS (MERN Inventory Management System)

This guide uses **free-tier friendly** services:

| Part | Service | Why |
|------|---------|-----|
| Database | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Managed PostgreSQL |
| Backend | [Render](https://render.com) | Node + WebSockets |
| Frontend | [Netlify](https://netlify.com) or [Vercel](https://vercel.com) | React static build |

---

## 1. Prepare the database

1. Create a PostgreSQL database on Neon (or Supabase).
2. Copy the **connection string** (`DATABASE_URL`), e.g.  
   `postgresql://user:pass@host/ims_db?sslmode=require`
3. In the SQL editor, run the schema from your project:

```bash
# Local example (if you have psql)
psql "YOUR_DATABASE_URL" -f Backend/schema.sql
```

4. (Optional) Seed an admin user with your existing scripts (`set-admin.js`, etc.) against the hosted DB by setting `DATABASE_URL` in a local `.env` before running them.

---

## 2. Deploy the backend (Render)

1. Push your code to **GitHub**.
2. On Render: **New → Web Service** → connect the repo.
3. Settings:

| Setting | Value |
|---------|--------|
| **Root directory** | `Backend` |
| **Build command** | `npm install` |
| **Start command** | `npm start` |
| **Instance** | Free |

4. **Environment variables** (Render dashboard → Environment):

```
NODE_ENV=production
PORT=10000
DATABASE_URL=<your Neon connection string>
PGSSL=true
JWT_SECRET=<long random string, e.g. openssl rand -hex 32>
FRONTEND_URL=https://your-app.netlify.app
GEMINI_API_KEY=<your key>
GEMINI_MODEL=gemini-2.5-flash
```

Add Razorpay keys if you use live payments:

```
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

5. Deploy and copy your backend URL, e.g. `https://ims-api.onrender.com`.
6. Test: open `https://ims-api.onrender.com/health` — should return `{"ok":true,...}`.

**Note:** Render free tier sleeps after inactivity; first request may be slow.

---

## 3. Deploy the frontend (Netlify)

1. Netlify: **Add new site → Import from Git**.
2. Settings:

| Setting | Value |
|---------|--------|
| **Base directory** | `Frontend/inventory_management_system` |
| **Build command** | `npm run build` |
| **Publish directory** | `build` |

3. **Environment variable**:

```
REACT_APP_API_URL=https://ims-api.onrender.com
```

(No trailing slash. Must be set **before** build — rebuild after changing.)

4. Deploy and copy your site URL, e.g. `https://ims-inventory.netlify.app`.

5. **SPA routing:** create `Frontend/inventory_management_system/public/_redirects`:

```
/*    /index.html   200
```

(Netlify serves this automatically from `public/`.)

6. Go back to Render and set:

```
FRONTEND_URL=https://ims-inventory.netlify.app
```

Redeploy the backend so CORS allows your frontend.

---

## 4. Vercel (frontend alternative)

- Root: `Frontend/inventory_management_system`
- Build: `npm run build`
- Output: `build`
- Env: `REACT_APP_API_URL=https://your-backend.onrender.com`
- Add `vercel.json` rewrites if needed:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 5. Local vs production checklist

| Item | Local | Production |
|------|-------|------------|
| API URL | default `http://localhost:3001` | `REACT_APP_API_URL` on host |
| DB | `PG*` vars in `Backend/.env` | `DATABASE_URL` + `PGSSL=true` |
| JWT | optional default | **Required** strong `JWT_SECRET` |
| CORS | `http://localhost:3000` | Your Netlify/Vercel URL in `FRONTEND_URL` |

---

## 6. After deploy — test

1. Open the frontend URL → register / login.
2. Add a product, check stock dashboard.
3. Open AI chat (needs `GEMINI_API_KEY` on backend).
4. If API calls fail: browser DevTools → Network → check URL and CORS errors.

**Common issues**

| Problem | Fix |
|---------|-----|
| CORS error | `FRONTEND_URL` on backend must exactly match frontend origin (https, no trailing slash). |
| 401 on every request | Users must **log in again** after deploy (old JWT used different secret). |
| DB connection failed | Use `DATABASE_URL` + `PGSSL=true` on Neon/Supabase. |
| Blank page on refresh | Add `_redirects` or Vercel rewrites for React Router. |
| Chat / API “network error” | `REACT_APP_API_URL` wrong or backend asleep (Render free). |

---

## 7. Security reminders

- Never commit `Backend/.env` or API keys to GitHub.
- Rotate `JWT_SECRET` and `GEMINI_API_KEY` if they were ever exposed.
- Use Razorpay **test** keys until you go live.

---

## Quick reference — env files

**Backend** (`Backend/.env` locally, Render env in cloud): see `Backend/.env.example`.

**Frontend** (`Frontend/inventory_management_system/.env.local` locally, Netlify env in cloud): see `.env.example`.

```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

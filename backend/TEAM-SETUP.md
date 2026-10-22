# Shop Pilot backend — team setup

One backend (port 4000): original auth/chat routes + product catalog (`/api/categories`, `/api/products`).

## One-time (project admin only)
1. MongoDB Atlas: create a project + free M0 cluster.
2. Database Access: create a database user (readWrite on `shop_pilot`) for the team.
3. Network Access: add each teammate's IP (avoid 0.0.0.0/0 except for short tests).
4. Put `Predictions.csv` in `backend/data/` (git-ignored), set `MONGO_URI`, then:
   `npm run import:dry` then `npm run import` (safe to re-run; upserts by `asin`, never deletes).

## Every teammate
```powershell
git clone <repo-url>
cd <repo>\backend
npm install
Copy-Item .env.example .env      # then edit .env: MONGO_URI (from the admin, privately), JWT_SECRET (any long random text)
npm start                         # http://localhost:4000/api/health should say ok
```
Frontend (second terminal): `cd ..\frontend; npm install; Copy-Item .env.example .env; npm run dev` → http://localhost:5173

Teammates do NOT import the CSV; the data is already in the shared database.
Never commit `.env`, `node_modules`, `data/`.

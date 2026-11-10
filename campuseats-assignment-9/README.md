# CampusEats — CS543 Web Services, Assignment 09: Securing the API

## Selected Service: Menu/Catalogue REST API (secured)

The Menu/Catalogue service from Assignment 8 (Node.js + Express, in-memory data, plain HTML/CSS frontend), now secured with:

- **Login** — `POST /login` checks a bcrypt-hashed password and returns a signed JWT (user id + role, 1 hour expiry).
- **Authentication** — an `auth` middleware verifies the `Authorization: Bearer <token>` header and replies `401` if the token is missing, invalid or expired.
- **Authorization** — a `requireRole(...)` middleware lets only the privileged role change data and replies `403` to any other signed-in user.
- **Secret in config** — the JWT secret is read from `process.env.JWT_SECRET` (`.env`, git-ignored). `.env.example` has a blank value.

## Team Members

| Name | Roll Number |
|---|---|
| Uday Kumar Gupta | 20251651098 |
| Ritesh Jadhav | 20251651046 |
| Mukesh Mourya | 20251651059 |
| Koushik | 20251651052 |
| Yash | 20251651105 |

## Run Locally

**Requirements:** Node.js (LTS) and npm.

```bash
npm install
```

Create the config file from the template and put any long random value after `JWT_SECRET=`:

```bash
# Windows (Command Prompt / PowerShell)
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

```bash
npm start
```

Open **http://localhost:3000**. If `JWT_SECRET` is missing the server stops with a clear message.

## Seeded Users (passwords are stored only as bcrypt hashes)

| Email | Password | Role |
|---|---|---|
| asha@campus.edu | customer123 | customer |
| mealhub@campus.edu | resto123 | restaurant |

## Using the Web Page

1. **Load menu (no token)** → the server answers **401**.
2. Click **Fill restaurant** (or **Fill customer**) → **Login** → the response panel shows the **token**.
3. **Load menu (with token)** → **200** and the menu is listed.
4. Logged in as the restaurant, use **Add a dish** → **201 Created**, and the new dish appears.
5. Logout, log in as the customer, **Add a dish** → **403 Forbidden**.

The "Last server response" box shows the method, path, status code and body of every request.

## REST API Routes

| Method | Path | Guards | Allowed | Status Codes |
|---|---|---|---|---|
| POST | `/login` | none (public) | anyone with valid credentials | 200, 401 |
| GET | `/items` | `auth` | any signed-in user (customer, restaurant, admin) | 200, 401 |
| GET | `/items/:id` | `auth` | any signed-in user | 200, 401, 404 |
| POST | `/items` | `auth` + `requireRole('restaurant', 'admin')` | restaurant or admin only | 201, 401, 403, 422 |

The guards run in order: `auth` (who are you → 401), then `requireRole` (may you → 403), then the handler.

### Example commands (PowerShell: use `curl.exe`)

```bash
curl -i localhost:3000/items
curl -X POST localhost:3000/login -H "Content-Type: application/json" -d "{\"email\":\"mealhub@campus.edu\",\"password\":\"resto123\"}"
curl -i localhost:3000/items -H "Authorization: Bearer <token>"
curl -i -X POST localhost:3000/items -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"name\":\"Cheese Pizza\",\"price\":99,\"category\":\"Snacks\"}"
```

## Answers to Assignment Questions

### 1. Which route(s) require only authentication, and which also require a role?

- **Authentication only:** `GET /items` and `GET /items/:id` — any signed-in user (customer, restaurant or admin) may read the menu.
- **Authentication + role:** `POST /items` — only the **restaurant** (or **admin**) role may add a dish.
- `POST /login` is public: it is how a user obtains a token.

### 2. One 401 and one 403 from the demo

**401** — `GET /items` with no token:

```
HTTP/1.1 401 Unauthorized
{"error":"invalid or missing token"}
```

*Why 401, not 403:* the request carried no valid token, so the server could not tell who the caller is. 401 means "I don't know who you are."

**403** — `POST /items` with the customer's token (`asha@campus.edu`):

```
HTTP/1.1 403 Forbidden
{"error":"forbidden"}
```

*Why 403, not 401:* the token is valid, so the server knows exactly who the caller is, but the `customer` role is not allowed to add dishes. 403 means "I know who you are, but you can't do this."

### 3. What is inside the JWT payload? Why trust the role claim, and why keep the secret out of the code?

**Payload:** `{ "sub": <user id>, "role": "<customer | restaurant>", "iat": <issued at>, "exp": <expiry, 1 hour later> }`.

**Why the role claim can be trusted:** the token is signed with `JWT_SECRET`. The signature is computed from the header, the payload and the secret. If a client edits the payload (for example changes `role` to `restaurant`), the signature no longer matches, `jwt.verify` throws and the server replies 401. Only the server, which holds the secret, can produce a valid signature. (The web page decodes the role only to show a badge; the server never trusts the browser and re-checks the signed token on every request.)

**Why the secret must stay out of the code:** anyone who knows the secret can sign their own tokens with any role, and the server would accept them. Source code is committed, shared and pushed to GitHub, so a secret written in it leaks. Reading it from `process.env.JWT_SECRET` (a git-ignored `.env` file) keeps it out of the repository and lets it be changed without editing code.

## Project Files

```
server.js         secured service: POST /login, auth, requireRole, routes
public/           index.html + style.css (login, menu, add-dish form, response panel)
package.json      express, jsonwebtoken, bcryptjs (+ dotenv to load .env)
.env.example      JWT_SECRET= (blank, committed)
.env              real secret (git-ignored, never committed)
.gitignore        node_modules/, .DS_Store, .env
README.md
```

## Submission Deliverables

### 1. GitHub Repository

[CampusEats Project Repository](https://github.com/udaygupta9081/shop-pilot-ai)

### 2. Google Drive — Demonstration and Screenshots

The Google Drive folder contains:
- A short demonstration video of the secured application.
- Screenshots of the five cases: **401** (no token), **login** (token returned), **200** (menu with token), **201** (restaurant adds a dish), **403** (customer tries to add a dish).

[Google Drive — Demo Video and Screenshots](PASTE_YOUR_DRIVE_LINK_HERE)

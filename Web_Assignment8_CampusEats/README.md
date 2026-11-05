# CampusEats — CS543 Web Services, Assignment 8

**Selected service:** Menu/Catalogue REST API

A Node.js + Express REST API with a plain HTML/CSS frontend. The menu data is held in an in-memory array, as permitted by the assignment.

## Team members

| Name | Roll Number |
|---|---|
| Uday Kumar Gupta | 20251651098 |
| Ritesh Jadhav | 20251651046 |
| Mukesh Mourya | 20251651059 |
| Koushik | 20251651052 |
| Yash | 20251651105 |

## Run locally

Requirements: Node.js (LTS) and npm.


npm install
npm start


Open **http://localhost:3000**. The frontend is served from `public/` by Express. The in-memory menu resets to the four seed records whenever the server restarts.

## REST API routes

| Method | Path | Purpose | Status codes |
|---|---|---|---|
| GET | `/items` | List all menu items | 200 |
| GET | `/items/:id` | Fetch one menu item by ID | 200, 404 |
| POST | `/items` | Create a menu item | 201, 422 |

### Example POST JSON


{
  "name": "Cheese Pizza",
  "price": 99,
  "category": "Snacks",
  "available": true
}


## Answers to assignment questions

**1. Which CampusEats service did you pick, and what are its routes (method + path)?**

We selected the **Menu/Catalogue Service**, which manages food items offered by campus vendors. Its routes are `GET /items` to list all items, `GET /items/:id` to fetch one item, and `POST /items` to create an item.

**2. Which status codes did you return, and for which outcomes (200 / 201 / 404 / 422)?**

- `200 OK`: menu list returned or requested item found.
- `201 Created`: menu item successfully created.
- `404 Not Found`: requested item ID does not exist.
- `422 Unprocessable Entity`: required fields (`name`, `price`, or `category`) are missing, or the price is invalid.

**3. Where did you use req.params and where req.body? Why does POST need express.json()?**

`req.params.id` is used in `GET /items/:id` to read the ID from the URL. `req.body` is used in `POST /items` to read the submitted menu item. `express.json()` parses incoming JSON request bodies and makes the resulting object available through `req.body`.

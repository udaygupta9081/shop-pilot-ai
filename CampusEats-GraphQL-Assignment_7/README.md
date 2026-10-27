# CampusEats GraphQL — CS543 Assignment 7

**Group:** 22  
**Selected service:** Menu/Dishes  
**Stack:** GraphQL, Apollo Server, Express, Node.js, MySQL, HTML/CSS/JavaScript

## Team members

| # | Name | Roll number |
|---|---|---|
| 1 | Uday Kumar Gupta | 20251651098 |
| 2 | Ritesh Jadhav | 20251651046 |
| 3 | Mukesh Mourya | 20251651059 |
| 4 | Koushisk Rakshit | 20251651052 |
| 5 | Yash Raj | 20251651105 |

## Assignment answers

### 1. Which CampusEats service did you pick?
We picked the **Menu/Dishes service**. It exposes dish information such as ID, name, price, and availability through GraphQL.

### 2. Name one field a client can skip and one it cannot. Why do we use `!`?
A client can skip `available` when selecting fields in a query if it does not need that value. In the mutation input, `available` can also be omitted because it is nullable and the resolver defaults it to `true`. The `name` field cannot be omitted or set to `null` in `AddDishInput`, because its type is `String!`. In GraphQL, `!` marks a value as non-null.

### 3. Map a query to SQL: which part becomes the `WHERE`, and which resolver runs the `INSERT`?
For `dish(id: ID!)`, the supplied GraphQL `id` argument is passed to the `Query.dish` resolver and used as the parameter in `WHERE id = ?`. The `Mutation.addDish` resolver runs the parameterized `INSERT INTO ...` statement to save a new dish.

## Features implemented

- GraphQL `Dish` object type, `Query` operations, and `addDish` mutation.
- MySQL `campuseats.dishes` table and seed data.
- SQL-backed resolvers using parameterized queries.
- HTML frontend that fetches and displays dishes and submits the add-dish mutation.
- Tested adding **Manchurian (₹120)** and **Paneer roll (₹90)** through the frontend.

## Setup and run

### 1. Set up MySQL
Ensure MySQL Server is running. Open `schema.sql` in MySQL Workbench and execute it to create the database/table and seed records.

The default local configuration is:

- Host: `localhost`
- User: `root`
- Password: empty by default
- Database: `campuseats`

If your MySQL password is not empty, set environment variables in PowerShell before starting the app:

```powershell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="your_mysql_password"
$env:DB_NAME="campuseats"
```

### 2. Install dependencies
Open a terminal in this project folder and run:

```bash
npm install
```

### 3. Start the server

```bash
npm start
```

Open **http://localhost:4000**. The GraphQL endpoint is **http://localhost:4000/graphql**.

## GraphQL examples

### Query all dishes

```graphql
query {
  dishes {
    id
    name
    price
    available
  }
}
```

### Query one dish by ID

```graphql
query {
  dish(id: "1") {
    id
    name
    price
    available
  }
}
```

### Add a dish

```graphql
mutation {
  addDish(input: { name: "Paneer Roll", price: 90 }) {
    id
    name
    price
    available
  }
}
```

## Evidence

Screenshots from the working frontend and MySQL verification are in the [`evidence/`](evidence/) folder.

For the demonstration video, record the browser at `http://localhost:4000`, show the current menu, add a dish, and show that the new dish appears. Upload the video to Google Drive and set access as instructed by your teacher.

## Submission links

- **GitHub repository:** _Add the repository URL after pushing this project._
- **Demonstration video:** _Add the Google Drive URL after uploading the video._

## One-line run instruction

Execute `schema.sql` in MySQL Workbench, run `npm install`, configure `DB_PASSWORD` if needed, run `npm start`, and open `http://localhost:4000`.

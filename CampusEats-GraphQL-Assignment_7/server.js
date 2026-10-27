
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4");
const { json } = require("express");
const db = require("./db");

const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema.graphql"),
  "utf8"
);

const resolvers = {
  Query: {
    dishes: async () => {
      const [rows] = await db.query(
        "SELECT id, name, price, available FROM campuseats.dishes ORDER BY id"
      );

      console.log("Dishes fetched:", rows.length);

      return rows.map((row) => ({
        ...row,
        available: Boolean(row.available)
      }));
    },

    dish: async (_parent, { id }) => {
      const [rows] = await db.execute(
        "SELECT id, name, price, available FROM campuseats.dishes WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        available: Boolean(rows[0].available)
      };
    }
  },

  Mutation: {
    addDish: async (_parent, { input }) => {
      try {
        const available = input.available ?? true;

        const [result] = await db.execute(
          `INSERT INTO campuseats.dishes
           (name, price, available)
           VALUES (?, ?, ?)`,
          [input.name.trim(), input.price, available]
        );

        console.log("INSERT RESULT:", {
          insertId: result.insertId,
          affectedRows: result.affectedRows
        });

        const [rows] = await db.execute(
          `SELECT id, name, price, available
           FROM campuseats.dishes
           WHERE id = ?`,
          [result.insertId]
        );

        if (rows.length === 0) {
          throw new Error("Dish insert hua, lekin database se dobara nahi mila.");
        }

        console.log("Dish saved:", rows[0]);

        return {
          ...rows[0],
          available: Boolean(rows[0].available)
        };
      } catch (error) {
        console.error("ADD DISH ERROR:", error);
        throw new Error("Dish save nahi hui: " + error.message);
      }
    }
  }
};

async function startServer() {
  try {
    // Database connection verify karo
   const [dbInfo] = await db.query(
    "SELECT DATABASE() AS db, @@hostname AS host, @@port AS port, @@datadir AS data_directory"
   );

    console.log("Database connection:", dbInfo[0]);

    const app = express();
    const apollo = new ApolloServer({ typeDefs, resolvers });

    await apollo.start();

    app.use(express.static(path.join(__dirname, "public")));
    app.use("/graphql", json(), expressMiddleware(apollo));

    const port = Number(process.env.PORT || 4000);

    app.listen(port, () => {
      console.log(`CampusEats is running at http://localhost:${port}`);
      console.log(`GraphQL endpoint: http://localhost:${port}/graphql`);
    });
  } catch (error) {
    console.error("SERVER START ERROR:", error);
    process.exit(1);
  }
}

startServer();

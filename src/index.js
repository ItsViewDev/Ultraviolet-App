npm install express-session

import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import session from "express-session";
import { createServer } from "node:http";
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join } from "node:path";
import { hostname } from "node:os";

const bare = createBareServer("/bare/");
const app = express();
const correctPassword = "1234";

// Set up session middleware
app.use(
  session({
    secret: "your-secret-key", // Change this to a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Middleware to check if the user is authenticated
function checkAuth(req, res, next) {
  if (req.session.isAuthenticated) {
    return next(); // User is authenticated, proceed to the next middleware
  }
  // If not authenticated, redirect to the password page
  res.redirect("/login");
}

// Password login page
app.get("/login", (req, res) => {
  res.send(`
    <html>
      <body>
        <h2>Enter Password</h2>
        <form method="POST" action="/check-password">
          <input type="password" name="password" placeholder="Enter password">
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  `);
});

// Check password and authenticate the user
app.post("/check-password", (req, res) => {
  const { password } = req.body;

  if (password === correctPassword) {
    req.session.isAuthenticated = true; // Set session authenticated
    res.redirect("/"); // Redirect to the main site
  } else {
    res.send(`
      <html>
        <body>
          <h2>Incorrect Password</h2>
          <p>Try again.</p>
          <a href="/login">Go back</a>
        </body>
      </html>
    `);
  }
});

// Main site content (protected by the password)
app.use(checkAuth, express.static(publicPath));
app.use("/uv/", express.static(uvPath));

// Error for everything else
app.use((req, res) => {
  res.status(404);
  res.sendFile(join(publicPath, "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

server.on("listening", () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`
  );
});

// Graceful shutdown
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  bare.close();
  process.exit(0);
}

server.listen({ port });

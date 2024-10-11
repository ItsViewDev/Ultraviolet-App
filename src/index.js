import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join } from "node:path";
import { hostname } from "node:os";
import session from 'express-session'; // Import express-session for handling sessions

const bare = createBareServer("/bare/");
const app = express();

// Define your password variable (easily changeable)
const password = "1234";

// Configure session with a secret key (change this for security)
const sessionConfig = {
  secret: 'your_secret_key', // Replace with a strong random string
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true for https
};
app.use(session(sessionConfig));

// Middleware to check for password on initial request
app.use((req, res, next) => {
  // Check if session exists and password is correct
  if (!req.session.isAuthenticated || req.session.isAuthenticated !== password) {
    // Password screen logic
    if (req.method === 'GET') {
      // Send password screen (replace with your password form)
      res.sendFile(join(publicPath, "password.html"));
    } else if (req.method === 'POST') {
      const submittedPassword = req.body.password;
      if (submittedPassword === password) {
        // Password is correct, set session variable and continue
        req.session.isAuthenticated = password;
        next();
      } else {
        // Password is incorrect, send error
        res.status(401).send("Incorrect password");
      }
    } else {
      // Handle other methods (optional)
      res.status(405).send("Method not allowed");
    }
  } else {
    // Password is correct, continue to main application
    // Hide password screen and show main content
    res.send('<script>document.getElementById("password-screen").style.display = "none";</script>');
    next();
  }
});

// Load your publicPath first and prioritize it over UV.
app.use(express.static(publicPath));
// Load vendor files last.
// The vendor's uv.config.js won't conflict with our uv.config.js inside the publicPath directory.
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

  // by default we are listening on 0.0.0.0 (every interface)
  // we just need to list a few
  console.log("Listening on:");
  console.log(`http://localhost:${address.port}`);
  console.log(`http://${hostname()}:${address.port}`);
  console.log(
    `http://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

// https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  bare.close();
  process.exit(0);
}

server.listen({
  port,
});

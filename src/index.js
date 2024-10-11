import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join } from "node:path";
import { hostname } from "node:os";
import bodyParser from "body-parser";  // To parse POST request bodies

const bare = createBareServer("/bare/");
const app = express();

// Middleware to parse URL-encoded and JSON bodies (for handling form submissions)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Password
const password = "1234";

// Render password page
app.get("/password", (req, res) => {
  res.send(`
    <html>
      <body>
        <h2>Please enter the password:</h2>
        <form action="/login" method="POST">
          <input type="password" name="password" />
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  `);
});

// Route to handle password submission
app.post("/login", (req, res) => {
  const userPassword = req.body.password;

  // Check if password is correct
  if (userPassword === password) {
    // Set a cookie to track successful login (you can also use sessions)
    res.cookie("authenticated", "true", { httpOnly: true });
    res.redirect("/");  // Redirect to the main site
  } else {
    res.send("Incorrect password, please try again.");
  }
});

// Middleware to check for the password cookie
app.use((req, res, next) => {
  if (req.cookies && req.cookies.authenticated === "true") {
    // User is authenticated, proceed to the site
    next();
  } else {
    // User is not authenticated, redirect to the password page
    res.redirect("/password");
  }
});

// Load our publicPath first and prioritize it over UV.
app.use(express.static(publicPath));
// Load vendor files last.
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
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
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

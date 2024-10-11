import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join } from "node:path";
import { hostname } from "node:os";
import bodyParser from "body-parser";

const bare = createBareServer("/bare/");
const app = express();

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(bodyParser.urlencoded({ extended: true }));

// Set a simple password
const PASSWORD = "1234";

// Serve the password input form
app.get("/", (req, res) => {
  if (req.query.unlocked) {
    res.sendFile(join(publicPath, "index.html")); // Serve the normal site
  } else {
    res.send(`
      <html>
        <head>
          <title>Password Protected</title>
        </head>
        <body>
          <h1>Enter Password</h1>
          <form method="POST" action="/">
            <input type="password" name="password" placeholder="Enter password" />
            <button type="submit">Submit</button>
          </form>
        </body>
      </html>
    `);
  }
});

// Handle password submission
app.post("/", (req, res) => {
  const enteredPassword = req.body.password;
  if (enteredPassword === PASSWORD) {
    // Password correct, redirect to main page with "unlocked" query param
    res.redirect("/?unlocked=true");
  } else {
    // Password incorrect, show the form again
    res.send(`
      <html>
        <head>
          <title>Password Protected</title>
        </head>
        <body>
          <h1>Incorrect password, try again</h1>
          <form method="POST" action="/">
            <input type="password" name="password" placeholder="Enter password" />
            <button type="submit">Submit</button>
          </form>
        </body>
      </html>
    `);
  }
});

// Load our publicPath first and prioritize it over UV.
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

  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
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

server.listen({
  port,
});

import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join } from "node:path";
import { hostname } from "node:os";

const bare = createBareServer("/bare/");
const app = express();
const correctPassword = "1234";

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Simple password screen
app.get("/", (req, res) => {
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

// Check password
app.post("/check-password", (req, res) => {
  const { password } = req.body;

  if (password === correctPassword) {
    res.send(`
      <html>
        <body>
          <h2>Access Granted</h2>
          <p>Welcome to the site!</p>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <body>
          <h2>Incorrect Password</h2>
          <p>Try again.</p>
          <a href="/">Go back</a>
        </body>
      </html>
    `);
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

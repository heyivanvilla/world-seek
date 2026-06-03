import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { registerHandlers } from "./handlers";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const io = new Server(server, {
    // Local dev only; widen/lock down as needed for deployment.
    cors: { origin: "*" },
  });
  registerHandlers(io);

  server.listen(port, () => {
    console.log(`> World Seek ready on http://localhost:${port}`);
  });
});

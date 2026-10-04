// Custom server so route handlers can see the real client IP.
// Next.js route handlers don't expose the socket address, so we pass it
// through a header that clients can't spoof (any incoming copy is removed).
import { createServer } from "node:http";
import next from "next";

const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 3000);
const trustProxy = process.env.TRUST_PROXY === "true";
export const IP_HEADER = "x-xkl-client-ip";

const app = next({ dev });
const handle = app.getRequestHandler();

function clientIp(req) {
  if (trustProxy) {
    const cf = req.headers["cf-connecting-ip"];
    if (typeof cf === "string" && cf) return cf.trim();
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

await app.prepare();
createServer((req, res) => {
  delete req.headers[IP_HEADER];
  let ip = clientIp(req);
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  req.headers[IP_HEADER] = ip;
  handle(req, res);
}).listen(port, () => {
  console.log(`Xkixos Licensing running on http://localhost:${port}${dev ? " (dev)" : ""}`);
});

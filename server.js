import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

async function ensureDataFile() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify({ utilisateurs: [], parties: [] }, null, 2));
  }
}

async function readData() {
  const text = await readFile(DATA_FILE, "utf-8");
  return JSON.parse(text);
}

async function saveData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

await ensureDataFile();

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.url === "/api/data" && req.method === "GET") {
    const data = await readData();
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(data));
    return;
  }

  if (req.url === "/api/data" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        await saveData(data);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "invalid json" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
  res.end();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`API server listening on ${PORT}`);
});

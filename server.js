import express from 'express';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { saveBase64AsJpeg } from './utils/image-store.mjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

async function ensureDataFile() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await readFile(DATA_FILE, 'utf-8');
  } catch {
    await writeFile(DATA_FILE, JSON.stringify({ utilisateurs: [], parties: [] }, null, 2));
  }
}

async function readData() {
  const text = await readFile(DATA_FILE, 'utf-8');
  return JSON.parse(text);
}

async function saveData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

await ensureDataFile();

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/uploads', express.static('uploads'));
app.use('/analyzed', express.static('public/analyzed'));

app.get('/api/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/data', async (req, res) => {
  try {
    await saveData(req.body || {});
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'invalid_json' });
  }
});

async function runAnalysis(absPath, jackColor = 'auto') {
  const base = path.basename(absPath, path.extname(absPath));
  const outDir = path.join('public', 'analyzed');
  await fs.mkdir(outDir, { recursive: true });
  const outPng = path.join(outDir, `${base}.annotated.png`);
  const outJson = path.join(outDir, `${base}.result.json`);

  const args = ['petanque-distance.mjs', absPath, '--out', outPng, '--json', outJson, '--jack-color', jackColor];
  return await new Promise((resolve, reject) => {
    const proc = spawn('node', args);
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', async code => {
      if (code === 0) {
        try {
          const json = JSON.parse(await fs.readFile(outJson, 'utf8'));
          json.annotated_url = `/analyzed/${path.basename(outPng)}`;
          json.json_url = `/analyzed/${path.basename(outJson)}`;
          resolve(json);
        } catch (e) {
          reject({ error: 'cannot_read_result', detail: e.message });
        }
      } else {
        await fs.rm(outPng, { force: true });
        await fs.rm(outJson, { force: true });
        reject({ error: 'analysis_failed', detail: stderr.trim() });
      }
    });
  });
}

app.post('/api/photo/upload', async (req, res) => {
  const { imageBase64, gameId, jackColor } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'missing_image' });
  try {
    const photo = await saveBase64AsJpeg(imageBase64);
    const data = await readData();
    let game = data.parties.find(p => p.id === gameId);
    if (!game) {
      game = { id: gameId || String(Date.now()), photos: [] };
      data.parties.push(game);
    }
    const photoRef = {
      id: String(Date.now()),
      filePath: photo.relPath,
      url: photo.publicUrl,
      width: photo.width,
      height: photo.height,
      bytes: photo.bytes,
      createdAt: photo.createdAt
    };
    game.photos = game.photos || [];
    game.photos.push(photoRef);
    await saveData(data);

    let analysis = null;
    try {
      analysis = await runAnalysis(photo.absPath, jackColor || 'auto');
    } catch (e) {
      return res.status(422).json(e);
    }

    res.json({ game, photo: photoRef, analysis });
  } catch (e) {
    res.status(500).json({ error: 'internal_error', detail: e.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { filePath, jackColor } = req.body || {};
  if (!filePath) return res.status(400).json({ error: 'missing_file' });
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  try {
    const analysis = await runAnalysis(absPath, jackColor || 'auto');
    res.json({ analysis });
  } catch (e) {
    res.status(422).json(e);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server listening on ${PORT}`);
});

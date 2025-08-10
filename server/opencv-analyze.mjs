// server/opencv-analyze.mjs
// Optional Node API for analyzing a pétanque photo using opencv4nodejs.
// Requires: npm i express multer opencv4nodejs
// Also requires OpenCV installed on the host system.
// If you already have a server.js, you can import and mount the router exported here.
import express from "express";
import multer from "multer";
import cv from "opencv4nodejs";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const router = express.Router();

function detectCircles(mat, dp, minDist, param1, param2, minRadius, maxRadius) {
  // opencv4nodejs uses HoughCircles via cv.HoughModes.HOUGH_GRADIENT
  const circles = mat.houghCircles(cv.HoughModes.HOUGH_GRADIENT, dp, minDist, param1, param2, minRadius, maxRadius);
  // circles is Nx1x3 Mat (x,y,r)
  const out = [];
  for (let i = 0; i < circles.rows; i++) {
    const x = circles.at(i, 0);
    const y = circles.at(i, 1);
    const r = circles.at(i, 2);
    out.push({ x, y, r });
  }
  return out;
}

function pickJackByHeuristics(srcBgr, circles) {
  if (!circles.length) return null;
  // Basic heuristic: smallest radius, with a bias for lighter/less saturated color
  let best = circles[0];
  let bestScore = -Infinity;
  const hsv = srcBgr.cvtColor(cv.COLOR_BGR2HSV);
  for (const c of circles) {
    const r = Math.max(3, Math.floor(c.r * 0.8));
    const x0 = Math.max(0, Math.floor(c.x - r));
    const y0 = Math.max(0, Math.floor(c.y - r));
    const x1 = Math.min(hsv.cols - 1, Math.floor(c.x + r));
    const y1 = Math.min(hsv.rows - 1, Math.floor(c.y + r));
    const roi = hsv.getRegion(new cv.Rect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)));
    const mean = roi.mean(); // [H,S,V]
    const S = mean[1], V = mean[2];
    const score = (1 / (c.r + 1)) * (255 - S + V);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { ...best, kind: "jack" };
}

router.post("/api/analyze", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded ('photo')." });
    // Read image from buffer
    let src = cv.imdecode(req.file.buffer); // BGR
    const maxSide = 1280;
    if (Math.max(src.cols, src.rows) > maxSide) {
      const scale = maxSide / Math.max(src.cols, src.rows);
      src = src.resize(new cv.Size(Math.round(src.cols * scale), Math.round(src.rows * scale)));
    }
    const gray = src.cvtColor(cv.COLOR_BGR2GRAY).medianBlur(5);
    const minDim = Math.min(src.cols, src.rows);
    const smallMinR = Math.max(3, Math.round(minDim * 0.01));
    const smallMaxR = Math.max(smallMinR + 3, Math.round(minDim * 0.04));
    const bigMinR = Math.max(10, Math.round(minDim * 0.05));
    const bigMaxR = Math.max(bigMinR + 10, Math.round(minDim * 0.18));

    const small = detectCircles(gray, 1.2, Math.round(minDim * 0.03), 100, 20, smallMinR, smallMaxR);
    const big = detectCircles(gray, 1.1, Math.round(minDim * 0.05), 120, 35, bigMinR, bigMaxR);
    const all = [...small, ...big];
    const jack = small.length ? pickJackByHeuristics(src, small) : (all.length ? pickJackByHeuristics(src, all) : null);

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    const boules = (big.length ? big : all).filter(c => !jack || dist(c, jack) > (c.r + (jack.r || 0)) * 1.1)
      .map(c => ({ ...c, kind: "boule" }));
    const sorted = jack ? [...boules].sort((a, b) => dist(a, jack) - dist(b, jack)) : boules;

    res.json({ jack, boules: sorted, distances: jack ? sorted.map(b => dist(b, jack)) : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze image." });
  }
});

// If you prefer to run this as a standalone server:
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = express();
  app.use(express.json());
  app.use(router);
  const PORT = process.env.PORT || 8787;
  app.listen(PORT, () => console.log(`Pétanque analyzer API on http://localhost:${PORT}`));
}

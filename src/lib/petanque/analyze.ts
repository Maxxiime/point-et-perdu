// src/lib/petanque/analyze.ts
// Pétanque photo analysis using OpenCV.js in the browser.
// Detects circles (boules + cochonnet) and ranks boules by distance to the cochonnet.
import { loadOpenCV } from "../opencv";

export type Circle = { x: number; y: number; r: number; kind?: "jack" | "boule" };
export type AnalysisResult = {
  image: HTMLImageElement;
  jack: Circle | null;
  boules: Circle[];
  sorted: Circle[]; // boules sorted by distance to jack (nearest first)
  pixelsPerMM?: number; // optional future calibration
};

type AnalyzeOptions = {
  /** If you roughly know the image is top-down and resolution, you can tweak detection. */
  sensitivity?: number; // 0.4 .. 1.6
  /** Provide a hint for the jack approximate color: "white" | "yellow" | "wood" */
  jackColorHint?: "white" | "yellow" | "wood";
  /** Set true to force user to click on jack if not confidently found */
  requireManualIfUncertain?: boolean;
};

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function matFromImage(cv: any, img: HTMLImageElement) {
  const mat = cv.imread(img);
  return mat;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function distance(a: Circle, b: Circle) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pickJackByHeuristics(cv: any, src: any, circles: Circle[]): Circle | null {
  if (circles.length === 0) return null;
  // Heuristic 1: smallest radius
  let best = circles.reduce((min, c) => (c.r < min.r ? c : min), circles[0]);
  // Optional: check color/saturation inside the circle to bias toward wooden/yellow/white
  // Compute mean HSV within small ROI
  let scored: Array<{ c: Circle; score: number }> = [];
  const hsv = new cv.Mat();
  cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
  cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
  for (const c of circles) {
    const r = Math.max(3, Math.floor(c.r * 0.8));
    const x0 = clamp(Math.floor(c.x - r), 0, hsv.cols - 1);
    const y0 = clamp(Math.floor(c.y - r), 0, hsv.rows - 1);
    const x1 = clamp(Math.floor(c.x + r), 0, hsv.cols - 1);
    const y1 = clamp(Math.floor(c.y + r), 0, hsv.rows - 1);
    const roi = hsv.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0));
    const mean = cv.mean(roi); // HSV mean
    roi.delete();
    // Lower saturation and higher value (lighter) likely to be jack (wood/white/yellow).
    // Also prefer smaller radii.
    const S = mean[1];
    const V = mean[2];
    const score = (1 / (c.r + 1)) * (255 - S + V);
    scored.push({ c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  hsv.delete();
  // Blend both criteria by picking the top score but ensure it's among the smaller third.
  const sortedByR = [...circles].sort((a, b) => a.r - b.r);
  const cutoff = sortedByR[Math.floor(sortedByR.length / 3)]?.r ?? sortedByR[0].r;
  const candidate = scored.find(s => s.c.r <= cutoff)?.c ?? scored[0].c;
  return candidate;
}

export async function analyzePetanquePhoto(file: File, opts: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const img = await fileToImage(file);
  const cv = await loadOpenCV();
  let src = matFromImage(cv, img);
  const original = src.clone();

  // Downscale large images for speed
  const maxSide = 1280;
  if (Math.max(src.cols, src.rows) > maxSide) {
    const scale = maxSide / Math.max(src.cols, src.rows);
    const dsize = new cv.Size(Math.round(src.cols * scale), Math.round(src.rows * scale));
    cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);
  }

  // Prep
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.medianBlur(gray, gray, 5);

  const sens = clamp(opts.sensitivity ?? 1.0, 0.4, 1.6);
  const minDim = Math.min(src.cols, src.rows);
  const smallMinR = Math.max(3, Math.round(minDim * 0.01 * sens));
  const smallMaxR = Math.max(smallMinR + 3, Math.round(minDim * 0.04 * sens));
  const bigMinR = Math.max(10, Math.round(minDim * 0.05 / sens));
  const bigMaxR = Math.max(bigMinR + 10, Math.round(minDim * 0.18 / sens));

  // Hough for small (jack)
  const smallCircles = new cv.Mat();
  cv.HoughCircles(
    gray,
    smallCircles,
    cv.HOUGH_GRADIENT,
    1.2,
    Math.round(minDim * 0.03),
    100,
    20,
    smallMinR,
    smallMaxR
  );

  // Hough for big (boules)
  const bigCircles = new cv.Mat();
  cv.HoughCircles(
    gray,
    bigCircles,
    cv.HOUGH_GRADIENT,
    1.1,
    Math.round(minDim * 0.05),
    120,
    35,
    bigMinR,
    bigMaxR
  );

  function toCircles(mat: any): Circle[] {
    const arr: Circle[] = [];
    for (let i = 0; i < mat.cols; i++) {
      const v = mat.data32F.slice(i * 3, i * 3 + 3);
      arr.push({ x: v[0], y: v[1], r: v[2] });
    }
    return arr;
  }

  let jackCandidates = toCircles(smallCircles);
  let bouleCandidates = toCircles(bigCircles);

  // If no small detected, allow smallest overall circle to be a jack
  const allCircles = [...jackCandidates, ...bouleCandidates];
  const jack = jackCandidates.length ? pickJackByHeuristics(cv, src, jackCandidates) :
              allCircles.length ? pickJackByHeuristics(cv, src, allCircles) : null;

  // Filter boules: remove the jack, remove tiny/huge outliers
  const boules: Circle[] = [];
  for (const c of bouleCandidates.length ? bouleCandidates : allCircles) {
    if (jack && distance(jack, c) < (jack.r + c.r) * 1.1) continue;
    // basic sanity: radius should be within plausible bounds
    if (c.r < bigMinR * 0.6 || c.r > bigMaxR * 1.2) continue;
    boules.push({ ...c, kind: "boule" });
  }

  const sorted = jack
    ? [...boules].sort((a, b) => distance(a, jack) - distance(b, jack))
    : boules;

  // Cleanup CV mats
  gray.delete();
  smallCircles.delete();
  bigCircles.delete();
  src.delete();
  original.delete();

  return { image: img, jack: jack ? { ...jack, kind: "jack" } : null, boules, sorted };
}

// Simple drawing utility to overlay results on a canvas
export async function drawAnalysisOnCanvas(file: File, canvas: HTMLCanvasElement, opts: AnalyzeOptions = {}) {
  const result = await analyzePetanquePhoto(file, opts);
  const cv = await loadOpenCV();

  const img = result.image;
  const ctx = canvas.getContext("2d")!;
  const maxW = Math.min(1400, img.width);
  const scale = Math.min(maxW / img.width, 1);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  function drawCircle(c: Circle, color: string, label: string) {
    ctx.beginPath();
    ctx.arc(c.x * scale, c.y * scale, c.r * scale, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "16px sans-serif";
    ctx.fillText(label, c.x * scale + 6, c.y * scale - 6);
  }

  if (result.jack) drawCircle(result.jack, "#ffd400", "Cochonnet");
  result.sorted.forEach((b, i) => drawCircle(b, "#29a3ff", `Boule ${i + 1}`));

  return result;
}

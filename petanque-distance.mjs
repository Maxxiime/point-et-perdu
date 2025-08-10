#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import cvReady from '@techstark/opencv-js';

// Initialize OpenCV
const cv = await cvReady;

// ---- Parameters (adjustable) ----
const GAUSSIAN_KSIZE = new cv.Size(9, 9);
const GAUSSIAN_SIGMA = 2;
const HOUGH_DP = 1.2;
const HOUGH_PARAM1 = 120;
const HOUGH_PARAM2_DEFAULT = 20;
const HOUGH_PARAM2_RETRY = 16;
const JACK_THICKNESS = 4;
const BALL_THICKNESS = 2;
// ---------------------------------

async function loadImageToMat(filePath, minRes) {
  const image = await Jimp.read(filePath);
  const maxDim = Math.max(image.bitmap.width, image.bitmap.height);
  if (minRes && maxDim < minRes) {
    const scale = minRes / maxDim;
    image.resize(Math.round(image.bitmap.width * scale), Math.round(image.bitmap.height * scale), Jimp.RESIZE_BILINEAR);
  }
  const mat = cv.matFromImageData(image.bitmap);
  return mat;
}

function detectCircles(gray, width, param2 = HOUGH_PARAM2_DEFAULT) {
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, GAUSSIAN_KSIZE, GAUSSIAN_SIGMA, GAUSSIAN_SIGMA, cv.BORDER_DEFAULT);
  const circles = new cv.Mat();
  cv.HoughCircles(
    blurred,
    circles,
    cv.HOUGH_GRADIENT,
    HOUGH_DP,
    width * 0.05,
    HOUGH_PARAM1,
    param2,
    Math.round(width * 0.01),
    Math.round(width * 0.12)
  );
  const res = [];
  for (let i = 0; i < circles.cols; i++) {
    res.push({
      x: circles.data32F[i * 3],
      y: circles.data32F[i * 3 + 1],
      r: circles.data32F[i * 3 + 2]
    });
  }
  blurred.delete();
  circles.delete();
  return res;
}

function sampleHSV(src, circle) {
  const r = Math.max(1, Math.round(circle.r * 0.3));
  const x = Math.max(0, Math.round(circle.x - r));
  const y = Math.max(0, Math.round(circle.y - r));
  const w = Math.min(r * 2, src.cols - x);
  const h = Math.min(r * 2, src.rows - y);
  const roi = src.roi(new cv.Rect(x, y, w, h));
  const hsv = new cv.Mat();
  cv.cvtColor(roi, hsv, cv.COLOR_RGBA2HSV);
  const m = cv.mean(hsv);
  roi.delete();
  hsv.delete();
  return { h: m[0], s: m[1], v: m[2] };
}

function classifyJackAndBalls(src, circles, jackColor) {
  if (!circles.length) return { jack: null, balls: [] };
  if (jackColor === 'any') {
    circles.sort((a, b) => a.r - b.r);
    const jack = circles.shift();
    return { jack, balls: circles };
  }
  let best = null;
  const others = [];
  for (const c of circles) {
    const { h, s } = sampleHSV(src, c);
    c.h = h;
    c.s = s;
    let score = 1 / c.r + s / 255;
    if (jackColor === 'yellow' && h >= 20 && h <= 35) score += 2;
    if (jackColor === 'orange' && h >= 5 && h <= 25) score += 2;
    if (!best || score > best.score) {
      if (best) others.push(best);
      best = { ...c, score };
    } else {
      others.push({ ...c, score });
    }
  }
  if (!best) return { jack: null, balls: others };
  return { jack: { x: best.x, y: best.y, r: best.r }, balls: others };
}

function computeDistances(jack, balls) {
  for (const b of balls) {
    b.distance_px = Math.hypot(b.x - jack.x, b.y - jack.y);
  }
  balls.sort((a, b) => a.distance_px - b.distance_px);
  return balls.length ? 0 : -1;
}

async function drawAnnotations(src, jack, balls, outPath) {
  const bgr = new cv.Mat();
  cv.cvtColor(src, bgr, cv.COLOR_RGBA2BGR);
  if (jack) {
    cv.circle(bgr, new cv.Point(jack.x, jack.y), Math.round(jack.r), new cv.Scalar(0, 255, 255, 255), JACK_THICKNESS);
  }
  for (const b of balls) {
    cv.circle(bgr, new cv.Point(b.x, b.y), Math.round(b.r), new cv.Scalar(255, 0, 0, 255), BALL_THICKNESS);
    cv.line(bgr, new cv.Point(jack.x, jack.y), new cv.Point(b.x, b.y), new cv.Scalar(0, 255, 0, 255), 1);
    const midX = Math.round((jack.x + b.x) / 2);
    const midY = Math.round((jack.y + b.y) / 2);
    cv.putText(bgr, `d=${Math.round(b.distance_px)}px`, new cv.Point(midX, midY), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(255, 255, 255, 255), 1, cv.LINE_AA);
  }
  const out = new cv.Mat();
  cv.cvtColor(bgr, out, cv.COLOR_BGR2RGBA);
  const jimp = new Jimp({ data: Buffer.from(out.data), width: out.cols, height: out.rows });
  await jimp.writeAsync(outPath);
  bgr.delete();
  out.delete();
}

function applyCalibration(src, calibPath) {
  const data = JSON.parse(fs.readFileSync(calibPath, 'utf8'));
  if (!data.src || !data.dst || data.src.length !== 4 || data.dst.length !== 4) return src;
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, data.src.flat());
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, data.dst.flat());
  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const dst = new cv.Mat();
  const dsize = new cv.Size(src.cols, src.rows);
  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
  srcPts.delete();
  dstPts.delete();
  M.delete();
  src.delete();
  return dst;
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('node $0 input.jpg --out annotated.png --json result.json [--jack-color auto|yellow|orange|any] [--min-res 720]')
    .option('out', { type: 'string', default: 'annotated.png' })
    .option('json', { type: 'string', default: 'result.json' })
    .option('jack-color', { type: 'string', choices: ['auto', 'yellow', 'orange', 'any'], default: 'auto' })
    .option('min-res', { type: 'number', default: 720 })
    .help()
    .argv;

  const input = argv._[0];
  if (!input) {
    console.error('Input image required');
    process.exitCode = 2;
    return;
  }

  let src = await loadImageToMat(input, argv['min-res']);
  const calib = path.resolve(path.dirname(input), 'calibration.json');
  if (fs.existsSync(calib)) {
    try {
      src = applyCalibration(src, calib);
    } catch (e) {
      console.warn('Calibration ignored:', e.message);
    }
  }

  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  let circles = detectCircles(gray, src.cols, HOUGH_PARAM2_DEFAULT);
  if (circles.length < 2) {
    circles = detectCircles(gray, src.cols, HOUGH_PARAM2_RETRY);
  }
  gray.delete();

  if (!circles.length) {
    console.error('No circles detected');
    src.delete();
    process.exitCode = 2;
    return;
  }

  const { jack, balls } = classifyJackAndBalls(src, circles, argv['jack-color']);
  if (!jack || !balls.length) {
    console.error('Jack or balls not found');
    src.delete();
    process.exitCode = 2;
    return;
  }

  const closestIdx = computeDistances(jack, balls);
  await drawAnnotations(src, jack, balls, argv.out);

  const json = {
    jack: { x: jack.x, y: jack.y, r: jack.r },
    balls: balls.map(b => ({ x: b.x, y: b.y, r: b.r, distance_px: b.distance_px })),
    closest_ball_index: closestIdx
  };
  await fs.promises.writeFile(argv.json, JSON.stringify(json, null, 2));

  src.delete();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 2;
});

// Future improvement: for real-world distances, capture from above or include a known-size reference object (e.g., credit card 85.6 mm) to estimate scale, or use four ground points to compute homography for metric measurements.

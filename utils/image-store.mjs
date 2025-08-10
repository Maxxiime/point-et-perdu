import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

export async function saveBase64AsJpeg(base64, { rootDir = 'uploads', quality = 80 } = {}) {
  // Supporte "data:image/*;base64,...."
  const comma = base64.indexOf(',');
  const raw = comma !== -1 ? base64.slice(comma + 1) : base64;
  const buf = Buffer.from(raw, 'base64');

  const img = await Jimp.read(buf);
  img.quality(quality);
  img.exifRotate();

  const now = new Date();
  const subdir = path.join(
    rootDir,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  );
  await fs.promises.mkdir(subdir, { recursive: true });

  const name = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const absPath = path.join(subdir, name);
  await img.writeAsync(absPath);

  const { width, height } = img.bitmap;
  const stat = await fs.promises.stat(absPath);

  return {
    absPath,
    relPath: absPath.replace(/^\.?\/*/, ''),
    publicUrl: `/${absPath.replace(/^\.?\/?public\/?/, '')}`.replace(/^\/?uploads/, '/uploads'),
    width,
    height,
    bytes: stat.size,
    createdAt: now.toISOString()
  };
}

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const IMAGE_EXT = { '.jpg': true, '.jpeg': true, '.png': true, '.webp': true, '.gif': true };
const VIDEO_EXT = { '.mp4': true, '.webm': true, '.mov': true };

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_BYTES = 120 * 1024 * 1024; // 120MB

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function extFromOriginalName(name) {
  return path.extname(name || '').toLowerCase();
}

// Validates an uploaded file against the allowlist for its kind and returns
// the (lowercased) extension to save it with. Throws an httpError otherwise.
function validateFile(kind, originalname, size) {
  const ext = extFromOriginalName(originalname);
  if (kind === 'image') {
    if (!IMAGE_EXT[ext]) throw httpError(400, `Unsupported image type "${ext || 'unknown'}". Use jpg, png, webp or gif.`);
    if (size > MAX_IMAGE_BYTES) throw httpError(400, 'Image is too large (max 20MB).');
  } else if (kind === 'video') {
    if (!VIDEO_EXT[ext]) throw httpError(400, `Unsupported video type "${ext || 'unknown'}". Use mp4, webm or mov.`);
    if (size > MAX_VIDEO_BYTES) throw httpError(400, 'Video is too large (max 120MB).');
  } else {
    throw httpError(400, 'Unknown upload kind.');
  }
  return ext;
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

// `logo-01.jpg`, `poster-14.jpg`, `reel-09.mp4` — next number is derived
// from files already on disk (not just data.json) so it never collides with
// an orphaned file left behind by a previous delete.
function nextSequentialName(dirAbs, prefix, ext) {
  fs.mkdirSync(dirAbs, { recursive: true });
  const existing = fs.readdirSync(dirAbs);
  const re = new RegExp(`^${prefix}-(\\d+)\\.`, 'i');
  let max = 0;
  existing.forEach((f) => {
    const m = f.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  const num = String(max + 1).padStart(2, '0');
  return `${prefix}-${num}${ext}`;
}

// Carousel/brochure page images are just `1.jpg`, `2.jpg`, ... inside the
// item's own folder.
function nextImageIndexName(dirAbs, ext) {
  fs.mkdirSync(dirAbs, { recursive: true });
  const existing = fs.readdirSync(dirAbs);
  let max = 0;
  existing.forEach((f) => {
    const m = f.match(/^(\d+)\./);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${max + 1}${ext}`;
}

function uniqueFilename(dirAbs, slug, ext) {
  fs.mkdirSync(dirAbs, { recursive: true });
  let name = `${slug}${ext}`;
  let n = 2;
  while (fs.existsSync(path.join(dirAbs, name))) {
    name = `${slug}-${n}${ext}`;
    n += 1;
  }
  return name;
}

// Extracts a still frame so reels have a poster thumbnail (used both by the
// homepage lazy-video loader and the gallery grid). Skips quietly if ffmpeg
// isn't installed on the host — the video still works, it just won't have a
// generated poster until one is installed.
function generateVideoThumbnail(videoAbsPath, thumbAbsPath) {
  return new Promise((resolve) => {
    execFile('ffmpeg', [
      '-y', '-ss', '00:00:00.5', '-i', videoAbsPath,
      '-frames:v', '1', '-vf', 'scale=720:-2', thumbAbsPath,
    ], { timeout: 20000 }, (err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.warn('Reel thumbnail generation skipped:', err.message);
        return resolve(false);
      }
      resolve(true);
    });
  });
}

function safeUnlink(p) {
  try {
    fs.unlinkSync(p);
  } catch {
    // file already gone or never existed — fine
  }
}

module.exports = {
  IMAGE_EXT,
  VIDEO_EXT,
  httpError,
  validateFile,
  slugify,
  nextSequentialName,
  nextImageIndexName,
  uniqueFilename,
  generateVideoThumbnail,
  safeUnlink,
};

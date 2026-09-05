const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const contentStore = require('../lib/contentStore');
const media = require('../lib/media');
const { requireAdmin, verifyPassword } = require('../lib/auth');
const credentials = require('../lib/credentials');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 130 * 1024 * 1024 } });

const MEDIA_COLLECTIONS = {
  logos: { key: 'logos', dir: 'public/logos', prefix: 'logo', kind: 'image' },
  posters: { key: 'posters', dir: 'public/posters', prefix: 'poster', kind: 'image' },
  reels: { key: 'reels', dir: 'public/reels', prefix: 'reel', kind: 'video' },
};

const GALLERY_COLLECTIONS = {
  carousels: { key: 'carousels', dirBase: 'public/carousel' },
  brochures: { key: 'brochures', dirBase: 'public/brochures' },
};

const router = express.Router();
router.use(requireAdmin);

function absPath(relPath) {
  return path.join(contentStore.ROOT, relPath);
}

function moveItem(arr, from, to) {
  if (!Array.isArray(arr)) return false;
  from = Number(from);
  to = Number(to);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return false;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  return true;
}

// Folder for a gallery (carousel/brochure) item stays pinned to wherever its
// first image already lives, so renaming the label later never orphans
// existing pages — only a brand-new item derives its folder from the label.
function resolveGalleryDir(col, item) {
  if (item.images && item.images.length > 0) {
    return path.posix.dirname(item.images[0]);
  }
  return `${col.dirBase}/${media.slugify(item.label)}`;
}

function buildTestimonialFields(body) {
  return {
    company: String((body || {}).company || '').trim(),
    name: String((body || {}).name || '').trim(),
    role: String((body || {}).role || '').trim(),
    text: String((body || {}).text || '').trim(),
  };
}

// ---------------------------------------------------------------- content
router.get('/content', (req, res) => {
  res.json(contentStore.load());
});

// ---------------------------------------------------------------- settings
router.post('/settings', (req, res) => {
  const data = contentStore.load();
  const { contactEmail, socials, stats } = req.body || {};

  if (typeof contactEmail === 'string' && contactEmail.trim()) {
    data.settings.contactEmail = contactEmail.trim();
  }
  if (socials && typeof socials === 'object') {
    ['instagram', 'linkedin', 'facebook', 'twitter'].forEach((k) => {
      if (typeof socials[k] === 'string') data.settings.socials[k] = socials[k].trim();
    });
  }
  if (Array.isArray(stats)) {
    data.settings.stats = stats.slice(0, 3).map((s) => ({
      num: String((s || {}).num || '').slice(0, 20),
      label: String((s || {}).label || '').slice(0, 40),
    }));
  }

  contentStore.save(data);
  res.json({ ok: true, settings: data.settings });
});

router.post('/password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyPassword(currentPassword, process.env.ADMIN_PASSWORD_HASH)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  credentials.updatePassword(newPassword);
  res.json({ ok: true });
});

// ------------------------------------------------------- media collections
router.post('/media/:col', upload.single('file'), async (req, res) => {
  const col = MEDIA_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const label = (req.body.label || '').trim() || 'Untitled';
  const ext = media.validateFile(col.kind, req.file.originalname, req.file.size);
  const dirAbs = absPath(col.dir);
  const filename = media.nextSequentialName(dirAbs, col.prefix, ext);
  fs.writeFileSync(path.join(dirAbs, filename), req.file.buffer);

  if (col.kind === 'video') {
    const postersDirAbs = path.join(dirAbs, 'posters');
    fs.mkdirSync(postersDirAbs, { recursive: true });
    const posterName = filename.slice(0, -ext.length) + '.jpg';
    await media.generateVideoThumbnail(path.join(dirAbs, filename), path.join(postersDirAbs, posterName));
  }

  const data = contentStore.load();
  const item = { src: `${col.dir}/${filename}`, label };
  data[col.key].push(item);
  contentStore.save(data);
  res.json({ ok: true, item });
});

router.put('/media/:col/:idx', (req, res) => {
  const col = MEDIA_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const arr = data[col.key];
  if (!arr[idx]) return res.status(404).json({ error: 'Item not found' });
  const label = (req.body.label || '').trim();
  if (label) arr[idx].label = label;
  contentStore.save(data);
  res.json({ ok: true, item: arr[idx] });
});

router.delete('/media/:col/:idx', (req, res) => {
  const col = MEDIA_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const arr = data[col.key];
  if (!arr[idx]) return res.status(404).json({ error: 'Item not found' });
  const [removed] = arr.splice(idx, 1);
  contentStore.save(data);

  if (req.query.deleteFile === 'true' && removed) {
    media.safeUnlink(absPath(removed.src));
    if (col.kind === 'video') {
      const ext = path.extname(removed.src);
      const base = path.basename(removed.src, ext);
      const dirAbs = path.dirname(absPath(removed.src));
      media.safeUnlink(path.join(dirAbs, 'posters', `${base}.jpg`));
    }
  }
  res.json({ ok: true });
});

router.post('/media/:col/reorder', (req, res) => {
  const col = MEDIA_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const data = contentStore.load();
  if (!moveItem(data[col.key], (req.body || {}).from, (req.body || {}).to)) {
    return res.status(400).json({ error: 'Invalid indices' });
  }
  contentStore.save(data);
  res.json({ ok: true, items: data[col.key] });
});

// --------------------------------------------------------------- tools
router.post('/tools', (req, res) => {
  const value = String((req.body || {}).value || '').trim();
  if (!value) return res.status(400).json({ error: 'Value required' });
  const data = contentStore.load();
  data.tools.push(value);
  contentStore.save(data);
  res.json({ ok: true, tools: data.tools });
});

router.put('/tools/:idx', (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const value = String((req.body || {}).value || '').trim();
  if (!value) return res.status(400).json({ error: 'Value required' });
  const data = contentStore.load();
  if (idx < 0 || idx >= data.tools.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  data.tools[idx] = value;
  contentStore.save(data);
  res.json({ ok: true, tools: data.tools });
});

router.delete('/tools/:idx', (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  if (idx < 0 || idx >= data.tools.length) return res.status(404).json({ error: 'Not found' });
  data.tools.splice(idx, 1);
  contentStore.save(data);
  res.json({ ok: true, tools: data.tools });
});

router.post('/tools/reorder', (req, res) => {
  const data = contentStore.load();
  if (!moveItem(data.tools, (req.body || {}).from, (req.body || {}).to)) {
    return res.status(400).json({ error: 'Invalid indices' });
  }
  contentStore.save(data);
  res.json({ ok: true, tools: data.tools });
});

// --------------------------------------------------------- testimonials
router.post('/testimonials', upload.single('logo'), (req, res) => {
  const data = contentStore.load();
  const t = buildTestimonialFields(req.body);
  if (!t.company || !t.name || !t.text) {
    return res.status(400).json({ error: 'Company, name and text are required.' });
  }
  const initials = String((req.body || {}).initials || '').trim().slice(0, 3).toUpperCase();

  if (req.file) {
    const ext = media.validateFile('image', req.file.originalname, req.file.size);
    const dirAbs = absPath('public/testimonials');
    const filename = media.uniqueFilename(dirAbs, media.slugify(t.company), ext);
    fs.writeFileSync(path.join(dirAbs, filename), req.file.buffer);
    t.logo = `public/testimonials/${filename}`;
  } else if (initials) {
    t.initials = initials;
  } else {
    return res.status(400).json({ error: 'Provide either a logo image or initials.' });
  }

  data.testimonials.push(t);
  contentStore.save(data);
  res.json({ ok: true, item: t });
});

router.put('/testimonials/:idx', upload.single('logo'), (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const existing = data.testimonials[idx];
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const updated = { ...existing, ...buildTestimonialFields(req.body) };
  const initials = String((req.body || {}).initials || '').trim().slice(0, 3).toUpperCase();

  if (req.file) {
    const ext = media.validateFile('image', req.file.originalname, req.file.size);
    const dirAbs = absPath('public/testimonials');
    const filename = media.uniqueFilename(dirAbs, media.slugify(updated.company), ext);
    fs.writeFileSync(path.join(dirAbs, filename), req.file.buffer);
    updated.logo = `public/testimonials/${filename}`;
    delete updated.initials;
  } else if (initials) {
    updated.initials = initials;
    delete updated.logo;
  }

  data.testimonials[idx] = updated;
  contentStore.save(data);
  res.json({ ok: true, item: updated });
});

router.delete('/testimonials/:idx', (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const arr = data.testimonials;
  if (!arr[idx]) return res.status(404).json({ error: 'Item not found' });
  const [removed] = arr.splice(idx, 1);
  contentStore.save(data);
  if (req.query.deleteFile === 'true' && removed.logo) media.safeUnlink(absPath(removed.logo));
  res.json({ ok: true });
});

router.post('/testimonials/reorder', (req, res) => {
  const data = contentStore.load();
  if (!moveItem(data.testimonials, (req.body || {}).from, (req.body || {}).to)) {
    return res.status(400).json({ error: 'Invalid indices' });
  }
  contentStore.save(data);
  res.json({ ok: true, items: data.testimonials });
});

// ----------------------------------------------------- gallery collections
router.post('/gallery/:col', (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const label = String((req.body || {}).label || '').trim();
  if (!label) return res.status(400).json({ error: 'Label required' });
  const data = contentStore.load();
  const item = { label, images: [] };
  data[col.key].push(item);
  contentStore.save(data);
  res.json({ ok: true, item, index: data[col.key].length - 1 });
});

router.put('/gallery/:col/:idx', (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const item = data[col.key][idx];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const label = String((req.body || {}).label || '').trim();
  if (label) item.label = label;
  contentStore.save(data);
  res.json({ ok: true, item });
});

router.delete('/gallery/:col/:idx', (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const arr = data[col.key];
  if (!arr[idx]) return res.status(404).json({ error: 'Item not found' });
  const [removed] = arr.splice(idx, 1);
  contentStore.save(data);
  if (req.query.deleteFiles === 'true') {
    (removed.images || []).forEach((img) => media.safeUnlink(absPath(img)));
  }
  res.json({ ok: true });
});

router.post('/gallery/:col/reorder', (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const data = contentStore.load();
  if (!moveItem(data[col.key], (req.body || {}).from, (req.body || {}).to)) {
    return res.status(400).json({ error: 'Invalid indices' });
  }
  contentStore.save(data);
  res.json({ ok: true, items: data[col.key] });
});

router.post('/gallery/:col/:idx/images', upload.single('file'), (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const item = data[col.key][idx];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = media.validateFile('image', req.file.originalname, req.file.size);
  const dirRel = resolveGalleryDir(col, item);
  const dirAbs = absPath(dirRel);
  const filename = media.nextImageIndexName(dirAbs, ext);
  fs.writeFileSync(path.join(dirAbs, filename), req.file.buffer);
  item.images.push(`${dirRel}/${filename}`);
  contentStore.save(data);
  res.json({ ok: true, item });
});

router.delete('/gallery/:col/:idx/images/:imgIdx', (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const imgIdx = parseInt(req.params.imgIdx, 10);
  const data = contentStore.load();
  const item = data[col.key][idx];
  if (!item || !item.images[imgIdx]) return res.status(404).json({ error: 'Not found' });
  const [removed] = item.images.splice(imgIdx, 1);
  contentStore.save(data);
  if (req.query.deleteFile === 'true') media.safeUnlink(absPath(removed));
  res.json({ ok: true, item });
});

router.post('/gallery/:col/:idx/images/reorder', (req, res) => {
  const col = GALLERY_COLLECTIONS[req.params.col];
  if (!col) return res.status(404).json({ error: 'Unknown collection' });
  const idx = parseInt(req.params.idx, 10);
  const data = contentStore.load();
  const item = data[col.key][idx];
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (!moveItem(item.images, (req.body || {}).from, (req.body || {}).to)) {
    return res.status(400).json({ error: 'Invalid indices' });
  }
  contentStore.save(data);
  res.json({ ok: true, item });
});

// ------------------------------------------------------------ error handler
// Catches both thrown httpErrors (e.g. media.validateFile) and anything
// Express 5 auto-forwards from a rejected async handler above.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Server error' });
});

module.exports = router;

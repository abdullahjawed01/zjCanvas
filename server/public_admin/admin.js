const state = { data: null };

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, { credentials: 'same-origin', ...options });
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return body;
}

let toastTimer = null;
function showToast(message, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.toggle('toast--error', !!isError);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function escapeAttr(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
const escapeHtml = escapeAttr;

async function guarded(fn, successMessage) {
  try {
    await fn();
    if (successMessage) showToast(successMessage);
  } catch (err) {
    showToast(err.message, true);
  }
}

// -------------------------------------------------------------- auth/shell
async function checkAuth() {
  const { authenticated } = await api('/me');
  if (authenticated) await showApp(); else showLogin();
}

function showLogin() {
  document.getElementById('loginView').hidden = false;
  document.getElementById('appView').hidden = true;
}

async function showApp() {
  document.getElementById('loginView').hidden = true;
  document.getElementById('appView').hidden = false;
  await loadContent();
}

async function loadContent() {
  state.data = await api('/content');
  renderSettings();
  renderMedia('reels', 'video');
  renderMedia('posters', 'image');
  renderMedia('logos', 'image');
  renderGallery('carousels');
  renderGallery('brochures');
  renderTestimonials();
  renderTools();
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  });
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  errorEl.hidden = true;
  try {
    await api('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    document.getElementById('loginPassword').value = '';
    await showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  showLogin();
});

// -------------------------------------------------------------- settings
function renderSettings() {
  const s = state.data.settings;
  const form = document.getElementById('settingsForm');
  form.contactEmail.value = s.contactEmail || '';
  form.instagram.value = (s.socials || {}).instagram || '';
  form.linkedin.value = (s.socials || {}).linkedin || '';
  form.facebook.value = (s.socials || {}).facebook || '';
  form.twitter.value = (s.socials || {}).twitter || '';

  const statsFields = document.getElementById('statsFields');
  statsFields.innerHTML = '';
  (s.stats || []).forEach((stat, i) => {
    statsFields.insertAdjacentHTML('beforeend', `
      <label class="field"><span>Stat ${i + 1} number</span><input data-stat-num="${i}" value="${escapeAttr(stat.num)}"></label>
      <label class="field"><span>Stat ${i + 1} label</span><input data-stat-label="${i}" value="${escapeAttr(stat.label)}"></label>
    `);
  });
}

document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const stats = [];
  document.querySelectorAll('[data-stat-num]').forEach((input) => {
    const i = input.dataset.statNum;
    const labelInput = document.querySelector(`[data-stat-label="${i}"]`);
    stats[i] = { num: input.value.trim(), label: labelInput.value.trim() };
  });
  guarded(async () => {
    await api('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactEmail: form.contactEmail.value.trim(),
        socials: {
          instagram: form.instagram.value.trim(),
          linkedin: form.linkedin.value.trim(),
          facebook: form.facebook.value.trim(),
          twitter: form.twitter.value.trim(),
        },
        stats,
      }),
    });
    await loadContent();
  }, 'Settings saved.');
});

document.getElementById('passwordForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  guarded(async () => {
    await api('/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.currentPassword.value, newPassword: form.newPassword.value }),
    });
    form.reset();
  }, 'Password updated.');
});

// -------------------------------------------------------------- media
function posterForReel(src) {
  return src.replace(/\/([^/]+)\.[^./]+$/, '/posters/$1.jpg');
}

function renderMedia(col, kind) {
  const grid = document.getElementById(`grid-${col}`);
  grid.innerHTML = '';
  const items = state.data[col];
  items.forEach((item, idx) => {
    const thumbSrc = kind === 'video' ? posterForReel(item.src) : item.src;
    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `
      <div class="media-thumb"><img src="/${thumbSrc}" alt="" onerror="this.style.opacity=0.1"></div>
      <input class="media-label" value="${escapeAttr(item.label)}">
      <div class="media-actions">
        <button data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button data-act="down" ${idx === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-act="save">Save</button>
        <button data-act="delete" class="btn-danger">Delete</button>
      </div>
    `;
    card.querySelector('[data-act="save"]').addEventListener('click', () => guarded(async () => {
      const label = card.querySelector('.media-label').value.trim();
      await api(`/media/${col}/${idx}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
      state.data[col][idx].label = label;
    }, 'Saved.'));
    card.querySelector('[data-act="delete"]').addEventListener('click', () => {
      if (!confirm(`Delete "${item.label}"? This also removes the file from the server.`)) return;
      guarded(async () => {
        await api(`/media/${col}/${idx}?deleteFile=true`, { method: 'DELETE' });
        await loadContent();
      }, 'Deleted.');
    });
    card.querySelector('[data-act="up"]').addEventListener('click', () => reorder(`/media/${col}/reorder`, idx, idx - 1));
    card.querySelector('[data-act="down"]').addEventListener('click', () => reorder(`/media/${col}/reorder`, idx, idx + 1));
    grid.appendChild(card);
  });
}

async function reorder(endpoint, from, to) {
  await guarded(async () => {
    await api(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) });
    await loadContent();
  });
}

document.querySelectorAll('.upload-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const col = form.dataset.media;
    const fd = new FormData(form);
    guarded(async () => {
      await api(`/media/${col}`, { method: 'POST', body: fd });
      form.reset();
      await loadContent();
    }, 'Uploaded.');
  });
});

// -------------------------------------------------------------- galleries
function renderGallery(col) {
  const list = document.getElementById(`grid-${col}`);
  list.innerHTML = '';
  const items = state.data[col];
  items.forEach((item, idx) => {
    const group = document.createElement('div');
    group.className = 'gallery-group';
    group.innerHTML = `
      <div class="gallery-group-head">
        <input class="gallery-label" value="${escapeAttr(item.label)}">
        <div class="media-actions">
          <button data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button data-act="down" ${idx === items.length - 1 ? 'disabled' : ''}>↓</button>
          <button data-act="save">Save</button>
          <button data-act="delete" class="btn-danger">Delete Group</button>
        </div>
      </div>
      <div class="gallery-images"></div>
      <form class="gallery-image-add">
        <input type="file" name="file" accept="image/*" required>
        <button type="submit" class="btn btn-secondary">Add Page</button>
      </form>
    `;

    const imagesWrap = group.querySelector('.gallery-images');
    item.images.forEach((img, imgIdx) => {
      const thumb = document.createElement('div');
      thumb.className = 'gallery-image';
      thumb.innerHTML = `
        <img src="/${img}" alt="">
        <div class="gallery-image-actions">
          <button data-img-act="up" ${imgIdx === 0 ? 'disabled' : ''}>↑</button>
          <button data-img-act="down" ${imgIdx === item.images.length - 1 ? 'disabled' : ''}>↓</button>
          <button data-img-act="delete">✕</button>
        </div>
      `;
      thumb.querySelector('[data-img-act="delete"]').addEventListener('click', () => {
        if (!confirm('Remove this page?')) return;
        guarded(async () => {
          await api(`/gallery/${col}/${idx}/images/${imgIdx}?deleteFile=true`, { method: 'DELETE' });
          await loadContent();
        }, 'Removed.');
      });
      thumb.querySelector('[data-img-act="up"]').addEventListener('click', () => reorder(`/gallery/${col}/${idx}/images/reorder`, imgIdx, imgIdx - 1));
      thumb.querySelector('[data-img-act="down"]').addEventListener('click', () => reorder(`/gallery/${col}/${idx}/images/reorder`, imgIdx, imgIdx + 1));
      imagesWrap.appendChild(thumb);
    });

    group.querySelector('[data-act="save"]').addEventListener('click', () => guarded(async () => {
      const label = group.querySelector('.gallery-label').value.trim();
      await api(`/gallery/${col}/${idx}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
      state.data[col][idx].label = label;
    }, 'Saved.'));
    group.querySelector('[data-act="delete"]').addEventListener('click', () => {
      if (!confirm(`Delete "${item.label}" and all its pages?`)) return;
      guarded(async () => {
        await api(`/gallery/${col}/${idx}?deleteFiles=true`, { method: 'DELETE' });
        await loadContent();
      }, 'Deleted.');
    });
    group.querySelector('[data-act="up"]').addEventListener('click', () => reorder(`/gallery/${col}/reorder`, idx, idx - 1));
    group.querySelector('[data-act="down"]').addEventListener('click', () => reorder(`/gallery/${col}/reorder`, idx, idx + 1));
    group.querySelector('.gallery-image-add').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      guarded(async () => {
        await api(`/gallery/${col}/${idx}/images`, { method: 'POST', body: fd });
        await loadContent();
      }, 'Page added.');
    });

    list.appendChild(group);
  });
}

document.querySelectorAll('.gallery-add-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const col = form.dataset.gallery;
    const label = form.label.value.trim();
    guarded(async () => {
      await api(`/gallery/${col}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
      form.reset();
      await loadContent();
    }, 'Added — now upload its pages below.');
  });
});

// -------------------------------------------------------------- testimonials
function renderTestimonials() {
  const list = document.getElementById('grid-testimonials');
  list.innerHTML = '';
  const items = state.data.testimonials;
  items.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'testimonial-card-admin';
    card.innerHTML = `
      <div class="testimonial-thumb">${t.logo ? `<img src="/${t.logo}" alt="">` : `<div class="initials-badge">${escapeHtml(t.initials || '')}</div>`}</div>
      <div class="testimonial-fields">
        <input data-f="company" value="${escapeAttr(t.company)}" placeholder="Company">
        <input data-f="name" value="${escapeAttr(t.name)}" placeholder="Name">
        <input data-f="role" value="${escapeAttr(t.role || '')}" placeholder="Role">
        <textarea data-f="text" rows="3">${escapeHtml(t.text || '')}</textarea>
        <input data-f="initials" value="${escapeAttr(t.initials || '')}" placeholder="Initials (used only if no logo)" maxlength="3">
        <input type="file" data-f="logo" accept="image/*">
      </div>
      <div class="media-actions">
        <button data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button data-act="down" ${idx === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-act="save">Save</button>
        <button data-act="delete" class="btn-danger">Delete</button>
      </div>
    `;
    card.querySelector('[data-act="save"]').addEventListener('click', () => guarded(async () => {
      const fd = new FormData();
      ['company', 'name', 'role', 'text', 'initials'].forEach((f) => {
        fd.append(f, card.querySelector(`[data-f="${f}"]`).value.trim());
      });
      const fileInput = card.querySelector('[data-f="logo"]');
      if (fileInput.files[0]) fd.append('logo', fileInput.files[0]);
      await api(`/testimonials/${idx}`, { method: 'PUT', body: fd });
      await loadContent();
    }, 'Saved.'));
    card.querySelector('[data-act="delete"]').addEventListener('click', () => {
      if (!confirm(`Delete testimonial from "${t.name}"?`)) return;
      guarded(async () => {
        await api(`/testimonials/${idx}?deleteFile=true`, { method: 'DELETE' });
        await loadContent();
      }, 'Deleted.');
    });
    card.querySelector('[data-act="up"]').addEventListener('click', () => reorder('/testimonials/reorder', idx, idx - 1));
    card.querySelector('[data-act="down"]').addEventListener('click', () => reorder('/testimonials/reorder', idx, idx + 1));
    list.appendChild(card);
  });
}

document.getElementById('testimonialAddForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  guarded(async () => {
    await api('/testimonials', { method: 'POST', body: fd });
    form.reset();
    await loadContent();
  }, 'Testimonial added.');
});

// -------------------------------------------------------------- tools
function renderTools() {
  const list = document.getElementById('grid-tools');
  list.innerHTML = '';
  state.data.tools.forEach((tool, idx) => {
    const chip = document.createElement('div');
    chip.className = 'tool-chip-admin';
    chip.innerHTML = `
      <input value="${escapeAttr(tool)}">
      <button data-act="save" title="Save">✓</button>
      <button data-act="delete" class="btn-danger" title="Remove">✕</button>
    `;
    chip.querySelector('[data-act="save"]').addEventListener('click', () => guarded(async () => {
      const value = chip.querySelector('input').value.trim();
      await api(`/tools/${idx}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      state.data.tools[idx] = value;
    }, 'Saved.'));
    chip.querySelector('[data-act="delete"]').addEventListener('click', () => {
      if (!confirm(`Remove "${tool}"?`)) return;
      guarded(async () => {
        await api(`/tools/${idx}`, { method: 'DELETE' });
        await loadContent();
      }, 'Removed.');
    });
    list.appendChild(chip);
  });
}

document.getElementById('toolAddForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  guarded(async () => {
    await api('/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: form.value.value.trim() }) });
    form.reset();
    await loadContent();
  }, 'Tool added.');
});

checkAuth();

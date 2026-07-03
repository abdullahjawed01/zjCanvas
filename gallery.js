function buildMediaCard(item, variant) {
  const card = document.createElement('div');
  card.className = 'gallery-card' + (variant ? ` gallery-card--${variant}` : '');

  const video = isVideoPath(item.src);
  const mediaEl = document.createElement(video ? 'video' : 'img');
  if (video) {
    setupLazyVideo(mediaEl, item.src);
  } else {
    mediaEl.src = item.src;
    mediaEl.alt = item.label;
    mediaEl.loading = 'lazy';
  }
  card.appendChild(mediaEl);

  const label = document.createElement('div');
  label.className = 'gallery-card-label';
  label.textContent = item.label;
  card.appendChild(label);

  card.addEventListener('click', () => openLightbox(item, video));
  return card;
}

function buildGalleryGrid(containerId, items, variant) {
  const container = document.getElementById(containerId);
  items.forEach((item) => container.appendChild(buildMediaCard(item, variant)));
}

function buildCarouselGrid(containerId, items, extraClass) {
  const container = document.getElementById(containerId);
  items.forEach((item) => container.appendChild(buildCarouselItemElement(item, extraClass)));
}

function openLightbox(item, video) {
  const overlay = document.getElementById('lightbox');
  const content = document.getElementById('lightboxContent');
  content.innerHTML = '';
  const el = document.createElement(video ? 'video' : 'img');
  el.src = item.src;
  if (video) {
    el.controls = true;
    el.autoplay = true;
  } else {
    el.alt = item.label;
  }
  content.appendChild(el);
  overlay.classList.add('is-open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('is-open');
  const content = document.getElementById('lightboxContent');
  content.querySelectorAll('video').forEach((v) => v.pause());
  content.innerHTML = '';
}

function initLightbox() {
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}


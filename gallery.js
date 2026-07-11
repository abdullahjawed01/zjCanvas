function buildMediaCard(item, variant) {
  const card = document.createElement('div');
  card.className = 'gallery-card' + (variant ? ` gallery-card--${variant}` : '');

  // Grid cards only ever show a static thumbnail — visitors click through
  // to the lightbox to actually play a video, so nothing here autoplays.
  const video = isVideoPath(item.src);
  const thumbSrc = video ? item.src.replace(/\/([^/]+)\.[^./]+$/, '/posters/$1.jpg') : item.src;

  const img = document.createElement('img');
  img.src = thumbSrc;
  img.alt = item.label;
  img.loading = 'lazy';
  card.appendChild(img);

  if (video) {
    const play = document.createElement('span');
    play.className = 'gallery-card-play';
    card.appendChild(play);
  }

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


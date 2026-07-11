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

// Carousel/Brochure grid cards (Carousel.html, Brochures.html) never
// auto-slide — each card is just a static first-page thumbnail, and every
// page only ever appears once someone clicks in to view it in the lightbox.
function buildCarouselStaticCard(item, extraClass) {
  const card = document.createElement('div');
  card.className = 'carousel-item carousel-item--static' + (extraClass ? ` ${extraClass}` : '');

  const img = document.createElement('img');
  img.src = item.images[0];
  img.alt = item.label;
  img.loading = 'lazy';
  card.appendChild(img);

  if (item.images.length > 1) {
    const count = document.createElement('span');
    count.className = 'carousel-item-count';
    count.textContent = `${item.images.length} pages`;
    card.appendChild(count);
  }

  const label = document.createElement('div');
  label.className = 'carousel-item-label';
  label.textContent = item.label;
  card.appendChild(label);

  card.addEventListener('click', () => openCarouselLightbox(item));
  return card;
}

function buildCarouselGrid(containerId, items, extraClass) {
  const container = document.getElementById(containerId);
  items.forEach((item) => container.appendChild(buildCarouselStaticCard(item, extraClass)));
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

// Paginated lightbox for multi-page carousel/brochure items — left/right
// arrow buttons (and arrow keys) step through `item.images` on demand.
let carouselLightboxState = null;

function renderCarouselLightbox() {
  const { images, label, index } = carouselLightboxState;
  const content = document.getElementById('lightboxContent');
  content.innerHTML = '';
  const img = document.createElement('img');
  img.src = images[index];
  img.alt = label;
  content.appendChild(img);

  const counter = document.getElementById('lightboxCounter');
  const hasMultiple = images.length > 1;
  if (counter) counter.textContent = hasMultiple ? `${index + 1} / ${images.length}` : '';
  document.getElementById('lightboxPrev').style.display = hasMultiple ? 'flex' : 'none';
  document.getElementById('lightboxNext').style.display = hasMultiple ? 'flex' : 'none';
}

function stepCarouselLightbox(delta) {
  if (!carouselLightboxState) return;
  const { images } = carouselLightboxState;
  carouselLightboxState.index = (carouselLightboxState.index + delta + images.length) % images.length;
  renderCarouselLightbox();
}

function openCarouselLightbox(item) {
  carouselLightboxState = { images: item.images, label: item.label, index: 0 };
  renderCarouselLightbox();
  document.getElementById('lightbox').classList.add('is-open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('is-open');
  const content = document.getElementById('lightboxContent');
  content.querySelectorAll('video').forEach((v) => v.pause());
  content.innerHTML = '';
  carouselLightboxState = null;
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

function initCarouselLightbox() {
  document.getElementById('lightboxPrev').addEventListener('click', () => stepCarouselLightbox(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => stepCarouselLightbox(1));
  document.addEventListener('keydown', (e) => {
    if (!carouselLightboxState) return;
    if (e.key === 'ArrowLeft') stepCarouselLightbox(-1);
    if (e.key === 'ArrowRight') stepCarouselLightbox(1);
  });
}


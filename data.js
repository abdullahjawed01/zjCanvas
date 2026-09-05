// Small DOM helpers shared by the homepage (script.js) and the "view all"
// gallery pages (gallery.js). The actual content — logos, posters, reels,
// carousels, brochures, testimonials, tools, site settings — lives in
// content-data.js, which is generated from content/data.json by the admin
// server (/admin) and loaded via a <script> tag right before this file.

function isImagePath(str) {
  return /^(https?:\/\/|\.{0,2}\/)/.test(str) || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(str);
}

function isVideoPath(str) {
  return /\.(mp4|webm|mov|m4v)$/i.test(str);
}

// Videos only get their `src` assigned (and start playing) once they scroll
// near the viewport, and pause again once they scroll away. Without this,
// every autoplaying <video> on the page — homepage marquees plus gallery
// grids — would start downloading at once, which is what made the site so
// heavy to load.
const lazyVideoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const el = entry.target;
    if (entry.isIntersecting) {
      if (!el.src) el.src = el.dataset.src;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  });
}, { rootMargin: '250px' });

function setupLazyVideo(mediaEl, src) {
  mediaEl.dataset.src = src;
  mediaEl.muted = true;
  mediaEl.loop = true;
  mediaEl.playsInline = true;
  mediaEl.preload = 'none';
  // Show a still frame right away instead of a blank card while the
  // video itself waits for the lazy IntersectionObserver to kick in.
  mediaEl.poster = src.replace(/\/([^/]+)\.[^./]+$/, '/posters/$1.jpg');
  lazyVideoObserver.observe(mediaEl);
}

function appendCarouselSlot(track, entry, label, basisPercent) {
  const slot = document.createElement('div');
  slot.className = 'carousel-item-image';
  slot.style.flex = `0 0 ${basisPercent}%`;
  if (isImagePath(entry)) {
    const img = document.createElement('img');
    img.src = entry;
    img.alt = label;
    slot.appendChild(img);
  } else {
    slot.textContent = entry;
  }
  track.appendChild(slot);
}

// Builds one self-contained carousel component: a card that scrolls slowly
// and continuously through its images, each slide sized to exactly fill the
// card (never cropped, never mixed with its neighbour) so one full image is
// always in view while it glides seamlessly into the next, on an endless loop.
function buildCarouselItemElement(item, extraClass, secondsPerImage = 5.5) {
  const slide = document.createElement('div');
  slide.className = 'carousel-item' + (extraClass ? ` ${extraClass}` : '');

  const mask = document.createElement('div');
  mask.className = 'carousel-item-images-mask';

  const imgTrack = document.createElement('div');
  imgTrack.className = 'carousel-item-images-track';

  const canAnimate = item.images.length > 1;
  const slidesList = canAnimate ? [...item.images, ...item.images] : item.images;
  const total = slidesList.length;
  imgTrack.style.width = `${total * 100}%`;
  slidesList.forEach((entry) => appendCarouselSlot(imgTrack, entry, item.label, 100 / total));

  if (canAnimate) {
    mask.classList.add('has-edge-fade');
    imgTrack.classList.add('is-scrolling');
    imgTrack.style.animationDuration = `${item.images.length * secondsPerImage}s`;
  }

  mask.appendChild(imgTrack);

  const label = document.createElement('div');
  label.className = 'carousel-item-label';
  label.textContent = item.label;

  slide.appendChild(mask);
  slide.appendChild(label);

  return slide;
}

// Applies SITE_SETTINGS (contact email + social links) to every matching
// element on the page. content-data.js is loaded on every page, so editing
// these once in the admin keeps every footer/contact link in sync.
function applySiteSettings() {
  if (typeof SITE_SETTINGS === 'undefined') return;
  document.querySelectorAll('[data-contact-email]').forEach((el) => {
    el.href = `mailto:${SITE_SETTINGS.contactEmail}`;
    el.textContent = SITE_SETTINGS.contactEmail;
  });
  Object.entries(SITE_SETTINGS.socials || {}).forEach(([key, url]) => {
    if (!url) return;
    document.querySelectorAll(`[data-social="${key}"]`).forEach((el) => { el.href = url; });
  });
}

// Shared navbar behaviour for every page: shrinks on scroll, and toggles
// the mobile menu on small screens.
function initNavbar() {
  applySiteSettings();
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  const closeMenu = () => {
    navbar.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = navbar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
}

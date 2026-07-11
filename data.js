// Shared data + small DOM helpers used by both the homepage (script.js)
// and the "view all" gallery pages (gallery.js).

const LOGO_ITEMS = [
  { src: 'public/logos/logo-01.jpg', label: 'Enlightened' },
  { src: 'public/logos/logo-02.jpg', label: 'Itz Review Time' },
  { src: 'public/logos/logo-03.jpg', label: 'Untitled Design' },
  { src: 'public/logos/logo-04.jpg', label: 'Abstract Green Healthy Life' },
  { src: 'public/logos/logo-05.jpg', label: 'Ismail Multispeciality Clinic' },
  { src: 'public/logos/logo-06.jpg', label: 'Ismail Multi-Speciality Clinic' },
];

const POSTER_ITEMS = [
  { src: 'public/posters/poster-01.jpg', label: 'Zainab Work 01' },
  { src: 'public/posters/poster-02.jpg', label: 'Zainab Work 02' },
  { src: 'public/posters/poster-03.jpg', label: 'Trustin — Poster 27' },
  { src: 'public/posters/poster-04.jpg', label: 'Trustin — Poster 22' },
  { src: 'public/posters/poster-05.jpg', label: 'Trustin — Poster 26' },
  { src: 'public/posters/poster-06.jpg', label: 'Your Word Shapes Your Kids’ World' },
  { src: 'public/posters/poster-07.jpg', label: 'Trustin — Poster 23' },
  { src: 'public/posters/poster-08.jpg', label: 'Zainab Work 03' },
  { src: 'public/posters/poster-09.jpg', label: 'Parenting Workshop' },
  { src: 'public/posters/poster-10.jpg', label: 'Wisdom of Words' },
  { src: 'public/posters/poster-11.jpg', label: 'Dawrah Qur’an' },
  { src: 'public/posters/poster-12.jpg', label: 'An Noor Islamic Academy' },
  { src: 'public/posters/poster-13.jpg', label: 'Trustin — Poster 25' },
  { src: 'public/posters/poster-14.jpg', label: 'Chocolate Workshop' },
  { src: 'public/posters/poster-15.jpg', label: 'My Mental Health, My Responsibility' },
  { src: 'public/posters/poster-16.jpg', label: 'Just Do It — Nike' },
  { src: 'public/posters/poster-17.jpg', label: 'This Is Why Your Neck Hurts — OrthoCare' },
  { src: 'public/posters/poster-18.jpg', label: 'Support to Strength — OrthoCare' },
  { src: 'public/posters/poster-19.jpg', label: 'Why Doctors Choose First Clinic' },
  { src: 'public/posters/poster-20.jpg', label: 'Start Your Clinic in 7 Days — First Clinic' },
  { src: 'public/posters/poster-21.jpg', label: 'Discover a Healthier You — First Clinic' },
  { src: 'public/posters/poster-22.jpg', label: 'Is Your Knee on Pause? — OrthoCare' },
  { src: 'public/posters/poster-23.jpg', label: 'OrthoCare, Bengaluru' },
  { src: 'public/posters/poster-24.jpg', label: 'Time for Qurbani — Adam’s Fresh Meat' },
  { src: 'public/posters/poster-25.jpg', label: 'Don’t Let Injury Stop Your Game — OrthoCare' },
  { src: 'public/posters/poster-26.jpg', label: 'Fresh Seafood, Pure Taste — Adam’s Fresh Meat' },
  { src: 'public/posters/poster-27.jpg', label: 'Wisdom of Words — Part 02' },
];

const REEL_ITEMS = [
  { src: 'public/reels/reel-01.mp4', label: 'AI Reel 01' },
  { src: 'public/reels/reel-03.mp4', label: 'AI Reel 03' },
  { src: 'public/reels/reel-04.mp4', label: 'AI Reel 04' },
  { src: 'public/reels/reel-05.mp4', label: 'AI Reel 05' },
  { src: 'public/reels/reel-07.mp4', label: 'Adam’s Fresh Meat — Heart of Quality' },
  { src: 'public/reels/reel-10.mp4', label: 'A Day in the Life of a Doctor in Dubai' },
  { src: 'public/reels/reel-11.mp4', label: 'Doctors, Thinking About Dubai?' },
  { src: 'public/reels/reel-13.mp4', label: 'A Day in the Life at TrustIn' },
];

// Each carousel component can hold N images — just add/remove entries in an
// item's `images` array. Entries that look like a path/URL render as <img>,
// anything else renders as a labelled placeholder slide.
const CAROUSEL_ITEMS = [
  {
    label: 'What Trustin Does That You Can’t Google',
    images: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `public/carousel/what-trustin-does/${n}.jpg`),
  },
  {
    label: 'From Eligibility to Practice',
    images: [2, 3, 4].map((n) => `public/carousel/from-eligibility-to-practice/${n}.jpg`),
  },
  {
    label: 'Carousel Showcase',
    images: [2, 3, 4, 5, 6, 7, 8].map((n) => `public/carousel/carousel-showcase/${n}.jpg`),
  },
  {
    label: 'Pink Gradients — Social Media & UX/UI Post',
    images: [1, 2, 3, 4, 5, 6].map((n) => `public/carousel/pink-gradients/${n}.jpg`),
  },
];

// Same component as CAROUSEL_ITEMS, reused for the Brochures row/page —
// each entry is a multi-page brochure that auto-floats through its pages.
const BROCHURE_ITEMS = [
  {
    label: 'TrustIn Brochure',
    images: ['public/brochures/trustin-brochure/1-outside.jpg', 'public/brochures/trustin-brochure/2-inside.jpg'],
  },
  {
    label: 'First Physio Brochure',
    images: ['public/brochures/first-physio-brochure/1-outside.jpg', 'public/brochures/first-physio-brochure/2-inside.jpg'],
  },
];

const TESTIMONIALS = [
  {
    logo: 'public/testimonials/trustin-consultancy.jpg',
    company: 'TrustIn Consultancy',
    name: 'Morsal Zamani',
    role: 'Client',
    text: 'Working with you has been an excellent experience. Your graphic design work is creative, professional, and always aligned with our brand at TrustIn. You communicate clearly, deliver on time, and consistently provide high quality content and social media planning that has helped strengthen our online presence. I highly recommend your services to anyone looking for a reliable and talented designer.',
  },
  {
    initials: 'BP',
    company: 'Bright Path Studio',
    name: 'Alina Cortez',
    role: 'Marketing Lead',
    text: 'From the first brief to the final delivery, the process was smooth and genuinely collaborative. Every design came back polished, on-brand, and ready to publish — no back-and-forth needed. Our engagement on social media has visibly improved since we started working together.',
  },
  {
    initials: 'NR',
    company: 'Nimbus Retail Co.',
    name: 'Daniel Osei',
    role: 'Founder',
    text: 'Incredibly reliable and easy to work with. Deadlines were always met, revisions were quick, and the creative direction consistently exceeded what we asked for. It genuinely feels like having an in-house designer who understands the brand inside out.',
  },
];

const TOOLS = [
  'Figma', 'Canva', 'Photoshop', 'Illustrator', 'Claude', 'Gemini',
  'Google AI Studio', 'Google Labs', 'Higgsfield', 'ChatGPT',
  'Midjourney', 'Firefly', 'After Effects', 'Premiere Pro', 'Notion',
];

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

// Shared navbar behaviour for every page: shrinks on scroll, and toggles
// the mobile menu on small screens.
function initNavbar() {
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

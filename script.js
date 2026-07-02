const WORK_ROWS = [
  { id: 'reels', label: 'AI Reels', link: 'Reels.html', linkLabel: 'View All Reels →', items: REEL_ITEMS, w: 230, h: 400, speed: 46 },
  { id: 'carousel', label: 'Carousel Designs', link: 'Carousel.html', linkLabel: 'View All Carousel Designs →', carouselItems: CAROUSEL_ITEMS, speed: 34 },
  { id: 'posters', label: 'Posters', link: 'Posters.html', linkLabel: 'View All Posters →', items: POSTER_ITEMS, w: 280, h: 373, speed: 40 },
  { id: 'brochure', label: 'Brochures', link: 'Brochures.html', linkLabel: 'View All Brochures →', carouselItems: BROCHURE_ITEMS, speed: 34 },
  { id: 'logos', label: 'Logos', link: 'Logos.html', linkLabel: 'View All Logos →', items: LOGO_ITEMS, w: 200, h: 200, speed: 50 },
];

function buildWorkRows() {
  const container = document.getElementById('workRows');
  WORK_ROWS.forEach((row) => {
    const section = document.createElement('div');
    section.className = 'work-row';

    const head = document.createElement('div');
    head.className = 'work-row-head';
    head.innerHTML = `<h3>${row.label}</h3><a href="${row.link}" class="pill-link">${row.linkLabel}</a>`;
    section.appendChild(head);

    const mask = document.createElement('div');
    mask.className = 'work-track-mask';
    const track = document.createElement('div');
    track.className = 'work-track';

    if (row.carouselItems) {
      const cardClass = row.id === 'brochure' ? 'carousel-item--large' : 'carousel-item--big';
      track.classList.add(row.id === 'brochure' ? 'work-track--tight' : 'work-track--carousel');
      const doubled = [...row.carouselItems, ...row.carouselItems];
      doubled.forEach((item) => track.appendChild(buildCarouselItemElement(item, cardClass)));
    } else {
      const doubled = [...row.items, ...row.items];
      doubled.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'work-card' + (row.id === 'logos' ? ' work-card--logos' : '');
        card.style.width = `clamp(140px, 42vw, ${row.w}px)`;
        card.style.aspectRatio = `${row.w} / ${row.h}`;

        const mediaEl = document.createElement(isVideoPath(item.src) ? 'video' : 'img');
        if (mediaEl.tagName === 'VIDEO') {
          mediaEl.src = item.src;
          mediaEl.muted = true;
          mediaEl.loop = true;
          mediaEl.autoplay = true;
          mediaEl.playsInline = true;
          mediaEl.preload = 'metadata';
        } else {
          mediaEl.src = item.src;
          mediaEl.alt = item.label;
          mediaEl.loading = 'lazy';
        }
        card.appendChild(mediaEl);
        track.appendChild(card);
      });
    }

    mask.appendChild(track);
    section.appendChild(mask);
    container.appendChild(section);

    initMarquee(track, row.speed);
  });
}

function buildToolsMarquee() {
  const track = document.getElementById('toolsTrack');
  const doubled = [...TOOLS, ...TOOLS];
  doubled.forEach((tool) => {
    const chip = document.createElement('span');
    chip.className = 'tool-chip';
    chip.innerHTML = `<span class="tool-dot"></span>${tool}`;
    track.appendChild(chip);
  });
}

function initMarquee(track, speed) {
  let hover = false;
  let current = 0;
  let pos = 0;
  let width = track.scrollWidth / 2;
  pos = -width;
  track.style.transform = `translateX(${pos}px)`;

  track.parentElement.addEventListener('mouseenter', () => { hover = true; });
  track.parentElement.addEventListener('mouseleave', () => { hover = false; });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const target = hover ? 0 : speed;
    current += (target - current) * Math.min(1, dt * 3.2);
    pos += current * dt;
    if (pos >= 0) pos -= width;
    track.style.transform = `translateX(${pos}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initHeroTilt() {
  const heroVisual = document.getElementById('heroVisual');
  window.addEventListener('mousemove', (e) => {
    const r = heroVisual.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / r.width;
    const dy = (e.clientY - cy) / r.height;
    heroVisual.style.transform = `perspective(900px) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
  });
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value;
    const email = form.email.value;
    const message = form.message.value;
    const subject = encodeURIComponent(`Project enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    submitBtn.textContent = 'Opening your mail…';
    window.location.href = `mailto:hello@zjcanvas.com?subject=${subject}&body=${body}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildWorkRows();
  buildToolsMarquee();
  initNavbar();
  initHeroTilt();
  initContactForm();
});

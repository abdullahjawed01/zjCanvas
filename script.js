const WORK_ROWS = [
  { id: 'reels', label: 'AI Reels', link: 'Reels.html', linkLabel: 'View All Reels →', items: REEL_ITEMS, w: 230, h: 400, speed: 46 },
  { id: 'carousel', label: 'Carousel Designs', link: 'Carousel.html', linkLabel: 'View All Carousel Designs →', carouselItems: CAROUSEL_ITEMS, speed: 34 },
  { id: 'posters', label: 'Posters', link: 'Posters.html', linkLabel: 'View All Posters →', items: POSTER_ITEMS, w: 280, h: 373, speed: 40 },
  { id: 'brochure', label: 'Brochures', link: 'Brochures.html', linkLabel: 'View All Brochures →', carouselItems: BROCHURE_ITEMS, speed: 16, imageDuration: 9 },
  { id: 'logos', label: 'Logos', link: 'Logos.html', linkLabel: 'View All Logos →', items: LOGO_ITEMS, w: 200, h: 200, speed: 50 },
];

// Keeps appending copies of `items` (via `renderItem`) onto an already
// in-document track until the strip is at least two screens wide. Rows with
// only a handful of items (Carousel, Brochures) would otherwise render a
// single set narrower than the viewport, so the infinite-scroll loop had
// nothing to show once it wrapped — a visible blank gap mid-scroll. Returns
// the width of one item-set, which initMarquee uses as its loop distance.
function fillMarqueeTrack(track, items, renderItem) {
  items.forEach((item) => track.appendChild(renderItem(item)));
  const unitWidth = track.scrollWidth;
  items.forEach((item) => track.appendChild(renderItem(item)));

  const target = window.innerWidth * 2;
  let total = unitWidth * 2;
  while (total < target) {
    items.forEach((item) => track.appendChild(renderItem(item)));
    total += unitWidth;
  }
  return unitWidth;
}

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
    mask.appendChild(track);
    section.appendChild(mask);
    container.appendChild(section);

    let unitWidth;
    if (row.carouselItems) {
      const cardClass = row.id === 'brochure' ? 'carousel-item--large' : 'carousel-item--big';
      track.classList.add('work-track--carousel');
      unitWidth = fillMarqueeTrack(track, row.carouselItems, (item) =>
        buildCarouselItemElement(item, cardClass, row.imageDuration));
    } else {
      unitWidth = fillMarqueeTrack(track, row.items, (item) => {
        const card = document.createElement('div');
        card.className = 'work-card' + (row.id === 'logos' ? ' work-card--logos' : '');
        card.style.width = `clamp(140px, 42vw, ${row.w}px)`;
        card.style.aspectRatio = `${row.w} / ${row.h}`;

        const mediaEl = document.createElement(isVideoPath(item.src) ? 'video' : 'img');
        if (mediaEl.tagName === 'VIDEO') {
          setupLazyVideo(mediaEl, item.src);
        } else {
          mediaEl.src = item.src;
          mediaEl.alt = item.label;
          mediaEl.loading = 'lazy';
        }
        card.appendChild(mediaEl);
        return card;
      });
    }

    initMarquee(track, row.speed, unitWidth);
  });
}

// Testimonial fields are editable from /admin, so they're untrusted text —
// built with createElement/textContent rather than innerHTML to rule out
// stored XSS from a pasted-in company name or quote.
function buildTestimonials() {
  const container = document.getElementById('testimonialsGrid');
  TESTIMONIALS.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';

    const head = document.createElement('div');
    head.className = 'testimonial-head';

    if (t.logo) {
      const img = document.createElement('img');
      img.src = t.logo;
      img.alt = `${t.company} logo`;
      img.className = 'testimonial-logo';
      head.appendChild(img);
    } else {
      const initials = document.createElement('div');
      initials.className = 'testimonial-logo testimonial-logo--initials';
      initials.textContent = t.initials || '';
      head.appendChild(initials);
    }

    const companyWrap = document.createElement('div');
    companyWrap.className = 'testimonial-company';
    const companyName = document.createElement('div');
    companyName.className = 'testimonial-company-name';
    companyName.textContent = t.company;
    const person = document.createElement('div');
    person.className = 'testimonial-person';
    person.textContent = t.role ? `${t.name} · ${t.role}` : t.name;
    companyWrap.appendChild(companyName);
    companyWrap.appendChild(person);
    head.appendChild(companyWrap);

    const text = document.createElement('p');
    text.className = 'testimonial-text';
    text.textContent = `“${t.text}”`;

    card.appendChild(head);
    card.appendChild(text);
    container.appendChild(card);
  });
}

function applyHeroStats() {
  (SITE_SETTINGS.stats || []).forEach((stat, i) => {
    const numEl = document.querySelector(`[data-stat-num="${i}"]`);
    const labelEl = document.querySelector(`[data-stat-label="${i}"]`);
    if (numEl) numEl.textContent = stat.num;
    if (labelEl) labelEl.textContent = stat.label;
  });
}

function buildToolsMarquee() {
  const track = document.getElementById('toolsTrack');
  const doubled = [...TOOLS, ...TOOLS];
  doubled.forEach((tool) => {
    const chip = document.createElement('span');
    chip.className = 'tool-chip';
    const dot = document.createElement('span');
    dot.className = 'tool-dot';
    chip.appendChild(dot);
    chip.appendChild(document.createTextNode(tool));
    track.appendChild(chip);
  });
}

function initMarquee(track, speed, width) {
  let hover = false;
  let current = 0;
  let pos = -width;
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
    window.location.href = `mailto:${SITE_SETTINGS.contactEmail}?subject=${subject}&body=${body}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildWorkRows();
  buildTestimonials();
  buildToolsMarquee();
  applyHeroStats();
  initNavbar();
  initHeroTilt();
  initContactForm();
});

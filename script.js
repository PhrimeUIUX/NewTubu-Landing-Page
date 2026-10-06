const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.getElementById("header");
const scrollProgress = document.getElementById("scrollProgress");
const themeToggle = document.getElementById("themeToggle");
const yearEl = document.getElementById("year");
const liveCount = document.getElementById("liveCount");
const revealEls = document.querySelectorAll(".reveal");

if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

const storedTheme = localStorage.getItem("ntv-theme");
if (storedTheme === "light" || storedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", storedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ntv-theme", next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#fafafa" : "#0b0b0b");
  });
}

let ticking = false;
const onScroll = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgress) scrollProgress.style.width = pct + "%";
  if (header) header.classList.toggle("scrolled", scrollTop > 8);

  ticking = false;
};

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  },
  { passive: true }
);
onScroll();

if (revealEls.length) {
  if (prefersReduced) {
    revealEls.forEach((el) => el.classList.add("active"));
  } else {
    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            revealIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealIO.observe(el));
  }
}

const downloads = {
  android: "https://assets.ppc-toda.com/phrimevisions/app-debug.apk",
  windows: "https://assets.ppc-toda.com/phrimevisions/NewTubu-Setup-1.3.0.exe",
};
const downloadEl = document.querySelector("[data-download]");
if (downloadEl) {
  downloadEl.href = /Android/i.test(navigator.userAgent) ? downloads.android : downloads.windows;
}

if (!prefersReduced) {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        "perspective(800px) rotateX(" +
        (-y * 4).toFixed(2) +
        "deg) rotateY(" +
        (x * 4).toFixed(2) +
        "deg) translateY(-3px)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

(function initBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let particles = [];
  const mouse = { x: -9999, y: -9999 };
  const linkDist = 130;
  const repelDist = 130;

  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

  function build() {
    const count = Math.min(Math.round((w * h) / 17000), 110);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      r: Math.random() * 1.5 + 0.6,
    }));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function palette() {
    return isLight()
      ? { dot: "rgba(20,20,20,", line: "rgba(225,29,29," }
      : { dot: "rgba(245,245,245,", line: "rgba(255,59,59," };
  }

  function draw() {
    const c = palette();
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < repelDist * repelDist) {
        const d = Math.sqrt(dist2) || 1;
        const force = (repelDist - d) / repelDist;
        p.x += (dx / d) * force * 1.7;
        p.y += (dy / d) * force * 1.7;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = c.dot + "0.5)";
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDist * linkDist) {
          const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.25;
          ctx.strokeStyle = c.line + alpha.toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    draw();
    window.requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener(
    "mousemove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true }
  );
  window.addEventListener("mouseout", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  if (prefersReduced) {
    draw();
  } else {
    loop();
  }
})();

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const QUERY = `query ($page: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: 24) {
    media(type: ANIME, sort: $sort, isAdult: false) {
      id
      title { romaji english }
      coverImage { large }
      bannerImage
      averageScore
      episodes
      genres
      format
      seasonYear
      description
      trailer { id site }
    }
  }
}`;
const SORTS = ["TRENDING_DESC", "POPULARITY_DESC", "SCORE_DESC", "START_DATE_DESC"];

const posterCache = new Map();
let allItems = [];
let activeGenre = "All";
let searchTerm = "";

function normalize(m) {
  return {
    id: m.id,
    title: (m.title && (m.title.english || m.title.romaji)) || "Untitled",
    romaji: (m.title && m.title.romaji) || "",
    poster: (m.coverImage && m.coverImage.large) || "",
    banner: m.bannerImage || (m.coverImage && m.coverImage.large) || "",
    score: m.averageScore || null,
    episodes: m.episodes || null,
    genres: m.genres || [],
    format: m.format ? m.format.replace(/_/g, " ") : "",
    year: m.seasonYear || null,
    description: m.description || "",
    trailer: m.trailer && m.trailer.site === "youtube" ? m.trailer.id : null,
  };
}

const FALLBACK = [
  { title: "Crimson Horizon", genres: ["Action", "Fantasy"], format: "TV", year: 2024, episodes: 12, score: 84 },
  { title: "Neon Requiem", genres: ["Sci-Fi", "Action"], format: "TV", year: 2023, episodes: 24, score: 88 },
  { title: "Paper Moon", genres: ["Romance", "Drama"], format: "Movie", year: 2022, episodes: 1, score: 79 },
  { title: "Skyline Drift", genres: ["Sports", "Drama"], format: "TV", year: 2024, episodes: 13, score: 81 },
  { title: "Silent Orbit", genres: ["Sci-Fi", "Mystery"], format: "TV", year: 2021, episodes: 12, score: 86 },
  { title: "Lantern Sea", genres: ["Adventure", "Fantasy"], format: "TV", year: 2023, episodes: 26, score: 82 },
  { title: "Midnight Ramen", genres: ["Slice of Life", "Comedy"], format: "TV", year: 2022, episodes: 12, score: 77 },
  { title: "Velvet Static", genres: ["Mystery", "Supernatural"], format: "TV", year: 2024, episodes: 11, score: 83 },
  { title: "Iron Blossom", genres: ["Action", "Drama"], format: "TV", year: 2020, episodes: 24, score: 80 },
  { title: "Glass Comet", genres: ["Sci-Fi", "Romance"], format: "Movie", year: 2023, episodes: 1, score: 85 },
  { title: "Echo Garden", genres: ["Fantasy", "Slice of Life"], format: "TV", year: 2021, episodes: 12, score: 76 },
  { title: "Last Train Home", genres: ["Drama", "Slice of Life"], format: "TV", year: 2024, episodes: 10, score: 87 },
].map((item, i) => ({
  id: "fallback-" + i,
  title: item.title,
  romaji: "",
  poster: "",
  banner: "",
  score: item.score,
  episodes: item.episodes,
  genres: item.genres,
  format: item.format,
  year: item.year,
  description: "",
  trailer: null,
}));

const shelf = document.getElementById("shelf");
const shelfEmpty = document.getElementById("shelfEmpty");
const genreChips = document.getElementById("genreChips");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const shelfPrev = document.getElementById("shelfPrev");
const shelfNext = document.getElementById("shelfNext");

function setLive(text) {
  if (liveCount) liveCount.textContent = text;
}

function renderSkeletons() {
  if (!shelf) return;
  shelf.innerHTML = "";
  shelfEmpty.hidden = true;
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("div");
    s.className = "skeleton skeleton-card";
    shelf.appendChild(s);
  }
}

function initials(text) {
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function makeCard(item) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "anime-card";
  card.setAttribute("aria-label", "Open " + item.title);

  const poster = document.createElement("div");
  poster.className = "anime-poster";

  if (item.poster) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = item.title + " poster";
    img.src = item.poster;
    img.addEventListener("error", () => {
      img.remove();
      const ph = document.createElement("div");
      ph.className = "anime-placeholder";
      ph.textContent = initials(item.title);
      poster.prepend(ph);
    });
    poster.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "anime-placeholder";
    ph.textContent = initials(item.title);
    poster.appendChild(ph);
  }

  if (item.score) {
    const badge = document.createElement("span");
    badge.className = "anime-badge";
    badge.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2 2 9.4l7-.9z"/></svg>';
    const value = document.createElement("span");
    value.textContent = item.score + "%";
    badge.appendChild(value);
    poster.appendChild(badge);
  }

  const hover = document.createElement("div");
  hover.className = "anime-hover";
  const hoverLabel = document.createElement("span");
  hoverLabel.innerHTML =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  hoverLabel.appendChild(document.createTextNode(item.trailer ? "Watch trailer" : "View details"));
  hover.appendChild(hoverLabel);
  poster.appendChild(hover);

  card.appendChild(poster);

  const name = document.createElement("span");
  name.className = "anime-name";
  name.textContent = item.title;
  card.appendChild(name);

  const meta = [item.format, item.year, item.episodes ? item.episodes + " eps" : null]
    .filter(Boolean)
    .join(" · ");
  if (meta) {
    const sub = document.createElement("span");
    sub.className = "anime-sub";
    sub.textContent = meta;
    card.appendChild(sub);
  }

  card.addEventListener("click", () => openModal(item));
  return card;
}

function filtered() {
  const term = searchTerm.trim().toLowerCase();
  return allItems.filter((item) => {
    const genreOk = activeGenre === "All" || item.genres.indexOf(activeGenre) !== -1;
    const termOk =
      !term ||
      item.title.toLowerCase().indexOf(term) !== -1 ||
      item.romaji.toLowerCase().indexOf(term) !== -1;
    return genreOk && termOk;
  });
}

function render() {
  if (!shelf) return;
  const items = filtered();
  shelf.innerHTML = "";
  shelfEmpty.hidden = items.length > 0;
  items.forEach((item) => shelf.appendChild(makeCard(item)));
  shelf.scrollTo({ left: 0 });
}

function buildChips() {
  if (!genreChips) return;
  const tally = {};
  allItems.forEach((item) => {
    item.genres.forEach((g) => {
      tally[g] = (tally[g] || 0) + 1;
    });
  });
  const top = Object.keys(tally)
    .sort((a, b) => tally[b] - tally[a])
    .slice(0, 7);
  const genres = ["All"].concat(top);

  genreChips.innerHTML = "";
  genres.forEach((genre) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (genre === activeGenre ? " is-active" : "");
    chip.textContent = genre;
    chip.addEventListener("click", () => {
      activeGenre = genre;
      genreChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
      render();
    });
    genreChips.appendChild(chip);
  });
}

function setFeature(item) {
  const featureMedia = document.getElementById("featureMedia");
  const featureTitle = document.getElementById("featureTitle");
  const featureScore = document.getElementById("featureScore");
  const featurePlay = document.getElementById("featurePlay");
  if (!featureMedia || !featureTitle || !featurePlay) return;

  const image = item.banner || item.poster;
  featureMedia.querySelectorAll("img, iframe, .skeleton").forEach((el) => el.remove());
  if (image) {
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.src = image;
    img.addEventListener("error", () => img.remove());
    featureMedia.prepend(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "anime-placeholder";
    ph.textContent = initials(item.title);
    featureMedia.prepend(ph);
  }

  featureTitle.textContent = item.title;
  if (featureScore) {
    if (item.score) {
      featureScore.textContent = item.score + "%";
      featureScore.hidden = false;
    } else {
      featureScore.hidden = true;
    }
  }

  featurePlay.disabled = !item.trailer;
  featurePlay.onclick = item.trailer ? () => openModal(item) : null;
}

async function loadAnime(page, sort) {
  renderSkeletons();
  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { page: page, sort: [sort] } }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const media = (json && json.data && json.data.Page && json.data.Page.media) || [];
    if (!media.length) throw new Error("empty");
    allItems = media.map(normalize);
    activeGenre = "All";
    buildChips();
    render();
    setLive(allItems.length + " titles · live");
    const featured = allItems.find((item) => item.trailer) || allItems[0];
    if (featured) setFeature(featured);
  } catch (err) {
    allItems = FALLBACK.slice();
    activeGenre = "All";
    buildChips();
    render();
    setLive("Sample data · offline");
    setFeature(allItems[0]);
  }
}

function randomSort() {
  return SORTS[Math.floor(Math.random() * SORTS.length)];
}

if (searchInput) {
  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTerm = searchInput.value;
      render();
    }, 120);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => loadAnime(1, randomSort()));
}

function scrollShelf(direction) {
  if (!shelf) return;
  shelf.scrollBy({ left: direction * shelf.clientWidth * 0.85, behavior: prefersReduced ? "auto" : "smooth" });
}

if (shelfPrev) shelfPrev.addEventListener("click", () => scrollShelf(-1));
if (shelfNext) shelfNext.addEventListener("click", () => scrollShelf(1));

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");
const modalMedia = document.getElementById("modalMedia");
const modalTitle = document.getElementById("modalTitle");
const modalTags = document.getElementById("modalTags");
const modalDesc = document.getElementById("modalDesc");
let lastFocused = null;

function stripHtml(html) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const ta = document.createElement("textarea");
  ta.innerHTML = text;
  return ta.value;
}

function openModal(item) {
  if (!modal) return;

  modalMedia.innerHTML = "";
  if (item.trailer) {
    const iframe = document.createElement("iframe");
    iframe.src =
      "https://www.youtube.com/embed/" + item.trailer + "?autoplay=1&rel=0&modestbranding=1";
    iframe.title = item.title + " trailer";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    modalMedia.appendChild(iframe);
  } else {
    if (item.poster) {
      const img = document.createElement("img");
      img.alt = item.title + " poster";
      img.src = item.poster;
      modalMedia.appendChild(img);
    }
    const note = document.createElement("div");
    note.className = "no-trailer";
    note.textContent = "No trailer available for this title";
    modalMedia.appendChild(note);
  }

  modalTitle.textContent = item.title;

  modalTags.innerHTML = "";
  const tags = [item.format, item.year, item.episodes ? item.episodes + " eps" : null].concat(
    item.genres
  );
  if (item.score) {
    const score = document.createElement("span");
    score.textContent = item.score + "% score";
    modalTags.appendChild(score);
  }
  tags
    .filter(Boolean)
    .slice(0, 6)
    .forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      modalTags.appendChild(span);
    });

  modalDesc.textContent = item.description
    ? stripHtml(item.description)
    : "No synopsis available.";

  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  if (modalClose) modalClose.focus();
}

function closeModal() {
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  modalMedia.innerHTML = "";
  document.body.classList.remove("modal-open");
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

if (modal) {
  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
}
if (modalClose) modalClose.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

loadAnime(1, "TRENDING_DESC");

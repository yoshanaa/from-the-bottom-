// ===== HOMEPAGE JS =====

document.getElementById('footer-year').textContent = new Date().getFullYear();

// Day counter
document.getElementById('day-count').textContent = daysSince(DB.getStartDate());

// ===== MOOD SLIDER =====
const slider = document.getElementById('mood-slider');
const display = document.getElementById('mood-display');

function updateSliderColor(val) {
  const pct = ((val - 1) / 9) * 100;
  slider.style.background = `linear-gradient(to right, ${moodColor(val)} ${pct}%, rgba(255,255,255,0.07) ${pct}%)`;
  display.style.color = moodColor(val);
}

slider.addEventListener('input', () => {
  const v = parseInt(slider.value);
  display.textContent = v;
  updateSliderColor(v);
});

// Init
display.textContent = slider.value;
updateSliderColor(parseInt(slider.value));

// ===== LOG BUTTON =====
document.getElementById('log-btn').addEventListener('click', () => {
  const score = parseInt(slider.value);
  const note = document.getElementById('mood-note').value.trim();
  const today = new Date().toDateString();
  const moods = DB.getMoods();

  // Prevent double-logging on same day
  if (moods.length && new Date(moods[0].date).toDateString() === today) {
    moods[0].score = score;
    moods[0].note = note;
    localStorage.setItem('ftb_moods', JSON.stringify(moods));
  } else {
    DB.saveMood({ date: new Date().toISOString(), score, note });
  }

  const confirm = document.getElementById('log-confirm');
  confirm.classList.add('show');
  setTimeout(() => confirm.classList.remove('show'), 2500);

  renderEntries();
  renderStats();
  renderPulse();
});

// ===== RENDER RECENT ENTRIES =====
function renderEntries() {
  const moods = DB.getMoods().slice(0, 5);
  const el = document.getElementById('entries-list');
  if (!moods.length) {
    el.innerHTML = '<p class="empty-state">no entries yet - check in above to start your journey.</p>';
    return;
  }
  el.innerHTML = moods.map(m => `
    <div class="entry-item">
      <span class="entry-date">${fmtDate(m.date)}</span>
      <span class="entry-text">${m.note || '<em>no note</em>'}</span>
      <span class="entry-score" style="color:${moodColor(m.score)}">${m.score}</span>
    </div>
  `).join('');
}

// ===== RENDER STATS =====
function renderStats() {
  const moods = DB.getMoods();
  document.getElementById('stat-days').textContent = moods.length;
  if (!moods.length) return;

  const avg = moods.reduce((a, m) => a + m.score, 0) / moods.length;
  document.getElementById('stat-avg').textContent = avg.toFixed(1);

  const best = Math.max(...moods.map(m => m.score));
  document.getElementById('stat-best').textContent = best;

  // Trend: compare last 3 vs previous 3
  if (moods.length >= 2) {
    const recent = moods.slice(0, Math.min(3, moods.length));
    const older = moods.slice(Math.min(3, moods.length), Math.min(6, moods.length));
    const recentAvg = recent.reduce((a, m) => a + m.score, 0) / recent.length;
    const olderAvg = older.length ? older.reduce((a, m) => a + m.score, 0) / older.length : recentAvg;
    const diff = recentAvg - olderAvg;
    const trendEl = document.getElementById('stat-trend');
    if (diff > 0.3) { trendEl.textContent = 'arrow'; trendEl.style.color = '#3ecf8e'; }
    else if (diff < -0.3) { trendEl.textContent = 'arrow'; trendEl.style.color = '#f87171'; }
    else { trendEl.textContent = 'arrow'; trendEl.style.color = '#a68afd'; }
  }
}

// ===== PULSE LINE =====
function renderPulse() {
  const moods = DB.getMoods().slice().reverse(); // oldest first
  const path = document.getElementById('pulse-path');
  const W = 800, H = 100;

  if (moods.length < 2) {
    // Draw a flat sample pulse if no real data
    const sample = [5,4,3,2,4,6,5,7,6,8,7,9];
    drawPulse(path, sample, W, H, true);
    return;
  }

  drawPulse(path, moods.map(m => m.score), W, H, false);
}

function drawPulse(path, scores, W, H, isDummy) {
  const pad = 20;
  const xs = scores.map((_, i) => pad + (i / Math.max(scores.length - 1, 1)) * (W - pad * 2));
  const ys = scores.map(s => H - pad - ((s - 1) / 9) * (H - pad * 2));

  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${cx} ${ys[i-1]}, ${cx} ${ys[i]}, ${xs[i]} ${ys[i]}`;
  }

  path.setAttribute('d', d);
  path.style.stroke = isDummy ? 'rgba(124,92,252,0.3)' : '#7c5cfc';
  path.style.strokeDasharray = '3000';
  path.style.strokeDashoffset = '3000';
  path.style.animation = 'none';
  // Trigger reflow
  path.getBoundingClientRect();
  path.style.animation = 'draw-pulse 2s ease forwards 0.2s';
}

// ===== DAILY QUOTE =====
// Mood-based search terms: low = resilience, mid = growth, high = success
const quoteTerms = {
  low:  ['resilience', 'strength', 'hope', 'healing', 'courage'],
  mid:  ['growth', 'change', 'perseverance', 'patience', 'progress'],
  high: ['success', 'motivation', 'confidence', 'winning', 'hustle']
};

const moodLabels = {
  low:  'for when it\'s tough',
  mid:  'keep going',
  high: 'you\'re on one'
};

function getMoodTier(score) {
  if (score <= 4) return 'low';
  if (score <= 7) return 'mid';
  return 'high';
}

async function loadQuote() {
  const card = document.getElementById('quote-card');
  const tagEl = document.getElementById('quote-tag');
  const textEl = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');

  // Get today's mood score or default to mid
  const moods = DB.getMoods();
  const todayScore = moods.length ? moods[0].score : 5;
  const tier = getMoodTier(todayScore);

  // Pick a search term - rotate daily so it changes each day
  const terms = quoteTerms[tier];
  const dayIndex = new Date().getDate() % terms.length;
  const term = terms[dayIndex];

  // Set mood tag
  card.className = `quote-card ${tier}`;
  tagEl.textContent = moodLabels[tier];

  // Check cache - only fetch once per day per tier
  const cacheKey = `ftb_quote_${new Date().toDateString()}_${tier}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const q = JSON.parse(cached);
    textEl.textContent = q.text;
    authorEl.textContent = q.author ? `- ${q.author}` : '';
    return;
  }

  try {
    const res = await fetch(`https://api.quotable.io/random?tags=${term}&maxLength=180`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const q = { text: data.content, author: data.author };
    localStorage.setItem(cacheKey, JSON.stringify(q));
    textEl.textContent = q.text;
    authorEl.textContent = `- ${q.author}`;
  } catch {
    // Fallback quotes if API is down
    const fallbacks = {
      low:  { text: "Even the darkest night will end and the sun will rise.", author: "Victor Hugo" },
      mid:  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
      high: { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" }
    };
    const f = fallbacks[tier];
    textEl.textContent = f.text;
    authorEl.textContent = `- ${f.author}`;
  }
}

// ===== INIT =====
renderEntries();
renderStats();
renderPulse();
loadQuote();
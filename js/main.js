// ===== HOMEPAGE JS =====

document.getElementById('footer-year').textContent = new Date().getFullYear()

// ===== AUTH WALL =====
// Shows login/signup form if not logged in
async function initAuth() {
  const user = await Auth.getUser()
  if (!user) {
    showAuthModal()
    return false
  }
  // Show sign out button
  const nav = document.querySelector('.nav-links')
  const btn = document.createElement('a')
  btn.href = '#'
  btn.textContent = 'sign out'
  btn.addEventListener('click', e => { e.preventDefault(); Auth.signOut() })
  nav.appendChild(btn)
  return true
}

function showAuthModal() {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(13,13,15,0.97);
    display:flex; align-items:center; justify-content:center;
    z-index:999; font-family:'Inter',sans-serif;
  `
  modal.innerHTML = `
    <div style="background:#141417; border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:2.5rem; width:100%; max-width:380px;">
      <div style="font-family:'Syne',sans-serif; font-size:1.8rem; font-weight:800; color:#f0eff4; margin-bottom:0.5rem;">welcome.</div>
      <div style="font-size:0.85rem; color:#6b6a73; margin-bottom:2rem;">sign in or create an account to start your journey.</div>
      <input id="auth-email" type="email" placeholder="email" style="width:100%; background:#1a1a1f; border:1px solid rgba(255,255,255,0.07); border-radius:8px; color:#f0eff4; font-family:'Inter',sans-serif; font-size:0.9rem; padding:0.75rem 1rem; margin-bottom:0.75rem; outline:none; box-sizing:border-box;" />
      <input id="auth-password" type="password" placeholder="password" style="width:100%; background:#1a1a1f; border:1px solid rgba(255,255,255,0.07); border-radius:8px; color:#f0eff4; font-family:'Inter',sans-serif; font-size:0.9rem; padding:0.75rem 1rem; margin-bottom:1rem; outline:none; box-sizing:border-box;" />
      <div style="display:flex; gap:0.75rem;">
        <button id="signin-btn" style="flex:1; background:#7c5cfc; color:#fff; border:none; border-radius:8px; padding:0.75rem; font-family:'Inter',sans-serif; font-size:0.9rem; font-weight:500; cursor:pointer;">sign in</button>
        <button id="signup-btn" style="flex:1; background:transparent; color:#a68afd; border:1px solid rgba(124,92,252,0.3); border-radius:8px; padding:0.75rem; font-family:'Inter',sans-serif; font-size:0.9rem; cursor:pointer;">sign up</button>
      </div>
      <div id="auth-error" style="font-size:0.8rem; color:#f87171; margin-top:0.75rem; min-height:1.2rem;"></div>
    </div>
  `
  document.body.appendChild(modal)

  document.getElementById('signin-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value
    const password = document.getElementById('auth-password').value
    const { error } = await Auth.signIn(email, password)
    if (error) { document.getElementById('auth-error').textContent = error.message; return }
    modal.remove()
    init()
  })

  document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value
    const password = document.getElementById('auth-password').value
    const { error } = await Auth.signUp(email, password)
    if (error) { document.getElementById('auth-error').textContent = error.message; return }
    document.getElementById('auth-error').style.color = '#3ecf8e'
    document.getElementById('auth-error').textContent = 'account created! check your email to confirm, then sign in.'
  })
}

// ===== MOOD SLIDER =====
const slider = document.getElementById('mood-slider')
const display = document.getElementById('mood-display')

function updateSliderColor(val) {
  const pct = ((val - 1) / 9) * 100
  slider.style.background = `linear-gradient(to right, ${moodColor(val)} ${pct}%, rgba(255,255,255,0.07) ${pct}%)`
  display.style.color = moodColor(val)
}

slider.addEventListener('input', () => {
  const v = parseInt(slider.value)
  display.textContent = v
  updateSliderColor(v)
})

display.textContent = slider.value
updateSliderColor(parseInt(slider.value))

// ===== LOG BUTTON =====
document.getElementById('log-btn').addEventListener('click', async () => {
  const score = parseInt(slider.value)
  const note = document.getElementById('mood-note').value.trim()
  await DB.saveMood(score, note)
  const confirm = document.getElementById('log-confirm')
  confirm.classList.add('show')
  setTimeout(() => confirm.classList.remove('show'), 2500)

  // Show reflect button after logging
  document.getElementById('reflect-wrap').style.display = 'block'
  document.getElementById('reflect-output').textContent = ''
  await renderEntries()
  await renderStats()
  await renderPulse()
  await renderChart()
  loadQuote()
})

// ===== RENDER RECENT ENTRIES =====
async function renderEntries() {
  const moods = (await DB.getMoods()).slice(0, 5)
  const el = document.getElementById('entries-list')
  if (!moods.length) {
    el.innerHTML = '<p class="empty-state">no entries yet - check in above to start your journey.</p>'
    return
  }
  el.innerHTML = moods.map(m => `
    <div class="entry-item">
      <span class="entry-date">${fmtDate(m.created_at)}</span>
      <span class="entry-text">${m.note || '<em>no note</em>'}</span>
      <span class="entry-score" style="color:${moodColor(m.score)}">${m.score}</span>
    </div>
  `).join('')
}

// ===== RENDER STATS =====
async function renderStats() {
  const moods = await DB.getMoods()
  document.getElementById('stat-days').textContent = moods.length
  if (!moods.length) return

  const avg = moods.reduce((a, m) => a + m.score, 0) / moods.length
  document.getElementById('stat-avg').textContent = avg.toFixed(1)

  const best = Math.max(...moods.map(m => m.score))
  document.getElementById('stat-best').textContent = best

  if (moods.length >= 2) {
    const recent = moods.slice(0, Math.min(3, moods.length))
    const older = moods.slice(Math.min(3, moods.length), Math.min(6, moods.length))
    const recentAvg = recent.reduce((a, m) => a + m.score, 0) / recent.length
    const olderAvg = older.length ? older.reduce((a, m) => a + m.score, 0) / older.length : recentAvg
    const diff = recentAvg - olderAvg
    const trendEl = document.getElementById('stat-trend')
    trendEl.style.fontFamily = 'Inter, sans-serif'
    if (diff > 0.3) { trendEl.textContent = 'arrow up'; trendEl.style.color = '#3ecf8e' }
    else if (diff < -0.3) { trendEl.textContent = 'arrow down'; trendEl.style.color = '#f87171' }
    else { trendEl.textContent = 'arrow side'; trendEl.style.color = '#a68afd' }
  }
}

// ===== PULSE LINE =====
async function renderPulse() {
  const moods = (await DB.getMoods()).slice().reverse()
  const path = document.getElementById('pulse-path')
  const W = 800, H = 100

  if (moods.length < 2) {
    const sample = [5,4,3,2,4,6,5,7,6,8,7,9]
    drawPulse(path, sample, W, H, true)
    return
  }
  drawPulse(path, moods.map(m => m.score), W, H, false)
}

function drawPulse(path, scores, W, H, isDummy) {
  const pad = 20
  const xs = scores.map((_, i) => pad + (i / Math.max(scores.length - 1, 1)) * (W - pad * 2))
  const ys = scores.map(s => H - pad - ((s - 1) / 9) * (H - pad * 2))

  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i-1] + xs[i]) / 2
    d += ` C ${cx} ${ys[i-1]}, ${cx} ${ys[i]}, ${xs[i]} ${ys[i]}`
  }

  path.setAttribute('d', d)
  path.style.stroke = isDummy ? 'rgba(124,92,252,0.3)' : '#7c5cfc'
  path.style.strokeDasharray = '3000'
  path.style.strokeDashoffset = '3000'
  path.style.animation = 'none'
  path.getBoundingClientRect()
  path.style.animation = 'draw-pulse 2s ease forwards 0.2s'
}

// ===== DAILY QUOTE =====
const quoteTerms = {
  low:  ['resilience', 'strength', 'hope', 'healing', 'courage'],
  mid:  ['growth', 'change', 'perseverance', 'patience', 'progress'],
  high: ['success', 'motivation', 'confidence', 'winning', 'hustle']
}

const moodLabels = {
  low:  "for when it's tough",
  mid:  'keep going',
  high: "you're on one"
}

function getMoodTier(score) {
  if (score <= 4) return 'low'
  if (score <= 7) return 'mid'
  return 'high'
}

async function loadQuote() {
  const card = document.getElementById('quote-card')
  const tagEl = document.getElementById('quote-tag')
  const textEl = document.getElementById('quote-text')
  const authorEl = document.getElementById('quote-author')

  const moods = await DB.getMoods()
  const todayScore = moods.length ? moods[0].score : 5
  const tier = getMoodTier(todayScore)

  const terms = quoteTerms[tier]
  const dayIndex = new Date().getDate() % terms.length
  const term = terms[dayIndex]

  card.className = `quote-card ${tier}`
  tagEl.textContent = moodLabels[tier]

  const cacheKey = `ftb_quote_${new Date().toDateString()}_${tier}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const q = JSON.parse(cached)
    textEl.textContent = q.text
    authorEl.textContent = q.author ? `- ${q.author}` : ''
    return
  }

  try {
    const res = await fetch(`https://api.quotable.io/random?tags=${term}&maxLength=180`)
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    const q = { text: data.content, author: data.author }
    localStorage.setItem(cacheKey, JSON.stringify(q))
    textEl.textContent = q.text
    authorEl.textContent = `- ${q.author}`
  } catch {
    const fallbacks = {
      low:  { text: "Even the darkest night will end and the sun will rise.", author: "Victor Hugo" },
      mid:  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
      high: { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" }
    }
    const f = fallbacks[tier]
    textEl.textContent = f.text
    authorEl.textContent = `- ${f.author}`
  }
}

// ===== MOOD CHART =====
let chartInstance = null

async function renderChart() {
  const moods = (await DB.getMoods()).slice().reverse() // oldest first
  const emptyEl = document.getElementById('chart-empty')
  const canvas = document.getElementById('mood-chart')

  if (moods.length < 2) {
    canvas.style.display = 'none'
    emptyEl.style.display = 'block'
    return
  }

  emptyEl.style.display = 'none'
  canvas.style.display = 'block'

  const labels = moods.map(m => fmtDate(m.created_at))
  const scores = moods.map(m => m.score)
  const colors = moods.map(m => moodColor(m.score))

  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'mood',
        data: scores,
        borderColor: '#7c5cfc',
        backgroundColor: 'rgba(124,92,252,0.08)',
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141417',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#a68afd',
          bodyColor: '#9998a3',
          padding: 12,
          callbacks: {
            label: ctx => `mood: ${ctx.parsed.y}/10`
          }
        }
      },
      scales: {
        y: {
          min: 1,
          max: 10,
          ticks: {
            color: '#6b6a73',
            stepSize: 1,
            font: { family: 'Inter', size: 11 }
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.07)' }
        },
        x: {
          ticks: {
            color: '#6b6a73',
            font: { family: 'Inter', size: 11 },
            maxRotation: 45
          },
          grid: { display: false },
          border: { color: 'rgba(255,255,255,0.07)' }
        }
      }
    }
  })
}

// ===== DAY COUNTER =====
async function renderDayCount() {
  const start = await DB.getStartDate()
  document.getElementById('day-count').textContent = daysSince(start)
}

// ===== INIT =====
async function init() {
  await renderDayCount()
  await renderEntries()
  await renderStats()
  await renderPulse()
  await renderChart()
  await loadQuote()
}

// Check auth then init
initAuth().then(loggedIn => {
  if (loggedIn) init()
})
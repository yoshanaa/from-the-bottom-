// ===== DATA LAYER =====
// All data stored in localStorage so it persists across sessions

const DB = {
  getMoods() {
    return JSON.parse(localStorage.getItem('ftb_moods') || '[]');
  },
  saveMood(entry) {
    const moods = this.getMoods();
    moods.unshift(entry); // newest first
    localStorage.setItem('ftb_moods', JSON.stringify(moods));
  },
  getWins() {
    return JSON.parse(localStorage.getItem('ftb_wins') || '[]');
  },
  saveWin(win) {
    const wins = this.getWins();
    wins.unshift(win);
    localStorage.setItem('ftb_wins', JSON.stringify(wins));
  },
  getHobbies() {
    return JSON.parse(localStorage.getItem('ftb_hobbies') || JSON.stringify([
      { id: 1, emoji: 'run', name: 'running', note: 'started from 0, building up.' },
      { id: 2, emoji: 'song', name: 'music', note: 'rediscovering old playlists.' },
      { id: 3, emoji: 'book', name: 'reading', note: 'getting into books again.' }
    ]));
  },
  saveHobbies(hobbies) {
    localStorage.setItem('ftb_hobbies', JSON.stringify(hobbies));
  },
  getStartDate() {
    let d = localStorage.getItem('ftb_start');
    if (!d) {
      d = new Date().toISOString();
      localStorage.setItem('ftb_start', d);
    }
    return new Date(d);
  }
};

// Utility: get color for mood score
function moodColor(score) {
  if (score <= 3) return '#f87171';
  if (score <= 5) return '#fbbf24';
  if (score <= 7) return '#a68afd';
  return '#3ecf8e';
}

// Utility: format date
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Utility: day count
function daysSince(startDate) {
  const diff = Date.now() - new Date(startDate).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

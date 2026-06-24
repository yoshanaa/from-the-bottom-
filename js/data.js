// ===== SUPABASE SETUP =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ===== UTILITIES =====
window.moodColor = function(score) {
  if (score <= 3) return '#f87171'
  if (score <= 5) return '#fbbf24'
  if (score <= 7) return '#a68afd'
  return '#3ecf8e'
}

window.fmtDate = function(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

window.daysSince = function(startDate) {
  const diff = Date.now() - new Date(startDate).getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
}

// ===== AUTH =====
window.Auth = {
  async signUp(email, password) {
    return await supabase.auth.signUp({ email, password })
  },
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  },
  async signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  },
  async getUser() {
    const { data } = await supabase.auth.getUser()
    return data?.user || null
  }
}

// ===== DATA LAYER =====
window.DB = {
  async getMoods() {
    const user = await Auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('mood table')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data
  },
  async saveMood(score, note) {
    const user = await Auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('mood table')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today)
      .limit(1)
    if (existing && existing.length > 0) {
      await supabase.from('mood table').update({ score, note }).eq('id', existing[0].id)
    } else {
      await supabase.from('mood table').insert({ user_id: user.id, score, note })
    }
  },
  async getWins() {
    const user = await Auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('wins table')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data
  },
  async saveWin(text) {
    const user = await Auth.getUser()
    if (!user) return
    await supabase.from('wins table').insert({ user_id: user.id, text })
  },
  async getHobbies() {
    const user = await Auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('hobbies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return [] }
    return data
  },
  async saveHobby(emoji, name, note) {
    const user = await Auth.getUser()
    if (!user) return
    await supabase.from('hobbies').insert({ user_id: user.id, emoji, name, note })
  },
  async getStartDate() {
    const moods = await this.getMoods()
    if (!moods.length) return new Date()
    return new Date(moods[moods.length - 1].created_at)
  }
}

// Boot main.js after Supabase is ready
const script = document.createElement('script')
script.type = 'module'
script.src = 'js/main.js'
document.body.appendChild(script)
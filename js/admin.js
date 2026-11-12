const cfg = window.SIFTCLEAN || {}
const $ = id => document.getElementById(id)
const KEY = 'siftclean_admin_token'
let days = 30
let timer = null

function fmtBytes(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0
  n = Number(n) || 0
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++ }
  return n.toLocaleString('en-US', { maximumFractionDigits: i ? (n < 10 ? 2 : 1) : 0 }) + ' ' + u[i]
}

function fmtNum(n) {
  return (Number(n) || 0).toLocaleString('en-US')
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function shortDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function call(payload) {
  const res = await fetch(cfg.api, { method: 'POST', body: JSON.stringify(payload) })
  return res.json()
}

function show(id) {
  ['login', 'dash', 'notice'].forEach(s => $(s).classList.toggle('hidden', s !== id))
}

function token() {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

function setToken(t) {
  try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY) } catch {}
}

function niceMax(v) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

function barChart(el, rows, key, fmt, label) {
  const W = Math.max(280, el.clientWidth || 640)
  const H = el.clientHeight || 210
  const pad = { l: 56, r: 6, t: 8, b: 26 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const max = niceMax(Math.max(0, ...rows.map(r => r[key])))
  const n = rows.length
  const slot = iw / n
  const gap = 2
  const bw = Math.max(1, slot - gap)
  const y = v => pad.t + ih - (v / max) * ih
  const ticks = [0, max / 2, max]
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">`
  ticks.forEach(t => {
    svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`
    svg += `<text class="axis" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`
  })
  rows.forEach((r, i) => {
    const x = pad.l + i * slot + gap / 2
    const v = r[key]
    if (v > 0) {
      const top = y(v)
      const h = pad.t + ih - top
      const rad = Math.min(4, bw / 2, h)
      svg += `<path class="bar" data-i="${i}" d="M${x},${pad.t + ih} V${top + rad} Q${x},${top} ${x + rad},${top} H${x + bw - rad} Q${x + bw},${top} ${x + bw},${top + rad} V${pad.t + ih} Z"/>`
    }
    svg += `<rect class="hit" data-i="${i}" x="${pad.l + i * slot}" y="${pad.t}" width="${slot}" height="${ih}"/>`
  })
  const idx = [0, Math.floor((n - 1) / 2), n - 1]
  idx.forEach((i, k) => {
    const x = pad.l + i * slot + slot / 2
    svg += `<text class="axis" x="${x}" y="${H - 6}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${esc(shortDate(rows[i].date))}</text>`
  })
  svg += '</svg>'
  el.innerHTML = svg + (rows.every(r => !r[key]) ? '<div class="empty">No data yet</div>' : '')
  const tip = $('tip')
  el.querySelectorAll('.hit').forEach(h => {
    h.addEventListener('mousemove', e => {
      const i = Number(h.dataset.i)
      el.classList.add('dimmed')
      el.querySelectorAll('.bar').forEach(b => b.classList.toggle('hl', Number(b.dataset.i) === i))
      tip.innerHTML = `<b>${esc(fmt(rows[i][key]))}</b><span>${esc(new Date(rows[i].date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))}</span>`
      tip.classList.remove('hidden')
      const tw = tip.offsetWidth
      tip.style.left = Math.min(window.innerWidth - tw - 10, e.clientX + 14) + 'px'
      tip.style.top = (e.clientY - 46) + 'px'
    })
    h.addEventListener('mouseleave', () => {
      el.classList.remove('dimmed')
      el.querySelectorAll('.bar').forEach(b => b.classList.remove('hl'))
      tip.classList.add('hidden')
    })
  })
}

function table(el, rows, key, fmt) {
  el.innerHTML = `<table><thead><tr><th>Date</th><th>Value</th></tr></thead><tbody>${rows.slice().reverse().map(r => `<tr><td>${esc(r.date)}</td><td>${esc(fmt(r[key]))}</td></tr>`).join('')}</tbody></table>`
}

function barList(el, items, fmt = fmtNum) {
  if (!items.length) {
    el.innerHTML = '<div class="none">No data yet</div>'
    return
  }
  const max = Math.max(...items.map(i => i.count), 1)
  el.innerHTML = items.slice(0, 8).map(i => `<div class="brow"><span class="nm" title="${esc(i.name)}">${esc(i.name)}</span><span class="tr"><i data-w="${i.count / max * 100}"></i></span><span class="vl">${esc(fmt(i.count))}</span></div>`).join('')
  requestAnimationFrame(() => el.querySelectorAll('i[data-w]').forEach(b => { b.style.width = b.dataset.w + '%' }))
}

const PLATFORM = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' }
const LANG = { cs: 'Čeština', en: 'English', zh: '简体中文', hi: 'हिन्दी', es: 'Español', fr: 'Français', pt: 'Português', ru: 'Русский', ja: '日本語', de: 'Deutsch', id: 'Indonesia' }

let last = null

function render(d) {
  last = d
  const t = d.totals
  const sum = k => d.daily.reduce((a, r) => a + (Number(r[k]) || 0), 0)
  $('kUsers').textContent = fmtNum(t.users)
  $('kUsersSub').textContent = `+${fmtNum(sum('newUsers'))} in the last ${days} days`
  $('kBytes').textContent = fmtBytes(t.bytesDeleted)
  $('kBytesSub').textContent = `${fmtNum(t.filesDeleted)} items · ${fmtBytes(sum('bytes'))} in the last ${days} days`
  $('kA7').textContent = fmtNum(t.active7)
  $('kA30').textContent = fmtNum(t.active30)
  $('kScans').textContent = fmtNum(t.scans)
  $('kDeletes').textContent = fmtNum(t.deletes)
  $('kLaunches').textContent = fmtNum(t.launches)
  $('kDownloads').textContent = fmtNum(t.downloads)
  $('sumBytes').textContent = fmtBytes(sum('bytes'))
  $('sumNew').textContent = fmtNum(sum('newUsers'))
  $('sumActive').textContent = `peak ${fmtNum(Math.max(0, ...d.daily.map(r => r.activeUsers)))}`
  barChart($('chBytes'), d.daily, 'bytes', fmtBytes, 'Data deleted per day')
  barChart($('chNew'), d.daily, 'newUsers', fmtNum, 'New users per day')
  barChart($('chActive'), d.daily, 'activeUsers', fmtNum, 'Active users per day')
  table($('tbBytes'), d.daily, 'bytes', fmtBytes)
  table($('tbNew'), d.daily, 'newUsers', fmtNum)
  table($('tbActive'), d.daily, 'activeUsers', fmtNum)
  barList($('lsPlatforms'), d.platforms.map(p => ({ ...p, name: PLATFORM[p.name] || p.name })))
  barList($('lsLanguages'), d.languages.map(l => ({ ...l, name: LANG[l.name] || l.name })))
  barList($('lsVersions'), d.versions)
  barList($('lsTotals'), [{ name: 'Launches', count: t.launches }, { name: 'Scans', count: t.scans }, { name: 'Deletions', count: t.deletes }, { name: 'Downloads', count: t.downloads }])
  $('updated').textContent = 'Updated ' + new Date(d.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

async function load() {
  $('dash').classList.add('loading')
  try {
    const d = await call({ action: 'stats', token: token(), days })
    if (!d.ok) {
      if (d.error === 'unauthorized') return signOut()
      throw new Error(d.error)
    }
    render(d)
  } catch (e) {
    $('updated').textContent = 'Could not load data'
  } finally {
    $('dash').classList.remove('loading')
  }
}

function enter() {
  show('dash')
  load()
  clearInterval(timer)
  timer = setInterval(load, 60000)
}

function signOut() {
  const t = token()
  if (t) call({ action: 'logout', token: t }).catch(() => {})
  setToken(null)
  clearInterval(timer)
  $('password').value = ''
  $('loginMsg').textContent = ''
  show('login')
  $('username').focus()
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault()
  const btn = $('loginBtn')
  btn.disabled = true
  btn.innerHTML = '<span class="spinner"></span>'
  $('loginMsg').textContent = ''
  try {
    const r = await call({ action: 'login', user: $('username').value, password: $('password').value })
    if (r.ok) {
      setToken(r.token)
      enter()
    } else {
      const msgs = { invalid: 'Wrong username or password', locked: 'Too many attempts. Try again in 15 minutes.', not_configured: 'Admin password is not set on the server.' }
      $('loginMsg').textContent = msgs[r.error] || 'Sign in failed'
      $('loginForm').classList.remove('shake')
      void $('loginForm').offsetWidth
      $('loginForm').classList.add('shake')
    }
  } catch {
    $('loginMsg').textContent = 'Cannot reach the server'
  } finally {
    btn.disabled = false
    btn.textContent = 'Sign in'
  }
})

$('range').addEventListener('click', e => {
  const b = e.target.closest('button')
  if (!b) return
  days = Number(b.dataset.days)
  $('range').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))
  load()
})
$('refresh').addEventListener('click', load)
let resizeTimer = null
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { if (last && !$('dash').classList.contains('hidden')) render(last) }, 150)
})
$('logout').addEventListener('click', signOut)

if (!cfg.api) show('notice')
else if (token()) enter()
else show('login')

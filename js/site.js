const cfg = window.SIFTCLEAN || {}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const uaPlatform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent
const userPlatform = /win/i.test(uaPlatform) ? 'win' : 'mac'
const PLATFORM_NAME = { mac: 'Mac', win: 'Windows' }

function fmtBytes(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++ }
  return n.toLocaleString('en-US', { maximumFractionDigits: i ? 1 : 0 }) + ' ' + u[i]
}

function api(payload) {
  if (!cfg.api) return Promise.resolve(null)
  return fetch(cfg.api, { method: 'POST', body: JSON.stringify(payload) }).then(r => r.json()).catch(() => null)
}

function trackDownload(platform) {
  if (!cfg.api) return
  fetch(cfg.api, { method: 'POST', mode: 'no-cors', keepalive: true, body: JSON.stringify({ action: 'download', platform }) }).catch(() => {})
}

if (userPlatform === 'win') {
  const primary = document.querySelector('.primary-dl')
  if (primary) {
    primary.dataset.platform = 'win'
    primary.classList.add('win')
    primary.querySelector('.dl-label').textContent = 'Download for Windows'
  }
}

const STEPS = {
  mac: ['Open <b>SiftClean.dmg</b> from your Downloads.', 'Drag SiftClean into the Applications folder.', 'Open it and allow Full Disk Access when asked.'],
  win: ['Open <b>SiftClean.exe</b> from your Downloads.', 'If SmartScreen appears, choose More info → Run anyway.', 'Allow administrator access – SiftClean runs right away, nothing to install.']
}

const modal = document.createElement('div')
modal.className = 'dl-modal hidden'
modal.innerHTML = `
  <div class="dl-card" role="dialog" aria-modal="true" aria-labelledby="dlTitle">
    <div class="dl-icon">
      <svg viewBox="0 0 64 64" class="dl-ring"><circle cx="32" cy="32" r="28"/></svg>
      <svg viewBox="0 0 24 24" class="dl-arrow"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/></svg>
      <svg viewBox="0 0 24 24" class="dl-check"><path d="m6 12.5 4 4 8-9"/></svg>
      <span class="dl-tray"></span>
    </div>
    <h2 id="dlTitle">Downloading SiftClean</h2>
    <p class="dl-sub" id="dlSub"></p>
    <ol class="dl-steps" id="dlSteps"></ol>
    <div class="dl-actions">
      <a class="dl-retry" id="dlRetry" href="#">Download didn’t start? Try again</a>
      <button class="btn solid" id="dlClose">Done</button>
    </div>
  </div>`
document.body.appendChild(modal)

function openModal(platform, started) {
  modal.querySelector('.dl-card').className = 'dl-card'
  modal.querySelector('#dlTitle').textContent = started ? 'Downloading SiftClean' : 'Download coming soon'
  modal.querySelector('#dlSub').textContent = started ? `SiftClean for ${PLATFORM_NAME[platform]} is on its way.` : `The ${PLATFORM_NAME[platform]} download isn’t available yet.`
  modal.querySelector('#dlSteps').innerHTML = started ? STEPS[platform].map(s => `<li>${s}</li>`).join('') : ''
  modal.querySelector('#dlRetry').classList.toggle('hidden', !started)
  modal.querySelector('#dlRetry').dataset.platform = platform
  modal.classList.remove('hidden')
  void modal.offsetWidth
  modal.classList.add('open')
  if (started) setTimeout(() => modal.querySelector('.dl-card').classList.add('done'), reduceMotion ? 0 : 1900)
  else modal.querySelector('.dl-card').classList.add('idle')
  document.getElementById('dlClose').focus()
}

function closeModal() {
  modal.classList.remove('open')
  setTimeout(() => modal.classList.add('hidden'), 250)
}

function startDownload(platform) {
  const url = cfg.downloads && cfg.downloads[platform]
  if (url) {
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
    trackDownload(platform)
  }
  openModal(platform, !!url)
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.dl, .nav-dl, #dlRetry')
  if (!btn) return
  e.preventDefault()
  if (btn.id === 'dlRetry') {
    const url = cfg.downloads && cfg.downloads[btn.dataset.platform]
    if (url) window.location.href = url
    return
  }
  startDownload(btn.dataset.platform || userPlatform)
})
modal.addEventListener('click', e => { if (e.target === modal) closeModal() })
document.getElementById('dlClose').addEventListener('click', closeModal)
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal() })

document.querySelectorAll('[data-contact]').forEach(a => {
  a.textContent = cfg.contact || ''
  a.href = cfg.contact ? 'mailto:' + cfg.contact : '#'
})
document.querySelectorAll('[data-contact-line]').forEach(el => el.classList.toggle('hidden', !cfg.contact))

const logoAnim = document.querySelector('.logo-anim')
if (logoAnim) {
  const arc = (r, a0, a1) => {
    const p = a => [512 + r * Math.cos((a - 90) * Math.PI / 180), 512 + r * Math.sin((a - 90) * Math.PI / 180)]
    const [x0, y0] = p(a0), [x1, y1] = p(a1)
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  }
  const ring = (r, w, parts, gap) => {
    let a = 0
    return parts.map(([deg, color], i) => {
      const d = arc(r, a + gap / 2, a + deg - gap / 2)
      a += deg
      return `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" style="--i:${i}"/>`
    }).join('')
  }
  logoAnim.querySelector('.outer').innerHTML = ring(262, 64, [[150, '#ffffff'], [80, '#b4b4b8'], [50, '#6c6c70'], [80, '#2a2a2d']], 6)
  logoAnim.querySelector('.inner').innerHTML = ring(178, 48, [[110, '#ffffff'], [95, '#8e8e93'], [70, '#4a4a4e'], [85, '#2a2a2d']], 7)
}

const nav = document.getElementById('nav')
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  const sections = [...document.querySelectorAll('main section[id]')]
  const links = [...nav.querySelectorAll('.links a[href^="#"]')]
  if (sections.length && links.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return
        links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + en.target.id))
      })
    }, { rootMargin: '-45% 0px -50% 0px' })
    sections.forEach(s => spy.observe(s))
  }
}

document.querySelectorAll('.split').forEach(el => {
  const words = el.textContent.trim().split(/\s+/)
  el.setAttribute('aria-label', el.textContent.trim())
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--i:${i}"><span>${w}</span></span>`).join(' ')
})

if (reduceMotion) {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'))
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return
      en.target.classList.add('in')
      io.unobserve(en.target)
    })
  }, { threshold: .2, rootMargin: '0px 0px -60px 0px' })
  document.querySelectorAll('.reveal').forEach(el => {
    const group = el.parentElement.closest('.facts, .bento, .plans')
    if (group) el.style.transitionDelay = ([...group.children].indexOf(el) * 90) + 'ms'
    io.observe(el)
  })
}

api({ action: 'public' }).then(r => {
  if (!r || !r.ok || !r.users) return
  const el = document.getElementById('publicStats')
  if (!el) return
  el.innerHTML = `<span><b>${r.users.toLocaleString('en-US')}</b>people use SiftClean</span><span><b>${fmtBytes(r.bytesDeleted)}</b>freed so far</span>`
  el.classList.remove('hidden')
})

const bill = document.getElementById('bill')
if (bill) {
  let mode = 'monthly'
  const euro = v => '€' + v.toFixed(2)
  const tween = (el, from, to) => {
    if (reduceMotion) return el.textContent = euro(to)
    const start = performance.now()
    const step = now => {
      const k = Math.min(1, (now - start) / 600)
      el.textContent = euro(from + (to - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  const apply = prev => {
    bill.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.bill === mode))
    document.querySelectorAll('.plan-price b[data-monthly]').forEach(b => {
      const to = Number(b.dataset[mode])
      prev ? tween(b, Number(b.dataset[prev]), to) : b.textContent = euro(to)
      b.nextElementSibling.textContent = mode === 'monthly' ? '/ month' : 'one-time'
    })
    document.querySelectorAll('.buy').forEach(a => {
      const url = (cfg.buy || {})[a.dataset.plan + (mode === 'monthly' ? 'Monthly' : 'Lifetime')]
      a.classList.toggle('soon', !url)
      a.href = url || '#'
      a.textContent = url ? 'Get ' + a.dataset.plan.toUpperCase() : 'Coming soon'
    })
  }
  bill.addEventListener('click', e => {
    const b = e.target.closest('button')
    if (!b || b.dataset.bill === mode) return
    const prev = mode
    mode = b.dataset.bill
    apply(prev)
  })
  document.addEventListener('click', async e => {
    const a = e.target.closest('.buy')
    if (!a) return
    e.preventDefault()
    if (a.classList.contains('soon') || a.classList.contains('busy')) return
    const fallback = a.href
    a.classList.add('busy')
    a.textContent = 'Opening checkout…'
    const r = await api({ action: 'checkout', plan: a.dataset.plan, billing: mode })
    window.location.href = r && r.ok ? r.url : fallback
    setTimeout(() => apply(), 4000)
    a.classList.remove('busy')
  })
  apply()
}

const claimEl = document.getElementById('claim')
if (claimEl) {
  const q = new URLSearchParams(location.search)
  const token = q.get('t') || ''
  const payment = q.get('payment_id') || q.get('receipt_id') || ''
  const req = /^pay_[A-Za-z0-9]{6,40}$/.test(payment) ? { action: 'claim', payment } : /^[a-f0-9]{40}$/.test(token) ? { action: 'claim', token } : null
  const box = document.getElementById('keyBox')
  const fail = () => {
    box.classList.add('failed')
    document.getElementById('thSub').textContent = 'Your payment went through.'
    document.getElementById('keyFallback').classList.remove('hidden')
  }
  const show = r => {
    box.classList.add('ready')
    document.getElementById('keyText').textContent = r.license
    document.getElementById('keyCopy').classList.remove('hidden')
    const open = document.getElementById('keyOpen')
    open.href = 'siftclean://activate?key=' + encodeURIComponent(r.license)
    open.classList.remove('hidden')
    document.getElementById('thSub').textContent = (r.plan ? 'SiftClean ' + r.plan.toUpperCase() : 'Your plan') + ' is ready. Activate it with the key below.'
  }
  document.getElementById('keyCopy').addEventListener('click', async e => {
    const btn = e.currentTarget
    try { await navigator.clipboard.writeText(document.getElementById('keyText').textContent) } catch {
      const r = document.createRange()
      r.selectNodeContents(document.getElementById('keyText'))
      getSelection().removeAllRanges()
      getSelection().addRange(r)
      document.execCommand('copy')
    }
    btn.classList.add('done')
    btn.querySelector('span').textContent = 'Copied'
    setTimeout(() => { btn.classList.remove('done'); btn.querySelector('span').textContent = 'Copy' }, 2000)
  })
  const saved = req ? (() => { try { return JSON.parse(sessionStorage.getItem('sc_claim_' + (payment || token)) || 'null') } catch { return null } })() : null
  if (!req) fail()
  else if (saved) show(saved)
  else {
    let tries = 0
    const poll = async () => {
      const r = await api(req)
      if (r && r.ok) {
        try { sessionStorage.setItem('sc_claim_' + (payment || token), JSON.stringify({ license: r.license, plan: r.plan })) } catch {}
        return show(r)
      }
      if (r && r.error !== 'pending') return fail()
      if (++tries > 40) return fail()
      setTimeout(poll, 3000)
    }
    poll()
  }
}

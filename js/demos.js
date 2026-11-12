;(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const onSee = (el, fn) => {
    if (!el) return
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); fn() } }), { threshold: .25 })
    io.observe(el)
  }
  const count = (el, from, to, ms, fmt) => new Promise(resolve => {
    const start = performance.now()
    const step = now => {
      const k = Math.min(1, (now - start) / ms)
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)))
      k < 1 ? requestAnimationFrame(step) : resolve()
    }
    requestAnimationFrame(step)
  })
  const gb = v => v.toFixed(2) + ' GB'
  const I = {
    back: '<svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5"/></svg>',
    tw: '<svg viewBox="0 0 16 16" class="tw"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>',
    dir: '<svg viewBox="0 0 16 16" class="ico"><path d="M1.75 4.25c0-.83.67-1.5 1.5-1.5h2.9l1.4 1.4h5.2c.83 0 1.5.67 1.5 1.5v6.6c0 .83-.67 1.5-1.5 1.5H3.25c-.83 0-1.5-.67-1.5-1.5z"/></svg>',
    file: '<svg viewBox="0 0 16 16" class="ico file"><path d="M4 1.75h5l3 3v9.5H4z"/><path d="M9 1.75v3h3"/></svg>',
    trash: '<svg viewBox="0 0 16 16"><path d="M2.5 4.5h11M6.25 4.5V3.1c0-.47.38-.85.85-.85h1.8c.47 0 .85.38.85.85v1.4M4 4.5l.6 8.4c.05.7.63 1.35 1.33 1.35h4.14c.7 0 1.28-.65 1.33-1.35L12 4.5"/></svg>',
    ok: '<svg viewBox="0 0 16 16"><path d="m3.5 8.5 3 3 6-7"/></svg>'
  }
  const fit = (win, w, h) => {
    const box = win.parentElement
    win.style.width = w + 'px'
    win.style.height = h + 'px'
    const apply = () => {
      const k = box.clientWidth / w
      win.style.transform = `scale(${k})`
      box.style.height = h * k + 'px'
    }
    new ResizeObserver(apply).observe(box)
    apply()
  }
  const smart = document.getElementById('smartDemo')
  if (smart) {
    const cats = [
      ['App caches', 'Temporary data apps store in their cache folder. Apps will recreate it.', 13, 3.42, [['com.apple.helpd', '~/Library/Caches/com.apple.helpd', '1.21 GB'], ['Google', '~/Library/Caches/Google', '930.4 MB'], ['com.spotify.client', '~/Library/Caches/com.spotify.client', '712.6 MB']]],
      ['Developer caches', 'npm, Gradle, Cargo, pnpm, ~/.cache and more.', 9, 2.61],
      ['Browser & app caches', 'Cache, GPU cache and code cache of browsers and other apps.', 6, 2.18],
      ['Logs & crash reports', 'App logs, crash dumps and diagnostic reports.', 27, 0.41]
    ]
    const total = cats.reduce((a, c) => a + c[3], 0)
    smart.innerHTML = `
      <div class="aw-list">
        <div class="aw-empty" id="smRun"><div class="aw-spin"></div><div>Looking for unneeded files…</div><div class="hint" id="smCheck"></div><div class="aw-hair"><i id="smHair"></i></div></div>
        <div id="smRes" class="hidden">
          <div class="aw-banner"><span class="big-n" id="smBig">0 GB</span><div class="txt">can be freed<br><b>${gb(total)}</b> selected · found in ${cats.length} categories</div></div>
          ${cats.map(([t, d, n, s, items]) => `
            <div class="aw-scat">
              <div class="aw-shead"><span class="aw-cb on"></span><div><div class="aw-stitle">${I.tw}${t}</div><div class="aw-sdesc">${d}</div></div><span class="aw-scount">${n} items</span><span class="aw-ssize">${gb(s)}</span></div>
              ${items ? `<div class="aw-sitems">${items.map(([nm, p, sz]) => `<div class="aw-sitem"><span class="aw-cb on"></span>${I.dir}<div class="nb"><div>${nm}</div><div class="sub">${p}</div></div><span class="sz">${sz}</span><span class="tr">${I.trash}</span></div>`).join('')}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>
      <div class="aw-dock" id="smDock"><span class="info"><b>55</b> items selected · <b>${gb(total)}</b></span><span class="aw-btn plain">Cancel</span><span class="aw-btn danger" id="smDel">Delete Permanently</span></div>
      <div class="aw-toast" id="smToast"><span class="ti">${I.ok}</span><div><b>Deleted 55 items</b><span>Freed ${gb(total)}</span></div><i class="tbar"></i></div>`
    fit(smart, 760, 480)
    const $ = id => smart.querySelector('#' + id)
    const scats = [...smart.querySelectorAll('.aw-scat')]
    const reset = () => {
      $('smRun').classList.remove('hidden')
      $('smRes').classList.add('hidden')
      $('smDock').classList.remove('show')
      $('smToast').classList.remove('show')
      $('smHair').style.width = '0%'
      scats.forEach(c => c.classList.remove('shown', 'open', 'gone'))
    }
    const final = () => {
      $('smRun').classList.add('hidden')
      $('smRes').classList.remove('hidden')
      scats.forEach(c => c.classList.add('shown'))
      scats[0].classList.add('open')
      $('smBig').textContent = gb(total)
    }
    const loop = async () => {
      while (true) {
        reset()
        for (let i = 0; i < cats.length; i++) {
          $('smCheck').textContent = 'Checking: ' + cats[i][0]
          $('smHair').style.width = ((i + 1) / cats.length * 100) + '%'
          await wait(550)
        }
        await wait(250)
        $('smRun').classList.add('hidden')
        $('smRes').classList.remove('hidden')
        count($('smBig'), 0, total, 900, gb)
        for (const c of scats) { c.classList.add('shown'); await wait(110) }
        await wait(700)
        scats[0].classList.add('open')
        await wait(900)
        $('smDock').classList.add('show')
        await wait(1500)
        $('smDel').classList.add('press')
        await wait(160)
        $('smDel').classList.remove('press')
        $('smDock').classList.remove('show')
        for (const c of scats) { c.classList.add('gone'); await wait(150) }
        count($('smBig'), total, 0, 900, gb)
        await wait(500)
        $('smToast').classList.add('show')
        await wait(3200)
      }
    }
    if (reduce) final()
    else onSee(smart, loop)
  }
  const size = v => v >= 1 ? (v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' GB' : (v * 1000).toFixed(1) + ' MB'
  const ex = document.getElementById('exDemo')
  if (ex) {
    const root = [['Users', 77.6, 'this minute'], ['Applications', 46.6, '10 hours ago'], ['Library', 22, '1 minute ago'], ['System', 19.6, '1 minute ago'], ['private', 13.1, 'this minute'], ['opt', 5.42, '20 hours ago'], ['usr', .99, '3 weeks ago']]
    const home = [['Library', 31.2, '2 minutes ago'], ['Developer', 18.4, 'yesterday'], ['Movies', 12.9, '8 months ago', 1], ['Downloads', 7.31, 'today'], ['Pictures', 4.82, '1 week ago'], ['Documents', 2.14, 'today'], ['Music', .86, '2 years ago', 1]]
    ex.innerHTML = `
      <div class="aw-tool"><span class="aw-nav">${I.back}</span><span class="aw-crumbs" id="exCrumbs"><b>Macintosh HD</b></span><span class="aw-meta" id="exMeta"></span></div>
      <div class="aw-thead ex"><span>Name</span><span></span><span class="r">Modified</span><span class="r act">Size ↓</span></div>
      <div class="aw-list" id="exList"></div>
      <span class="aw-cursor" id="exCursor"></span>`
    fit(ex, 760, 420)
    const list = ex.querySelector('#exList')
    const crumbs = ex.querySelector('#exCrumbs')
    const meta = ex.querySelector('#exMeta')
    const render = (rows, max) => {
      list.innerHTML = rows.map(([n, s, m, stale], i) => `<div class="aw-row ex" style="--n:${i}"><span class="nm">${I.dir}${n}</span><span class="rbar"><i style="width:${s / max * 100}%"></i></span><span class="mod${stale ? ' stale' : ''}">${m}</span><span class="sz">${size(s)}</span></div>`).join('')
      void list.offsetWidth
      list.classList.add('in')
    }
    const skel = () => {
      list.classList.remove('in')
      list.innerHTML = Array.from({ length: 7 }, (_, i) => `<div class="aw-row ex skel"><span class="sk" style="width:${120 + (i * 37) % 90}px"></span><span class="sk" style="width:${90 - (i * 13) % 60}%;height:4px"></span><span></span><span class="sk r" style="width:56px"></span></div>`).join('')
    }
    const loop = async () => {
      while (true) {
        crumbs.innerHTML = '<b>Macintosh HD</b>'
        meta.innerHTML = '<b>185.4 GB</b> · 1,498,810 items'
        skel()
        await wait(900)
        render(root, 77.6)
        await wait(1800)
        const users = list.firstElementChild
        const cur = ex.querySelector('#exCursor')
        cur.style.transition = 'none'
        cur.style.left = '600px'
        cur.style.top = '380px'
        void cur.offsetWidth
        cur.style.transition = ''
        cur.classList.add('on')
        await wait(150)
        cur.style.left = '120px'
        cur.style.top = (users.offsetTop + list.offsetTop + 23) + 'px'
        await wait(800)
        users.classList.add('hl')
        await wait(350)
        cur.classList.add('press')
        users.classList.add('press')
        await wait(180)
        cur.classList.remove('press')
        await wait(120)
        cur.classList.remove('on')
        list.classList.add('leave')
        await wait(260)
        list.classList.remove('leave', 'in')
        crumbs.innerHTML = '<a>Macintosh HD</a><i>›</i><a>Users</a><i>›</i><b>you</b>'
        meta.innerHTML = '<b>77.6 GB</b> · 384,741 items'
        render(home, 31.2)
        await wait(4200)
        list.classList.add('leave')
        await wait(300)
        list.classList.remove('leave')
      }
    }
    if (reduce) render(root, 77.6)
    else onSee(ex, loop)
  }
  const del = document.getElementById('delDemo')
  if (del) {
    const rows = [['Xcode_16.2.xip', 7.31, '5 months ago', 1, 0], ['Screen Recordings', 6.84, '3 months ago', 1, 1], ['Old iPhone backup', 4.45, '1 year ago', 1, 1], ['Photos Export', 2.62, 'last week', 0, 1], ['Invoices', .41, 'yesterday', 0, 1], ['setup-notes.pdf', .02, 'today', 0, 0]]
    const pick = rows.filter(r => r[3])
    const sum = pick.reduce((a, r) => a + r[1], 0)
    del.innerHTML = `
      <div class="aw-tool"><span class="aw-nav">${I.back}</span><span class="aw-crumbs"><a>Macintosh HD</a><i>›</i><a>you</a><i>›</i><b>Downloads</b></span><span class="aw-meta"><b>21.65 GB</b> · 6 items</span></div>
      <div class="aw-thead del"><span class="aw-cb"></span><span>Name</span><span class="r">Modified</span><span class="r act">Size ↓</span></div>
      <div class="aw-list" id="dlList">${rows.map(([n, s, m, on, dir], i) => `<div class="aw-row del" data-on="${on}" style="--n:${i}"><span class="aw-cb"></span><span class="nm">${dir ? I.dir : I.file}${n}</span><span class="mod">${m}</span><span class="sz">${size(s)}</span></div>`).join('')}</div>
      <div class="aw-dock" id="dlDock"><span class="info"><b id="dlN">0</b> items selected · <b id="dlSize">0 GB</b></span><span class="aw-btn plain">Cancel</span><span class="aw-btn solid" id="dlBtn">Move to Trash</span></div>
      <div class="aw-overlay" id="dlConfirm">
        <div class="aw-sheet">
          <div class="cf-icon">${I.trash}</div>
          <div class="cf-title">Move ${pick.length} items (${size(sum)}) to the Trash?</div>
          <div class="cf-sub">You can restore the items from the Trash.</div>
          <div class="cf-list">${pick.map(([n, s, , , dir]) => `<div class="cf-row">${dir ? I.dir : I.file}<div class="cf-name"><b>${n}</b><span>~/Downloads/${n}</span></div><span class="cf-size">${size(s)}</span></div>`).join('')}</div>
          <div class="cf-actions"><span class="aw-btn plain">Cancel</span><span class="aw-btn solid" id="dlOk">Move to Trash</span></div>
        </div>
      </div>
      <div class="aw-toast" id="dlToast"><span class="ti">${I.ok}</span><div><b>Moved ${pick.length} items to the Trash</b><span>Freed ${size(sum)}</span></div><i class="tbar"></i></div>`
    fit(del, 760, 420)
    const $ = id => del.querySelector('#' + id)
    const items = [...del.querySelectorAll('.aw-row')]
    const reset = () => {
      items.forEach(r => { r.classList.remove('sel', 'gone'); r.querySelector('.aw-cb').classList.remove('on') })
      $('dlDock').classList.remove('show')
      $('dlConfirm').classList.remove('show')
      $('dlToast').classList.remove('show')
    }
    const loop = async () => {
      while (true) {
        reset()
        await wait(1000)
        let n = 0, s = 0
        for (const r of items.filter(r => r.dataset.on === '1')) {
          r.classList.add('sel')
          r.querySelector('.aw-cb').classList.add('on')
          n++
          s += rows[items.indexOf(r)][1]
          $('dlN').textContent = n
          $('dlSize').textContent = size(s)
          $('dlDock').classList.add('show')
          await wait(550)
        }
        await wait(900)
        $('dlBtn').classList.add('press')
        await wait(160)
        $('dlBtn').classList.remove('press')
        $('dlConfirm').classList.add('show')
        await wait(2000)
        $('dlOk').classList.add('press')
        await wait(160)
        $('dlOk').classList.remove('press')
        $('dlConfirm').classList.remove('show')
        $('dlDock').classList.remove('show')
        await wait(250)
        for (const r of items.filter(r => r.dataset.on === '1')) { r.classList.add('gone'); await wait(140) }
        await wait(400)
        $('dlToast').classList.add('show')
        await wait(3400)
      }
    }
    if (reduce) {
      items.forEach(r => { if (r.dataset.on === '1') { r.classList.add('sel'); r.querySelector('.aw-cb').classList.add('on') } })
      $('dlConfirm').classList.add('show')
    } else onSee(del, loop)
  }
  const speed = document.getElementById('speedTile')
  if (speed) {
    const cores = speed.querySelector('.cores')
    cores.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--n:${(i * 7) % 12}"></i>`).join('')
    onSee(speed, () => {
      speed.classList.add('play')
      const el = document.getElementById('fileCount')
      const fmt = v => Math.round(v).toLocaleString('en-US')
      reduce ? el.textContent = fmt(1155750) : count(el, 0, 1155750, 2600, fmt)
    })
  }
  const langs = document.querySelectorAll('#langList li')
  if (langs.length && !reduce) {
    let i = 0
    setInterval(() => {
      langs.forEach(l => l.classList.remove('on'))
      langs[i++ % langs.length].classList.add('on')
    }, 900)
  }
  document.querySelectorAll('.checks span').forEach((s, i) => s.style.setProperty('--n', i))
})()

// ==UserScript==
// @name         Theme Studio - Glass, Clean, Speed, Colours
// @namespace    https://github.com/local/theme-studio
// @version      2.0.0
// @description  Restyle every website with liquid glass, clean mode, speed mode and theme colours from a floating panel. Settings persist globally or per site.
// @author       You
// @match        *://*/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// ==/UserScript==
(function () {
  'use strict';

  /* ===================== 1. CONSTANTS AND DEFAULTS ===================== */
  if (!/html/i.test(document.contentType || 'text/html')) return;
  var HOST = location.hostname;
  var K = {
    global: 'uts2_global', site: 'uts2_site:' + HOST, scope: 'uts2_scope:' + HOST,
    sites: 'uts2_sites', presets: 'uts2_presets', ui: 'uts2_ui',
    off: 'uts2_off:' + HOST, cleanOff: 'uts2_cleanoff:' + HOST
  };
  var DEFAULTS = {
    colors: { on: false, mode: 'auto', accent: '#5b8cff', bg: '#14151c', text: '#e6e8ef', link: '#8fb0ff', deep: true },
    glass: { on: false, mode: 'liquid', blur: 16, opacity: 0.45, saturate: 160, radius: 14, glow: 8, aurora: false, borderW: 1, borderAlpha: 0.2, shine: 0.4, shadow: 0.18 },
    clean: { on: false, cookies: true, popups: true, sticky: true, ads: true, typo: false, font: 'default', size: 16, lineHeight: 1.6, width: 0 },
    speed: { on: false, noAnim: true, lazyImg: true, lazyIframe: true, pauseVideo: true, reduceFx: false }
  };
  var BUILTIN = [
    { name: 'Midnight', bg: '#0b1020', text: '#dfe6ff', accent: '#5b8cff', link: '#8fb0ff' },
    { name: 'Ocean', bg: '#06232b', text: '#d9f3f7', accent: '#14b8d4', link: '#6fdcec' },
    { name: 'Rose', bg: '#2a0f1a', text: '#ffe4ec', accent: '#ff5c8a', link: '#ff9db9' },
    { name: 'Forest', bg: '#0e1f14', text: '#e2f3e5', accent: '#3ecf6e', link: '#86e3a6' },
    { name: 'Neon', bg: '#0a0a12', text: '#f0f0ff', accent: '#ff2bd6', link: '#20f0ff' },
    { name: 'Mono', bg: '#121212', text: '#eaeaea', accent: '#ffffff', link: '#bdbdbd' },
    { name: 'Sunset', bg: '#2b1320', text: '#ffeede', accent: '#ff7a3d', link: '#ffb36b' },
    { name: 'Paper', bg: '#f6f1e7', text: '#2b2a26', accent: '#b5542c', link: '#8a3d1c' }
  ];
  /* Glass look presets: values copied into the sliders when a mode is chosen */
  var MODES = {
    liquid: ['Liquid', { blur: 16, opacity: 0.45, saturate: 160, radius: 14, glow: 8, borderW: 1, borderAlpha: 0.2, shine: 0.4, shadow: 0.18 }],
    glossy: ['Glossy', { blur: 12, opacity: 0.4, saturate: 180, radius: 16, glow: 0, borderW: 1, borderAlpha: 0.35, shine: 0.9, shadow: 0.3 }],
    frosted: ['Frosted', { blur: 26, opacity: 0.35, saturate: 130, radius: 14, glow: 0, borderW: 1, borderAlpha: 0.15, shine: 0.15, shadow: 0.12 }],
    crystal: ['Crystal', { blur: 6, opacity: 0.12, saturate: 200, radius: 12, glow: 6, borderW: 1, borderAlpha: 0.45, shine: 0.6, shadow: 0.1 }],
    matte: ['Matte', { blur: 0, opacity: 0.85, saturate: 100, radius: 10, glow: 0, borderW: 1, borderAlpha: 0.08, shine: 0, shadow: 0.2 }],
    clean: ['Clean', { blur: 0, opacity: 0.95, saturate: 100, radius: 8, glow: 0, borderW: 1, borderAlpha: 0.12, shine: 0, shadow: 0 }]
  };
  var FONTS = {
    'default': ['Site default', ''],
    system: ['System UI', 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'],
    serif: ['Serif', 'Georgia,"Times New Roman",serif'],
    mono: ['Monospace', 'ui-monospace,Menlo,Consolas,monospace'],
    humanist: ['Humanist', '"Segoe UI",Candara,"Trebuchet MS",sans-serif'],
    rounded: ['Rounded', 'ui-rounded,"SF Pro Rounded",Nunito,system-ui,sans-serif']
  };
  /* Elements never recoloured or glassed (media, maps, players, our own UI) */
  var EX = 'video,canvas,img,picture,svg,iframe,object,embed,audio,#uts-host,[class*="mapbox" i],[class*="leaflet" i],[class*="maplibre" i],[class*="gm-style" i],[class*="player" i],[class*="video" i]';
  var NOT = ':where(:not(' + EX + '))';
  var SEL_COOKIE = '#onetrust-consent-sdk,#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,.cc-window,.cc-banner,#truste-consent-track,.fc-consent-root,[id*="cookie-banner" i],[class*="cookie-banner" i],[id*="cookie-consent" i],[class*="cookie-consent" i],[class*="cookie-notice" i],[id*="cookie-notice" i]';
  var SEL_POPUP = '[class*="newsletter-popup" i],[class*="email-popup" i],[class*="subscribe-popup" i],[id*="newsletter-modal" i],[class*="exit-intent" i],[class*="push-prompt" i]';
  var SEL_STICKY = '[class*="sticky-promo" i],[class*="promo-bar" i],[class*="sticky-banner" i],[id*="promo-banner" i],[class*="app-banner" i],[class*="smart-banner" i]';
  var SEL_ADS = 'ins.adsbygoogle,[id^="google_ads_" i],[id^="div-gpt-ad" i],[class~="adsbygoogle"],[class*="ad-container" i],[class*="ad-slot" i],[data-ad-slot],[aria-label="Advertisement" i],iframe[src*="doubleclick.net"],iframe[src*="googlesyndication"]';

  /* ===================== 2. UTILITIES ===================== */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function merge(base, over) {
    var out = clone(base);
    if (!isObj(over)) return out;
    Object.keys(out).forEach(function (k) {
      if (isObj(out[k])) out[k] = merge(out[k], over[k]);
      else if (over[k] !== undefined && typeof over[k] === typeof out[k]) out[k] = over[k];
    });
    return out;
  }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) {
    var ks = p.split('.'), last = ks.pop();
    var t = ks.reduce(function (a, k) { return a[k]; }, o);
    t[last] = v;
  }
  function num(v, min, max, def) { v = parseFloat(v); return isNaN(v) ? def : Math.min(max, Math.max(min, v)); }
  function col(v, def) { return /^#[0-9a-f]{6}$/i.test(v) ? v : def; }
  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }
  function isDarkHex(hex) {
    var p = rgb(hex).split(',').map(Number);
    return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) < 140;
  }
  function prefersDark() { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function debounce(fn, ms) {
    var t = 0;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function gv(k, d) { try { var v = GM_getValue(k); return v === undefined ? d : v; } catch (e) { return d; } }
  function sv(k, v) { try { GM_setValue(k, v); } catch (e) { /* ignore */ } }

  /* ===================== 3. SETTINGS STATE AND PERSISTENCE ===================== */
  var cfg, scope, presets, ui, offSite, cleanOff;
  function loadAll() {
    scope = gv(K.scope, 'global') === 'site' ? 'site' : 'global';
    cfg = merge(DEFAULTS, scope === 'site' ? gv(K.site, null) : gv(K.global, null));
    presets = (gv(K.presets, []) || []).filter(validPreset);
    ui = Object.assign({ btn: true, x: null, y: null, tab: 'glass' }, gv(K.ui, {}));
    offSite = !!gv(K.off, false);
    cleanOff = !!gv(K.cleanOff, false);
  }
  function validPreset(p) { return p && typeof p.name === 'string' && isObj(p.colors); }
  function siteIndex(add, host) {
    var idx = gv(K.sites, []);
    if (!Array.isArray(idx)) idx = [];
    var i = idx.indexOf(host);
    if (add && i < 0) idx.push(host);
    if (!add && i >= 0) idx.splice(i, 1);
    sv(K.sites, idx);
  }
  function persist() {
    if (scope === 'site') { sv(K.site, cfg); siteIndex(true, HOST); } else sv(K.global, cfg);
  }
  function setScope(s) {
    if (s === 'site' && gv(K.site, null) == null) { sv(K.site, clone(cfg)); siteIndex(true, HOST); }
    sv(K.scope, s);
    loadAll(); apply(); render();
  }
  function resetSite() {
    try { GM_deleteValue(K.site); GM_deleteValue(K.scope); } catch (e) { /* ignore */ }
    siteIndex(false, HOST);
    loadAll(); apply(); render(); status('This site reset to global settings');
  }
  function resetGlobal() {
    sv(K.global, clone(DEFAULTS));
    loadAll(); apply(); render(); status('Global settings reset');
  }
  function exportAll() {
    var sites = {};
    (gv(K.sites, []) || []).forEach(function (h) { var s = gv('uts2_site:' + h, null); if (s) sites[h] = s; });
    return JSON.stringify({ v: 2, global: gv(K.global, clone(DEFAULTS)), sites: sites, presets: gv(K.presets, []) }, null, 2);
  }
  function importAll(txt) {
    var d;
    try { d = JSON.parse(txt); } catch (e) { return 'Invalid JSON'; }
    if (!isObj(d)) return 'Invalid data';
    if (isObj(d.global)) sv(K.global, merge(DEFAULTS, d.global));
    if (isObj(d.sites)) {
      Object.keys(d.sites).forEach(function (h) {
        if (!isObj(d.sites[h]) || !/^[\w.\-]+$/.test(h)) return;
        sv('uts2_site:' + h, merge(DEFAULTS, d.sites[h]));
        sv('uts2_scope:' + h, 'site');
        siteIndex(true, h);
      });
    }
    if (Array.isArray(d.presets)) sv(K.presets, d.presets.filter(validPreset));
    loadAll(); apply(); render();
    return 'Import complete';
  }
  function set(path, v) {
    setPath(cfg, path, v);
    if (/^colors\.(bg|text|link)$/.test(path) && cfg.colors.mode !== 'custom') {
      cfg.colors.mode = 'custom';
      if (refs.mode) refs.mode.value = 'custom';
    }
    persist(); schedApply();
  }

  /* ===================== 4. CSS GENERATION ===================== */
  function palette() {
    var c = cfg.colors, accent = col(c.accent, '#5b8cff');
    if (c.mode === 'custom') {
      var bg = col(c.bg, '#14151c');
      return { bg: bg, text: col(c.text, '#e6e8ef'), link: col(c.link, '#8fb0ff'), accent: accent, dark: isDarkHex(bg) };
    }
    var dark = c.mode === 'dark' || (c.mode === 'auto' && prefersDark());
    return dark
      ? { bg: '#14151c', text: '#e6e8ef', link: '#8fb0ff', accent: accent, dark: true }
      : { bg: '#fafafa', text: '#1b1d23', link: '#1a56c4', accent: accent, dark: false };
  }

  function buildCss() {
    if (offSite) return '';
    var o = [], P = palette();

    /* --- Theme colours --- */
    if (cfg.colors.on) {
      o.push(':root{--uts-bg:' + P.bg + ';--uts-text:' + P.text + ';--uts-link:' + P.link + ';--uts-accent:' + P.accent + ';color-scheme:' + (P.dark ? 'dark' : 'light') + ';accent-color:' + P.accent + '}');
      o.push('html,body{background-color:var(--uts-bg)!important;color:var(--uts-text)!important}');
      if (cfg.colors.deep) {
        o.push(':where(div,section,main,article,aside,header,footer,nav,ul,ol,li,dl,dt,dd,p,span,h1,h2,h3,h4,h5,h6,table,thead,tbody,tfoot,tr,td,th,form,fieldset,label,blockquote,figure,figcaption,details,summary,pre,code)' +
          ':where(:not(' + EX + ')){background-color:transparent!important;color:var(--uts-text)!important;border-color:color-mix(in srgb,var(--uts-text) 22%,transparent)!important}');
      }
      o.push('a:where(:not(#uts-host)),a:where(:not(#uts-host)):visited{color:var(--uts-link)!important}');
      o.push('::selection{background:var(--uts-accent);color:#fff}');
      o.push(':where(input:not([type=checkbox],[type=radio],[type=range],[type=color],[type=file]),textarea,select){background-color:color-mix(in srgb,var(--uts-bg) 85%,var(--uts-text) 15%)!important;color:var(--uts-text)!important;border-color:color-mix(in srgb,var(--uts-text) 28%,transparent)!important}');
      o.push(':where(button,[type=submit],[type=button]){border-color:var(--uts-accent)!important}');
      o.push(':focus-visible{outline:2px solid var(--uts-accent)!important;outline-offset:2px}');
    }

    /* --- Liquid glass --- */
    if (cfg.glass.on) {
      var g = cfg.glass;
      var blur = num(g.blur, 0, 50, 16), op = num(g.opacity, 0, 1, 0.45), sat = num(g.saturate, 100, 300, 160);
      var rad = num(g.radius, 0, 40, 14), glow = num(g.glow, 0, 40, 8);
      var bw = num(g.borderW, 0, 4, 1), ba = num(g.borderAlpha, 0, 1, 0.2), shine = num(g.shine, 0, 1, 0.4), shd = num(g.shadow, 0, 1, 0.18);
      var dark = cfg.colors.on ? P.dark : prefersDark();
      var tint = cfg.colors.on ? rgb(P.bg) : (dark ? '22,24,34' : '255,255,255');
      var acc = rgb(P.accent);
      /* Only semantic containers and exact class tokens; only the OUTERMOST match is styled
         so nested cards never get doubled borders or corners. */
      var LIST = 'dialog,[role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=tooltip],[role=banner],[role=navigation],body>header,body>nav,body>footer,aside,[class~=modal],[class~=dropdown],[class~=popover],[class~=card],[class~=sidebar],[class~=toolbar],[class~=panel]';
      var SEL = ':is(' + LIST + ')' + NOT + ':not(:is(' + LIST + ') *)';
      var bf = blur > 0 ? 'blur(' + blur + 'px) saturate(' + sat + '%)' : 'none';
      var shadows = [];
      if (bw > 0) shadows.push('inset 0 0 0 ' + bw + 'px rgba(255,255,255,' + ba + ')');
      if (shine > 0) shadows.push('inset 0 1px 0 rgba(255,255,255,' + (shine * 0.8).toFixed(2) + ')', 'inset 0 -1px 0 rgba(255,255,255,' + (shine * 0.2).toFixed(2) + ')');
      if (shd > 0) shadows.push('0 8px 32px rgba(0,0,0,' + shd + ')');
      if (glow) shadows.push('0 0 ' + glow + 'px rgba(' + acc + ',0.45)');
      o.push(SEL + '{background-color:rgba(' + tint + ',' + op + ')!important;-webkit-backdrop-filter:' + bf + '!important;backdrop-filter:' + bf + '!important;' +
        'border-radius:' + rad + 'px!important;box-shadow:' + (shadows.join(',') || 'none') + '!important}');
      /* Descendants inside a glass container: no extra borders/shadows/corners from us */
      o.push(':is(input:not([type=checkbox],[type=radio],[type=range],[type=color],[type=file]),textarea,select){background-color:rgba(' + tint + ',' + Math.min(1, op * 0.7 + 0.1).toFixed(2) + ')!important;border-radius:' + Math.min(rad, 10) + 'px!important}');
      if (g.aurora) {
        o.push('html{background-color:' + P.bg + '!important;background-image:radial-gradient(circle at 15% 10%,rgba(' + acc + ',0.35),transparent 45%),radial-gradient(circle at 85% 85%,rgba(' + acc + ',0.25),transparent 50%)!important;background-attachment:fixed!important}body{background-color:transparent!important}');
      }
    }

    /* --- Clean mode --- */
    if (cfg.clean.on && !cleanOff) {
      var c = cfg.clean, hide = [];
      if (c.cookies) hide.push(SEL_COOKIE);
      if (c.popups) hide.push(SEL_POPUP);
      if (c.sticky) hide.push(SEL_STICKY);
      if (c.ads) hide.push(SEL_ADS);
      if (hide.length) o.push(hide.join(',') + '{display:none!important}');
      if (c.typo) {
        var stack = (FONTS[c.font] || FONTS['default'])[1];
        o.push('html{font-size:' + num(c.size, 10, 32, 16) + 'px!important}');
        if (stack) o.push(':where(body,p,li,span,div,a,td,th,h1,h2,h3,h4,h5,h6,button,input,textarea,select):where(:not(i,code,pre,kbd,samp,[class*="icon" i],[class*="fa-" i],[class*="material" i])){font-family:' + stack + '!important}');
        o.push(':where(p,li,dd,blockquote){line-height:' + num(c.lineHeight, 1, 3, 1.6) + '!important}');
        var w = num(c.width, 0, 3000, 0);
        if (w > 0) o.push(':where(main,article,[role=main]){max-width:' + w + 'px!important;margin-inline:auto!important}');
      }
    }

    /* --- Speed mode --- */
    if (cfg.speed.on) {
      if (cfg.speed.noAnim) o.push('*,*::before,*::after{animation-duration:0.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:0.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}');
      if (cfg.speed.reduceFx) o.push('*,*::before,*::after{box-shadow:none!important;text-shadow:none!important;will-change:auto!important;-webkit-backdrop-filter:none;backdrop-filter:none}');
    }
    return o.join('\n');
  }

  /* ===================== 5. APPLY ENGINE ===================== */
  var styleEl = null, applyQueued = false, userActive = false;
  function mkStyle() {
    var el = null;
    try { if (typeof GM_addStyle === 'function') el = GM_addStyle('/* theme-studio */'); } catch (e) { el = null; }
    if (!el || el.nodeType !== 1) {
      el = document.createElement('style');
      el.id = 'uts-style';
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }
  function ensureStyle() {
    if (!styleEl) styleEl = mkStyle();
    else if (!styleEl.isConnected) (document.head || document.documentElement).appendChild(styleEl);
  }
  function domTweaks() {
    if (offSite || !cfg.speed.on) return;
    var s = cfg.speed;
    if (s.lazyImg) {
      document.querySelectorAll('img:not([loading])').forEach(function (i) { i.loading = 'lazy'; i.decoding = 'async'; });
    }
    if (s.lazyIframe) {
      document.querySelectorAll('iframe:not([loading])').forEach(function (f) { f.loading = 'lazy'; });
    }
    if (s.pauseVideo && !userActive) {
      document.querySelectorAll('video').forEach(function (v) {
        if (v.autoplay) v.autoplay = false;
        if (!v.paused) v.pause();
      });
    }
  }
  function apply() {
    ensureStyle();
    var css = buildCss();
    if (styleEl.textContent !== css) styleEl.textContent = css;
    domTweaks();
  }
  function schedApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(function () { applyQueued = false; apply(); });
  }

  /* ===================== 6. UI HELPERS (no innerHTML) ===================== */
  var refs = {}, hostEl = null, root = null, panelEl = null, bodyEl = null, tabsEl = null, statusEl = null, fabEl = null, scopeSel = null;
  var TABS = [['glass', 'Glass'], ['clean', 'Clean'], ['speed', 'Speed'], ['colors', 'Colours'], ['presets', 'Presets'], ['advanced', 'Advanced']];

  function h(tag, props, kids) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'for') el.htmlFor = v;
      else if (k === 'type' || k === 'min' || k === 'max' || k === 'step' || k === 'value' || k === 'checked' || k === 'rows' || k === 'placeholder') el[k] = v;
      else el.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function status(msg) { if (statusEl) statusEl.textContent = msg; }

  function ctlToggle(label, getter, setter) {
    var i = h('input', { type: 'checkbox', checked: !!getter(), onchange: function () { setter(i.checked); } });
    return h('label', { class: 'row' }, [h('span', { class: 'lbl', text: label }), i]);
  }
  function tgl(path, label) { return ctlToggle(label, function () { return getPath(cfg, path); }, function (v) { set(path, v); }); }
  function rng(path, label, min, max, step, unit) {
    var out = h('output', { text: getPath(cfg, path) + (unit || '') });
    var i = h('input', { type: 'range', min: min, max: max, step: step, value: getPath(cfg, path),
      oninput: function () { set(path, parseFloat(i.value)); out.textContent = i.value + (unit || ''); } });
    return h('label', { class: 'row' }, [h('span', { class: 'lbl', text: label }), i, out]);
  }
  function pick(path, label) {
    var i = h('input', { type: 'color', value: col(getPath(cfg, path), '#000000'), oninput: function () { set(path, i.value); } });
    refs[path] = i;
    return h('label', { class: 'row' }, [h('span', { class: 'lbl', text: label }), i]);
  }
  function sel(path, label, opts, key) {
    var s = h('select', { onchange: function () { set(path, s.value); if (key === 'mode') schedApply(); } },
      opts.map(function (o) { var op = h('option', { value: o[0], text: o[1] }); if (o[0] === getPath(cfg, path)) op.selected = true; return op; }));
    if (key) refs[key] = s;
    return h('label', { class: 'row' }, [h('span', { class: 'lbl', text: label }), s]);
  }
  function btn(text, fn, cls) { return h('button', { type: 'button', class: cls || 'btn', text: text, onclick: fn }); }

  /* ===================== 7. TAB CONTENT ===================== */
  function tabGlass() {
    var m = h('select', { 'aria-label': 'Glass mode', onchange: function () {
      var d = MODES[m.value];
      if (d) { Object.assign(cfg.glass, d[1], { mode: m.value, on: true }); persist(); apply(); render(); }
    } }, Object.keys(MODES).map(function (k) {
      var op = h('option', { value: k, text: MODES[k][0] }); if (k === cfg.glass.mode) op.selected = true; return op; }));
    return [tgl('glass.on', 'Enable glass'), h('label', { class: 'row' }, [h('span', { class: 'lbl', text: 'Mode' }), m]),
      rng('glass.blur', 'Blur', 0, 50, 1, 'px'), rng('glass.opacity', 'Opacity', 0, 1, 0.05, ''),
      rng('glass.saturate', 'Saturation', 100, 300, 5, '%'), rng('glass.radius', 'Corner radius', 0, 40, 1, 'px'),
      rng('glass.borderW', 'Border width', 0, 4, 1, 'px'), rng('glass.borderAlpha', 'Border strength', 0, 1, 0.05, ''),
      rng('glass.shine', 'Gloss / shine', 0, 1, 0.05, ''), rng('glass.shadow', 'Shadow', 0, 1, 0.05, ''),
      rng('glass.glow', 'Accent glow', 0, 40, 1, 'px'), tgl('glass.aurora', 'Aurora background gradient')];
  }
  function tabClean() {
    return [tgl('clean.on', 'Enable clean mode'),
      ctlToggle('Turn clean OFF on this site', function () { return cleanOff; }, function (v) { cleanOff = v; sv(K.cleanOff, v); schedApply(); }),
      tgl('clean.cookies', 'Hide cookie banners'), tgl('clean.popups', 'Hide newsletter popups'), tgl('clean.sticky', 'Hide sticky promos'), tgl('clean.ads', 'Hide ad containers'),
      tgl('clean.typo', 'Typography tidy-up'),
      sel('clean.font', 'Font', Object.keys(FONTS).map(function (k) { return [k, FONTS[k][0]]; })),
      rng('clean.size', 'Font size', 10, 32, 1, 'px'), rng('clean.lineHeight', 'Line height', 1, 3, 0.05, ''),
      rng('clean.width', 'Max content width (0=off)', 0, 1600, 20, 'px')];
  }
  function tabSpeed() {
    return [tgl('speed.on', 'Enable speed mode'), tgl('speed.noAnim', 'Disable animations and transitions'), tgl('speed.lazyImg', 'Lazy-load images'),
      tgl('speed.lazyIframe', 'Lazy-load iframes'), tgl('speed.pauseVideo', 'Pause autoplay video'), tgl('speed.reduceFx', 'Reduce heavy effects (shadows)')];
  }
  function tabColors() {
    return [tgl('colors.on', 'Enable theme colours'),
      sel('colors.mode', 'Mode', [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light'], ['custom', 'Custom']], 'mode'),
      pick('colors.accent', 'Accent'), pick('colors.bg', 'Background'), pick('colors.text', 'Text'), pick('colors.link', 'Links'),
      tgl('colors.deep', 'Recolour page containers (deep)')];
  }
  function applyPreset(p) {
    var c = p.colors;
    ['bg', 'text', 'accent', 'link'].forEach(function (k) { cfg.colors[k] = col(c[k], cfg.colors[k]); });
    cfg.colors.mode = 'custom'; cfg.colors.on = true;
    if (isObj(p.glass)) cfg.glass = merge(DEFAULTS.glass, p.glass);
    persist(); apply(); render(); status('Applied preset ' + p.name);
  }
  function swatch(p, del) {
    var c = p.colors || p;
    var b = h('button', { type: 'button', class: 'preset', title: p.name, onclick: function () { applyPreset(p.colors ? p : { name: p.name, colors: p }); } },
      [h('span', { class: 'sw' }), h('span', { text: p.name })]);
    b.firstChild.style.background = 'linear-gradient(135deg,' + col(c.bg, '#000000') + ' 50%,' + col(c.accent, '#ffffff') + ' 50%)';
    if (!del) return b;
    return h('div', { class: 'pwrap' }, [b, h('button', { type: 'button', class: 'x', 'aria-label': 'Delete preset ' + p.name, text: 'x', onclick: del })]);
  }
  function tabPresets() {
    var grid = h('div', { class: 'grid' }, BUILTIN.map(function (p) { return swatch(p); }));
    var cgrid = h('div', { class: 'grid' }, presets.map(function (p, idx) {
      return swatch(p, function () { presets.splice(idx, 1); sv(K.presets, presets); render(); });
    }));
    var name = h('input', { type: 'text', placeholder: 'Preset name' });
    return [h('h4', { text: 'Built-in' }), grid, h('h4', { text: 'Custom' }), cgrid,
      h('div', { class: 'row' }, [name, btn('Save current', function () {
        var n = name.value.trim().slice(0, 24);
        if (!n) { status('Enter a name first'); return; }
        presets.push({ name: n, colors: { bg: cfg.colors.bg, text: cfg.colors.text, accent: cfg.colors.accent, link: cfg.colors.link }, glass: clone(cfg.glass) });
        sv(K.presets, presets); render(); status('Saved preset ' + n);
      })])];
  }
  function tabAdvanced() {
    var ta = h('textarea', { rows: 6, placeholder: 'Settings JSON' });
    scopeSel = null;
    return [
      ctlToggle('Disable Theme Studio on this site', function () { return offSite; }, function (v) { offSite = v; sv(K.off, v); schedApply(); }),
      ctlToggle('Show floating button', function () { return ui.btn; }, function (v) { ui.btn = v; sv(K.ui, ui); fabEl.hidden = !v; }),
      h('div', { class: 'row' }, [btn('Reset this site', resetSite), btn('Reset global', resetGlobal)]),
      h('h4', { text: 'Import / export (all sites)' }), ta,
      h('div', { class: 'row' }, [
        btn('Export', function () { ta.value = exportAll(); ta.select(); status('Exported below'); }),
        btn('Copy', function () {
          if (!ta.value) ta.value = exportAll();
          ta.select();
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function () { status('Copied'); }, function () { status('Press Ctrl+C to copy'); });
          else status('Press Ctrl+C to copy');
        }),
        btn('Import', function () { status(importAll(ta.value)); })]),
      h('p', { class: 'hint', text: 'Shortcut: Alt+Shift+T. Host: ' + HOST })];
  }
  var TAB_FN = { glass: tabGlass, clean: tabClean, speed: tabSpeed, colors: tabColors, presets: tabPresets, advanced: tabAdvanced };

  /* ===================== 8. PANEL, TABS, FLOATING BUTTON ===================== */
  var PANEL_CSS = ':host{all:initial}*{box-sizing:border-box}' +
    '.fab{position:fixed;z-index:2147483646;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.4);color:#fff;font:20px system-ui,sans-serif;cursor:grab;touch-action:none;background:rgba(40,44,70,.55);-webkit-backdrop-filter:blur(14px) saturate(180%);backdrop-filter:blur(14px) saturate(180%);box-shadow:0 6px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.5)}' +
    '.fab[hidden],.panel[hidden]{display:none}' +
    '.panel{position:fixed;z-index:2147483647;top:12px;right:12px;width:min(380px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;color:#f2f4ff;font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;background:rgba(24,26,40,.68);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,.22);border-radius:20px;box-shadow:0 16px 48px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.35)}' +
    'header{display:flex;align-items:center;gap:8px;padding:12px 14px 6px}header b{flex:1;font-size:15px}' +
    '[role=tablist]{display:flex;gap:4px;padding:4px 10px;overflow-x:auto}' +
    '[role=tab]{flex:none;padding:7px 11px;border-radius:10px;border:1px solid transparent;background:transparent;color:inherit;font:inherit;cursor:pointer}' +
    '[role=tab][aria-selected=true]{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.28)}' +
    '.body{padding:6px 14px 8px;overflow-y:auto;flex:1}' +
    '.row{display:flex;align-items:center;gap:8px;padding:6px 0;min-height:36px}.lbl{flex:1}' +
    'output{min-width:46px;text-align:right;opacity:.8}' +
    'input[type=range]{flex:0 0 120px}input[type=color]{width:44px;height:30px;border:0;background:none;padding:0}' +
    'input[type=checkbox]{width:20px;height:20px}' +
    'select,input[type=text],textarea{background:rgba(255,255,255,.12);color:inherit;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:6px;font:inherit;max-width:60%}textarea{width:100%;max-width:100%}option{color:#000}' +
    '.btn,header button{background:rgba(255,255,255,.16);color:inherit;border:1px solid rgba(255,255,255,.28);border-radius:10px;padding:7px 11px;font:inherit;cursor:pointer}.btn:hover,header button:hover{background:rgba(120,150,255,.5)}' +
    'h4{margin:12px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a9bcff}' +
    '.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.pwrap{position:relative}' +
    '.preset{display:flex;align-items:center;gap:8px;width:100%;padding:7px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:inherit;font:inherit;cursor:pointer}' +
    '.sw{width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.5)}' +
    '.x{position:absolute;top:2px;right:2px;border:0;border-radius:50%;width:20px;height:20px;background:rgba(0,0,0,.45);color:#fff;cursor:pointer}' +
    '.status{padding:4px 14px 10px;min-height:22px;font-size:12px;opacity:.85}.hint{opacity:.7;font-size:12px}' +
    ':focus-visible{outline:2px solid #8fb0ff;outline-offset:2px}' +
    '@media (max-width:600px){.panel{top:auto;bottom:8px;right:8px;left:8px;width:auto;max-height:78vh}}' +
    '@media (prefers-reduced-motion:no-preference){.panel{transition:opacity .15s}}';

  function ensureHost() {
    if (hostEl && hostEl.isConnected) return;
    if (!document.documentElement) return;
    if (!hostEl) {
      hostEl = document.createElement('div');
      hostEl.id = 'uts-host';
      root = hostEl.attachShadow({ mode: 'open' });
      try {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(PANEL_CSS);
        root.adoptedStyleSheets = [sheet];
      } catch (e) {
        var st = document.createElement('style'); st.textContent = PANEL_CSS; root.appendChild(st);
      }
      buildShell();
    }
    document.documentElement.appendChild(hostEl);
  }

  function buildShell() {
    fabEl = h('button', { type: 'button', class: 'fab', 'aria-label': 'Open Theme Studio', title: 'Theme Studio (Alt+Shift+T)', text: '\u2726' });
    fabEl.hidden = !ui.btn;
    placeFab();
    dragify(fabEl, togglePanel);

    scopeSel = h('select', { 'aria-label': 'Settings scope', onchange: function () { setScope(scopeSel.value); } }, [
      h('option', { value: 'global', text: 'Global' }), h('option', { value: 'site', text: 'This site' })]);
    statusEl = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
    tabsEl = h('div', { role: 'tablist', 'aria-label': 'Sections' });
    bodyEl = h('div', { class: 'body', role: 'tabpanel' });
    panelEl = h('div', { class: 'panel', role: 'dialog', 'aria-label': 'Theme Studio settings' }, [
      h('header', null, [h('b', { text: 'Theme Studio' }), scopeSel, h('button', { type: 'button', 'aria-label': 'Close', text: 'x', onclick: closePanel })]),
      tabsEl, bodyEl, statusEl]);
    panelEl.hidden = true;
    panelEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePanel(); fabEl.focus(); } e.stopPropagation(); });
    root.appendChild(fabEl);
    root.appendChild(panelEl);
  }

  function placeFab() {
    var w = window.innerWidth, hgt = window.innerHeight;
    var x = ui.x == null ? w - 60 : ui.x, y = ui.y == null ? hgt - 76 : ui.y;
    fabEl.style.left = Math.min(Math.max(0, x), w - 44) + 'px';
    fabEl.style.top = Math.min(Math.max(0, y), hgt - 44) + 'px';
  }
  function dragify(el, onClick) {
    var sx = 0, sy = 0, ox = 0, oy = 0, moved = false, down = false;
    el.addEventListener('pointerdown', function (e) {
      down = true; moved = false; sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.left) || 0; oy = parseFloat(el.style.top) || 0;
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) {
        el.style.left = Math.min(Math.max(0, ox + dx), window.innerWidth - 44) + 'px';
        el.style.top = Math.min(Math.max(0, oy + dy), window.innerHeight - 44) + 'px';
      }
    });
    el.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) { ui.x = parseFloat(el.style.left); ui.y = parseFloat(el.style.top); sv(K.ui, ui); } else onClick();
    });
  }

  function render() {
    if (!panelEl || panelEl.hidden) return;
    refs = {};
    scopeSel.value = scope;
    clear(tabsEl);
    TABS.forEach(function (t, i) {
      var b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(t[0] === ui.tab), tabindex: t[0] === ui.tab ? '0' : '-1', text: t[1],
        onclick: function () { ui.tab = t[0]; sv(K.ui, ui); render(); },
        onkeydown: function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          ui.tab = TABS[(i + d + TABS.length) % TABS.length][0]; sv(K.ui, ui); render();
          var sel2 = tabsEl.querySelector('[aria-selected=true]'); if (sel2) sel2.focus();
        } });
      tabsEl.appendChild(b);
    });
    clear(bodyEl);
    TAB_FN[ui.tab]().forEach(function (n) { bodyEl.appendChild(n); });
  }
  function openPanel() { ensureHost(); if (!panelEl) return; panelEl.hidden = false; render(); var t = tabsEl.querySelector('[aria-selected=true]'); if (t) t.focus(); }
  function closePanel() { if (panelEl) panelEl.hidden = true; }
  function togglePanel() { ensureHost(); if (panelEl && !panelEl.hidden) closePanel(); else openPanel(); }

  /* ===================== 9. OBSERVERS, SPA, EVENTS ===================== */
  var lastHref = location.href;
  var tick = debounce(function () {
    ensureStyle(); ensureHost(); domTweaks();
    if (location.href !== lastHref) { lastHref = location.href; apply(); }
  }, 300);

  function hookHistory() {
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m];
      if (typeof orig !== 'function') return;
      history[m] = function () { var r = orig.apply(this, arguments); tick(); return r; };
    });
    window.addEventListener('popstate', tick);
    window.addEventListener('hashchange', tick);
  }

  function init() {
    loadAll();
    ensureStyle();
    apply();                                   /* styles injected at document-start: no flash */

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, function () { userActive = true; }, { capture: true, passive: true, once: true });
    });
    document.addEventListener('play', function (e) {
      if (!offSite && cfg.speed.on && cfg.speed.pauseVideo && !userActive && e.target && e.target.tagName === 'VIDEO') e.target.pause();
    }, true);

    hookHistory();
    new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { ensureHost(); apply(); });
    window.addEventListener('resize', debounce(function () { if (fabEl) placeFab(); }, 150));
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', schedApply);
    }

    document.addEventListener('keydown', function (e) {
      if (e.altKey && e.shiftKey && e.code === 'KeyT') { e.preventDefault(); togglePanel(); }
    }, true);

    try { GM_registerMenuCommand('Open Theme Studio panel', togglePanel); } catch (e) { /* ignore */ }
    try {
      GM_registerMenuCommand('Toggle Theme Studio on this site', function () { offSite = !offSite; sv(K.off, offSite); apply(); render(); });
    } catch (e) { /* ignore */ }

    /* keep other tabs in sync */
    [K.global, K.site, K.scope, K.presets, K.off, K.cleanOff].forEach(function (key) {
      try {
        GM_addValueChangeListener(key, function (n, o, nv, remote) {
          if (!remote) return;
          loadAll(); schedApply(); render();
        });
      } catch (e) { /* ignore */ }
    });
  }

  init();
})();

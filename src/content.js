// Marketplace integration and the Probe detection overlay.
(() => {
  "use strict";
  if (window.__a6ProberContent) return;
  window.__a6ProberContent = true;

  const A6P = globalThis.A6P;
  const API = globalThis.A6PAPI;
  const PROBES = A6P.PROBES;
  const HOST_ID = "a6-prober-root";
  const LISTING_SOURCE = "a6p:listings";

  const ICONS = {
    flask:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6L5.2 18.1A2 2 0 0 0 6.9 21h10.2a2 2 0 0 0 1.7-2.9L14 9V3"/><path d="M7.2 15h9.6"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    pelican:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 15.5c2.6-1.4 4.8-1.8 7.3-1.4l2.6-3.7c.5-.7 1.4-1.1 2.3-.9l2.5.5-1.1 2.2 1.5 1.9c.8 1 .4 2.6-.9 3.1-1.8.7-3.8 1.1-5.8 1.1-2.6 0-4.8.4-7 1.5"/><path d="M13.1 12.8c.5 1.9 1.9 3.1 3.8 3.5"/><path d="M20.8 9.1c.5.2.8.7.7 1.2"/></svg>',
    flight:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13.5c4.5-1.1 8.6-3.8 11.5-7.7"/><path d="M3 18.5c5.8-1.4 10.7-4.9 14.2-9.8"/><path d="M21 3.5c-1.2 4.7-3.6 8.8-7.1 12.1"/><path d="M8 6.5h5.5"/><path d="M14.5 20.5H20"/></svg>',
    bolt:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z"/></svg>',
    spark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/><path d="M5 15.5l.6 1.7 1.7.6-1.7.6L5 20.1l-.6-1.7-1.7-.6 1.7-.6L5 15.5Z"/></svg>',
    attach:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m20.5 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.4 3.4 0 0 1 4.8 4.8l-9.2 9.2a1.8 1.8 0 0 1-2.5-2.5l8.5-8.5"/></svg>',
    folder:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h4l2 2h6.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Z"/></svg>',
    gear:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7l.8 13h9.4l.8-13"/><path d="M10 11v5M14 11v5"/></svg>',
    send:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 3-7.2 18-3.4-7.4L3 10.2 21 3Z"/><path d="M10.4 13.6 21 3"/></svg>',
    stop:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>',
    cross:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>',
    download:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>',
    key:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8"/><path d="m16 5 3 3"/><path d="m14 7 2 2"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
    refresh:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 4v7h-7"/></svg>',
    code:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 5-4 14"/></svg>',
  };

  let state = null;
  let modalGeneration = 0;
  let host = null;
  let shadow = null;
  let scanScheduled = false;
  const listings = new Map();

  function icon(name, size = 16) {
    const span = document.createElement("span");
    span.className = "a6p-icon";
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.innerHTML = ICONS[name] || ICONS.spark;
    return span;
  }

  function node(tag, className = "", text = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== "") el.textContent = text;
    return el;
  }

  function button(className, label, iconName, size = 15) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    if (iconName) el.appendChild(icon(iconName, size));
    if (label) el.appendChild(node("span", "a6p-btn-label", label));
    return el;
  }

  function clearNode(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ---------- marketplace row integration ----------

  function ensureRowStyle() {
    if (document.getElementById("a6p-row-style")) return;
    const style = document.createElement("style");
    style.id = "a6p-row-style";
    style.textContent = `
      .a6p-row-btn {
        display: inline-flex; align-items: center; gap: 5px; height: 28px;
        margin-left: 7px; padding: 0 9px; border: 1px solid #bcded8;
        border-radius: 7px; background: #e8f5f2; color: #087f75;
        font: 600 11.5px/1 Inter, "Segoe UI", system-ui, sans-serif;
        letter-spacing: .01em; cursor: pointer; white-space: nowrap;
        box-shadow: 0 1px 2px rgba(23, 43, 58, .04);
        transition: background .15s ease, transform .15s ease, box-shadow .15s ease;
        vertical-align: middle;
      }
      .a6p-row-btn:hover { background: #d8eee9; border-color: #87bfb5; box-shadow: 0 3px 8px rgba(23, 43, 58, .08); }
      .a6p-row-btn:focus-visible { outline: 2px solid #087f75; outline-offset: 3px; }
      .a6p-row-btn:active { transform: translateY(1px); }
      .a6p-row-btn .a6p-icon { display: inline-flex; width: 13px; height: 13px; }
      .a6p-row-btn .a6p-icon svg { width: 100%; height: 100%; }
      .a6p-row-btn[data-busy="1"] { opacity: .65; pointer-events: none; }
      .a6p-row-btn.is-inline {
        height: 24px; margin-left: 7px; padding: 0 8px; border-radius: 7px;
        font-size: 10.5px; vertical-align: middle;
      }
      .a6p-row-btn.is-inline .a6p-icon { width: 12px; height: 12px; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function channelFromRow(row) {
    const chip = row.querySelector(".chip-channel");
    const text = chip ? chip.textContent || "" : "";
    const match = text.match(/#\s*(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function modelFromRow(row) {
    const modelEl = row.querySelector(".model-name-text");
    if (!modelEl) return "";
    return (modelEl.getAttribute("title") || modelEl.textContent || "").trim();
  }

  function rowInfo(row) {
    const listingId = Number(row.getAttribute("data-market-row"));
    if (!Number.isSafeInteger(listingId) || listingId <= 0) return null;
    const known = listings.get(listingId) || {};
    const channelId = Number(known.channelId) || channelFromRow(row);
    const model = known.model || modelFromRow(row);
    if (!channelId || !model) return null;
    return {
      listingId,
      channelId,
      model,
      endpoint: known.endpoint || "chat",
      supplier: known.supplier || "",
      channelName: known.channelName || "",
      pelican: known.pelican === true,
      modelDetection: known.modelDetection === true,
    };
  }

  function isVisibleElement(element) {
    if (!element || !element.isConnected) return false;
    if (!element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function inViewport(element) {
    if (!isVisibleElement(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }

  function probeTarget(row) {
    const modelEl = row.querySelector(".model-name-text");
    if (modelEl && modelEl.parentElement && isVisibleElement(modelEl)) {
      return { target: modelEl.parentElement, after: modelEl };
    }
    const modelCheck = row.querySelector('td[data-col="modelCheck"]');
    if (modelCheck && inViewport(modelCheck)) return { target: modelCheck, after: null };
    const actions = row.querySelector('td[data-col="actions"]');
    if (actions && inViewport(actions)) return { target: actions, after: null };
    for (const cell of row.querySelectorAll("td")) {
      if (inViewport(cell)) return { target: cell, after: null };
    }
    return null;
  }

  function injectRowButton(row, info) {
    const existing = row.querySelector(".a6p-row-btn");
    const placement = probeTarget(row);
    if (!placement) return;
    if (existing) {
      if (placement.after) {
        if (existing.parentElement !== placement.target || existing.previousElementSibling !== placement.after) {
          placement.after.insertAdjacentElement("afterend", existing);
        }
      } else if (existing.parentElement !== placement.target) {
        placement.target.appendChild(existing);
      }
      existing.dataset.channelId = String(info.channelId);
      existing.dataset.model = info.model;
      existing.classList.toggle("is-inline", !!placement.after);
      existing.title = `Probe ${info.model} · channel #${info.channelId}`;
      return;
    }
    ensureRowStyle();
    const btn = button("a6p-row-btn", "Probe", "flask", 13);
    btn.type = "button";
    btn.title = `Probe ${info.model} · channel #${info.channelId}`;
    btn.dataset.channelId = String(info.channelId);
    btn.dataset.model = info.model;
    btn.classList.toggle("is-inline", !!placement.after);
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.dataset.busy === "1") return;
      const fresh = rowInfo(row);
      if (!fresh) {
        showToast("The row is still loading. Try again in a moment.", "warn");
        return;
      }
      openProbe(fresh, btn);
    });
    if (placement.after) placement.after.insertAdjacentElement("afterend", btn);
    else placement.target.appendChild(btn);
  }

  function scanRows() {
    scanScheduled = false;
    for (const row of document.querySelectorAll("tr[data-market-row]")) {
      const info = rowInfo(row);
      if (info) injectRowButton(row, info);
    }
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(scanRows);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== LISTING_SOURCE || !Array.isArray(data.listings)) return;
    for (const listing of data.listings) {
      if (!listing || !listing.listingId) continue;
      listings.set(Number(listing.listingId), listing);
    }
    scheduleScan();
  });

  window.addEventListener("scroll", scheduleScan, true);
  const observer = new MutationObserver(scheduleScan);
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => observer.observe(document.documentElement, { childList: true, subtree: true }), { once: true });
  }
  scheduleScan();

  // ---------- overlay ----------

  const CSS = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .a6p-shell {
      --bg: #f3f6f8;
      --panel: #ffffff;
      --ink: #172b3a;
      --muted: #617182;
      --faint: #738292;
      --line: #e2e9ee;
      --line-strong: #ccd7df;
      --soft: #f1f6f8;
      --soft-line: #dce6ec;
      --accent: #087f75;
      --accent-soft: #e8f5f2;
      --good: #1a8a4d;
      --good-soft: #eaf8ef;
      --warn: #a96a05;
      --warn-soft: #fff7e8;
      --bad: #bd3b3b;
      --bad-soft: #fff0ef;
      position: fixed; inset: 0; z-index: 2147483000; pointer-events: auto;
      font-family: Inter, "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      color: var(--ink); line-height: 1.5; color-scheme: light;
      -webkit-font-smoothing: antialiased;
    }
    button, input, select, textarea { font: inherit; }
    button, summary, select { -webkit-tap-highlight-color: transparent; }
    button:focus-visible, summary:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid var(--accent); outline-offset: 3px;
    }
    .a6p-backdrop {
      position: fixed; inset: 0; background: rgba(15, 32, 45, .42);
      backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
      animation: a6p-fade .2s ease both;
    }
    .a6p-modal {
      position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(1240px, 95vw); height: min(940px, 93dvh);
      display: flex; flex-direction: column; overflow: hidden;
      background: var(--panel); border: 1px solid var(--line-strong);
      border-radius: 20px; box-shadow: 0 32px 100px rgba(15, 32, 45, .26);
      animation: a6p-rise .28s cubic-bezier(.2,.8,.2,1) both;
    }
    .a6p-topbar {
      display: flex; align-items: center; gap: 12px; min-height: 74px; padding: 0 28px;
      border-bottom: 1px solid var(--line); background: var(--panel);
      flex-shrink: 0;
    }
    .a6p-identity { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    .a6p-brand-mark { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--accent); color: #fff; flex: 0 0 auto; }
    .a6p-conv { color: var(--muted); font: 500 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .02em; }
    .a6p-score-pill {
      display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 9px;
      border-radius: 999px; border: 1px solid var(--line-strong); background: #fff;
      color: var(--muted); font: 650 11px/1 Inter, system-ui, sans-serif; cursor: default;
      white-space: nowrap;
    }
    .a6p-score-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #91a2ae; }
    .a6p-score-pill.is-strong { color: var(--good); border-color: #c7e8d3; background: var(--good-soft); }
    .a6p-score-pill.is-strong::before { background: var(--good); }
    .a6p-score-pill.is-fair { color: var(--warn); border-color: #f0dfb9; background: var(--warn-soft); }
    .a6p-score-pill.is-fair::before { background: var(--warn); }
    .a6p-score-pill.is-weak, .a6p-score-pill.is-failed { color: var(--bad); border-color: #f0c9c6; background: var(--bad-soft); }
    .a6p-score-pill.is-weak::before, .a6p-score-pill.is-failed::before { background: var(--bad); }
    .a6p-model {
      min-width: 0; max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font: 700 15px/1.2 Inter, system-ui, sans-serif; letter-spacing: -.025em;
    }
    .a6p-kind-pill {
      display: inline-flex; align-items: center; height: 22px; padding: 0 8px;
      border: 1px solid var(--line); border-radius: 6px;
      color: var(--muted); background: var(--bg); font: 600 10.5px/1 Inter, system-ui, sans-serif;
      letter-spacing: .02em; white-space: nowrap;
    }
    .a6p-top-actions { display: flex; align-items: center; gap: 5px; }
    .a6p-icon-btn {
      display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;
      padding: 0; border: 1px solid transparent; border-radius: 9px; background: transparent;
      color: var(--muted); cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease;
    }
    .a6p-icon-btn:hover { background: var(--bg); color: var(--ink); border-color: var(--line); }
    .a6p-icon-btn:disabled { opacity: .32; cursor: default; background: transparent; }
    .a6p-icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .a6p-icon svg { display: block; width: 100%; height: 100%; }
    .a6p-close-btn { margin-left: 4px; }

    .a6p-tabs {
      display: flex; align-items: center; justify-content: flex-start; gap: 6px;
      padding: 12px 28px; border-bottom: 1px solid var(--line);
      background: var(--panel); flex-shrink: 0; overflow-x: auto; scrollbar-width: thin;
    }
    .a6p-tabs::-webkit-scrollbar { display: none; }
    .a6p-tab {
      display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 12px; flex-shrink: 0;
      border: 1px solid transparent; border-radius: 8px; background: transparent;
      color: var(--muted); font: 600 12px/1.3 Inter, system-ui, sans-serif; cursor: pointer;
      white-space: nowrap; transition: background .15s ease, color .15s ease, box-shadow .15s ease;
    }
    .a6p-tab:hover { color: var(--ink); background: var(--bg); }
    .a6p-tab.is-active {
      color: var(--accent); background: var(--accent-soft); border-color: #bcded8;
      box-shadow: none;
    }
    .a6p-tab .a6p-icon { width: 14px; height: 14px; opacity: .75; }
    .a6p-tab.is-active .a6p-icon { opacity: 1; }
    .a6p-tab-busy { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: a6p-pulse 1s infinite; }

    .a6p-body {
      flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
      padding: 32px 28px 20px; background: var(--bg); scrollbar-width: thin;
    }
    .a6p-body::-webkit-scrollbar { width: 9px; }
    .a6p-body::-webkit-scrollbar-thumb { background: var(--line-strong); border: 2px solid var(--bg); border-radius: 99px; }
    .a6p-center { width: min(840px, 100%); margin: 0 auto; }

    .a6p-intro {
      border: 1px solid var(--line); border-radius: 14px; background: var(--panel);
      padding: 26px; box-shadow: 0 3px 12px rgba(23, 43, 58, .03);
    }
    .a6p-intro-head { display: flex; gap: 13px; align-items: flex-start; }
    .a6p-probe-mark {
      display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;
      border-radius: 12px; background: var(--accent-soft); color: var(--accent); flex: 0 0 auto;
    }
    .a6p-probe-mark .a6p-icon { width: 19px; height: 19px; }
    .a6p-intro h2 { margin: 0 0 7px; font: 700 21px/1.3 Inter, system-ui, sans-serif; letter-spacing: -.035em; }
    .a6p-intro p { margin: 0; color: var(--muted); font: 400 13px/1.65 Inter, system-ui, sans-serif; }
    .a6p-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 13px 0 0; }
    .a6p-chip {
      display: inline-flex; align-items: center; height: 22px; padding: 0 8px;
      border: 1px solid var(--line); border-radius: 7px; background: #fff;
      color: var(--muted); font: 550 11px/1 Inter, system-ui, sans-serif;
    }
    .a6p-prompt-details { margin-top: 13px; border-top: 1px dashed var(--line); padding-top: 10px; }
    .a6p-prompt-details summary { color: var(--muted); font: 600 12px/1.4 Inter, system-ui, sans-serif; cursor: pointer; list-style: none; }
    .a6p-prompt-details summary::-webkit-details-marker { display: none; }
    .a6p-prompt-details summary::before { content: "›"; display: inline-block; margin-right: 5px; transition: transform .15s ease; }
    .a6p-prompt-details[open] summary::before { transform: rotate(90deg); }
    .a6p-prompt-details pre {
      margin: 8px 0 0; padding: 12px; border-radius: 8px; background: var(--bg);
      color: var(--muted); font: 11.5px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre-wrap; word-break: break-word; max-height: 180px; overflow: auto;
    }
    .a6p-run-row { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
    .a6p-token-field { display: flex; flex-direction: column; gap: 5px; min-width: 190px; flex: 1; }
    .a6p-token-field > span { color: var(--muted); font: 650 10px/1.4 Inter, system-ui, sans-serif; text-transform: uppercase; letter-spacing: .08em; }
    .a6p-select {
      width: 100%; height: 40px; padding: 0 28px 0 12px; border: 1px solid var(--line-strong);
      border-radius: 8px; background: #fff; color: var(--ink); font: 550 12px/1.3 Inter, system-ui, sans-serif;
      outline: none; cursor: pointer; appearance: none;
      background-image: linear-gradient(45deg, transparent 50%, #617182 50%), linear-gradient(135deg, #617182 50%, transparent 50%);
      background-position: calc(100% - 14px) 17px, calc(100% - 10px) 17px;
      background-size: 4px 4px, 4px 4px; background-repeat: no-repeat;
    }
    .a6p-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(8, 127, 117, .12); }
    .a6p-select:disabled { opacity: .55; cursor: default; }
    .a6p-run-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px;
      border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: #fff;
      font: 650 12px/1 Inter, system-ui, sans-serif; cursor: pointer; white-space: nowrap;
      box-shadow: 0 2px 4px rgba(8, 127, 117, .12); transition: transform .15s ease, background .15s ease;
    }
    .a6p-run-btn:hover { background: #06675f; }
    .a6p-run-btn:active { transform: translateY(1px); }
    .a6p-run-btn:disabled { opacity: .45; cursor: default; }
    .a6p-run-btn .a6p-icon { width: 14px; height: 14px; }
    .a6p-stop-btn {
      display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px;
      border: 1px solid #efcecb; border-radius: 9px; background: #fff5f4; color: #a33c37;
      font: 650 11.5px/1 Inter, system-ui, sans-serif; cursor: pointer;
    }
    .a6p-stop-btn .a6p-icon { width: 12px; height: 12px; }
    .a6p-auth-note { margin-top: 12px; color: var(--muted); font: 450 11px/1.6 Inter, system-ui, sans-serif; }
    .a6p-auth-note.is-warn { color: var(--warn); }
    .a6p-auth-note.is-bad { color: var(--bad); }
    .a6p-key-row { display: flex; gap: 7px; margin-top: 8px; }
    .a6p-key-row input {
      flex: 1; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--line-strong);
      border-radius: 8px; background: #fff; color: var(--ink); font: 500 11.5px/1 ui-monospace, Menlo, monospace;
      outline: none;
    }
    .a6p-key-row input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(8, 127, 117, .12); }
    .a6p-key-row button {
      height: 32px; padding: 0 11px; border: 1px solid var(--line-strong); border-radius: 8px;
      background: #fff; color: var(--muted); font: 650 11px/1 Inter, system-ui, sans-serif; cursor: pointer;
    }

    .a6p-channel-strip {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px;
      border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
      color: var(--muted); font: 500 12px/1.4 Inter, system-ui, sans-serif;
    }
    .a6p-channel-strip .a6p-select { width: auto; min-width: 180px; height: 30px; margin-left: auto; }
    .a6p-dot { width: 7px; height: 7px; border-radius: 50%; background: #91a2ae; flex: 0 0 auto; }
    .a6p-dot.is-live { background: var(--good); box-shadow: 0 0 0 3px rgba(26, 138, 77, .12); }

    .a6p-empty { text-align: center; padding: 42px 18px 30px; color: var(--muted); }
    .a6p-empty-mark {
      display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px;
      border: 1px solid #c9e5de; border-radius: 14px; background: var(--accent-soft); color: var(--accent); margin-bottom: 14px;
    }
    .a6p-empty-mark .a6p-icon { width: 21px; height: 21px; }
    .a6p-empty h3 { margin: 0 0 8px; color: var(--ink); font: 650 16px/1.3 Inter, system-ui, sans-serif; letter-spacing: -.02em; }
    .a6p-empty p { margin: 0 auto; max-width: 430px; font: 400 13px/1.65 Inter, system-ui, sans-serif; }
    .a6p-suggestions { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; margin-top: 16px; }
    .a6p-suggestion {
      padding: 8px 10px; border: 1px solid var(--line); border-radius: 9px; background: #fff;
      color: var(--muted); font: 520 12px/1.4 Inter, system-ui, sans-serif; cursor: pointer;
      transition: background .15s ease, border-color .15s ease;
    }
    .a6p-suggestion:hover { color: var(--accent); background: var(--accent-soft); border-color: #bcded8; }

    .a6p-transcript { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
    .a6p-run-line {
      display: flex; align-items: center; gap: 8px; margin: 24px 0 12px; color: var(--muted);
      font: 600 10.5px/1.2 Inter, system-ui, sans-serif; letter-spacing: .03em; text-transform: uppercase;
    }
    .a6p-run-line::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #91a2ae; flex: 0 0 auto; }
    .a6p-run-line.is-running::before { background: var(--accent); animation: a6p-pulse 1.2s infinite; }
    .a6p-run-line.is-success::before { background: var(--good); }
    .a6p-run-line.is-failed::before { background: var(--bad); }
    .a6p-run-line .a6p-run-status { margin-left: auto; color: var(--muted); font-weight: 550; text-transform: none; letter-spacing: 0; }
    .a6p-run-line .a6p-run-time { color: var(--faint); font-weight: 500; text-transform: none; letter-spacing: 0; }

    .a6p-prompt {
      margin: 2px 0 10px; border-left: 2px solid var(--line-strong); padding: 2px 0 2px 10px;
      color: var(--muted); font: 450 12px/1.5 Inter, system-ui, sans-serif;
    }
    .a6p-prompt summary { cursor: pointer; list-style: none; color: var(--muted); }
    .a6p-prompt summary::-webkit-details-marker { display: none; }
    .a6p-prompt summary::before { content: "›"; display: inline-block; margin-right: 5px; transition: transform .15s ease; }
    .a6p-prompt[open] summary::before { transform: rotate(90deg); }
    .a6p-prompt pre {
      margin: 7px 0 0; padding: 9px 10px; border-radius: 8px; background: var(--panel);
      color: var(--muted); white-space: pre-wrap; word-break: break-word;
      font: 11px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .a6p-user-event { display: flex; flex-direction: column; align-items: flex-end; margin: 8px 0 14px; }
    .a6p-user-label { color: var(--muted); font: 600 10px/1 Inter, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; margin: 0 4px 7px; }
    .a6p-user-bubble {
      max-width: 86%; padding: 10px 12px; border-radius: 13px 13px 4px 13px;
      background: #e2efed; color: #234c49; font: 450 13px/1.65 Inter, system-ui, sans-serif;
      white-space: pre-wrap; word-break: break-word;
    }
    .a6p-user-thumbs { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; margin-top: 6px; }
    .a6p-user-thumbs img { width: 54px; height: 54px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); }

    .a6p-assistant { display: flex; gap: 10px; margin: 10px 0 12px; }
    .a6p-avatar {
      display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
      border-radius: 8px; background: var(--ink); color: #fff; font: 700 8.5px/1 Inter, system-ui, sans-serif;
      letter-spacing: .04em; flex: 0 0 auto; margin-top: 1px;
    }
    .a6p-assistant-copy { min-width: 0; flex: 1; }
    .a6p-assistant-text {
      color: var(--ink); font: 450 13px/1.75 Inter, system-ui, sans-serif;
      white-space: pre-wrap; word-break: break-word;
    }
    .a6p-assistant-text.is-streaming::after {
      content: ""; display: inline-block; width: 6px; height: 13px; margin-left: 2px;
      border-radius: 1px; background: var(--accent); vertical-align: -2px; animation: a6p-blink 1s steps(2) infinite;
    }
    .a6p-assistant-meta { margin-top: 7px; color: var(--faint); font: 500 10px/1.4 Inter, system-ui, sans-serif; }

    .a6p-tool-card {
      margin: 9px 0 12px; border: 1px solid var(--soft-line); border-radius: 14px;
      background: var(--soft); overflow: hidden;
    }
    .a6p-tool-head {
      display: flex; align-items: center; gap: 8px; min-height: 38px; padding: 7px 12px;
      border-bottom: 1px solid var(--soft-line); color: #73819a; font: 600 11px/1.2 Inter, system-ui, sans-serif;
    }
    .a6p-tool-head .a6p-icon { width: 14px; height: 14px; color: #4c8a63; }
    .a6p-tool-name { color: #3f4c61; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .a6p-tool-meta { margin-left: auto; color: #8f9bb0; font-weight: 500; white-space: nowrap; }
    .a6p-tool-body { background: #fff; }
    .a6p-tool-preview { padding: 10px; display: flex; align-items: center; justify-content: center; background: #fff; }
    .a6p-tool-preview img { display: block; max-width: 100%; max-height: 310px; border-radius: 9px; }
    .a6p-tool-preview iframe { width: 100%; height: 300px; border: 0; border-radius: 9px; background: #fff; }
    .a6p-tool-preview pre {
      width: 100%; margin: 0; padding: 12px; border-radius: 8px; background: var(--bg);
      color: var(--muted); font: 11.5px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre-wrap; word-break: break-word; max-height: 230px; overflow: auto;
    }
    .a6p-tool-note { padding: 7px 12px 0; color: #9aa4b4; font: 500 9.5px/1.4 Inter, system-ui, sans-serif; }
    .a6p-tool-foot {
      display: flex; align-items: center; gap: 7px; padding: 8px 12px 9px; color: #8d9ab0;
      font: 500 9.5px/1.3 Inter, system-ui, sans-serif;
    }
    .a6p-tool-foot .a6p-icon { width: 12px; height: 12px; }
    .a6p-mini-btn {
      display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px;
      border: 1px solid #dce3ef; border-radius: 7px; background: #fff; color: #536176;
      font: 600 9.5px/1 Inter, system-ui, sans-serif; cursor: pointer;
    }
    .a6p-mini-btn:hover { background: #f5f8fd; }
    .a6p-mini-btn .a6p-icon { width: 11px; height: 11px; }
    .a6p-tool-foot .a6p-spacer { flex: 1; }

    .a6p-list-card {
      margin: 9px 0 12px; padding: 11px 13px; border: 1px solid var(--line); border-radius: 12px;
      background: var(--panel); color: var(--muted); font: 450 11.5px/1.7 ui-monospace, Menlo, monospace;
      white-space: pre-wrap; word-break: break-word;
    }

    .a6p-status-event {
      display: flex; align-items: center; gap: 7px; margin: 7px 0 9px; color: var(--muted);
      font: 500 10.5px/1.3 Inter, system-ui, sans-serif;
    }
    .a6p-spinner {
      width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--line-strong);
      border-top-color: var(--accent); animation: a6p-spin .8s linear infinite; flex: 0 0 auto;
    }
    .a6p-status-event.is-done .a6p-spinner { display: none; }
    .a6p-status-event.is-done::before { content: "✓"; color: var(--good); font-weight: 700; }

    .a6p-error-card {
      margin: 9px 0 12px; padding: 11px 13px; border: 1px solid #f0cbc7; border-radius: 12px;
      background: #fff5f4; color: #9b3f39; font: 450 11.5px/1.55 Inter, system-ui, sans-serif;
      white-space: pre-wrap; word-break: break-word;
    }

    .a6p-score-card {
      margin: 16px 0 12px; border: 1px solid var(--line); border-radius: 16px;
      background: #fff; overflow: hidden;
    }
    .a6p-score-head { display: flex; gap: 13px; align-items: flex-start; padding: 15px 16px 12px; }
    .a6p-score-value { display: flex; align-items: baseline; gap: 2px; flex: 0 0 auto; }
    .a6p-score-number { font: 750 30px/1 Inter, system-ui, sans-serif; letter-spacing: -.045em; }
    .a6p-score-denom { color: var(--faint); font: 550 11px/1 Inter, system-ui, sans-serif; }
    .a6p-score-copy { min-width: 0; flex: 1; padding-top: 1px; }
    .a6p-score-label { display: flex; align-items: center; gap: 7px; color: var(--muted); font: 650 10px/1.4 Inter, system-ui, sans-serif; text-transform: uppercase; letter-spacing: .07em; }
    .a6p-verdict-pill { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 999px; font-size: 9.5px; letter-spacing: .02em; text-transform: capitalize; }
    .a6p-verdict-pill.is-strong { color: var(--good); background: var(--good-soft); }
    .a6p-verdict-pill.is-fair { color: var(--warn); background: var(--warn-soft); }
    .a6p-verdict-pill.is-weak, .a6p-verdict-pill.is-failed { color: var(--bad); background: var(--bad-soft); }
    .a6p-score-summary { margin-top: 7px; color: var(--muted); font: 450 13px/1.6 Inter, system-ui, sans-serif; }
    .a6p-score-metrics { display: flex; flex-wrap: wrap; gap: 5px 14px; padding: 0 16px 14px; color: var(--muted); font: 500 11px/1.4 Inter, system-ui, sans-serif; }
    .a6p-score-metrics span { display: inline-flex; align-items: center; gap: 4px; }
    .a6p-score-metrics b { color: var(--ink); font-weight: 650; }
    .a6p-score-details { border-top: 1px solid var(--line); }
    .a6p-score-details summary {
      padding: 11px 16px; color: var(--muted); font: 600 11px/1.4 Inter, system-ui, sans-serif;
      cursor: pointer; list-style: none; display: flex; align-items: center; gap: 5px;
    }
    .a6p-score-details summary::-webkit-details-marker { display: none; }
    .a6p-score-details summary::before { content: "›"; transition: transform .15s ease; }
    .a6p-score-details[open] summary::before { transform: rotate(90deg); }
    .a6p-checks { padding: 0 16px 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 16px; }
    .a6p-check { display: flex; align-items: flex-start; gap: 6px; min-width: 0; color: var(--muted); font: 450 11px/1.5 Inter, system-ui, sans-serif; }
    .a6p-check .a6p-icon { width: 12px; height: 12px; margin-top: 1px; flex: 0 0 auto; }
    .a6p-check.is-ok .a6p-icon { color: var(--good); }
    .a6p-check.is-bad .a6p-icon { color: #ccb1ae; }
    .a6p-check-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .a6p-check-points { margin-left: auto; color: var(--faint); font-size: 10px; flex: 0 0 auto; }

    .a6p-candy-card {
      margin: 14px 0 12px; border: 1px solid var(--line); border-radius: 16px;
      background: #fff; overflow: hidden;
    }
    .a6p-candy-head {
      display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
      padding: 10px 13px; border-bottom: 1px solid var(--line); background: #fbfcff;
    }
    .a6p-candy-mark {
      display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
      border-radius: 50%; background: var(--bad-soft); color: var(--bad); flex: 0 0 auto;
    }
    .a6p-candy-mark.is-pass { background: var(--good-soft); color: var(--good); }
    .a6p-candy-mark .a6p-icon { width: 13px; height: 13px; }
    .a6p-candy-id { color: #5e6d86; font: 650 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .a6p-candy-time { color: var(--faint); font: 500 10px/1.2 Inter, system-ui, sans-serif; }
    .a6p-candy-status {
      display: inline-flex; align-items: center; height: 19px; padding: 0 7px;
      border-radius: 999px; font: 700 9px/1 Inter, system-ui, sans-serif;
      letter-spacing: .04em; text-transform: uppercase;
    }
    .a6p-candy-status.is-pass { background: var(--good-soft); color: var(--good); }
    .a6p-candy-status.is-fail { background: var(--bad-soft); color: var(--bad); }
    .a6p-candy-meta { margin-left: auto; color: var(--muted); font: 500 10px/1.3 Inter, system-ui, sans-serif; white-space: nowrap; }
    .a6p-candy-body { padding: 12px 13px 13px; }
    .a6p-candy-summary { margin-bottom: 12px; color: var(--ink); font: 550 13px/1.6 Inter, system-ui, sans-serif; }
    .a6p-candy-label {
      margin: 12px 0 6px; color: var(--muted); font: 700 10px/1.2 Inter, system-ui, sans-serif;
      letter-spacing: .07em; text-transform: uppercase;
    }
    .a6p-candy-answer {
      max-height: 300px; overflow: auto; padding: 10px 11px; border: 1px solid var(--line);
      border-radius: 9px; background: var(--bg); color: var(--ink); font: 450 12px/1.7 Inter, system-ui, sans-serif;
      white-space: pre-wrap; word-break: break-word;
    }
    .a6p-candy-prompt {
      max-height: 240px; overflow: auto; margin: 0; padding: 10px 11px; border: 1px solid var(--line);
      border-radius: 9px; background: var(--bg); color: var(--muted);
      font: 10.5px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre-wrap;
    }
    .a6p-candy-expected {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 11px; padding-top: 9px;
      border-top: 1px dashed var(--line); color: var(--muted); font: 500 11px/1.4 Inter, system-ui, sans-serif;
    }
    .a6p-candy-expected b { color: var(--ink); font-size: 13px; }
    .a6p-candy-details { margin-top: 9px; border-top: 1px solid var(--line); }
    .a6p-candy-details summary {
      padding: 11px 0 0; color: var(--muted); font: 600 11px/1.4 Inter, system-ui, sans-serif;
      cursor: pointer; list-style: none;
    }
    .a6p-candy-details summary::-webkit-details-marker { display: none; }
    .a6p-candy-details summary::before { content: "›"; display: inline-block; margin-right: 4px; transition: transform .15s ease; }
    .a6p-candy-details[open] summary::before { transform: rotate(90deg); }
    .a6p-candy-details .a6p-checks { padding: 8px 0 0; }

    .a6p-composer-wrap {
      flex-shrink: 0; padding: 16px 28px; border-top: 1px solid var(--line);
      background: var(--panel);
    }
    .a6p-composer {
      width: min(840px, 100%); margin: 0 auto; border: 1px solid var(--line-strong); border-radius: 12px;
      background: #fff; box-shadow: 0 3px 12px rgba(23, 43, 58, .04); padding: 10px 12px;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .a6p-composer:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(8, 127, 117, .1); }
    .a6p-attachments { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 0 0; }
    .a6p-attachment { position: relative; width: 52px; height: 52px; border-radius: 8px; border: 1px solid var(--line); overflow: hidden; }
    .a6p-attachment img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .a6p-attachment button {
      position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; padding: 0;
      border: 0; border-radius: 50%; background: rgba(28, 24, 18, .72); color: #fff; cursor: pointer;
      font: 700 10px/1 Inter, system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
    }
    .a6p-composer textarea {
      display: block; width: 100%; min-height: 30px; max-height: 160px; resize: none; overflow-y: auto;
      padding: 6px 5px 5px; border: 0; outline: 0; background: transparent; color: var(--ink);
      font: 450 13px/1.55 Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    }
    .a6p-composer textarea::placeholder { color: var(--faint); }
    .a6p-composer-row { display: flex; align-items: center; gap: 2px; }
    .a6p-composer-tools { display: flex; align-items: center; gap: 1px; }
    .a6p-composer-tools .a6p-icon-btn { width: 34px; height: 34px; border-radius: 8px; color: var(--muted); }
    .a6p-composer-tools .a6p-icon-btn .a6p-icon { width: 15px; height: 15px; }
    .a6p-composer-tools .a6p-icon-btn:hover { background: var(--bg); }
    .a6p-status-text {
      margin-left: auto; min-width: 0; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--muted); font: 500 10px/1.4 Inter, system-ui, sans-serif;
    }
    .a6p-send-btn {
      display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex: 0 0 auto;
      margin-left: 7px; padding: 0; border: 0; border-radius: 9px; background: #a3c9c3;
      color: #fff; cursor: pointer; transition: background .15s ease, transform .15s ease;
    }
    .a6p-send-btn:not(:disabled) { background: var(--accent); }
    .a6p-send-btn:not(:disabled):hover { background: #06675f; }
    .a6p-send-btn:active { transform: scale(.96); }
    .a6p-send-btn:disabled { cursor: default; opacity: .7; }
    .a6p-send-btn .a6p-icon { width: 15px; height: 15px; }
    .a6p-fineprint {
      width: min(840px, 100%); margin: 9px auto 0; color: var(--faint);
      font: 450 10px/1.5 Inter, system-ui, sans-serif; text-align: center;
    }
    .a6p-fineprint b { color: var(--muted); font-weight: 600; }

    .a6p-layer {
      position: fixed; inset: 0; z-index: 2; display: none; align-items: center; justify-content: center;
      padding: 24px; background: rgba(15, 32, 45, .3); backdrop-filter: blur(4px);
    }
    .a6p-layer.is-open { display: flex; }
    .a6p-layer-card {
      display: flex; flex-direction: column; width: min(940px, 94vw); height: min(760px, 90vh);
      background: var(--panel); border: 1px solid var(--line-strong); border-radius: 18px;
      box-shadow: 0 24px 70px rgba(15, 32, 45, .24); overflow: hidden;
    }
    .a6p-layer-head { display: flex; align-items: center; gap: 9px; min-height: 52px; padding: 0 15px; border-bottom: 1px solid var(--line); }
    .a6p-layer-title { font: 650 12px/1.2 Inter, system-ui, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .a6p-layer-body { flex: 1; min-height: 0; overflow: auto; padding: 15px; background: var(--bg); }
    .a6p-layer-body iframe { width: 100%; height: 100%; min-height: 480px; border: 0; border-radius: 10px; background: #fff; }
    .a6p-layer-body img { display: block; max-width: 100%; max-height: 100%; margin: 0 auto; border-radius: 10px; }
    .a6p-layer-body pre { margin: 0; padding: 13px; border-radius: 10px; background: #fff; border: 1px solid var(--line); color: var(--ink); font: 12px/1.7 ui-monospace, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }
    .a6p-scratch-list { display: flex; flex-direction: column; gap: 7px; }
    .a6p-scratch-item {
      display: flex; align-items: center; gap: 9px; padding: 10px 11px; border: 1px solid var(--line);
      border-radius: 10px; background: #fff; color: var(--ink); font: 500 12px/1.4 Inter, system-ui, sans-serif;
    }
    .a6p-scratch-item .a6p-icon { width: 14px; height: 14px; color: var(--accent); }
    .a6p-scratch-item .a6p-scratch-meta { margin-left: auto; color: var(--muted); font-size: 10px; }
    .a6p-layer-actions { display: flex; gap: 7px; padding: 10px 15px; border-top: 1px solid var(--line); background: var(--panel); }

    .a6p-toast-layer { position: fixed; left: 50%; bottom: 28px; z-index: 3; transform: translateX(-50%); display: flex; flex-direction: column; gap: 7px; pointer-events: none; }
    .a6p-toast {
      padding: 11px 15px; border: 1px solid var(--line-strong); border-radius: 10px; background: #172b3a;
      color: #fff; font: 550 12px/1.5 Inter, system-ui, sans-serif; box-shadow: 0 8px 24px rgba(15, 32, 45, .2);
      animation: a6p-toast-in .2s ease both;
    }
    .a6p-toast.is-warn { background: #4f3b16; }
    .a6p-toast.is-bad { background: #5a2522; }

    .a6p-hidden { display: none !important; }
    @keyframes a6p-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes a6p-rise { from { opacity: 0; transform: translate(-50%, calc(-50% + 14px)) scale(.985); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
    @keyframes a6p-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
    @keyframes a6p-spin { to { transform: rotate(360deg); } }
    @keyframes a6p-blink { 50% { opacity: 0; } }
    @keyframes a6p-toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 720px) {
      .a6p-modal { width: 100vw; height: 100dvh; border-radius: 0; border: 0; }
      .a6p-topbar { padding: 10px 14px; min-height: 66px; }
      .a6p-identity { gap: 8px; flex-wrap: wrap; }
      .a6p-brand-mark { width: 30px; height: 30px; }
      .a6p-model { max-width: calc(100% - 44px); font-size: 13px; }
      .a6p-conv { margin-left: 38px; }
      .a6p-kind-pill { display: none; }
      .a6p-score-pill { height: 22px; font-size: 10px; }
      .a6p-body { padding: 20px 13px 8px; }
      .a6p-tabs { justify-content: flex-start; padding: 8px 12px; }
      .a6p-intro { padding: 18px; }
      .a6p-intro h2 { font-size: 18px; }
      .a6p-intro-head { gap: 10px; }
      .a6p-run-row .a6p-run-btn { flex: 1; }
      .a6p-token-field { flex-basis: 100%; min-width: 0; }
      .a6p-composer-wrap { padding: 10px 12px; }
      .a6p-status-text { max-width: 110px; }
      .a6p-run-line { flex-wrap: wrap; line-height: 1.5; }
      .a6p-layer { padding: 12px; }
      .a6p-scratch-item { flex-wrap: wrap; overflow-wrap: anywhere; }
      .a6p-checks { grid-template-columns: 1fr; }
      .a6p-score-head { gap: 9px; padding: 13px 12px 10px; }
      .a6p-score-metrics { padding: 0 12px 10px; }
      .a6p-tool-preview iframe { height: 220px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `;

  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = "position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
    document.documentElement.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);
  }

  function showToast(message, tone = "") {
    if (!shadow) return;
    let layer = shadow.querySelector(".a6p-toast-layer");
    if (!layer) {
      layer = node("div", "a6p-toast-layer");
      shadow.appendChild(layer);
    }
    const toast = node("div", `a6p-toast${tone ? ` is-${tone}` : ""}`, message);
    layer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function activeSession() {
    if (!state) return null;
    return state.sessions[state.activeTab] || null;
  }

  function newSession(tab) {
    return {
      tab,
      events: [],
      messages: [],
      scratch: new A6P.Scratch(),
      busy: false,
      controller: null,
      live: null,
      lastScore: null,
      lastResult: null,
      runCount: 0,
      generation: state?.generation || 0,
    };
  }

  function sessionFor(tab) {
    if (!state.sessions[tab]) state.sessions[tab] = newSession(tab);
    return state.sessions[tab];
  }

  function resetSession(tab) {
    const previous = state.sessions[tab];
    if (previous?.busy && previous.controller) previous.controller.abort();
    state.sessions[tab] = newSession(tab);
    return state.sessions[tab];
  }

  function eventNodeId(event) {
    if (!event.id) event.id = A6P.makeId("evt");
    return event.id;
  }

  function addEvent(session, event) {
    if (!event.id) event.id = A6P.makeId("evt");
    session.events.push(event);
    if (state && state.activeTab === session.tab && state.refs?.transcript) {
      const el = renderEvent(event, session);
      state.refs.transcript.appendChild(el);
      scrollBody();
    }
    return event;
  }

  function removeEvent(session, event) {
    session.events = session.events.filter((item) => item !== event);
    if (state && state.activeTab === session.tab && state.refs?.transcript) {
      const el = state.refs.transcript.querySelector(`[data-event-id="${event.id}"]`);
      if (el) el.remove();
    }
  }

  function updateEvent(session, event) {
    if (state && state.activeTab === session.tab && state.refs?.transcript) {
      const el = state.refs.transcript.querySelector(`[data-event-id="${event.id}"]`);
      if (el) {
        const fresh = renderEvent(event, session);
        el.replaceWith(fresh);
      }
    }
  }

  function updateLiveEvent(session, event) {
    if (!state || state.activeTab !== session.tab || !state.refs?.transcript) return;
    const wrap = state.refs.transcript.querySelector(`[data-event-id="${event.id}"]`);
    if (!wrap) return;
    if (event.type === "assistant") {
      const text = wrap.querySelector(".a6p-assistant-text");
      if (text) {
        text.textContent = event.text || "";
        text.classList.toggle("is-streaming", !!event.streaming);
      }
      const meta = wrap.querySelector(".a6p-assistant-meta");
      if (meta && event.meta) meta.textContent = event.meta;
      return;
    }
    if (event.type === "status") {
      const textNode = [...wrap.childNodes].find((child) => child.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = event.text || "";
      else {
        const fresh = renderEvent(event, session);
        wrap.replaceWith(fresh);
      }
    }
  }

  function autoScrollIfNearBottom() {
    const body = state?.refs?.body;
    if (!body) return;
    if (body.scrollHeight - body.scrollTop - body.clientHeight < 160) {
      body.scrollTop = body.scrollHeight;
    }
  }

  function scheduleEventPaint(session, event) {
    if (!state || state.activeTab !== session.tab) return;
    if (!session.paintEvents) session.paintEvents = new Set();
    session.paintEvents.add(event);
    if (session.paintFrame) return;
    session.paintFrame = requestAnimationFrame(() => {
      session.paintFrame = null;
      if (!state || state.activeTab !== session.tab) {
        session.paintEvents?.clear();
        return;
      }
      const events = session.paintEvents ? [...session.paintEvents] : [];
      session.paintEvents?.clear();
      for (const item of events) updateLiveEvent(session, item);
      autoScrollIfNearBottom();
    });
  }

  function scrollBody() {
    if (!state?.refs?.body) return;
    const body = state.refs.body;
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  function renderEvent(event, session) {
    const wrap = node("div", "a6p-event");
    wrap.dataset.eventId = event.id || (event.id = A6P.makeId("evt"));
    if (event.type === "run") {
      wrap.className = `a6p-run-line is-${event.status || "running"}`;
      wrap.appendChild(document.createTextNode(`Run ${event.number || 1} · ${event.probe?.name || "Probe"}`));
      const status = node("span", "a6p-run-status", event.status === "running" ? "running" : event.status === "success" ? "complete" : "failed");
      wrap.appendChild(status);
      if (event.durationMs) wrap.appendChild(node("span", "a6p-run-time", A6P.formatDuration(event.durationMs)));
      return wrap;
    }
    if (event.type === "prompt") {
      const details = document.createElement("details");
      details.className = "a6p-prompt";
      const summary = document.createElement("summary");
      summary.textContent = event.label || "View prompt";
      details.appendChild(summary);
      const pre = node("pre", "", event.text || "");
      details.appendChild(pre);
      wrap.appendChild(details);
      return wrap;
    }
    if (event.type === "user") {
      wrap.className = "a6p-user-event";
      wrap.appendChild(node("div", "a6p-user-label", event.synthetic ? "Probe prompt" : "You"));
      const bubble = node("div", "a6p-user-bubble", event.text || "");
      wrap.appendChild(bubble);
      if (event.attachments?.length) {
        const thumbs = node("div", "a6p-user-thumbs");
        for (const attachment of event.attachments) {
          const img = document.createElement("img");
          img.src = attachment.dataUrl;
          img.alt = attachment.name || "attachment";
          thumbs.appendChild(img);
        }
        wrap.appendChild(thumbs);
      }
      return wrap;
    }
    if (event.type === "assistant") {
      wrap.className = "a6p-assistant";
      wrap.appendChild(node("div", "a6p-avatar", "A6"));
      const copy = node("div", "a6p-assistant-copy");
      const text = node("div", `a6p-assistant-text${event.streaming ? " is-streaming" : ""}`, event.text || "");
      copy.appendChild(text);
      if (event.meta) copy.appendChild(node("div", "a6p-assistant-meta", event.meta));
      wrap.appendChild(copy);
      return wrap;
    }
    if (event.type === "status") {
      wrap.className = `a6p-status-event${event.done ? " is-done" : ""}`;
      if (!event.done) wrap.appendChild(node("span", "a6p-spinner"));
      wrap.appendChild(document.createTextNode(event.text || "Working…"));
      return wrap;
    }
    if (event.type === "error") {
      wrap.className = "a6p-error-card";
      wrap.textContent = event.text || "Something went wrong.";
      return wrap;
    }
    if (event.type === "tool") {
      wrap.appendChild(renderTool(event));
      return wrap;
    }
    if (event.type === "score") {
      wrap.appendChild(renderScore(event));
      return wrap;
    }
    return wrap;
  }

  function toolMeta(event) {
    if (event.action === "write" && event.artifact) return `Wrote ${A6P.formatBytes(event.artifact.bytes)}`;
    if (event.action === "read" && event.artifact) return `Read ${A6P.formatBytes(event.artifact.bytes)}`;
    if (event.action === "list") return `${event.files?.length || 0} file(s)`;
    if (event.action === "error") return "Error";
    return "";
  }

  function renderTool(event) {
    if (event.action === "list") {
      const card = node("div", "a6p-list-card");
      const files = event.files || [];
      card.textContent = files.length ? files.map((file) => `${file.path} · ${A6P.formatBytes(file.bytes)}`).join("\n") : "Browser scratch directory is empty.";
      return card;
    }
    if (event.action === "error") {
      const error = node("div", "a6p-error-card", event.message || "The tool call failed.");
      return error;
    }
    if (!event.artifact) {
      return node("div", "a6p-status-event", event.tool || "Tool call");
    }
    return artifactCard(event.artifact, event.action || "write");
  }

  function artifactCard(artifact, action) {
    const card = node("div", "a6p-tool-card");
    const head = node("div", "a6p-tool-head");
    head.appendChild(icon("check", 14));
    head.appendChild(node("span", "a6p-tool-name", artifact.path));
    head.appendChild(node("span", "a6p-tool-meta", action === "read" ? `Read ${A6P.formatBytes(artifact.bytes)}` : `Wrote ${A6P.formatBytes(artifact.bytes)}`));
    card.appendChild(head);

    const body = node("div", "a6p-tool-body");
    const preview = node("div", "a6p-tool-preview");
    if (artifact.kind === "svg") {
      const img = document.createElement("img");
      img.alt = artifact.path;
      const dataUrl = A6P.svgToDataUrl(artifact.content);
      if (!dataUrl) {
        preview.appendChild(node("pre", "", artifact.content.slice(0, 5000)));
      } else {
        img.src = dataUrl;
        preview.appendChild(img);
      }
    } else if (artifact.kind === "html") {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "");
      frame.setAttribute("loading", "lazy");
      frame.srcdoc = A6P.prepareHtmlPreview(artifact.content);
      preview.appendChild(frame);
      body.appendChild(preview);
      body.appendChild(node("div", "a6p-tool-note", "Scripts do not run in the preview."));
    } else {
      preview.appendChild(node("pre", "", artifact.content.slice(0, 5000)));
    }
    if (!body.contains(preview)) body.appendChild(preview);
    card.appendChild(body);

    const foot = node("div", "a6p-tool-foot");
    foot.appendChild(icon("folder", 12));
    foot.appendChild(node("span", "", "Browser scratch directory"));
    foot.appendChild(node("span", "a6p-spacer"));
    const open = button("a6p-mini-btn", "Open", "external", 11);
    open.addEventListener("click", () => openArtifactLayer(artifact));
    foot.appendChild(open);
    const download = button("a6p-mini-btn", "Download", "download", 11);
    download.addEventListener("click", () => downloadArtifact(artifact));
    foot.appendChild(download);
    card.appendChild(foot);
    return card;
  }

  function scoreTone(score) {
    return score?.verdict || (score?.score >= 85 ? "strong" : score?.score >= 65 ? "fair" : score?.score > 0 ? "weak" : "failed");
  }

  function formatUsage(usage) {
    if (!usage || typeof usage !== "object") return "—";
    const input = usage.input_tokens ?? usage.prompt_tokens;
    const output = usage.output_tokens ?? usage.completion_tokens;
    if (typeof input === "number" || typeof output === "number") {
      return `${typeof input === "number" ? input : "—"} in / ${typeof output === "number" ? output : "—"} out`;
    }
    if (typeof usage.total_tokens === "number") return `${usage.total_tokens} total`;
    return "—";
  }

  function formatTokenTotal(usage) {
    if (!usage || typeof usage !== "object") return "—";
    if (typeof usage.total_tokens === "number") return String(usage.total_tokens);
    const input = usage.input_tokens ?? usage.prompt_tokens;
    const output = usage.output_tokens ?? usage.completion_tokens;
    if (typeof input === "number" && typeof output === "number") return String(input + output);
    return "—";
  }

  function renderCandyScore(event) {
    const result = event.result || {};
    const score = event.score || result.score || {};
    const correct = score.correct === true || score.verdict === "strong";
    const card = node("div", "a6p-candy-card");
    const head = node("div", "a6p-candy-head");
    const mark = node("span", `a6p-candy-mark${correct ? " is-pass" : ""}`);
    mark.appendChild(icon(correct ? "check" : "cross", 13));
    head.appendChild(mark);
    head.appendChild(node("span", "a6p-candy-id", `#${event.listingId ?? state?.info?.listingId ?? "—"}`));
    head.appendChild(node("span", "a6p-candy-time", A6P.formatTime(event.startedAt || Date.now())));
    head.appendChild(node("span", `a6p-candy-status ${correct ? "is-pass" : "is-fail"}`, correct ? "Passed" : "Failed"));
    const tokenTotal = formatTokenTotal(result.usage);
    head.appendChild(
      node(
        "span",
        "a6p-candy-meta",
        `${A6P.formatDuration(result.durationMs || 0)}${tokenTotal !== "—" ? ` · Tokens: ${tokenTotal}` : ""}`
      )
    );
    card.appendChild(head);

    const body = node("div", "a6p-candy-body");
    body.appendChild(
      node(
        "div",
        "a6p-candy-summary",
        correct ? "The answer matches the expected result." : "The answer is inconsistent with the truth."
      )
    );
    body.appendChild(node("div", "a6p-candy-label", "Model answer"));
    body.appendChild(node("div", "a6p-candy-answer", result.reply || "(no answer)"));
    body.appendChild(node("div", "a6p-candy-label", "Prompt"));
    body.appendChild(node("pre", "a6p-candy-prompt", event.prompt || result.probe?.prompt || "(prompt unavailable)"));
    const expected = node("div", "a6p-candy-expected");
    expected.appendChild(document.createTextNode("Expected answer"));
    expected.appendChild(node("b", "", String(event.expectedAnswer ?? score.expectedAnswer ?? A6P.CANDY_EXPECTED)));
    if (score.actualAnswer !== null && score.actualAnswer !== undefined) {
      expected.appendChild(node("span", "", `· model answered ${score.actualAnswer}`));
    }
    body.appendChild(expected);
    if (Array.isArray(score.checks) && score.checks.length) {
      const details = document.createElement("details");
      details.className = "a6p-candy-details";
      const passed = score.checks.filter((check) => check.ok).length;
      const summary = document.createElement("summary");
      summary.textContent = `Checks · ${passed}/${score.checks.length} passed`;
      details.appendChild(summary);
      const grid = node("div", "a6p-checks");
      for (const check of score.checks) {
        const row = node("div", `a6p-check ${check.ok ? "is-ok" : "is-bad"}`);
        row.appendChild(icon(check.ok ? "check" : "cross", 12));
        const labelText = node("span", "a6p-check-text", check.label);
        if (check.detail) labelText.title = check.detail;
        row.appendChild(labelText);
        row.appendChild(node("span", "a6p-check-points", `+${check.points ?? 0}`));
        grid.appendChild(row);
      }
      details.appendChild(grid);
      body.appendChild(details);
    }
    card.appendChild(body);
    return card;
  }

  function renderScore(event) {
    if (event.probeId === "candy") return renderCandyScore(event);
    const result = event.result || {};
    const score = event.score || result.score || { score: 0, checks: [], summary: "" };
    const tone = scoreTone(score);
    const card = node("div", "a6p-score-card");
    const head = node("div", "a6p-score-head");
    const value = node("div", "a6p-score-value");
    value.appendChild(node("span", "a6p-score-number", String(score.score ?? 0)));
    value.appendChild(node("span", "a6p-score-denom", "/100"));
    head.appendChild(value);
    const copy = node("div", "a6p-score-copy");
    const label = node("div", "a6p-score-label");
    label.appendChild(document.createTextNode("Probe score"));
    const verdict = node("span", `a6p-verdict-pill is-${tone}`, tone);
    label.appendChild(verdict);
    copy.appendChild(label);
    copy.appendChild(node("div", "a6p-score-summary", score.summary || ""));
    head.appendChild(copy);
    card.appendChild(head);

    const metrics = node("div", "a6p-score-metrics");
    const addMetric = (labelText, valueText) => {
      const span = node("span", "");
      span.appendChild(node("b", "", valueText));
      span.appendChild(document.createTextNode(` ${labelText}`));
      metrics.appendChild(span);
    };
    addMetric("latency", A6P.formatDuration(result.durationMs || 0));
    if (Number.isFinite(result.firstByteMs)) addMetric("first byte", A6P.formatDuration(result.firstByteMs));
    addMetric("transport", result.mode === "stream" ? "SSE stream" : "JSON");
    if (result.usage) addMetric("tokens", formatUsage(result.usage));
    if (result.modelCalls) addMetric(result.modelCalls === 1 ? "call" : "calls", String(result.modelCalls));
    if (result.toolsUsed) addMetric(result.toolsUsed === 1 ? "tool" : "tools", String(result.toolsUsed));
    const fileCount = (result.files || result.artifacts || []).length;
    if (fileCount) addMetric(fileCount === 1 ? "file" : "files", String(fileCount));
    card.appendChild(metrics);

    if (Array.isArray(score.checks) && score.checks.length) {
      const details = document.createElement("details");
      details.className = "a6p-score-details";
      const passed = score.checks.filter((check) => check.ok).length;
      const summary = document.createElement("summary");
      summary.textContent = `Checks · ${passed}/${score.checks.length} passed`;
      details.appendChild(summary);
      const grid = node("div", "a6p-checks");
      for (const check of score.checks) {
        const row = node("div", `a6p-check ${check.ok ? "is-ok" : "is-bad"}`);
        row.appendChild(icon(check.ok ? "check" : "cross", 12));
        const labelText = node("span", "a6p-check-text", check.label);
        if (check.detail) labelText.title = check.detail;
        row.appendChild(labelText);
        row.appendChild(node("span", "a6p-check-points", `+${check.points ?? 0}`));
        grid.appendChild(row);
      }
      details.appendChild(grid);
      card.appendChild(details);
    }
    return card;
  }

  function mimeForArtifact(artifact) {
    if (artifact.kind === "svg") return "image/svg+xml";
    if (artifact.kind === "html") return "text/html";
    if (artifact.kind === "css") return "text/css";
    if (artifact.kind === "js") return "text/javascript";
    if (artifact.kind === "json") return "application/json";
    if (artifact.kind === "md") return "text/markdown";
    return "text/plain";
  }

  function downloadArtifact(artifact) {
    const blob = new Blob([artifact.content || ""], { type: mimeForArtifact(artifact) });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = A6P.safeFileName(artifact.path.split("/").pop(), "artifact.txt");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }

  function openLayer(title, bodyNode, actions = []) {
    if (!state?.refs?.layer) return;
    const layer = state.refs.layer;
    clearNode(layer);
    const card = node("div", "a6p-layer-card");
    const head = node("div", "a6p-layer-head");
    head.appendChild(node("div", "a6p-layer-title", title));
    const close = button("a6p-icon-btn", "", "close", 17);
    close.style.marginLeft = "auto";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeLayer);
    head.appendChild(close);
    card.appendChild(head);
    const body = node("div", "a6p-layer-body");
    body.appendChild(bodyNode);
    card.appendChild(body);
    if (actions.length) {
      const foot = node("div", "a6p-layer-actions");
      for (const action of actions) foot.appendChild(action);
      card.appendChild(foot);
    }
    layer.appendChild(card);
    layer.classList.add("is-open");
  }

  function closeLayer() {
    if (!state?.refs?.layer) return;
    state.refs.layer.classList.remove("is-open");
    clearNode(state.refs.layer);
  }

  function openArtifactLayer(artifact) {
    const body = node("div", "");
    if (artifact.kind === "svg") {
      const img = document.createElement("img");
      img.alt = artifact.path;
      const dataUrl = A6P.svgToDataUrl(artifact.content);
      if (dataUrl) img.src = dataUrl;
      else body.appendChild(node("pre", "", artifact.content || "Invalid SVG"));
      if (dataUrl) body.appendChild(img);
    } else if (artifact.kind === "html") {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "");
      frame.srcdoc = A6P.prepareHtmlPreview(artifact.content);
      body.appendChild(frame);
    } else {
      body.appendChild(node("pre", "", artifact.content || ""));
    }
    const download = button("a6p-mini-btn", "Download", "download", 12);
    download.addEventListener("click", () => downloadArtifact(artifact));
    openLayer(artifact.path, body, [download]);
  }

  function openScratchLayer(session) {
    const body = node("div", "a6p-scratch-list");
    const files = session.scratch.list();
    if (!files.length) {
      body.appendChild(node("div", "a6p-empty", "No files in the scratch directory yet."));
    } else {
      for (const file of files) {
        const row = node("div", "a6p-scratch-item");
        row.appendChild(icon(file.kind === "html" ? "code" : file.kind === "svg" ? "pelican" : "folder", 14));
        row.appendChild(node("span", "", file.path));
        row.appendChild(node("span", "a6p-scratch-meta", A6P.formatBytes(file.bytes)));
        const open = button("a6p-mini-btn", "Open", "external", 11);
        open.addEventListener("click", () => openArtifactLayer(file));
        row.appendChild(open);
        const download = button("a6p-mini-btn", "Download", "download", 11);
        download.addEventListener("click", () => downloadArtifact(file));
        row.appendChild(download);
        body.appendChild(row);
      }
    }
    openLayer("Browser scratch directory", body, []);
  }

  // ---------- overlay shell ----------

  function buildShell() {
    const shell = node("div", "a6p-shell");
    const backdrop = node("div", "a6p-backdrop");
    backdrop.addEventListener("click", () => closeProbe());
    shell.appendChild(backdrop);
    const modal = node("section", "a6p-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Probe detection");

    const topbar = node("header", "a6p-topbar");
    const identity = node("div", "a6p-identity");
    const conv = node("span", "a6p-conv", `#${state.info.listingId}`);
    const score = button("a6p-score-pill is-none", "not tested", "", 0);
    score.disabled = false;
    const model = node("span", "a6p-model", state.info.model);
    model.title = [state.info.model, state.info.supplier, `channel #${state.info.channelId}`].filter(Boolean).join(" · ");
    const brandMark = node("span", "a6p-brand-mark");
    brandMark.appendChild(icon("flask", 19));
    identity.appendChild(brandMark);
    identity.appendChild(model);
    identity.appendChild(conv);
    identity.appendChild(score);
    identity.appendChild(node("span", "a6p-kind-pill", "Probe detection"));
    topbar.appendChild(identity);
    const topActions = node("div", "a6p-top-actions");
    const close = button("a6p-icon-btn a6p-close-btn", "", "close", 18);
    close.setAttribute("aria-label", "Close probe detection");
    close.addEventListener("click", closeProbe);
    topActions.appendChild(close);
    topbar.appendChild(topActions);
    modal.appendChild(topbar);

    const tabs = node("nav", "a6p-tabs");
    tabs.setAttribute("aria-label", "Probe tests");
    for (const probe of PROBES) {
      const tab = button("a6p-tab", probe.name, probe.icon, 14);
      tab.dataset.probe = probe.id;
      tab.addEventListener("click", () => selectTab(probe.id));
      tabs.appendChild(tab);
    }
    modal.appendChild(tabs);

    const body = node("main", "a6p-body");
    const center = node("div", "a6p-center");
    body.appendChild(center);
    modal.appendChild(body);

    const composerWrap = node("footer", "a6p-composer-wrap");
    const composer = node("div", "a6p-composer");
    const attachments = node("div", "a6p-attachments");
    composer.appendChild(attachments);
    const textarea = document.createElement("textarea");
    textarea.rows = 1;
    textarea.setAttribute("aria-label", "Message");
    textarea.placeholder = "Ask the channel anything, or ask it to write a file…";
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(160, textarea.scrollHeight)}px`;
      updateComposer();
    });
    textarea.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        sendComposer();
      }
    });
    composer.appendChild(textarea);
    const row = node("div", "a6p-composer-row");
    const tools = node("div", "a6p-composer-tools");
    const attach = button("a6p-icon-btn", "", "attach", 15);
    attach.title = "Attach images";
    attach.setAttribute("aria-label", "Attach images");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.className = "a6p-hidden";
    fileInput.addEventListener("change", handleFiles);
    attach.addEventListener("click", () => fileInput.click());
    tools.appendChild(attach);
    tools.appendChild(fileInput);
    const folder = button("a6p-icon-btn", "", "folder", 15);
    folder.title = "Browser scratch directory";
    folder.setAttribute("aria-label", "Open scratch directory");
    folder.addEventListener("click", () => openScratchLayer(sessionFor(state.activeTab)));
    tools.appendChild(folder);
    const gear = button("a6p-icon-btn", "", "gear", 15);
    gear.title = "Extension settings";
    gear.setAttribute("aria-label", "Extension settings");
    gear.addEventListener("click", () => {
      try {
        chrome.runtime.sendMessage({ type: "a6p:openOptions" });
      } catch {
        // Ignore.
      }
    });
    tools.appendChild(gear);
    const trash = button("a6p-icon-btn", "", "trash", 15);
    trash.title = "Clear this session";
    trash.setAttribute("aria-label", "Clear this session");
    trash.addEventListener("click", () => requestClear(trash));
    tools.appendChild(trash);
    row.appendChild(tools);
    const statusText = node("span", "a6p-status-text", "");
    row.appendChild(statusText);
    const send = button("a6p-send-btn", "", "send", 15);
    send.setAttribute("aria-label", "Send message");
    send.addEventListener("click", sendComposer);
    row.appendChild(send);
    composer.appendChild(row);
    composerWrap.appendChild(composer);
    const fineprint = node("div", "a6p-fineprint");
    fineprint.innerHTML = "Local probe UI · every run makes a real request billed to your <b>A6API</b> token";
    composerWrap.appendChild(fineprint);
    modal.appendChild(composerWrap);
    shell.appendChild(modal);

    const layer = node("div", "a6p-layer");
    layer.addEventListener("click", (event) => {
      if (event.target === layer) closeLayer();
    });
    shell.appendChild(layer);
    const toastLayer = node("div", "a6p-toast-layer");
    shell.appendChild(toastLayer);

    return {
      shell,
      backdrop,
      modal,
      topbar,
      identity,
      conv,
      score,
      model,
      tabs,
      body,
      center,
      composer,
      attachments,
      textarea,
      attach,
      folder,
      gear,
      trash,
      send,
      statusText,
      fineprint,
      layer,
      toastLayer,
    };
  }

  function updateHeader() {
    if (!state?.refs) return;
    const session = activeSession();
    const score = session?.lastScore;
    const pill = state.refs.score;
    pill.className = "a6p-score-pill";
    if (!score) {
      pill.classList.add("is-none");
      pill.textContent = "not tested";
      pill.title = "Run a probe to compute a local signal score";
      return;
    }
    const tone = scoreTone(score);
    pill.classList.add(`is-${tone}`);
    pill.textContent = `${Math.round(score.score)}% signal`;
    pill.title = `${score.summary || ""} · local heuristic, not proof of model identity`;
  }

  function updateTabs() {
    if (!state?.refs) return;
    for (const tab of state.refs.tabs.querySelectorAll(".a6p-tab")) {
      const isActive = tab.dataset.probe === state.activeTab;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      const session = state.sessions[tab.dataset.probe];
      const oldBusy = tab.querySelector(".a6p-tab-busy");
      if (session?.busy) {
        if (!oldBusy) tab.appendChild(node("span", "a6p-tab-busy"));
      } else if (oldBusy) {
        oldBusy.remove();
      }
    }
  }

  function updateComposer() {
    if (!state?.refs) return;
    const session = activeSession();
    const text = state.refs.textarea.value.trim();
    const busy = !!session?.busy;
    const canAuth = hasAuthReady();
    const canProbe = supportsTextEndpoint();
    state.refs.send.disabled = busy || !canAuth || !canProbe || (!text && !state.attachments.length);
    state.refs.attach.disabled = busy;
    state.refs.trash.disabled = busy || !session?.events.length;
    state.refs.textarea.disabled = busy;
    if (busy) {
      state.refs.statusText.textContent = session.statusText || "Working…";
    } else if (!canProbe) {
      state.refs.statusText.textContent = `Text probes unavailable · ${endpointLabel()} endpoint`;
    } else {
      const auth = authSummary();
      const promptChars = state.refs.textarea.value.trim().length;
      const suffix = promptChars > 4000 ? ` · long prompt ${promptChars.toLocaleString()} chars` : "";
      state.refs.statusText.textContent = `${auth || "Ready"}${suffix}`;
      state.refs.statusText.title = `${auth || "Ready"}${suffix}`;
    }
    const probe = A6P.getProbe(state.activeTab);
    state.refs.textarea.placeholder =
      probe.kind === "custom"
        ? "Ask the channel anything, or ask it to write a file…"
        : "Send a follow-up to this probe…";
  }

  function supportsTextEndpoint(info = state?.info) {
    const endpoint = String(info?.endpoint || "chat").toLowerCase();
    return endpoint === "" || endpoint === "chat" || endpoint === "responses";
  }

  function endpointLabel(info = state?.info) {
    return String(info?.endpoint || "chat");
  }

  function hasAuthReady() {
    if (!state) return false;
    if (state.tokensLoading) return false;
    if (String(state.settings.apiKey || "").trim()) return true;
    return state.tokens.some((token) => A6P.isTokenUsable(token));
  }

  function authSummary() {
    if (!state) return "";
    if (state.tokensLoading) return "Finding A6API tokens…";
    if (state.useManual && state.settings.apiKey) return "Manual API key";
    const token = state.tokens.find((item) => String(item.id) === String(state.tokenId));
    if (token) return `${A6P.tokenLabel(token)} · billed`;
    if (state.settings.apiKey) return "Manual API key";
    if (state.tokenError) return "No token · add a key";
    return "No token selected";
  }

  function updateAuthNote(container) {
    if (!container) return;
    clearNode(container);
    container.className = "a6p-auth-note";
    if (!supportsTextEndpoint()) {
      container.className = "a6p-auth-note is-bad";
      container.textContent = `This channel exposes the "${endpointLabel()}" endpoint. A6 Prober currently sends chat and responses text probes.`;
      return;
    }
    if (state.tokensLoading) {
      container.textContent = "Finding tokens from your A6API session…";
      return;
    }
    if (state.useManual && state.settings.apiKey) {
      container.textContent = "Using the manual API key saved in extension settings.";
      return;
    }
    const token = state.tokens.find((item) => String(item.id) === String(state.tokenId));
    if (token && A6P.isTokenUsable(token)) {
      container.textContent = `Billed to ${A6P.tokenLabel(token)} · auto-detected from your A6API session.`;
      return;
    }
    if (state.settings.apiKey) {
      container.textContent = "Using the manual API key saved in extension settings.";
      return;
    }
    container.className = "a6p-auth-note is-warn";
    container.textContent = state.tokenError
      ? `Automatic tokens unavailable (${A6P.truncate(state.tokenError, 120)}). Add an API key below, or log in to A6API and reopen this panel.`
      : "No token found. Log in to A6API to auto-detect a token, or paste an API key below.";
    const keyRow = node("div", "a6p-key-row");
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "off";
    input.placeholder = "sk-… (stored locally)";
    input.setAttribute("aria-label", "A6API API key");
    const save = node("button", "", "Save key");
    save.type = "button";
    save.addEventListener("click", async () => {
      const value = input.value.trim();
      if (!value) return;
      state.settings.apiKey = value;
      state.useManual = true;
      try {
        await A6P.saveSettings({ apiKey: value, tokenMode: "manual" });
        showToast("API key saved locally.");
        renderActiveTab();
      } catch (error) {
        showToast(`Could not save key: ${error.message}`, "bad");
      }
    });
    keyRow.appendChild(input);
    keyRow.appendChild(save);
    const retry = node("button", "", "Retry");
    retry.type = "button";
    retry.title = "Retry automatic token detection";
    retry.addEventListener("click", () => loadTokens());
    keyRow.appendChild(retry);
    container.appendChild(keyRow);
  }

  function tokenOptionsMarkup() {
    const options = [];
    if (state.settings.apiKey) {
      options.push({ value: "manual", label: "Manual API key" });
    }
    for (const token of state.tokens) {
      const usable = A6P.isTokenUsable(token);
      options.push({
        value: String(token.id),
        label: `${token.name} (#${token.id})${usable ? "" : " · unavailable"}`,
        disabled: !usable,
      });
    }
    if (!options.length) options.push({ value: "", label: state.tokensLoading ? "Loading tokens…" : "No tokens found", disabled: false });
    return options;
  }

  function makeTokenSelect() {
    const select = document.createElement("select");
    select.className = "a6p-select";
    select.setAttribute("aria-label", "A6API token");
    for (const option of tokenOptionsMarkup()) {
      const el = document.createElement("option");
      el.value = option.value;
      el.textContent = option.label;
      if (option.disabled) el.disabled = true;
      select.appendChild(el);
    }
    const selected = state.useManual ? "manual" : state.tokenId;
    if ([...select.options].some((option) => option.value === selected && !option.disabled)) select.value = selected;
    select.disabled = state.tokensLoading || (!state.tokens.length && !state.settings.apiKey);
    select.addEventListener("change", async () => {
      if (select.value === "manual") {
        state.useManual = true;
        state.tokenId = "";
        await A6P.saveSettings({ tokenMode: "manual" });
      } else {
        state.useManual = false;
        state.tokenId = select.value;
        await A6P.saveSettings({ tokenMode: "auto", preferredTokenId: select.value });
      }
      renderActiveTab();
    });
    return select;
  }

  function buildIntro(probe) {
    const intro = node("div", "a6p-intro");
    const head = node("div", "a6p-intro-head");
    const mark = node("div", "a6p-probe-mark");
    mark.appendChild(icon(probe.icon, 19));
    head.appendChild(mark);
    const copy = node("div", "");
    copy.appendChild(node("h2", "", probe.name));
    copy.appendChild(node("p", "", probe.description));
    head.appendChild(copy);
    intro.appendChild(head);

    const chips = node("div", "a6p-chips");
    for (const meta of probe.meta || []) chips.appendChild(node("span", "a6p-chip", meta));
    intro.appendChild(chips);

    const prompt = probe.kind === "steps" ? probe.steps.join("\n\n---\n\n") : probe.prompt;
    if (prompt) {
      const details = document.createElement("details");
      details.className = "a6p-prompt-details";
      const summary = document.createElement("summary");
      summary.textContent = probe.kind === "steps" ? "View both prompts" : "View prompt";
      details.appendChild(summary);
      details.appendChild(node("pre", "", prompt));
      intro.appendChild(details);
    }

    const runRow = node("div", "a6p-run-row");
    const tokenField = node("label", "a6p-token-field");
    tokenField.appendChild(node("span", "", "Token"));
    tokenField.appendChild(makeTokenSelect());
    runRow.appendChild(tokenField);
    const run = button("a6p-run-btn", "Run probe", "arrow", 14);
    run.disabled = !hasAuthReady() || !supportsTextEndpoint();
    run.title = !supportsTextEndpoint()
      ? `This channel exposes the "${endpointLabel()}" endpoint; text probes are unavailable`
      : run.disabled
        ? "Log in to A6API or add an API key to run this probe"
        : "";
    run.addEventListener("click", runFixedProbe);
    runRow.appendChild(run);
    const stop = button("a6p-stop-btn a6p-hidden", "Stop", "stop", 12);
    stop.addEventListener("click", stopActiveRun);
    runRow.appendChild(stop);
    intro.appendChild(runRow);
    const auth = node("div", "a6p-auth-note");
    intro.appendChild(auth);
    updateAuthNote(auth);
    return { intro, run, stop };
  }

  function buildCustomStrip() {
    const strip = node("div", "a6p-channel-strip");
    const dot = node("span", "a6p-dot is-live");
    strip.appendChild(dot);
    strip.appendChild(node("span", "", `${state.info.supplier || state.info.channelName || "Channel"} · #${state.info.channelId}`));
    strip.appendChild(node("span", "", state.info.model));
    const select = makeTokenSelect();
    select.style.marginLeft = "auto";
    strip.appendChild(select);
    return strip;
  }

  function buildEmpty(probe) {
    const empty = node("div", "a6p-empty");
    const mark = node("div", "a6p-empty-mark");
    mark.appendChild(icon(probe.icon, 21));
    empty.appendChild(mark);
    if (probe.kind === "custom") {
      empty.appendChild(node("h3", "", "Probe this channel with your own test"));
      empty.appendChild(node("p", "", "Send a prompt below. If the model supports tools, ask it to write files and they will appear in the scratch directory with a live preview."));
      const suggestions = node("div", "a6p-suggestions");
      const prompts = [
        "Draw a pelican riding a bicycle as a detailed SVG.",
        "Create an animated HTML landing page for a small coffee brand.",
        "Write a self-contained SVG weather icon set and preview it.",
        "Test instruction following: reply with exactly the word ORBIT.",
      ];
      for (const prompt of prompts) {
        const chip = node("button", "a6p-suggestion", prompt);
        chip.type = "button";
        chip.addEventListener("click", () => {
          state.refs.textarea.value = prompt;
          state.refs.textarea.dispatchEvent(new Event("input"));
          state.refs.textarea.focus();
        });
        suggestions.appendChild(chip);
      }
      empty.appendChild(suggestions);
    } else {
      empty.appendChild(node("h3", "", "No probe run yet"));
      empty.appendChild(node("p", "", "Press Run probe to send the preset through this channel. The response, artifacts and a local signal score will appear here."));
    }
    return empty;
  }

  function renderActiveTab() {
    if (!state?.refs) return;
    updateTabs();
    updateHeader();
    const probe = A6P.getProbe(state.activeTab);
    const session = sessionFor(state.activeTab);
    const center = state.refs.center;
    clearNode(center);
    let runButton = null;
    let stopButton = null;
    if (probe.kind !== "custom") {
      const built = buildIntro(probe);
      center.appendChild(built.intro);
      runButton = built.run;
      stopButton = built.stop;
    } else {
      const strip = buildCustomStrip();
      center.appendChild(strip);
      const auth = node("div", "a6p-auth-note");
      auth.style.margin = "8px 2px 0";
      updateAuthNote(auth);
      center.appendChild(auth);
    }
    const transcript = node("div", "a6p-transcript");
    if (!session.events.length) transcript.appendChild(buildEmpty(probe));
    else for (const event of session.events) transcript.appendChild(renderEvent(event, session));
    center.appendChild(transcript);
    state.refs.transcript = transcript;
    state.refs.runButton = runButton;
    state.refs.stopButton = stopButton;
    if (session.busy) {
      if (runButton) runButton.disabled = true;
      if (stopButton) stopButton.classList.remove("a6p-hidden");
    }
    updateComposer();
    scrollBody();
  }

  function selectTab(probeId) {
    if (!state || state.activeTab === probeId) return;
    state.activeTab = probeId;
    state.attachments = [];
    renderActiveTab();
  }

  // ---------- auth and execution ----------

  async function loadTokens() {
    const current = state;
    if (!current) return;
    current.tokensLoading = true;
    updateComposer();
    try {
      const result = await API.discoverSession();
      if (state !== current) return;
      current.tokens = result.tokens;
      current.tokenError = result.error;
      current.loggedIn = result.loggedIn;
      const siteTokenId = API.readSiteTokenId ? API.readSiteTokenId() : "";
      const picked = API.pickToken(result.tokens, siteTokenId || current.settings.preferredTokenId, current.info.model);
      current.tokenId = picked ? String(picked.id) : "";
      current.useManual = (current.settings.tokenMode === "manual" && !!current.settings.apiKey) || (!picked && !!current.settings.apiKey);
    } catch (error) {
      if (state !== current) return;
      current.tokenError = error?.message || String(error);
    } finally {
      if (state !== current) return;
      current.tokensLoading = false;
      renderActiveTab();
    }
  }

  async function resolveAuth() {
    if (!state) throw new Error("The probe panel is closed.");
    if (state.tokensLoading && state.tokensPromise) await state.tokensPromise;
    const manual = String(state.settings.apiKey || "").trim();
    if (state.useManual && manual) return { key: manual, source: "manual" };
    const token = state.tokens.find((item) => String(item.id) === String(state.tokenId)) || API.pickToken(state.tokens, state.settings.preferredTokenId, state.info.model);
    if (token) {
      if (!A6P.isTokenUsable(token)) {
        if (manual) return { key: manual, source: "manual" };
        throw new Error("The selected token is inactive, expired or out of quota. Choose another token or add a key.");
      }
      const cached = state.tokenKeys.get(String(token.id));
      if (cached) return { key: cached, source: "token", token };
      try {
        const key = await API.getTokenKey(token.id);
        state.tokenKeys.set(String(token.id), key);
        if (!state.tokenId) state.tokenId = String(token.id);
        return { key, source: "token", token };
      } catch (error) {
        if (manual) return { key: manual, source: "manual" };
        throw new Error(`Could not retrieve the token key: ${error.message}`);
      }
    }
    if (manual) return { key: manual, source: "manual" };
    throw new Error("No A6API token is available. Log in to A6API, create a token, or add an API key in the input above.");
  }

  function setLiveStatus(session, text) {
    if (!session) return;
    session.statusText = text;
    if (state?.activeTab === session.tab && state.refs?.statusText) state.refs.statusText.textContent = text;
  }

  function handleProbeEvent(session, event, runEvent) {
    if (!state || session.generation !== modalGeneration) return;
    if (event.type === "run_start") {
      return;
    }
    if (event.type === "user") {
      const probe = A6P.getProbe(session.tab);
      if (probe.hidePrompt) return;
      addEvent(session, { type: "prompt", text: event.text, label: "Prompt · click to view" });
      return;
    }
    if (event.type === "status") {
      const text = event.text || "Working…";
      session.statusText = text;
      let statusEvent = session.events.findLast?.((item) => item.type === "status" && !item.done);
      if (!statusEvent) {
        for (let i = session.events.length - 1; i >= 0; i -= 1) {
          if (session.events[i].type === "status" && !session.events[i].done) {
            statusEvent = session.events[i];
            break;
          }
        }
      }
      if (!statusEvent) {
        statusEvent = addEvent(session, { type: "status", text, done: false });
      } else {
        statusEvent.text = text;
        scheduleEventPaint(session, statusEvent);
      }
      if (state.activeTab === session.tab && state.refs?.statusText) state.refs.statusText.textContent = text;
      updateComposer();
      return;
    }
    if (event.type === "reasoning") {
      const chars = Number(event.chars) || 0;
      const text = `Thinking · ${chars.toLocaleString()} chars`;
      session.statusText = text;
      let statusEvent = null;
      for (let i = session.events.length - 1; i >= 0; i -= 1) {
        if (session.events[i].type === "status" && !session.events[i].done) {
          statusEvent = session.events[i];
          break;
        }
      }
      if (!statusEvent) {
        statusEvent = addEvent(session, { type: "status", text, done: false });
      } else {
        statusEvent.text = text;
        scheduleEventPaint(session, statusEvent);
      }
      if (state.activeTab === session.tab && state.refs?.statusText) state.refs.statusText.textContent = text;
      return;
    }
    if (event.type === "heartbeat") {
      return;
    }
    if (event.type === "delta") {
      if (!session.live) {
        session.live = addEvent(session, { type: "assistant", text: event.text || "", streaming: true });
      } else {
        session.live.text = event.text || "";
        scheduleEventPaint(session, session.live);
      }
      const chars = Number(event.chars) || (event.text || "").length;
      setLiveStatus(session, `Streaming · ${chars} chars`);
      return;
    }
    if (event.type === "tool") {
      addEvent(session, {
        type: "tool",
        tool: event.tool,
        action: event.action,
        artifact: event.artifact || null,
        files: event.files || null,
        message: event.message || "",
        parsed: !!event.parsed,
      });
      setLiveStatus(session, event.artifact ? `${event.action === "read" ? "Read" : "Wrote"} ${event.artifact.path}` : "Tool call completed");
      return;
    }
  }

  function stopActiveRun() {
    const session = activeSession();
    if (!session?.controller) return;
    session.controller.abort(new DOMException("Stopped by user", "AbortError"));
  }

  async function saveRunHistory(record) {
    try {
      await A6P.addHistory(record, state?.settings?.historyLimit || A6P.DEFAULT_SETTINGS.historyLimit);
    } catch (error) {
      // History is best-effort and must never break a probe.
      console.warn("A6 Prober: could not save history", error);
    }
  }

  async function finalizeSuccess(session, runEvent, result, auth) {
    if (!state || session.generation !== modalGeneration) return;
    const probe = A6P.getProbe(state.activeTab);
    const resultProbe = result.probe || probe;
    const isCandy = resultProbe.id === "candy";
    if (session.live) {
      if (isCandy) {
        removeEvent(session, session.live);
      } else if (result.reply) {
        session.live.text = result.reply;
        session.live.streaming = false;
        session.live.meta = `${result.mode === "stream" ? "SSE" : "JSON"} · ${A6P.formatDuration(result.durationMs)}`;
        updateEvent(session, session.live);
      } else {
        removeEvent(session, session.live);
      }
      session.live = null;
    } else if (result.reply && !isCandy) {
      addEvent(session, {
        type: "assistant",
        text: result.reply,
        meta: `${result.mode === "stream" ? "SSE" : "JSON"} · ${A6P.formatDuration(result.durationMs)}`,
      });
    }

    session.messages = result.messages || session.messages;
    session.lastResult = result;
    session.lastScore = result.score;
    session.runCount += 1;
    const candyPassed = isCandy && result.score?.correct === true;
    runEvent.status = isCandy && !candyPassed ? "failed" : "success";
    runEvent.durationMs = result.durationMs;
    runEvent.score = result.score?.score;
    updateEvent(session, runEvent);

    for (const statusEvent of session.events.filter((item) => item.type === "status" && !item.done)) {
      statusEvent.done = true;
      statusEvent.text = "Complete";
      updateEvent(session, statusEvent);
    }

    addEvent(session, {
      type: "score",
      probeId: resultProbe.id,
      startedAt: runEvent.startedAt,
      listingId: state.info.listingId,
      prompt: resultProbe.prompt || "",
      expectedAnswer: result.score?.expectedAnswer ?? resultProbe.expectedAnswer ?? null,
      score: result.score,
      result: {
        ...result,
        files: session.scratch.list(),
      },
    });
    session.statusText = "";
    updateHeader();
    updateComposer();
    updateTabs();
    scrollBody();

    await saveRunHistory({
      id: A6P.makeId("run"),
      ts: Date.now(),
      probeId: resultProbe.id,
      probeName: resultProbe.name,
      model: state.info.model,
      channelId: state.info.channelId,
      listingId: state.info.listingId,
      supplier: state.info.supplier,
      channelName: state.info.channelName,
      endpoint: state.info.endpoint,
      status: isCandy && !candyPassed ? "failed" : "success",
      score: result.score?.score ?? 0,
      verdict: result.score?.verdict || "",
      expectedAnswer: result.score?.expectedAnswer ?? null,
      actualAnswer: result.score?.actualAnswer ?? null,
      correct: result.score?.correct ?? null,
      summary: result.score?.summary || "",
      durationMs: result.durationMs || 0,
      firstByteMs: result.firstByteMs ?? null,
      mode: result.mode || "",
      usage: result.usage || null,
      modelCalls: result.modelCalls || result.turns || 1,
      toolsUsed: result.toolsUsed || 0,
      reply: result.reply || "",
      checks: result.score?.checks || [],
      artifacts: session.scratch.toHistory(),
    });
  }

  async function finalizeError(session, runEvent, error) {
    if (!state || session.generation !== modalGeneration) return;
    const aborted = error?.name === "AbortError";
    const reason = session.controller?.signal?.reason;
    const timedOut = aborted && String(reason?.message || reason || "").toLowerCase().includes("timed out");
    const message = aborted
      ? timedOut
        ? `Probe timed out after ${state.settings.timeoutSec}s.`
        : "Probe stopped."
      : error?.message || String(error);
    if (session.live) {
      session.live.streaming = false;
      updateEvent(session, session.live);
      session.live = null;
    }
    for (const statusEvent of session.events.filter((item) => item.type === "status" && !item.done)) {
      statusEvent.done = true;
      statusEvent.text = timedOut ? "Timed out" : aborted ? "Stopped" : "Failed";
      updateEvent(session, statusEvent);
    }
    addEvent(session, { type: "error", text: message });
    runEvent.status = "failed";
    runEvent.durationMs = Date.now() - (runEvent.startedAt || Date.now());
    updateEvent(session, runEvent);
    session.lastScore = { score: 0, verdict: "failed", summary: message };
    session.statusText = "";
    updateHeader();
    updateComposer();
    updateTabs();
    await saveRunHistory({
      id: A6P.makeId("run"),
      ts: Date.now(),
      probeId: runEvent.probe?.id || A6P.getProbe(state.activeTab).id,
      probeName: runEvent.probe?.name || A6P.getProbe(state.activeTab).name,
      model: state.info.model,
      channelId: state.info.channelId,
      listingId: state.info.listingId,
      supplier: state.info.supplier,
      channelName: state.info.channelName,
      endpoint: state.info.endpoint,
      status: timedOut ? "timeout" : aborted ? "stopped" : "failed",
      score: 0,
      verdict: "failed",
      summary: message,
      durationMs: runEvent.durationMs,
      mode: "",
      usage: null,
      artifacts: session.scratch.toHistory(),
    });
  }

  async function executeProbe({ probeId, session, prompt = "", userContent = null, messages = null, tools = null, emitUser = true, userEventData = null }) {
    if (!state || !session || session.busy) return;
    const probe = A6P.getProbe(probeId);
    const controller = new AbortController();
    session.busy = true;
    session.controller = controller;
    session.live = null;
    session.statusText = "Resolving token…";
    session.runStartedAt = Date.now();
    session.elapsedTimer = setInterval(() => {
      if (!state || session.generation !== modalGeneration) return;
      if (!session.busy || state.activeTab !== session.tab) return;
      if (state.refs?.statusText) {
        const base = session.statusText || "Working…";
        state.refs.statusText.textContent = `${base} · ${A6P.formatDuration(Date.now() - session.runStartedAt)}`;
      }
    }, 1000);
    session.runCount += 1;
    const runEvent = addEvent(session, {
      type: "run",
      number: session.runCount,
      probe,
      status: "running",
      startedAt: Date.now(),
    });
    if (userEventData) {
      addEvent(session, {
        type: "user",
        text: userEventData.text || "",
        attachments: userEventData.attachments || [],
      });
    }
    updateTabs();
    updateComposer();
    if (state.refs.runButton) state.refs.runButton.disabled = true;
    if (state.refs.stopButton) state.refs.stopButton.classList.remove("a6p-hidden");
    const timer = setTimeout(() => {
      try {
        controller.abort(new DOMException(`Probe timed out after ${state.settings.timeoutSec} seconds`, "AbortError"));
      } catch {
        controller.abort();
      }
    }, Math.max(30, Number(state.settings.timeoutSec) || 300) * 1000);

    try {
      const auth = await resolveAuth();
      if (!state) return;
      session.statusText = "Sending request…";
      updateComposer();
      if (!state || session.generation !== modalGeneration) return;
      const result = await A6PProbes.runProbe({
        probeId,
        info: state.info,
        tokenKey: auth.key,
        scratch: session.scratch,
        signal: controller.signal,
        settings: state.settings,
        prompt,
        messages: messages || session.messages,
        promptContent: userContent,
        tools,
        emitUser,
        onEvent: (event) => handleProbeEvent(session, event, runEvent),
      });
      if (!state || session.generation !== modalGeneration) return;
      await finalizeSuccess(session, runEvent, result, auth);
    } catch (error) {
      if (!state || session.generation !== modalGeneration) return;
      await finalizeError(session, runEvent, error);
    } finally {
      clearTimeout(timer);
      if (session.elapsedTimer) {
        clearInterval(session.elapsedTimer);
        session.elapsedTimer = null;
      }
      session.busy = false;
      session.controller = null;
      if (state && session.generation === modalGeneration) {
        updateTabs();
        updateComposer();
        if (state.activeTab === session.tab) {
          if (state.refs.runButton) state.refs.runButton.disabled = false;
          if (state.refs.stopButton) state.refs.stopButton.classList.add("a6p-hidden");
        }
      }
    }
  }

  async function runFixedProbe() {
    if (!state) return;
    const probe = A6P.getProbe(state.activeTab);
    if (probe.kind === "custom") return;
    if (!supportsTextEndpoint()) {
      showToast(`This channel exposes the "${endpointLabel()}" endpoint; text probes are unavailable.`, "warn");
      return;
    }
    const session = sessionFor(probe.id);
    if (session.busy) return;
    resetSession(probe.id);
    state.attachments = [];
    renderAttachments();
    renderActiveTab();
    await executeProbe({ probeId: probe.id, session: sessionFor(probe.id) });
  }

  function buildUserContent(text, attachments) {
    if (!attachments?.length) return text;
    const parts = [];
    if (text) parts.push({ type: "text", text });
    for (const attachment of attachments) {
      parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
    }
    return parts;
  }

  async function sendComposer() {
    if (!state) return;
    const session = activeSession();
    if (!session || session.busy) return;
    if (!supportsTextEndpoint()) {
      showToast(`This channel exposes the "${endpointLabel()}" endpoint; text probes are unavailable.`, "warn");
      return;
    }
    const text = state.refs.textarea.value.trim();
    const attachments = state.attachments.slice();
    if (!text && !attachments.length) return;
    const tab = state.activeTab;
    const probe = A6P.getProbe(tab);
    const content = buildUserContent(text, attachments);
    state.refs.textarea.value = "";
    state.refs.textarea.style.height = "auto";
    state.attachments = [];
    renderAttachments();
    updateComposer();
    scrollBody();
    await executeProbe({
      probeId: "custom",
      session,
      prompt: text || "Please inspect the attached image.",
      userContent: content,
      messages: session.messages,
      tools: probe.id === "quick" ? false : true,
      emitUser: false,
      userEventData: {
        text: text || "(image attachments)",
        attachments,
      },
    });
  }

  function requestClear(trashButton) {
    const session = activeSession();
    if (!session || session.busy) return;
    if (!session.events.length) return;
    if (trashButton.dataset.confirm === "1") {
      resetSession(state.activeTab);
      trashButton.dataset.confirm = "";
      showToast("Session cleared.");
      renderActiveTab();
      return;
    }
    trashButton.dataset.confirm = "1";
    trashButton.title = "Click again to clear";
    showToast("Click the trash icon again to clear this session.", "warn");
    setTimeout(() => {
      if (trashButton.isConnected) {
        trashButton.dataset.confirm = "";
        trashButton.title = "Clear this session";
      }
    }, 3200);
  }

  async function handleFiles(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length || !state) return;
    const remaining = 4 - state.attachments.length;
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 8 * 1024 * 1024) {
        showToast(`${file.name} is larger than 8 MB.`, "warn");
        continue;
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Could not read file"));
        reader.readAsDataURL(file);
      }).catch(() => "");
      if (dataUrl) state.attachments.push({ name: file.name, type: file.type, dataUrl, size: file.size });
    }
    renderAttachments();
    updateComposer();
  }

  function renderAttachments() {
    if (!state?.refs?.attachments) return;
    const box = state.refs.attachments;
    clearNode(box);
    state.attachments.forEach((attachment, index) => {
      const item = node("div", "a6p-attachment");
      const img = document.createElement("img");
      img.src = attachment.dataUrl;
      img.alt = attachment.name;
      item.appendChild(img);
      const remove = node("button", "", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${attachment.name}`);
      remove.addEventListener("click", () => {
        state.attachments.splice(index, 1);
        renderAttachments();
        updateComposer();
      });
      item.appendChild(remove);
      box.appendChild(item);
    });
  }

  // ---------- open and close ----------

  async function openProbe(info, returnFocus) {
    if (host) closeProbe();
    const generation = ++modalGeneration;
    ensureHost();
    const settings = await A6P.getSettings();
    if (generation !== modalGeneration) return;
    state = {
      info,
      settings,
      generation,
      activeTab: "pelican-lite",
      sessions: {},
      tokens: [],
      tokenKeys: new Map(),
      tokenId: "",
      useManual: settings.tokenMode === "manual" && !!settings.apiKey,
      tokenError: "",
      tokensLoading: true,
      tokensPromise: null,
      attachments: [],
      refs: null,
      returnFocus,
      closed: false,
    };
    state.sessions = Object.fromEntries(PROBES.map((probe) => [probe.id, newSession(probe.id)]));
    const shellRefs = buildShell();
    state.refs = shellRefs;
    shadow.appendChild(shellRefs.shell);
    shellRefs.textarea.focus();
    const onKey = (event) => {
      if (!state) return;
      if (event.key === "Escape") {
        if (shellRefs.layer.classList.contains("is-open")) closeLayer();
        else closeProbe();
      }
    };
    state.onKey = onKey;
    window.addEventListener("keydown", onKey, true);
    renderActiveTab();
    state.tokensPromise = loadTokens();
  }

  function closeProbe() {
    if (!state) return;
    modalGeneration += 1;
    const focus = state.returnFocus;
    if (state.onKey) window.removeEventListener("keydown", state.onKey, true);
    for (const session of Object.values(state.sessions)) {
      if (session.controller) {
        try {
          session.controller.abort(new DOMException("Panel closed", "AbortError"));
        } catch {
          session.controller.abort();
        }
      }
    }
    state.closed = true;
    state = null;
    if (host) {
      host.remove();
      host = null;
      shadow = null;
    }
    if (focus && focus.isConnected) focus.focus();
  }

  // Expose a tiny hook for debugging from the page console (isolated world only).
  globalThis.__A6_PROBER__ = { openProbe, closeProbe, listings };
})();

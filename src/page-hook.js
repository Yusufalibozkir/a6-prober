// Runs in the page's main world before the app boots. It mirrors the marketplace
// responses the site already fetches so the content script can attach a probe
// button to the right channel without scraping every field from the DOM.
(() => {
  "use strict";
  if (window.__a6ProberHooked) return;
  window.__a6ProberHooked = true;

  const MARKETPLACE_URL = /\/api\/marketplace\/(?:public\/)?channels(?:\/search)?(?:\?|$)/;
  const MESSAGE_SOURCE = "a6p:listings";

  function number(value) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  }

  function pickListing(item) {
    if (!item || typeof item !== "object") return null;
    const listingId = number(item.listing_id ?? item._id ?? item.id);
    const channelId = number(item.channel_id);
    if (!listingId || !channelId) return null;
    return {
      listingId,
      channelId,
      model: typeof item.model_name === "string" ? item.model_name : typeof item.model === "string" ? item.model : "",
      endpoint: typeof item.test_endpoint === "string" ? item.test_endpoint : "",
      supplier: String(item.supplier_name || item.supplier_nickname || ""),
      channelName: String(item.channel_name || ""),
      pelican: item.pelican_test_enabled === true,
      modelDetection: item.model_detection_supported === true,
    };
  }

  function listingsFrom(json) {
    const root = json && typeof json === "object" && json.data !== undefined ? json.data : json;
    const data = root && typeof root === "object" && root.data !== undefined ? root.data : root;
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    for (const key of ["channels", "items", "listings", "results", "list"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  function publish(json) {
    const items = listingsFrom(json);
    if (!items.length) return;
    const listings = items.map(pickListing).filter(Boolean);
    if (!listings.length) return;
    try {
      window.postMessage({ source: MESSAGE_SOURCE, listings }, window.location.origin);
    } catch {
      // Never interfere with the site.
    }
  }

  const originalFetch = window.fetch;
  window.fetch = function a6ProberFetch(...args) {
    const promise = originalFetch.apply(this, args);
    try {
      const input = args[0];
      const url = typeof input === "string" ? input : input && input.url;
      if (url && MARKETPLACE_URL.test(url)) {
        promise
          .then((response) => (response && response.ok ? response.clone().json() : null))
          .then((json) => json && publish(json))
          .catch(() => {});
      }
    } catch {
      // Ignore hook failures.
    }
    return promise;
  };

  // Some builds resolve marketplace data before the content script asks for it.
  // Re-scan the DOM for rows that carry enough information to probe on their own.
  function publishFromDom() {
    const listings = [];
    for (const row of document.querySelectorAll("tr[data-market-row]")) {
      const listingId = number(row.getAttribute("data-market-row"));
      if (!listingId) continue;
      const chip = row.querySelector(".chip-channel");
      const chipText = chip ? chip.textContent || "" : "";
      const channelId = number((chipText.match(/#\s*(\d+)/) || [])[1]);
      const modelEl = row.querySelector(".model-name-text");
      const model = modelEl ? (modelEl.getAttribute("title") || modelEl.textContent || "").trim() : "";
      if (channelId && model) {
        listings.push({ listingId, channelId, model, endpoint: "chat" });
      }
    }
    if (listings.length) {
      try {
        window.postMessage({ source: MESSAGE_SOURCE, listings }, window.location.origin);
      } catch {
        // Ignore.
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", publishFromDom, { once: true });
  } else {
    publishFromDom();
  }
})();

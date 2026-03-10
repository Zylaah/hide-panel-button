// ==UserScript==
// @name           Hide Panel UI Menu Button
// @version        1.1
// @description    Hides the app menu button by default; shows it when the panel has to display (badge or panel open).
// @compatibility  Firefox 100+
// ==/UserScript==

(() => {
  const STYLE_ID = "hide-panel-button-styles";
  const VISIBLE_CLASS = "hide-panel-button-visible";
  const MENU_BUTTON_ID = "PanelUI-menu-button";

  // Inject styles immediately so they apply as soon as the document loads
  if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `#PanelUI-menu-button,[id="PanelUI-menu-button"]{visibility:hidden!important;pointer-events:none!important}:root.${VISIBLE_CLASS} #PanelUI-menu-button,:root.${VISIBLE_CLASS} [id="PanelUI-menu-button"]{visibility:visible!important;pointer-events:auto!important}`;
    (document.head || document.documentElement).appendChild(s);
  }
  const PANEL_BUTTON_ID = "PanelUI-button";
  const APP_MENU_POPUP_ID = "appMenu-popup";
  const MAX_RETRIES = 20;
  const RETRY_MS = 250;

  /** @type {Element | null} */
  let menuButton = null;
  /** @type {Element | null} */
  let panelButton = null;
  /** @type {Element | null} */
  let appMenuPopup = null;
  /** @type {boolean} */
  let lastVisibleState = false;
  /** @type {number} */
  let rafId = 0;

  function getDoc() {
    return typeof document !== "undefined" ? document : null;
  }

  function getRoot() {
    const doc = getDoc();
    return doc?.documentElement || doc?.body || null;
  }

  /**
   * Inject CSS that hides the button by default. Uses class on :root to show when needed.
   * This runs before we find elements so the hide rule applies as soon as the button exists.
   */
  function injectStyles() {
    const doc = getDoc();
    const root = getRoot();
    if (!doc || !root || doc.getElementById(STYLE_ID)) return;

    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide by default */
      #PanelUI-menu-button,
      [id="PanelUI-menu-button"] {
        visibility: hidden !important;
        width: 0 !important;
        height: 0 !important;
        pointer-events: none !important;
      }
      /* Show when class is on root */
      :root.${VISIBLE_CLASS} #PanelUI-menu-button,
      :root.${VISIBLE_CLASS} [id="PanelUI-menu-button"] {
        visibility: visible !important;
        width: auto !important;
        height: auto !important;
        pointer-events: auto !important;
      }
    `;

    const head = doc.head || doc.getElementsByTagName("head")[0] || root;
    head.appendChild(style);
  }

  function shouldShowButton(forcePanelOpen = false) {
    if (!menuButton) return false;
    if (forcePanelOpen) return true;

    const hasBadge =
      (menuButton.getAttribute("badge") || "").trim().length > 0 ||
      (menuButton.querySelector(".toolbarbutton-badge")?.textContent || "").trim()
        .length > 0;

    const isPanelOpen =
      panelButton &&
      (panelButton.hasAttribute("open") || panelButton.hasAttribute("panelopen"));

    const menuButtonOpen =
      menuButton.hasAttribute("open") || menuButton.hasAttribute("panelopen");

    return hasBadge || isPanelOpen || menuButtonOpen;
  }

  function scheduleVisibilityUpdate() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateVisibility();
    });
  }

  function updateVisibility(forcePanelOpen = false) {
    const root = getRoot();
    if (!root) return;

    const visible = shouldShowButton(forcePanelOpen);
    if (visible === lastVisibleState) return;
    lastVisibleState = visible;

    if (visible) {
      root.classList.add(VISIBLE_CLASS);
    } else {
      root.classList.remove(VISIBLE_CLASS);
    }
  }

  function findElements(doc) {
    if (!doc) return false;

    menuButton =
      doc.getElementById(MENU_BUTTON_ID) ||
      doc.querySelector(`[id="${MENU_BUTTON_ID}"]`);
    panelButton =
      doc.getElementById(PANEL_BUTTON_ID) ||
      doc.querySelector(`[id="${PANEL_BUTTON_ID}"]`);
    appMenuPopup =
      doc.getElementById(APP_MENU_POPUP_ID) ||
      doc.querySelector(`[id="${APP_MENU_POPUP_ID}"]`);

    return !!menuButton;
  }

  function setupObservers(win) {
    const doc = win?.document || getDoc();
    if (!doc) return;

    injectStyles();

    if (!findElements(doc)) return;

    lastVisibleState = false;
    updateVisibility();

    const observeOpenState = (el) => {
      if (!el) return;
      const mo = new MutationObserver(scheduleVisibilityUpdate);
      mo.observe(el, {
        attributes: true,
        attributeFilter: ["open", "panelopen"],
        subtree: false,
      });
    };
    observeOpenState(panelButton);
    observeOpenState(menuButton);

    const menuButtonObserver = new MutationObserver(scheduleVisibilityUpdate);
    menuButtonObserver.observe(menuButton, {
      attributes: true,
      attributeFilter: ["badge"],
      subtree: false,
    });

    if (appMenuPopup) {
      appMenuPopup.addEventListener(
        "popupshowing",
        () => updateVisibility(true),
        { capture: true }
      );
      appMenuPopup.addEventListener("popuphidden", updateVisibility, {
        capture: true,
      });
    }
  }

  function tryInit(win, attempt) {
    win = win || (typeof window !== "undefined" ? window : null);
    const doc = win?.document;

    injectStyles();

    if (findElements(doc)) {
      setupObservers(win);
      return true;
    }

    if (attempt < MAX_RETRIES) {
      win?.setTimeout(() => tryInit(win, attempt + 1), RETRY_MS);
    }
    return false;
  }

  function init() {
    const win = typeof window !== "undefined" ? window : null;
    if (!win || win.__hidePanelButtonInit) return;
    win.__hidePanelButtonInit = true;

    function run(actualWin) {
      actualWin = actualWin || win;
      if (typeof gBrowserInit !== "undefined" && gBrowserInit?.delayedStartupFinished) {
        tryInit(actualWin, 0);
      } else if (typeof Services !== "undefined") {
        const observer = (subject, topic) => {
          if (topic === "browser-delayed-startup-finished" && subject === win) {
            Services.obs.removeObserver(observer, topic);
            tryInit(win, 0);
          }
        };
        try {
          Services.obs.addObserver(observer, "browser-delayed-startup-finished");
        } catch (e) {
          tryInit(win, 0);
        }
      } else {
        tryInit(win, 0);
      }
    }

    const doc = getDoc();
    if (doc?.readyState === "loading") {
      win.addEventListener("DOMContentLoaded", () => run(win), { once: true });
    } else {
      run(win);
    }
  }

  const doc = getDoc();
  if (doc?.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

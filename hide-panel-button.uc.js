// ==UserScript==
// @name           Hide Panel UI Menu Button
// @version        1.0
// @description    Hides the app menu button by default; shows it when the panel has to display (badge or panel open).
// @compatibility  Firefox 100+
// ==/UserScript==

(() => {
  const STYLE_ID = "hide-panel-button-styles";
  const MENU_BUTTON_ID = "PanelUI-menu-button";
  const PANEL_BUTTON_ID = "PanelUI-button";
  const APP_MENU_POPUP_ID = "appMenu-popup";

  /** @type {HTMLButtonElement | null} */
  let menuButton = null;
  /** @type {Element | null} */
  let panelButton = null;
  /** @type {Element | null} */
  let appMenuPopup = null;
  /** @type {boolean} */
  let lastVisibleState = false;
  /** @type {number} */
  let rafId = 0;

  /**
   * Returns true if the app menu button should be visible.
   * Visible when: badge has content OR panel is open.
   * @param {boolean} [forcePanelOpen] - When true, treat panel as open (e.g. during popupshowing).
   */
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

    return hasBadge || isPanelOpen;
  }

  /**
   * Updates the menu button visibility. Coalesces rapid updates via rAF.
   */
  function scheduleVisibilityUpdate() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateVisibility();
    });
  }

  /**
   * @param {boolean} [forcePanelOpen] - When true, treat panel as open (for popupshowing).
   */
  function updateVisibility(forcePanelOpen = false) {
    if (!menuButton) return;

    const visible = shouldShowButton(forcePanelOpen);
    if (visible === lastVisibleState) return;
    lastVisibleState = visible;

    menuButton.setAttribute("data-panel-button-visible", String(visible));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #PanelUI-menu-button[data-panel-button-visible="false"],
      [id="PanelUI-menu-button"][data-panel-button-visible="false"] {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function setupObservers() {
    menuButton =
      document.getElementById(MENU_BUTTON_ID) ||
      document.querySelector(`[id="${MENU_BUTTON_ID}"]`);
    panelButton =
      document.getElementById(PANEL_BUTTON_ID) ||
      document.querySelector(`[id="${PANEL_BUTTON_ID}"]`);
    appMenuPopup =
      document.getElementById(APP_MENU_POPUP_ID) ||
      document.querySelector(`[id="${APP_MENU_POPUP_ID}"]`);

    if (!menuButton) return;

    injectStyles();
    menuButton.setAttribute("data-panel-button-visible", "false");
    lastVisibleState = false;
    updateVisibility();

    const observeOpenState = (element) => {
      if (!element) return;
      const mo = new MutationObserver(scheduleVisibilityUpdate);
      mo.observe(element, {
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
      // Sync update so button is visible before panel anchors; force show on opening
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

  function init() {
    if (window.__hidePanelButtonInit) return;
    window.__hidePanelButtonInit = true;

    if (gBrowserInit?.delayedStartupFinished) {
      setupObservers();
    } else {
      const observer = (subject, topic) => {
        if (topic === "browser-delayed-startup-finished" && subject === window) {
          Services.obs.removeObserver(observer, topic);
          setupObservers();
        }
      };
      Services.obs.addObserver(observer, "browser-delayed-startup-finished");
    }
  }

  init();
})();

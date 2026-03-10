# Hide Panel UI Menu Button for Zen

## Overview

This mod hides the app menu button (Zen/hamburger) by default in Zen Browser. The button becomes visible only when:

- The panel has a **badge** (e.g. update notification)
- The **panel is open** (including when it opens on its own)

## Installation

1. Place the `theme.json` and `hide-panel-button.uc.js` files in your Zen Browser profile mod directory.
2. Restart Zen Browser.

The exact path depends on your Zen installation and OS. Typically:
- **Linux**: `~/.zen/mods/` or similar
- **Windows**: `%APPDATA%\Zen\mods\` or similar
- **macOS**: `~/Library/Application Support/Zen/mods/` or similar

Ensure both files are in the same directory so Zen can load the script via `theme.json`.

## Troubleshooting

**If the button is not hidden:**
1. Verify the mod is enabled in Zen Settings → Mods.
2. Open the Browser Toolbox (`Ctrl+Alt+Shift+I` / `Cmd+Alt+Shift+I`) and inspect the document: search for `hide-panel-button-styles` or `#PanelUI-menu-button` to confirm the script ran and the button exists.
3. As a manual fallback, add this to your `userChrome.css` (in your profile `chrome` folder):
   ```css
   #PanelUI-menu-button { visibility: hidden !important; pointer-events: none !important; }
   ```

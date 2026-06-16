// iOS Safari viewport-height fix.
//
// Goal: keep the .app sized to the *actual* visible area on iOS Safari,
// across three states:
//   1. Bottom tab bar visible, keyboard hidden     (e.g. iPhone with "Tab Bar" enabled)
//   2. Bottom tab bar hidden, keyboard hidden      (e.g. iPhone without Tab Bar, or after scroll)
//   3. Keyboard open                              (tab bar auto-hidden)
//
// iOS Safari's visualViewport reports the keyboard-shrunk height when
// the keyboard is up, but on some devices it does NOT subtract the
// bottom tab bar (or other browser UI) — visualViewport.height can be
// the full screen height. Conversely, `100dvh` tracks the tab bar
// (excludes browser UI that can shrink) but on iOS it does NOT update
// when the keyboard opens — it stays at the tab-bar-aware value.
//
// So neither one alone is correct. Use the smaller of the two:
//   - when the keyboard is up, visualViewport shrinks → we use that
//   - when the tab bar is visible, 100dvh is smaller → we use that
// `Math.min(visualViewport.height, 100dvh-as-pixels)` covers both cases.
//
// The script publishes the result as a CSS custom property (`--app-height`)
// that the .app uses. `100dvh` in the CSS is a fallback for the brief
// moment before the script runs.
(function () {
  // Helper: read 100dvh as a pixel value via a probe element. getComputedStyle
  // resolves CSS units, so height:'100dvh' on a positioned element gives
  // us the current dvh in pixels.
  function getDvhPx() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;height:100dvh;width:1px;visibility:hidden;pointer-events:none;';
    document.documentElement.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    probe.remove();
    return px;
  }

  function setAppHeight() {
    const vv = window.visualViewport;
    // visualViewport.height tracks the iOS keyboard (shrinks when keyboard
    // pops up). On some iOS builds it does NOT account for the bottom tab
    // bar — i.e. it can be the full screen height even when the tab bar
    // is visible. dvh tracks the tab bar (excludes shrinkable browser UI)
    // but does NOT update when the keyboard opens. Whichever is smaller
    // is the actual visible area.
    const vvH = (vv && vv.height) ? vv.height : window.innerHeight;
    const dvhH = getDvhPx();
    const h = Math.min(vvH, dvhH);
    document.documentElement.style.setProperty('--app-height', h + 'px');
  }

  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', setAppHeight);
  if (window.visualViewport) {
    // Fires on iOS Safari when the keyboard appears/disappears, and when
    // the visual viewport scrolls (which can happen at the same time).
    window.visualViewport.addEventListener('resize', setAppHeight);
    window.visualViewport.addEventListener('scroll', setAppHeight);
  }
  // Belt-and-braces: focusin on a form control is a strong signal the
  // keyboard is about to appear, focusout that it's about to disappear.
  // The 100ms delay lets the keyboard finish its show/hide animation
  // before we measure.
  document.addEventListener('focusin', () => setTimeout(setAppHeight, 100));
  document.addEventListener('focusout', () => setTimeout(setAppHeight, 350));
})();

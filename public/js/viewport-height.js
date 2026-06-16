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
//
// iOS fires multiple visualViewport events during the keyboard animation
// (the height is updated incrementally: 769 → 600 → 500 → 422 over ~250ms).
// If we update --app-height on every event, the page visibly resizes
// multiple times — the "wiggle" the user reported. Debounce: only the
// LAST value in a 250ms window is accepted. The page resizes once,
// smoothly, to the final height.
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

  let currentHeight = null;     // the value currently in --app-height
  let pendingHeight = null;     // the value waiting for the debounce to expire
  let pendingTimer = null;

  function acceptHeight(h) {
    if (h === currentHeight) return;  // no-op: nothing changed
    currentHeight = h;
    document.documentElement.style.setProperty('--app-height', h + 'px');
    // Force scroll back to 0. iOS Safari preserves the scroll position
    // from when the keyboard was up, leaving the page scrolled with the
    // header cut off at the top. overflow:hidden alone doesn't reset
    // this on iOS — you have to explicitly scrollTo.
    try {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (document.documentElement && document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
      if (document.body && document.body.scrollTop !== 0) document.body.scrollTop = 0;
    } catch (_) { /* ignore */ }
  }

  function setAppHeight() {
    const vv = window.visualViewport;
    const vvH = (vv && vv.height) ? vv.height : window.innerHeight;
    const dvhH = getDvhPx();
    const h = Math.min(vvH, dvhH);

    // If this is the same as the last accepted value, no-op.
    if (h === currentHeight) {
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      pendingHeight = null;
      return;
    }

    // If this matches the pending value, just reset the timer and wait.
    // If it's a new pending value, restart the countdown.
    pendingHeight = h;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      acceptHeight(pendingHeight);
      pendingHeight = null;
      pendingTimer = null;
    }, 250);
  }

  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', setAppHeight);
  if (window.visualViewport) {
    // Fires on iOS Safari when the keyboard appears/disappears, and
    // when the visual viewport scrolls. The debounce above handles
    // the burst of events that fire during the keyboard animation.
    window.visualViewport.addEventListener('resize', setAppHeight);
    window.visualViewport.addEventListener('scroll', setAppHeight);
  }
  // Belt-and-braces: focusin on a form control is a strong signal the
  // keyboard is about to appear, focusout that it's about to disappear.
  // These are now redundant with the visualViewport events on modern
  // iOS but kept as a fallback for older builds / different browsers.
  document.addEventListener('focusin', () => setTimeout(setAppHeight, 100));
  document.addEventListener('focusout', () => setTimeout(setAppHeight, 350));
})();

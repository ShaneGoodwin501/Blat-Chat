// iOS Safari viewport-height fix.
//
// On iOS, `100vh` includes the URL bar height (so the page is taller than
// the visible area), and `100dvh` has known bugs in some Safari versions
// where it doesn't update when the URL bar shows/hides. The only reliable
// measure of the visible viewport on iOS is `window.innerHeight`, taken
// after the URL bar has settled.
//
// We publish that pixel value as a CSS custom property (`--app-height`)
// and use it for the .app and .login-page heights. `100dvh` in the CSS
// is a fallback for the brief moment before this script runs.
//
// Re-runs on resize and orientationchange so the app resizes correctly
// when the device rotates or the URL bar appears/disappears.
(function () {
  function setAppHeight() {
    // visualViewport is the only API that updates when the iOS keyboard
    // pops up. window.innerHeight stays the same on iOS Safari when the
    // keyboard appears (it's the *layout* viewport, not the *visual*
    // one), so without this the .app ends up taller than the visible
    // area and the user can scroll the body to see the hidden bits.
    const vv = window.visualViewport;
    const h = (vv && vv.height) ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', h + 'px');
  }
  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', setAppHeight);
  if (window.visualViewport) {
    // Fires on iOS Safari when the keyboard appears/disappears — the
    // event the rest of the page needs but never got.
    window.visualViewport.addEventListener('resize', setAppHeight);
    window.visualViewport.addEventListener('scroll', setAppHeight);
  }
  // iOS fires the resize event after the URL bar animates in/out, so
  // setAppHeight() picks up the new viewport size automatically.
})();

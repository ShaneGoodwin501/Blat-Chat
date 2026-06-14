// Profile photo upload — square crop + zoom + drag, exports 256x256 JPEG.
//
// Public API: window.openAvatarCropper({ onSaved }). Shows a modal that
// lets the user pick a file, drag/zoom to frame it in a circle, then
// POSTs the cropped image to /api/auth/avatar. On success, fires
// onSaved() so the caller can update its own state.

(function () {
  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.setAttribute('style', attrs[k]);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function makeModal({ title, onSave, onRemove }) {
    return new Promise((resolve) => {
      const SIZE = 300; // visible crop square in CSS px
      let imgEl = null, imgNatural = { w: 0, h: 0 };
      let state = { scale: 1, x: 0, y: 0 };
      let dragging = false, lastPx = 0, lastPy = 0;

      const fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', style: 'display:none' });
      const zoomRange = el('input', { type: 'range', min: '1', max: '3', step: '0.01', value: '1' });
      const stage = el('div', { class: 'crop-stage', style: `width:${SIZE}px;height:${SIZE}px` });
      const placeholder = el('div', { class: 'crop-placeholder' }, 'Pick a photo to start');
      stage.appendChild(placeholder);

      const errEl = el('div', { class: 'crop-err' });
      const statusEl = el('div', { class: 'crop-status' });

      const pickBtn = el('button', { type: 'button', class: 'secondary' }, 'Choose photo…');
      const saveBtn = el('button', { type: 'button' }, 'Save');
      const removeBtn = el('button', { type: 'button', class: 'secondary danger hidden' }, 'Remove photo');
      const cancelBtn = el('button', { type: 'button', class: 'secondary' }, 'Close');

      saveBtn.disabled = true;

      pickBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) loadFile(f);
      });
      cancelBtn.addEventListener('click', () => { cleanup(); resolve(null); });
      removeBtn.addEventListener('click', async () => {
        if (!confirm('Remove your profile photo? You\'ll go back to the colourful initials.')) return;
        const r = await fetch('/api/auth/avatar', { method: 'DELETE' });
        if (r.ok) {
          cleanup();
          resolve({ removed: true });
        } else {
          errEl.textContent = 'Could not remove photo. Try again.';
        }
      });

      function loadFile(file) {
        if (file.size > 8 * 1024 * 1024) { errEl.textContent = 'File too large (max 8MB). Pick a smaller image.'; return; }
        errEl.textContent = '';
        // Detect format from magic bytes. The browser's <img> decoder
        // silently fails on HEIC/HEIF (common iPhone "High Efficiency"
        // photos that have been renamed to .jpg) and on most other
        // non-browser-native formats, so we sniff first and tell the
        // user what to do about it.
        const head = file.slice(0, 12);
        const reader = new FileReader();
        reader.onload = () => {
          const b = new Uint8Array(reader.result);
          const isHeic =
            (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && // "ftyp"
             (b[8] === 0x68 && b[9] === 0x65 && b[10] === 0x69 && b[11] === 0x63)) || // "heic"
            (b.length >= 12 && b[8] === 0x6d && b[9] === 0x69 && b[10] === 0x66 && b[11] === 0x31); // "mif1"
          if (isHeic) {
            errEl.textContent = 'That looks like an iPhone HEIC photo. Most browsers can\'t decode it directly. In your phone\'s camera settings, switch to "Most Compatible" (JPG), then re-upload.';
            return;
          }
          tryLoadImage(file);
        };
        reader.readAsArrayBuffer(head);
      }

      function tryLoadImage(file) {
        const url = URL.createObjectURL(file);
        const tmp = new Image();
        tmp.onload = () => {
          imgNatural = { w: tmp.naturalWidth, h: tmp.naturalHeight };
          if (imgEl) { stage.removeChild(imgEl); }
          imgEl = el('img', { src: url, alt: '', class: 'crop-image', draggable: 'false' });
          stage.appendChild(imgEl);
          placeholder.classList.add('hidden');
          fitToStage();
          attachDrag();
          saveBtn.disabled = false;
          removeBtn.classList.remove('hidden');
          // Lock the file input so picking the same file again re-triggers change
          fileInput.value = '';
        };
        tmp.onerror = () => {
          URL.revokeObjectURL(url);
          errEl.textContent = 'That file isn\'t a supported image. Try a regular JPG or PNG (screenshots work great).';
        };
        tmp.src = url;
      }

      function fitToStage() {
        // Cover-fit the image inside the stage, then centre it.
        const sx = SIZE / imgNatural.w, sy = SIZE / imgNatural.h;
        state.scale = Math.max(sx, sy); // already >=1 to fill square
        zoomRange.value = String(state.scale);
        // Centre
        state.x = (SIZE - imgNatural.w * state.scale) / 2;
        state.y = (SIZE - imgNatural.h * state.scale) / 2;
        apply();
      }

      function apply() {
        if (!imgEl) return;
        imgEl.style.width = (imgNatural.w * state.scale) + 'px';
        imgEl.style.height = (imgNatural.h * state.scale) + 'px';
        imgEl.style.left = state.x + 'px';
        imgEl.style.top = state.y + 'px';
      }

      function attachDrag() {
        const onDown = (e) => {
          dragging = true;
          stage.classList.add('dragging');
          const p = pointer(e);
          lastPx = p.x; lastPy = p.y;
          e.preventDefault();
        };
        const onMove = (e) => {
          if (!dragging) return;
          const p = pointer(e);
          state.x += (p.x - lastPx);
          state.y += (p.y - lastPy);
          lastPx = p.x; lastPy = p.y;
          apply();
        };
        const onUp = () => { dragging = false; stage.classList.remove('dragging'); };
        stage.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        stage.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
        zoomRange.addEventListener('input', () => {
          state.scale = Number(zoomRange.value);
          apply();
        });
        // Mouse wheel zoom (when hovering stage)
        stage.addEventListener('wheel', (e) => {
          if (!imgEl) return;
          e.preventDefault();
          const delta = -e.deltaY * 0.0015;
          state.scale = Math.max(1, Math.min(3, state.scale + delta));
          zoomRange.value = String(state.scale);
          apply();
        }, { passive: false });
      }

      function pointer(e) {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
      }

      async function exportCroppedBlob() {
        // Draw the current stage (which is a 300x300 CSS-px square showing
        // the visible region) onto a 256x256 canvas.
        const OUT = 256;
        const canvas = document.createElement('canvas');
        canvas.width = OUT; canvas.height = OUT;
        const ctx = canvas.getContext('2d');
        // The stage is SIZE CSS px wide. We drew the natural-size image
        // scaled by state.scale and positioned at (state.x, state.y) in
        // CSS px. So the mapping from image-natural-coords to canvas is
        // (state.scale / SIZE) * OUT.
        const k = OUT / SIZE;
        const dw = imgNatural.w * state.scale * k;
        const dh = imgNatural.h * state.scale * k;
        const dx = state.x * k;
        const dy = state.y * k;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgEl, dx, dy, dw, dh);
        return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
      }

      saveBtn.addEventListener('click', async () => {
        if (!imgEl) return;
        errEl.textContent = '';
        saveBtn.disabled = true; statusEl.textContent = 'Uploading…'; pickBtn.disabled = true;
        try {
          const blob = await exportCroppedBlob();
          if (!blob) throw new Error('Crop failed');
          const fd = new FormData();
          fd.append('avatar', blob, 'avatar.jpg');
          const r = await fetch('/api/auth/avatar', { method: 'POST', body: fd });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            const msg = j.error === 'too_large' ? 'Image too large (server limit).'
                      : j.error === 'bad_mime' ? 'Server rejected the image format.'
                      : j.error ? `Server: ${j.error}` : `Server returned ${r.status}.`;
            throw new Error(msg);
          }
          const data = await r.json();
          cleanup();
          resolve({ url: data.url, removed: false });
        } catch (e) {
          errEl.textContent = e.message;
          saveBtn.disabled = false; statusEl.textContent = ''; pickBtn.disabled = false;
        }
      });

      const backdrop = el('div', { class: 'modal-backdrop' },
        el('div', { class: 'modal avatar-modal', role: 'dialog', 'aria-modal': 'true' },
          el('h3', null, title || 'Profile photo'),
          el('div', { class: 'crop-help' }, 'Drag to position · scroll or use the slider to zoom · the circle shows what will be saved'),
          el('div', { class: 'crop-shell' },
            el('div', { class: 'crop-frame' },
              stage,
              el('div', { class: 'crop-circle-mask', 'aria-hidden': 'true' })
            )
          ),
          el('div', { class: 'crop-zoom' },
            el('label', { for: 'crop-zoom-range' }, 'Zoom'),
            zoomRange
          ),
          errEl,
          statusEl,
          el('div', { class: 'form-actions' },
            removeBtn,
            el('div', { class: 'spacer', style: 'flex:1' }),
            cancelBtn,
            pickBtn,
            saveBtn
          ),
          fileInput
        )
      );

      document.body.appendChild(backdrop);
      const closeOnOutside = (e) => { if (e.target === backdrop) { cleanup(); resolve(null); } };
      const escHandler = (e) => { if (e.key === 'Escape') { cleanup(); resolve(null); } };
      backdrop.addEventListener('click', closeOnOutside);
      document.addEventListener('keydown', escHandler);
      function cleanup() {
        backdrop.removeEventListener('click', closeOnOutside);
        document.removeEventListener('keydown', escHandler);
        if (imgEl && imgEl.src.startsWith('blob:')) URL.revokeObjectURL(imgEl.src);
        backdrop.remove();
      }
    });
  }

  window.openAvatarCropper = async function ({ title, onSaved, onRemoved } = {}) {
    const result = await makeModal({ title });
    if (!result) return null;
    if (result.removed) { if (onRemoved) onRemoved(); return result; }
    if (onSaved) onSaved(result.url);
    return result;
  };
})();

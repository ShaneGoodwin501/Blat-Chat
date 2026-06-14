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
      const zoomRange = el('input', { type: 'range', min: '0.2', max: '3', step: '0.01', value: '1' });
      const stage = el('div', { class: 'crop-stage', style: `width:${SIZE}px;height:${SIZE}px` });
      const placeholder = el('div', { class: 'crop-placeholder' }, t('avatar.placeholder'));
      stage.appendChild(placeholder);

      const errEl = el('div', { class: 'crop-err' });
      const statusEl = el('div', { class: 'crop-status' });

      const pickBtn = el('button', { type: 'button', class: 'secondary' }, t('avatar.choose'));
      const saveBtn = el('button', { type: 'button' }, t('avatar.save'));
      const removeBtn = el('button', { type: 'button', class: 'secondary danger hidden' }, t('avatar.remove'));
      const cancelBtn = el('button', { type: 'button', class: 'secondary' }, t('avatar.close'));

      saveBtn.disabled = true;

      pickBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) loadFile(f);
      });
      cancelBtn.addEventListener('click', () => { cleanup(); resolve(null); });
      removeBtn.addEventListener('click', async () => {
        if (!confirm(t('avatar.remove_confirm'))) return;
        const r = await fetch('/api/auth/avatar', { method: 'DELETE' });
        if (r.ok) {
          cleanup();
          resolve({ removed: true });
        } else {
          errEl.textContent = t('avatar.could_not_remove');
        }
      });

      // HEIC/HEIF/AVIF brand codes that show up in the ISOBMFF "ftyp"
      // box. Any of these means Safari/Chrome won't decode the file in
      // a plain <img> element on most platforms.
      const HEIC_BRANDS = new Set([
        'heic', 'heix', 'heim', 'heis', // HEIC family
        'hevc', 'hevx',                 // HEVC-coded
        'mif1', 'msf1', 'msf2',         // HEIF family
        'avif', 'avis',                 // AVIF
      ]);

      function sniffIsoBmffBrand(bytes) {
        // ISOBMFF: bytes 4..7 = "ftyp", bytes 8..11 = major brand.
        // For robustness also scan a few "compatible brand" slots
        // (bytes 16, 20, 24...) in case the major brand is "isom"/"mp42"
        // and the HEIC brand is listed as compatible.
        if (bytes.length < 12) return null;
        if (!(bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70)) return null;
        const slice = (off) => String.fromCharCode(bytes[off], bytes[off+1], bytes[off+2], bytes[off+3]);
        const major = slice(8);
        if (HEIC_BRANDS.has(major)) return major;
        for (let off = 16; off + 4 <= bytes.length && off < 64; off += 4) {
          const b = slice(off);
          if (HEIC_BRANDS.has(b)) return b;
        }
        return null;
      }

      function loadFile(file) {
        if (file.size > 8 * 1024 * 1024) { errEl.textContent = t('avatar.too_large'); return; }
        errEl.textContent = '';
        // Read enough of the head to detect the ISOBMFF container. 64
        // bytes covers the ftyp box and several compatible-brand slots.
        const head = file.slice(0, 64);
        const reader = new FileReader();
        reader.onload = () => {
          const brand = sniffIsoBmffBrand(new Uint8Array(reader.result));
          if (brand) {
            errEl.textContent = t('avatar.heic_hint', { brand: brand.toUpperCase() });
            return;
          }
          tryLoadImage(file);
        };
        reader.readAsArrayBuffer(head);
      }

      function tryLoadImage(file) {
        // Use a data URL rather than a blob URL. iOS Safari has known
        // hiccups decoding blob URLs in some <img> paths (and even some
        // JPEG-via-Photos-picker flows); a data URL always works.
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          const tmp = new Image();
          tmp.onload = () => {
            // iOS Safari sometimes "loads" an HEIC image but reports
            // 0x0 dimensions. Treat that as a decode failure.
            if (!tmp.naturalWidth || !tmp.naturalHeight) {
              errEl.textContent = t('avatar.cant_decode');
              return;
            }
            imgNatural = { w: tmp.naturalWidth, h: tmp.naturalHeight };
            if (imgEl) { stage.removeChild(imgEl); }
            imgEl = el('img', { src: dataUrl, alt: '', class: 'crop-image', draggable: 'false' });
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
            errEl.textContent = t('avatar.cant_decode');
          };
          tmp.src = dataUrl;
        };
        reader.onerror = () => {
          errEl.textContent = t('avatar.cant_read');
        };
        reader.readAsDataURL(file);
      }

      function fitToStage() {
        // Contain-fit: scale so the WHOLE image fits inside the square,
        // so the user can see everything and zoom in on what they want.
        // (Previously used cover-fit which clipped edges and gave no
        // way to zoom out below that minimum.)
        const sx = SIZE / imgNatural.w, sy = SIZE / imgNatural.h;
        state.scale = Math.min(sx, sy);
        // If even contain would zoom in past 1x (very small image), cap at 1.
        if (state.scale > 1) state.scale = 1;
        // And floor at the slider minimum so the UI stays in range.
        if (state.scale < Number(zoomRange.min)) state.scale = Number(zoomRange.min);
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
          state.scale = Math.max(Number(zoomRange.min), Math.min(Number(zoomRange.max), state.scale + delta));
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
        saveBtn.disabled = true; statusEl.textContent = t('avatar.uploading'); pickBtn.disabled = true;
        try {
          const blob = await exportCroppedBlob();
          if (!blob) throw new Error(t('avatar.crop_failed'));
          const fd = new FormData();
          fd.append('avatar', blob, 'avatar.jpg');
          const r = await fetch('/api/auth/avatar', { method: 'POST', body: fd });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            const msg = j.error === 'too_large' ? t('avatar.server_too_large')
                      : j.error === 'bad_mime' ? t('avatar.server_bad_mime')
                      : j.error ? `${t('misc.server_err', { err: j.error })}` : t('misc.server_status', { status: r.status });
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
          el('h3', null, title || t('avatar.title')),
          el('div', { class: 'crop-help' }, t('avatar.help')),
          el('div', { class: 'crop-shell' },
            el('div', { class: 'crop-frame' },
              stage,
              el('div', { class: 'crop-circle-mask', 'aria-hidden': 'true' })
            )
          ),
          el('div', { class: 'crop-zoom' },
            el('label', { for: 'crop-zoom-range' }, t('avatar.zoom')),
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

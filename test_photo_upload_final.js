const fs = require('fs');

async function login(user) {
  const r = await fetch('http://172.105.177.137/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: 'BlatChat2026' }),
  });
  if (!r.ok) throw new Error(`login ${user}: ${r.status}`);
  return r.headers.get('set-cookie').split(';')[0];
}

async function upload(cookie, filePath, mime, label) {
  const buf = fs.readFileSync(filePath);
  // Use FormData with a Blob and explicit filename/contentType
  const file = new File([buf], label, { type: mime });
  const fd = new FormData();
  fd.append('photo', file);
  const r = await fetch('http://172.105.177.137/api/upload', {
    method: 'POST', headers: { Cookie: cookie }, body: fd,
  });
  const text = await r.text();
  console.log(`[${label}] mime=${mime} size=${buf.length} → ${r.status} ${text.slice(0, 200)}`);
  return r.ok;
}

(async () => {
  const cookie = await login('hermes-test');
  console.log('logged in');
  const ok1 = await upload(cookie, '/tmp/real.jpg', 'image/jpeg', 'real.jpg');
  const ok2 = await upload(cookie, '/tmp/real.png', 'image/png', 'real.png');
  const ok3 = await upload(cookie, '/tmp/real.webp', 'image/webp', 'real.webp');
  const ok4 = await upload(cookie, '/tmp/huge.jpg', 'image/jpeg', 'huge.jpg');
  // 5MB+ should now succeed
  const ok5 = await upload(cookie, '/tmp/test.jpg', 'image/jpeg', 'small.jpg');
  console.log('all ok?', ok1 && ok2 && ok3 && ok4 && ok5);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

<?php
require __DIR__ . '/../inc/bootstrap.php';
$user = require_login();
$roomId = (int)($_GET['room_id'] ?? 0);
if (!$roomId || !can_access_room((int)$user['id'], $roomId)) { http_response_code(403); exit('No access'); }

$stmt = db()->prepare('SELECT name FROM rooms WHERE id = ?');
$stmt->execute([$roomId]);
$room = $stmt->fetch();
if (!$room) { http_response_code(404); exit('Room not found'); }
?>
<!doctype html><html><head><meta charset="utf-8"><title><?= e($room['name']) ?></title><link rel="stylesheet" href="<?= url('/style.css') ?>"></head><body><div class="container">
<div class="card"><div class="row"><a href="<?= url('/chat.php') ?>">Back to rooms</a><a href="<?= url('/logout.php') ?>">Logout</a></div>
<h2><?= e($room['name']) ?></h2>
<div id="chat" class="chat-box"></div>
<form id="sendForm" class="row" enctype="multipart/form-data">
<input type="hidden" name="room_id" value="<?= $roomId ?>">
<input type="text" name="body" placeholder="Message" style="flex:1">
<input type="file" name="media" accept="image/*,video/*">
<button>Send</button>
</form></div></div>
<script>
let lastId = 0;
const chat = document.getElementById('chat');
function renderMsg(m){
 const div=document.createElement('div');div.className='msg';
 div.innerHTML=`<div class="meta">${m.username} • ${m.created_at}</div><div>${m.body??''}</div>`;
 if(m.media_id){
   const a=document.createElement('a');a.href=`<?= url('/media_view.php') ?>?message_id=${m.media_id}&room_id=${m.room_id}`;
   const t=document.createElement(m.media_type==='image'?'img':'video');
   t.className='thumb';t.src=`<?= url('/media.php') ?>?message_id=${m.media_id}`; if(m.media_type==='video'){t.muted=true;}
   a.appendChild(t);div.appendChild(a);
 }
 chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
}
async function poll(){
 const r=await fetch(`<?= url('/messages.php') ?>?room_id=<?=$roomId?>&after_id=${lastId}`); if(!r.ok) return;
 const data=await r.json(); data.forEach(m=>{lastId=m.id;renderMsg(m)});
}
setInterval(poll,2000); poll();
document.getElementById('sendForm').addEventListener('submit', async (e)=>{
 e.preventDefault(); const fd=new FormData(e.target); await fetch('<?= url('/send_message.php') ?>',{method:'POST',body:fd}); e.target.body.value=''; e.target.media.value=''; poll();
});
</script>
</body></html>

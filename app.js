// === BACKEND INTEGRATION (optional) ==========================
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyg0ojl7g-lsmUtPQSQrA-esPyerdFNsR0DN6Lgesb8K5NFCsNBf5WaYQzgLwt-6CO6/exec'; 
// =============================================================

const $ = (id)=>document.getElementById(id);
document.getElementById('year').textContent = new Date().getFullYear();

const form = $('regForm');
const errors = $('errors');
const previews = $('previews');
const subsSection = $('submissionsSection');
const subsWrap = $('submissions');
const totalAmount = $('totalAmount');

// Local storage helpers
const KEY = 'jordan_membership_submissions_v2';
const getSubs = () => JSON.parse(localStorage.getItem(KEY)||'[]');
const setSubs = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

function renderSubs(){
  const entries = getSubs();
  subsWrap.innerHTML = '';
  subsSection.classList.toggle('hidden', entries.length===0);
  entries.forEach((e)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<strong>${(e.first||'') + ' ' + (e.last||'')}</strong> — <span class="muted">${e.email || ''}</span><br>
      <small class="muted">Level: ${e.level || '—'} | Total: $${e.amount || 0} | Phone: ${e.cc||''} ${e.phone||''} | ${e.address||''}</small>`;
    subsWrap.appendChild(card);
  });
}
renderSubs();

// Membership amount updater
const radios = document.querySelectorAll('input[name="level_radio"]');
function updateLevel(){
  let amt = 0; let level = '';
  radios.forEach(r=>{ if(r.checked){ amt = Number(r.dataset.amount||0); level = r.value; }});
  $('level').value = level;
  totalAmount.textContent = level ? `$${amt.toLocaleString()}` : '$0';
}
radios.forEach(r=> r.addEventListener('change', updateLevel));
updateLevel();

// Gift card preview thumbnails
$('giftcard').addEventListener('change', (e)=>{
  previews.innerHTML = '';
  const files = Array.from(e.target.files||[]).slice(0,6);
  files.forEach(file=>{
    if(file.type.startsWith('image/')){
      const img = document.createElement('img');
      img.alt = file.name; img.src = URL.createObjectURL(file); previews.appendChild(img);
    } else {
      const tag = document.createElement('div'); tag.textContent = file.name.replace(/</g,'&lt;'); tag.className = 'badge'; previews.appendChild(tag);
    }
  });
});

function showError(msg){
  errors.textContent = msg; errors.classList.remove('hidden');
  setTimeout(()=>errors.classList.add('hidden'), 5000);
}

function fileMeta(fileList){
  return Array.from(fileList||[]).map(f=>({name:f.name, type:f.type, size:f.size}));
}

function toCSV(rows){
  if(!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = v => '"'+String(v??'').replaceAll('"','""')+'"';
  return [cols.map(esc).join(','), ...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');
}

$('downloadCSV').addEventListener('click', ()=>{
  const rows = getSubs(); if(!rows.length) return;
  const blob = new Blob([toCSV(rows)], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'submissions.csv'; a.click();
});
$('downloadJSON').addEventListener('click', ()=>{
  const rows = getSubs(); if(!rows.length) return;
  const blob = new Blob([JSON.stringify(rows,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'submissions.json'; a.click();
});
$('clearAll').addEventListener('click', ()=>{ if(confirm('Clear all saved submissions on this browser?')){ setSubs([]); renderSubs(); }});

document.getElementById('policyLink')?.addEventListener('click', (e)=>{
  e.preventDefault();
  alert('Placeholder Terms & Policy. Replace this with your real URL or PDF.');
});
document.getElementById('policyLinkFooter')?.addEventListener('click', (e)=>{
  e.preventDefault();
  alert('Placeholder Terms & Policy. Replace this with your real URL or PDF.');
});

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  errors.classList.add('hidden');

  // Basic validation
  const reqIds = ['first','last','email','level','giftcard','agree'];
  for(const id of reqIds){
    const el = $(id);
    if(id==='agree'){ if(!el.checked){ showError('Please agree to the Terms & Membership Policy.'); return; } }
    else if(id==='giftcard'){ if(!el.files || el.files.length===0){ showError('Please upload your gift card receipt/photo (PDF or image).'); return; } }
    else if(!el.value.trim()){ el.focus(); showError('Please complete all required fields.'); return; }
  }

  // Build data
  const data = Object.fromEntries(new FormData(form).entries());
  data.cc = $('cc').value;
  // amount from radio
  let amount = 0; let level = data.level;
  radios.forEach(r=>{ if(r.checked){ amount = Number(r.dataset.amount||0); }});
  data.amount = amount;
  data.giftcard_files = fileMeta($('giftcard').files); // metadata only
  data.timestamp = new Date().toISOString();

  // Save locally so YOU can see it on this device (no server yet)
  const entries = getSubs();
  entries.unshift(data); // newest first
  setSubs(entries);
  renderSubs();

  // Build payload and open dedicated Thank‑You page (separate file) in a NEW TAB
  const ref = 'JDM-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const payload = { ref, amount, data };
  try{
    if(BACKEND_URL){
      await fetch(BACKEND_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    }
  }catch(err){ console.warn('Backend error:', err); }

  // Store payload and open thank-you.html
  localStorage.setItem('jdm_last_payload_v1', JSON.stringify(payload));
  const w = window.open('thank-you.html', '_blank');
  if(!w){ alert('Pop‑up blocked. Please allow pop‑ups for this site to view your receipt.'); }

  // Reset form visuals
  form.reset(); previews.innerHTML=''; updateLevel(); window.scrollTo({top:0,behavior:'smooth'});
});

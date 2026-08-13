/* ============ Hassan Pharmacy — shared logic (storefront, backend-connected) ============ */

const API_BASE = 'https://hassan-pharmacy.onrender.com/api'; // <-- apna asal Render URL yahan daalein

const CATS = ["Pain Relief","Cold and Flu","Diabetes Care","Digestive Health","First Aid","Skin Care","Child and Baby Care","Heart Health","Eye and Ear Care","Respiratory Health"];
const ICONS = {"Pain Relief":"💊","Cold and Flu":"🤧","Diabetes Care":"🩸","Digestive Health":"🌿","First Aid":"🩹","Skin Care":"🧴","Child and Baby Care":"🍼","Heart Health":"❤️","Eye and Ear Care":"👁️","Respiratory Health":"😷"};
const DOCTORS = [
  {name:"Dr. Asif Mahmood",spec:"General Physician",fee:"Rs. 800",time:"5:00 PM – 9:00 PM"},
  {name:"Dr. Sana Riaz",spec:"Pediatrician",fee:"Rs. 1000",time:"11:00 AM – 2:00 PM"},
  {name:"Dr. Bilal Chaudhry",spec:"Cardiologist",fee:"Rs. 1500",time:"6:00 PM – 8:00 PM"},
];

/* ---------- API helpers ---------- */
async function apiGet(path){
  const r = await fetch(API_BASE + path);
  if(!r.ok) throw new Error('Server returned ' + r.status);
  return r.json();
}
async function apiSend(method, path, body){
  const r = await fetch(API_BASE + path, {
    method, headers:{'Content-Type':'application/json'},
    body: body!==undefined ? JSON.stringify(body) : undefined,
  });
  if(!r.ok){
    let detail = 'Request failed';
    try{ detail = (await r.json()).detail || detail; }catch(e){}
    throw new Error(detail);
  }
  return r.json();
}
function showApiError(msg){
  let el = document.getElementById('apiErrorBanner');
  if(!el){
    el = document.createElement('div');
    el.id = 'apiErrorBanner';
    el.style.cssText = 'background:#fde3e3;color:#d64545;padding:12px 20px;text-align:center;font-size:13.5px;font-weight:600;position:sticky;top:0;z-index:99;';
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.textContent = '⚠️ ' + msg + ' — make sure the FastAPI backend is running (see backend/README.md).';
  el.classList.remove('hidden');
}

/* ---------- local (per-browser) helpers ---------- */
function lsGet(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e){ return fallback; }
}
function lsSet(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

function getCart(){ return lsGet('hp_cart', []); }
function saveCart(c){ lsSet('hp_cart', c); }
function getUser(){ return lsGet('hp_user', null); }
function saveUser(u){ if(u) lsSet('hp_user', u); else localStorage.removeItem('hp_user'); }

function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- shared data (backend-backed) ---------- */
let _productCache = [];
async function getProducts(){
  try{ _productCache = await apiGet('/products'); return _productCache; }
  catch(e){ showApiError('Could not load products'); return _productCache; }
}
async function getAnnouncements(){
  try{ return await apiGet('/announcements'); }
  catch(e){ return []; }
}
async function getNews(){
  try{ return await apiGet('/news'); }
  catch(e){ return []; }
}
async function getStories(){
  try{ return await apiGet('/stories'); }
  catch(e){ return []; }
}
async function getOrders(phone){
  const path = phone ? ('/orders?phone=' + encodeURIComponent(phone)) : '/orders';
  try{ return await apiGet(path); }
  catch(e){ showApiError('Could not load orders'); return []; }
}
async function createOrderApi(order){ return apiSend('POST', '/orders', order); }
async function registerUserApi(u){ return apiSend('POST', '/auth/register', u); }
async function loginUserApi(id, password){ return apiSend('POST', '/auth/login', {id, password}); }

/* ---------- header / footer ---------- */
async function renderHeader(active){
  const host = document.getElementById('siteHeader');
  if(!host) return;
  const user = getUser();
  const cartCount = getCart().reduce((s,c)=>s+c.qty,0);
  host.innerHTML = `
    <div class="ticker-wrap" id="tickerWrap"><div class="ticker-inner" id="tickerInner"></div></div>
    <header class="site">
      <div class="container top-bar">
        <a class="logo" href="home.html"><div class="mark">✚</div> Hassan Pharmacy</a>
        <div class="search-box"><input type="text" placeholder="Search medicine, medical products..."><button>🔍</button></div>
        <div class="top-actions">
          <button class="icon-btn">♡</button>
          <a class="icon-btn" href="cart.html">🛍<span class="badge">${cartCount}</span></a>
          <div class="acct" onclick="toggleAcctMenu(event)">
            <div class="av">${user? user.name.charAt(0).toUpperCase() : 'G'}</div>
            <span>${user? user.name.split(' ')[0] : 'Guest'}</span>
            <div class="acct-menu" id="acctMenu">
              <a href="account.html">My Dashboard</a>
              <a href="doctors.html">Doctor Consultation</a>
              <a href="admin/index.html">Admin Panel</a>
              ${user? `<button onclick="doLogout()">Log Out</button>` : `<a href="login.html">Login / Register</a>`}
            </div>
          </div>
        </div>
      </div>
      <nav class="cats"><div class="container cats-inner">
        <a href="medicines.html">All Categories</a>
        ${CATS.map(c=>`<a href="medicines.html?cat=${encodeURIComponent(c)}">${c}</a>`).join('')}
      </div></nav>
      <div class="page-nav">
        <a href="home.html" class="${active==='home'?'active':''}">Home</a>
        <a href="medicines.html" class="${active==='medicines'?'active':''}">All Medicines</a>
        <a href="doctors.html" class="${active==='doctors'?'active':''}">Doctor Consultation</a>
        <a href="account.html" class="${active==='account'?'active':''}">My Dashboard</a>
        <a href="cart.html" class="${active==='cart'?'active':''}">Cart</a>
      </div>
    </header>`;
  await renderTicker();
  document.addEventListener('click', ()=>{ const m=document.getElementById('acctMenu'); if(m) m.classList.remove('open'); });
}
function toggleAcctMenu(e){ e.stopPropagation(); document.getElementById('acctMenu').classList.toggle('open'); }
function doLogout(){ saveUser(null); window.location.href = 'login.html'; }

async function renderTicker(){
  const wrap = document.getElementById('tickerWrap');
  const inner = document.getElementById('tickerInner');
  if(!wrap) return;
  const ann = await getAnnouncements();
  if(!ann.length){ wrap.classList.add('empty'); return; }
  wrap.classList.remove('empty');
  const items = ann.map(a=>`<span class="ticker-item"><span class="ticker-dot"></span>${escapeHtml(a.text)}</span>`).join('');
  inner.innerHTML = items + items;
}

function renderFooter(){
  const host = document.getElementById('siteFooter');
  if(!host) return;
  host.innerHTML = `
  <footer class="site">
    <div class="container foot-grid">
      <div>
        <div class="foot-logo">✚ Hassan Pharmacy</div>
        <p>📍 Rahwali, near DC Colony, Gujranwala, Pakistan</p>
        <p>📞 +92 325 8604103</p>
        <p>✉️ info@hassanpharmacy.pk</p>
      </div>
      <div><h4>Quick Links</h4>
        <a href="home.html">Home</a><a href="medicines.html">All Medicines</a>
        <a href="doctors.html">Services</a><a href="account.html">My Account</a>
      </div>
      <div><h4>Specialties</h4><a>Anesthesiology</a><a>Psychiatry</a><a>General Surgery</a><a>Family Medicine</a></div>
      <div><h4>Services</h4><a>Medical Delivery</a><a>Online Consultation</a><a>Laboratory</a><a>Patient Ward</a></div>
      <div><h4>Social Media</h4><a>Facebook</a><a>Instagram</a><a>YouTube</a></div>
    </div>
    <div class="container foot-bottom">
      <span>© 2026 Hassan Pharmacy. All rights reserved.</span>
      <span>Terms &amp; Privacy</span>
    </div>
  </footer>`;
}

/* ---------- product cards ---------- */
function priceHtml(p){
  const final = p.discount>0 ? Math.round(p.price*(1-p.discount/100)) : p.price;
  return `<div class="prod-price-row"><span class="prod-price">Rs. ${final}</span>${p.discount>0?`<span class="prod-old">Rs. ${p.price}</span>`:''}</div>`;
}
function productCard(p){
  const thumb = p.image
    ? `<div class="prod-thumb" style="background:#fff;overflow:hidden;padding:0"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML='${ICONS[p.category]||'💊'}'"></div>`
    : `<div class="prod-thumb">${ICONS[p.category]||'💊'}</div>`;
  return `<div class="prod-card" onclick="openMedicine('${p.id}')">
    ${p.discount>0?`<span class="disc-badge">${p.discount}% OFF</span>`:''}
    <span class="stock-badge ${p.stock?'in-stock':'out-stock'}">${p.stock?'In Stock':'Out of Stock'}</span>
    ${thumb}
    <div class="prod-name">${escapeHtml(p.name)}</div>
    <div class="prod-cat">${escapeHtml(p.category)}</div>
    ${priceHtml(p)}
    <button class="add-btn" ${p.stock?'':'disabled'} onclick="event.stopPropagation();quickAdd('${p.id}')">${p.stock?'🛒 Add to Cart':'Unavailable'}</button>
  </div>`;
}
function quickAdd(id){
  addToCart(id);
  const badge = document.querySelector('.badge');
  if(badge) badge.textContent = getCart().reduce((s,c)=>s+c.qty,0);
}
function addToCart(id){
  const cart = getCart();
  const existing = cart.find(c=>c.id===id);
  if(existing) existing.qty++; else cart.push({id, qty:1});
  saveCart(cart);
}

/* ---------- medicine detail modal (reads from the in-memory product cache) ---------- */
function ensureModal(){
  if(document.getElementById('medModal')) return;
  const div = document.createElement('div');
  div.innerHTML = `<div class="modal-overlay hidden" id="medModal">
    <div class="modal-box">
      <button class="modal-close" onclick="closeMedicine()">✕</button>
      <div id="medModalBody"></div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}
function openMedicine(id){
  ensureModal();
  const p = _productCache.find(x=>x.id===id);
  if(!p) return;
  const final = p.discount>0 ? Math.round(p.price*(1-p.discount/100)) : p.price;
  const iconHtml = p.image
    ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.textContent='${ICONS[p.category]||'💊'}'">`
    : (ICONS[p.category]||'💊');
  document.getElementById('medModalBody').innerHTML = `
    <div class="modal-icon" style="overflow:hidden;background:#fff">${iconHtml}</div>
    <span class="stock-badge ${p.stock?'in-stock':'out-stock'}" style="position:static;display:inline-block;margin-bottom:8px">${p.stock?'In Stock':'Out of Stock'}</span>
    <h2 style="margin-bottom:4px">${escapeHtml(p.name)}</h2>
    <div class="prod-cat" style="margin-bottom:10px">${escapeHtml(p.category)}</div>
    <p style="font-size:13.5px;color:var(--gray);margin-bottom:14px">${escapeHtml(p.desc||'')}</p>
    ${priceHtml(p)}
    <button class="add-btn" style="margin-top:14px" ${p.stock?'':'disabled'} onclick="quickAdd('${p.id}');closeMedicine();">${p.stock?'🛒 Add to Cart':'Unavailable'}</button>
  `;
  document.getElementById('medModal').classList.remove('hidden');
}
function closeMedicine(){ const m=document.getElementById('medModal'); if(m) m.classList.add('hidden'); }

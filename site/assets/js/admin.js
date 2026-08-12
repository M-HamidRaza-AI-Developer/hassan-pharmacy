/* ============ Hassan Pharmacy — Admin logic (backend-connected) ============ */

function isAdminLoggedIn(){ return localStorage.getItem('hp_admin_session') === '1'; }
async function adminLoginAttempt(id, pass){
  try{
    await apiSend('POST', '/auth/admin-login', {id, password: pass});
    localStorage.setItem('hp_admin_session','1');
    return true;
  }catch(e){ return false; }
}
function adminLogout(){
  localStorage.removeItem('hp_admin_session');
  window.location.href = 'index.html';
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderAdminShell(active){
  const host = document.getElementById('adminShellRoot');
  host.innerHTML = `
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="brand"><div class="mark">✚</div><span>Hassan Pharmacy</span></div>
      <div class="side-label">Main Menu</div>
      <nav>
        <button data-t="dashboard" class="${active==='dashboard'?'active':''}" onclick="switchAdminTab('dashboard')">🏠 <span class="lbl">Dashboard</span></button>
        <button data-t="products" class="${active==='products'?'active':''}" onclick="switchAdminTab('products')">📦 <span class="lbl">Products</span></button>
        <button data-t="categories" class="${active==='categories'?'active':''}" onclick="switchAdminTab('categories')">🗂️ <span class="lbl">Categories</span></button>
      </nav>
      <div class="side-label">Leads</div>
      <nav>
        <button data-t="orders" class="${active==='orders'?'active':''}" onclick="switchAdminTab('orders')">🧾 <span class="lbl">Orders</span></button>
        <button data-t="sales" class="${active==='sales'?'active':''}" onclick="switchAdminTab('sales')">📈 <span class="lbl">Sales</span></button>
        <button data-t="customers" class="${active==='customers'?'active':''}" onclick="switchAdminTab('customers')">👥 <span class="lbl">Customers</span></button>
      </nav>
      <div class="side-label">Comms</div>
      <nav>
        <button data-t="payments" class="${active==='payments'?'active':''}" onclick="switchAdminTab('payments')">💳 <span class="lbl">Payments</span></button>
        <button data-t="reports" class="${active==='reports'?'active':''}" onclick="switchAdminTab('reports')">📊 <span class="lbl">Reports</span></button>
        <button data-t="content" class="${active==='content'?'active':''}" onclick="switchAdminTab('content')">📢 <span class="lbl">Announcements</span></button>
        <button data-t="settings" class="${active==='settings'?'active':''}" onclick="switchAdminTab('settings')">⚙️ <span class="lbl">Settings</span></button>
      </nav>
      <button class="admin-logout" onclick="adminLogout()">⎋ <span class="lbl">Log Out</span></button>
    </aside>
    <main class="admin-main">
      <div class="admin-topbar">
        <div class="search-box"><input placeholder="Search..."><button>🔍</button></div>
        <div class="right">
          <span style="font-size:18px">🔔</span>
          <div class="admin-avatar">H</div>
          <div>
            <div style="font-weight:700;font-size:13px">Hassan</div>
            <div style="font-size:11px;color:var(--gray)">Administrator</div>
          </div>
        </div>
      </div>
      <div id="adminTabHost"><p style="color:var(--gray)">Loading…</p></div>
    </main>
  </div>`;
}

function switchAdminTab(tab){
  document.querySelectorAll('.admin-sidebar button[data-t]').forEach(b=>b.classList.toggle('active', b.dataset.t===tab));
  const renderers = {
    dashboard: renderTabDashboard, products: renderTabProducts, categories: renderTabCategories,
    orders: renderTabOrders, sales: renderTabSales, customers: renderTabCustomers,
    payments: renderTabPayments, reports: renderTabReports, content: renderTabContent, settings: renderTabSettings,
  };
  (renderers[tab] || renderTabDashboard)();
}

/* ---------- Dashboard tab ---------- */
async function renderTabDashboard(){
  const host = document.getElementById('adminTabHost');
  host.innerHTML = '<p style="color:var(--gray)">Loading…</p>';
  const [orders, products, users] = await Promise.all([getOrders(), getProducts(), apiGet('/users').catch(()=>[])]);

  const totalSales = orders.reduce((s,o)=>s+o.total,0);
  const cancelled = orders.filter(o=>o.status==='Cancelled').length;

  const statusCounts = {Pending:0,'In Transit':0,Delivered:0,Cancelled:0};
  orders.forEach(o=>{ statusCounts[o.status] = (statusCounts[o.status]||0)+1; });
  const totalOrders = orders.length || 1;
  const donutColors = {Pending:'#f5c451',['In Transit']:'#7ba7ff',Delivered:'#2f9e5c',Cancelled:'#e57373'};
  let acc = 0;
  const stops = Object.entries(statusCounts).map(([k,v])=>{
    const pct = (v/totalOrders)*100;
    const seg = `${donutColors[k]} ${acc}% ${acc+pct}%`;
    acc += pct;
    return seg;
  }).join(', ');

  const weekTotals = [0,0,0,0,0,0,0];
  orders.forEach(o=>{
    const d = new Date(o.date);
    if(!isNaN(d)) weekTotals[d.getDay()] += o.total;
  });
  const maxVal = Math.max(...weekTotals, 1);
  const peakIdx = weekTotals.indexOf(Math.max(...weekTotals));

  host.innerHTML = `
    <div class="admin-welcome"><h1>Welcome, Hassan!</h1><span class="month-pill">📅 This Month ▾</span></div>
    <p class="admin-sub">Pharmacy Sales Results</p>

    <div class="kpi-grid">
      <div class="kpi-card kpi-1"><div class="top-row"><div class="ic">💰</div></div><b>Rs. ${totalSales}</b><div class="lbl">Total Sales</div><span class="delta" style="color:#237a47">▲ ${orders.length} orders</span></div>
      <div class="kpi-card kpi-2"><div class="top-row"><div class="ic">🗂️</div></div><b>${CATS.length}</b><div class="lbl">Available Categories</div><span class="delta" style="color:#5b4fa8">Across ${products.length} items</span></div>
      <div class="kpi-card kpi-3"><div class="top-row"><div class="ic">✕</div></div><b>${cancelled}</b><div class="lbl">Cancelled Orders</div><span class="delta" style="color:#c65b5b">${orders.length ? Math.round(cancelled/orders.length*100) : 0}% of total</span></div>
      <div class="kpi-card kpi-4"><div class="top-row"><div class="ic">👥</div></div><b>${users.length}</b><div class="lbl">Total Customers</div><span class="delta" style="color:#a06600">Registered users</span></div>
    </div>

    <div class="admin-grid-2">
      <div class="card-box">
        <h3>Graph Report</h3>
        <div class="donut-wrap">
          <div class="donut" style="background:conic-gradient(${orders.length ? stops : '#e6ede8 0% 100%'})">
            <div class="donut-hole"><b>${orders.length}</b><span>Orders</span></div>
          </div>
          <div class="legend">
            ${Object.keys(statusCounts).map(k=>`<span><i style="background:${donutColors[k]}"></i>${k}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="card-box">
        <h3>Total Sales Overview</h3>
        <div class="bar-chart">
          ${weekTotals.map((v,i)=>`
            <div class="bar-col ${i===peakIdx && v>0 ? 'peak':''}">
              <div class="bar" style="height:${Math.max((v/maxVal)*120,4)}px">
                ${i===peakIdx && v>0 ? `<span class="bar-val">Rs. ${v}</span>` : ''}
              </div>
              <div class="day">${DAY_NAMES[i]}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="card-box">
      <h3>Recent Sales List</h3>
      <table class="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.slice(0,8).map(o=>`<tr>
            <td>${o.id}</td><td>${escapeHtml(o.customer||'Guest')}</td><td>${o.date}</td><td>Rs. ${o.total}</td>
            <td><span class="status-pill ${o.status==='Delivered'?'st-delivered':o.status==='In Transit'?'st-transit':o.status==='Cancelled'?'st-cancelled':'st-pending'}">${o.status}</span></td>
          </tr>`).join('') || '<tr><td colspan="5" style="color:var(--gray)">No sales yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------- Products tab ---------- */
async function renderTabProducts(){
  const host = document.getElementById('adminTabHost');
  const products = await getProducts();
  host.innerHTML = `
    <div class="card-box">
      <h3>Add New Medicine</h3>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 2fr auto;gap:10px;align-items:end;margin-bottom:20px">
        <div class="form-row" style="margin:0"><label>Name</label><input id="newProdName" placeholder="Medicine name"></div>
        <div class="form-row" style="margin:0"><label>Category</label>
          <select id="newProdCat">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
        </div>
        <div class="form-row" style="margin:0"><label>Price (Rs.)</label><input id="newProdPrice" type="number" placeholder="0"></div>
        <div class="form-row" style="margin:0"><label>Discount %</label><input id="newProdDisc" type="number" placeholder="0"></div>
        <div class="form-row" style="margin:0"><label>Image URL</label><input id="newProdImage" placeholder="https://... (optional)"></div>
        <button class="mini-btn mini-save" style="height:38px" onclick="addProduct()">+ Add</button>
      </div>
      <h3>All Medicines (${products.length})</h3>
      <table class="admin-table">
        <thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Disc %</th><th>Image URL</th><th>Stock</th><th></th></tr></thead>
        <tbody id="adminProdTable">${products.map(prodRowHtml).join('')}</tbody>
      </table>
    </div>`;
}
function prodRowHtml(p){
  const thumbHtml = p.image
    ? `<img src="${escapeHtml(p.image)}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:#f7faf8" onerror="this.style.display='none'">`
    : `<span style="font-size:20px">${ICONS[p.category]||'💊'}</span>`;
  return `<tr>
      <td>${thumbHtml}</td>
      <td><input value="${escapeHtml(p.name)}" onchange="editProduct('${p.id}','name',this.value)"></td>
      <td>
        <select onchange="editProduct('${p.id}','category',this.value)">
          ${CATS.map(c=>`<option ${c===p.category?'selected':''}>${c}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" value="${p.price}" onchange="editProduct('${p.id}','price',this.value)"></td>
      <td><input type="number" value="${p.discount}" onchange="editProduct('${p.id}','discount',this.value)"></td>
      <td><input value="${escapeHtml(p.image||'')}" placeholder="https://..." onchange="editProductImage('${p.id}',this.value)"></td>
      <td><button class="toggle-stock ${p.stock?'in-stock':'out-stock'}" onclick="toggleStock('${p.id}',${p.stock})">${p.stock?'In Stock':'Out of Stock'}</button></td>
      <td><button class="mini-btn mini-del" onclick="deleteProduct('${p.id}')">Delete</button></td>
    </tr>`;
}
async function editProductImage(id, value){
  try{ await apiSend('PUT', '/products/'+id, {image: value}); renderTabProducts(); }
  catch(e){ alert('Could not update: '+e.message); }
}
async function editProduct(id, field, value){
  const body = {}; body[field] = (field==='price'||field==='discount') ? Number(value) : value;
  try{ await apiSend('PUT', '/products/'+id, body); }catch(e){ alert('Could not update: '+e.message); }
}
async function toggleStock(id, current){
  try{ await apiSend('PUT', '/products/'+id, {stock: !current}); renderTabProducts(); }
  catch(e){ alert('Could not update: '+e.message); }
}
async function deleteProduct(id){
  if(!confirm('Delete this medicine?')) return;
  try{ await apiSend('DELETE', '/products/'+id); renderTabProducts(); }
  catch(e){ alert('Could not delete: '+e.message); }
}
async function addProduct(){
  const name = document.getElementById('newProdName').value.trim();
  const category = document.getElementById('newProdCat').value;
  const price = Number(document.getElementById('newProdPrice').value) || 0;
  const discount = Number(document.getElementById('newProdDisc').value) || 0;
  const image = document.getElementById('newProdImage').value.trim();
  if(!name){ alert('Enter a medicine name.'); return; }
  try{ await apiSend('POST', '/products', {name, category, price, discount, stock:true, desc:'', image}); renderTabProducts(); }
  catch(e){ alert('Could not add product: '+e.message); }
}

/* ---------- Categories tab ---------- */
async function renderTabCategories(){
  const products = await getProducts();
  document.getElementById('adminTabHost').innerHTML = `
    <div class="card-box">
      <h3>Categories Overview</h3>
      <table class="admin-table">
        <thead><tr><th>Category</th><th>Icon</th><th># Medicines</th><th>In Stock</th></tr></thead>
        <tbody>
          ${CATS.map(c=>{
            const items = products.filter(p=>p.category===c);
            const inStock = items.filter(p=>p.stock).length;
            return `<tr><td>${c}</td><td style="font-size:18px">${ICONS[c]}</td><td>${items.length}</td><td>${inStock}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Orders tab ---------- */
async function renderTabOrders(){
  const orders = await getOrders();
  document.getElementById('adminTabHost').innerHTML = `
    <div class="card-box">
      <h3>All Orders (${orders.length})</h3>
      <table class="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.map(o=>`<tr>
            <td>${o.id}</td><td>${escapeHtml(o.customer||'Guest')}</td><td>${escapeHtml(o.phone||'—')}</td><td>${o.date}</td><td>Rs. ${o.total}</td>
            <td><select onchange="updateOrderStatus('${o.id}', this.value)">
              ${['Pending','In Transit','Delivered','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}
            </select></td>
          </tr>`).join('') || '<tr><td colspan="6" style="color:var(--gray)">No orders yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}
async function updateOrderStatus(id, status){
  try{ await apiSend('PUT', `/orders/${id}/status`, {status}); }
  catch(e){ alert('Could not update status: '+e.message); }
}

/* ---------- Sales tab ---------- */
async function renderTabSales(){
  const orders = await getOrders();
  const total = orders.reduce((s,o)=>s+o.total,0);
  const avg = orders.length ? Math.round(total/orders.length) : 0;
  document.getElementById('adminTabHost').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card kpi-1"><b>Rs. ${total}</b><div class="lbl">Total Revenue</div></div>
      <div class="kpi-card kpi-2"><b>${orders.length}</b><div class="lbl">Total Sales Count</div></div>
      <div class="kpi-card kpi-4"><b>Rs. ${avg}</b><div class="lbl">Average Order Value</div></div>
    </div>
    <div class="card-box">
      <h3>All Sales</h3>
      <table class="admin-table">
        <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Amount</th></tr></thead>
        <tbody>
          ${orders.map(o=>`<tr><td>${o.id}</td><td>${o.date}</td><td>${o.items.reduce((s,it)=>s+it.qty,0)}</td><td>Rs. ${o.total}</td></tr>`).join('') || '<tr><td colspan="4" style="color:var(--gray)">No sales yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Customers tab ---------- */
async function renderTabCustomers(){
  const [users, orders] = await Promise.all([apiGet('/users').catch(()=>[]), getOrders()]);
  document.getElementById('adminTabHost').innerHTML = `
    <div class="card-box">
      <h3>Registered Customers (${users.length})</h3>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th></tr></thead>
        <tbody>
          ${users.map(u=>`<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.phone)}</td><td>${escapeHtml(u.email||'—')}</td><td>${orders.filter(o=>o.phone===u.phone).length}</td></tr>`).join('') || '<tr><td colspan="4" style="color:var(--gray)">No customers registered yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Payments tab ---------- */
async function renderTabPayments(){
  const orders = await getOrders();
  const methods = ['Cash on Delivery','JazzCash','EasyPaisa'];
  const totals = {}; methods.forEach(m=>totals[m]=0);
  orders.forEach((o,i)=>{ totals[methods[i % methods.length]] += o.total; });
  document.getElementById('adminTabHost').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      ${methods.map((m,i)=>`<div class="kpi-card ${['kpi-1','kpi-2','kpi-3'][i]}"><b>Rs. ${totals[m]}</b><div class="lbl">${m}</div></div>`).join('')}
    </div>
    <div class="card-box"><h3>Note</h3><p style="font-size:13px;color:var(--gray)">Payment method is simulated for demo purposes — connect a real gateway (JazzCash/EasyPaisa API) when going live.</p></div>`;
}

/* ---------- Reports tab ---------- */
async function renderTabReports(){
  const [orders, products, users] = await Promise.all([getOrders(), getProducts(), apiGet('/users').catch(()=>[])]);
  const total = orders.reduce((s,o)=>s+o.total,0);
  document.getElementById('adminTabHost').innerHTML = `
    <div class="card-box">
      <h3>Business Report Summary</h3>
      <div class="profile-line"><span>Total Revenue</span><b>Rs. ${total}</b></div>
      <div class="profile-line"><span>Total Orders</span><b>${orders.length}</b></div>
      <div class="profile-line"><span>Total Medicines Listed</span><b>${products.length}</b></div>
      <div class="profile-line"><span>Out of Stock Items</span><b>${products.filter(p=>!p.stock).length}</b></div>
      <div class="profile-line"><span>Registered Customers</span><b>${users.length}</b></div>
      <button class="btn-primary" style="margin-top:16px" onclick="alert('📊 Report exported (demo).')">Export Report</button>
    </div>`;
}

/* ---------- Content / Announcements tab ---------- */
async function renderTabContent(){
  document.getElementById('adminTabHost').innerHTML = `
    <div class="card-box">
      <h3>Ticker Announcements (blinking bar)</h3>
      <div class="inline-add"><input id="newAnnText" placeholder="e.g. 🎉 Flat 25% off on all vitamins this week!"><button class="mini-btn mini-save" onclick="addAnnouncement()">+ Add</button></div>
      <div id="adminAnnList">Loading…</div>
    </div>
    <div class="card-box">
      <h3>Latest News</h3>
      <div class="form-row"><label>Title</label><input id="newNewsTitle" placeholder="News title"></div>
      <div class="form-row"><label>Excerpt</label><input id="newNewsExcerpt" placeholder="Short description"></div>
      <button class="mini-btn mini-save" onclick="addNews()">+ Add News</button>
      <div id="adminNewsList" style="margin-top:14px">Loading…</div>
    </div>
    <div class="card-box">
      <h3>Top Stories</h3>
      <div class="form-row"><label>Title</label><input id="newStoryTitle" placeholder="Story title"></div>
      <div class="form-row"><label>Tag</label><input id="newStoryTag" placeholder="e.g. Wellness"></div>
      <button class="mini-btn mini-save" onclick="addStory()">+ Add Story</button>
      <div id="adminStoryList" style="margin-top:14px">Loading…</div>
    </div>`;
  fillAnnList(); fillNewsList(); fillStoryList();
}
async function fillAnnList(){
  const ann = await getAnnouncements();
  document.getElementById('adminAnnList').innerHTML = ann.length ? ann.map(a=>`
    <div class="ann-row"><span>${escapeHtml(a.text)}</span><button class="mini-btn mini-del" onclick="deleteAnnouncement(${a.id})">Delete</button></div>`).join('') : '<p style="color:var(--gray);font-size:13px">No announcements.</p>';
}
async function addAnnouncement(){
  const val = document.getElementById('newAnnText').value.trim();
  if(!val) return;
  try{ await apiSend('POST', '/announcements', {text: val}); document.getElementById('newAnnText').value=''; fillAnnList(); }
  catch(e){ alert('Could not add: '+e.message); }
}
async function deleteAnnouncement(id){
  try{ await apiSend('DELETE', '/announcements/'+id); fillAnnList(); }
  catch(e){ alert('Could not delete: '+e.message); }
}

async function fillNewsList(){
  const news = await getNews();
  document.getElementById('adminNewsList').innerHTML = news.length ? news.map(n=>`
    <div class="ann-row"><span><b>${escapeHtml(n.title)}</b> — ${escapeHtml(n.excerpt)}</span><button class="mini-btn mini-del" onclick="deleteNews(${n.id})">Delete</button></div>`).join('') : '<p style="color:var(--gray);font-size:13px">No news yet.</p>';
}
async function addNews(){
  const title = document.getElementById('newNewsTitle').value.trim();
  const excerpt = document.getElementById('newNewsExcerpt').value.trim();
  if(!title) return;
  try{ await apiSend('POST', '/news', {title, excerpt}); document.getElementById('newNewsTitle').value=''; document.getElementById('newNewsExcerpt').value=''; fillNewsList(); }
  catch(e){ alert('Could not add: '+e.message); }
}
async function deleteNews(id){
  try{ await apiSend('DELETE', '/news/'+id); fillNewsList(); }
  catch(e){ alert('Could not delete: '+e.message); }
}

async function fillStoryList(){
  const stories = await getStories();
  document.getElementById('adminStoryList').innerHTML = stories.length ? stories.map(s=>`
    <div class="ann-row"><span><b>${escapeHtml(s.title)}</b> <span style="color:var(--gray)">(${escapeHtml(s.tag||'')})</span></span><button class="mini-btn mini-del" onclick="deleteStory(${s.id})">Delete</button></div>`).join('') : '<p style="color:var(--gray);font-size:13px">No stories yet.</p>';
}
async function addStory(){
  const title = document.getElementById('newStoryTitle').value.trim();
  const tag = document.getElementById('newStoryTag').value.trim() || 'Health';
  if(!title) return;
  try{ await apiSend('POST', '/stories', {title, tag}); document.getElementById('newStoryTitle').value=''; document.getElementById('newStoryTag').value=''; fillStoryList(); }
  catch(e){ alert('Could not add: '+e.message); }
}
async function deleteStory(id){
  try{ await apiSend('DELETE', '/stories/'+id); fillStoryList(); }
  catch(e){ alert('Could not delete: '+e.message); }
}

/* ---------- Settings tab (local only — store preferences) ---------- */
function renderTabSettings(){
  const s = lsGet('hp_settings', {storeName:'Hassan Pharmacy', phone:'+92 325 8604103', address:'Rahwali, near DC Colony, Gujranwala'});
  document.getElementById('adminTabHost').innerHTML = `
    <div class="card-box">
      <h3>Store Settings</h3>
      <div class="form-row"><label>Store Name</label><input id="setName" value="${escapeHtml(s.storeName)}"></div>
      <div class="form-row"><label>Contact Phone</label><input id="setPhone" value="${escapeHtml(s.phone)}"></div>
      <div class="form-row"><label>Address</label><input id="setAddress" value="${escapeHtml(s.address)}"></div>
      <button class="btn-primary" onclick="saveSettings()">Save Settings</button>
    </div>`;
}
function saveSettings(){
  const s = { storeName: document.getElementById('setName').value.trim(), phone: document.getElementById('setPhone').value.trim(), address: document.getElementById('setAddress').value.trim() };
  lsSet('hp_settings', s);
  alert('✅ Settings saved.');
}

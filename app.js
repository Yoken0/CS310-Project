function byId(id){return document.getElementById(id)}

const state = {
  items: [],
  page: 1,
  pageSize: 5,
  mapVisible: false,
  map: null,
  markers: []
}

function setLoading(on){
  const el = byId('loading');
  if(on) el.classList.remove('hidden'); else el.classList.add('hidden');
}

async function fetchResults(){
  setLoading(true);

  // UI is tag-driven. Use the Tag field as primary input.
  const tag = byId('tag').value.trim();
  const sort_method = byId('sort_method') ? byId('sort_method').value : 'location';
  const ascending = byId('ascending') ? !!byId('ascending').checked : false;
  const latEl = byId('lat'); const lonEl = byId('lon');
  const lat = latEl ? (latEl.value || '').trim() : '';
  const lon = lonEl ? (lonEl.value || '').trim() : '';

  const params = new URLSearchParams();
  // send tag and sorting intent to backend. Backend sorting code can use these params.
  if(tag) params.set('tag', tag);
  if(sort_method) params.set('sort_method', sort_method);
  params.set('ascending', ascending ? '1' : '0');
  if(lat) params.set('lat', lat);
  if(lon) params.set('lon', lon);

  try{
    const res = await fetch('/api/restaurants?' + params.toString());
    if(!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    state.items = data;
    state.page = 1;
    buildTagSuggestions();
    renderPage(state.page);
  }catch(err){
    const container = byId('results');
    container.textContent = 'Error loading results: ' + err.message;
  }finally{
    setLoading(false);
  }
}

function renderResults(items){
  const container = byId('results');
  // keep loading element, but clear other nodes
  const loading = byId('loading');
  container.innerHTML = '';
  container.appendChild(loading);
  loading.classList.add('hidden');

  if(!items.length){
    const p = document.createElement('div'); p.textContent = 'No restaurants found.'; container.appendChild(p); return;
  }

  for(const it of items){
    const card = document.createElement('div'); card.className = 'card';
    const left = document.createElement('div'); left.className = 'left';
    const h = document.createElement('div'); h.innerHTML = `<strong>${escapeHtml(it.name)}</strong> <span class="meta"> — ${escapeHtml(it.address || '')}</span>`;
    const tags = document.createElement('div'); tags.className = 'tags'; tags.textContent = (it.tags || []).join(', ');
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `Rating: ${it.rating || 'N/A'}  •  Price: ${it.price || 'N/A'}  •  Reviews: ${it.review_count || 0}`;
    left.appendChild(h); left.appendChild(tags); left.appendChild(meta);

    // recommendation badges removed — recommendations are not supported without user history

    const right = document.createElement('div');
    if(it.distance_km !== null && it.distance_km !== undefined){
      const d = document.createElement('div'); d.className = 'distance'; d.textContent = `${it.distance_km} km`;
      right.appendChild(d);
    }
    card.appendChild(left); card.appendChild(right);
    container.appendChild(card);
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

function renderPagination(){
  const total = state.items.length;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  const wrap = byId('pagination');
  const info = byId('page-info');
  const prev = byId('prev-page');
  const next = byId('next-page');
  if(total <= state.pageSize){ wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  info.textContent = `Page ${state.page} of ${pages} — ${total} results`;
  prev.disabled = state.page <= 1; next.disabled = state.page >= pages;
  prev.classList.toggle('disabled', prev.disabled);
  next.classList.toggle('disabled', next.disabled);
}

function renderPage(page){
  const total = state.items.length;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.max(1, Math.min(page, pages));
  const start = (state.page - 1) * state.pageSize;
  const pageItems = state.items.slice(start, start + state.pageSize);
  renderResults(pageItems);
  renderPagination();
  if(state.mapVisible) updateMapMarkers(pageItems);
}

function buildTagSuggestions(){
  const set = new Set();
  for(const r of state.items){
    (r.tags || []).forEach(t=>set.add(t));
  }
  const dl = byId('tag-suggestions'); dl.innerHTML = '';
  Array.from(set).sort().forEach(t=>{
    const opt = document.createElement('option'); opt.value = t; dl.appendChild(opt);
  });
}

function initMap(){
  if(state.map) return;
  state.map = L.map('map', {scrollWheelZoom:false}).setView([42.3601, -71.0589], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap'}).addTo(state.map);
}

function clearMarkers(){
  state.markers.forEach(m=>state.map.removeLayer(m)); state.markers = [];
}

function updateMapMarkers(items){
  if(!state.map) initMap();
  clearMarkers();
  const coords = [];
  for(const it of items){
    if(it.lat && it.lon){
      const m = L.marker([it.lat, it.lon]).addTo(state.map).bindPopup(`<strong>${escapeHtml(it.name)}</strong><br>${escapeHtml(it.address||'')}`);
      state.markers.push(m);
      coords.push([it.lat, it.lon]);
    }
  }
  if(coords.length) state.map.fitBounds(coords, {padding:[40,40]});
}

document.addEventListener('DOMContentLoaded', ()=>{
  byId('search-btn').addEventListener('click', fetchResults);
  byId('search').addEventListener('keydown', (e)=>{ if(e.key==='Enter') fetchResults(); });
  // location UI removed; keep functionality safe if elements exist
  const useLocBtn = byId('use-location');
  if(useLocBtn){
    useLocBtn.addEventListener('click', ()=>{
      if(navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>{
        const latEl = byId('lat'); const lonEl = byId('lon');
        if(latEl) latEl.value = pos.coords.latitude.toFixed(6);
        if(lonEl) lonEl.value = pos.coords.longitude.toFixed(6);
        fetchResults();
      }, err=>{ alert('Location denied or unavailable'); });
    });
  }

  byId('prev-page').addEventListener('click', ()=> renderPage(state.page - 1));
  byId('next-page').addEventListener('click', ()=> renderPage(state.page + 1));

  // map toggle removed from UI; keep safe if element exists
  const toggleMapBtn = byId('toggle-map');
  if(toggleMapBtn){
    toggleMapBtn.addEventListener('click', ()=>{
      state.mapVisible = !state.mapVisible;
      const wrap = byId('map-wrap');
      if(wrap) wrap.classList.toggle('hidden', !state.mapVisible);
      if(state.mapVisible){ setTimeout(()=>{ if(!state.map) initMap(); updateMapMarkers(state.items.slice((state.page-1)*state.pageSize, (state.page)*state.pageSize)); if(state.map) state.map.invalidateSize(); }, 200); }
    });
  }

  // Recommend button removed per request; no recommendation logic here.

  // initial load
  fetchResults();
});

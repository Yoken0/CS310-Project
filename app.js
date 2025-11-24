function byId(id){return document.getElementById(id)}

const state = {
  items: [],
  page: 1,
  pageSize: 5,
  mapVisible: false,
  map: null,
  markers: [],
  showingRecs: false
}

function setLoading(on){
  const el = byId('loading');
  if(on) el.classList.remove('hidden'); else el.classList.add('hidden');
}

async function fetchResults(){
  setLoading(true);
  const q = byId('search').value.trim();
  const tag = byId('tag').value.trim();
  const min_rating = byId('min_rating').value;
  const price = byId('price').value;
  const latEl = byId('lat'); const lonEl = byId('lon');
  const lat = latEl ? (latEl.value || '').trim() : '';
  const lon = lonEl ? (lonEl.value || '').trim() : '';

  const params = new URLSearchParams();
  if(q) params.set('query', q);
  if(tag) params.set('tag', tag);
  if(min_rating) params.set('min_rating', min_rating);
  if(price) params.set('price', price);
  if(lat) params.set('lat', lat);
  if(lon) params.set('lon', lon);

  try{
    const res = await fetch('/api/restaurants?' + params.toString());
    if(!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    state.items = data;
    state.page = 1;
    state.showingRecs = false;
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

    if(state.showingRecs && it._rec_score !== undefined){
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'Recommended';
      h.appendChild(badge);
    }

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

  const toggleMapBtn = byId('toggle-map');
  if(toggleMapBtn){
    toggleMapBtn.addEventListener('click', ()=>{
      state.mapVisible = !state.mapVisible;
      const wrap = byId('map-wrap');
      if(wrap) wrap.classList.toggle('hidden', !state.mapVisible);
      if(state.mapVisible){ setTimeout(()=>{ if(!state.map) initMap(); updateMapMarkers(state.items.slice((state.page-1)*state.pageSize, (state.page)*state.pageSize)); if(state.map) state.map.invalidateSize(); }, 200); }
    });
  }

  // Recommend handler
  const recommendBtn = byId('recommend-btn');
  if(recommendBtn){
    recommendBtn.addEventListener('click', async ()=>{
      setLoading(true);
      const q = byId('search').value.trim();
      const tag = byId('tag').value.trim();
      const min_rating = byId('min_rating').value;
      const price = byId('price').value;

      const params = new URLSearchParams();
      if(q) params.set('query', q);
      if(tag) params.set('tag', tag);
      if(min_rating) params.set('min_rating', min_rating);
      if(price) params.set('price', price);

      try{
        const res = await fetch('/api/restaurants?' + params.toString());
        const data = await res.json();
        // simple scoring: rating * (1 + review_count/100)
        const scored = data.map(r=>{
          const reviews = r.review_count || 0;
          let score = (r.rating || 0) * (1 + reviews/100);
          // boost if tag matches user's tag
          if(tag && r.tags && r.tags.map(t=>t.toLowerCase()).includes(tag.toLowerCase())) score *= 1.2;
          return Object.assign({}, r, {_rec_score: score});
        });
        scored.sort((a,b)=>b._rec_score - a._rec_score);
        const top = scored.slice(0, Math.max(5, state.pageSize));
        state.showingRecs = true;
        // hide pagination while showing recommendations
        const pag = byId('pagination'); if(pag) pag.classList.add('hidden');
        renderResults(top);
      }catch(e){
        const container = byId('results'); container.textContent = 'Error computing recommendations: '+ e.message;
      }finally{ setLoading(false); }
    });
  }

  // Research mode removed from UI; no-op.

  // initial load
  fetchResults();
});

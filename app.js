function byId(id){return document.getElementById(id)}

const state = {
  items: [],
  page: 1,
  pageSize: 5,
  mapVisible: false,
  map: null,
  markers: []
}

// we store user coordinates or address for distance sorting
state.user = { lat: null, lon: null, address: null };

//  the math formula: distance in kilometers
function haversineKm(lat1, lon1, lat2, lon2){
  const toRad = x => x * Math.PI / 180;
  const R = 6371.0; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Removed sortByDistance - all sorting is now handled by backend sorting.py algorithms

function setLoading(on){
  const el = byId('loading');
  if(on) el.classList.remove('hidden'); else el.classList.add('hidden');
}

async function fetchResults(){
  setLoading(true);

  // UI is tag driven. Use the Tag field as primary input.
  const tag = byId('tag').value.trim();
  const sort_method = byId('sort_method') ? byId('sort_method').value : 'location';
  const ascending = byId('ascending') ? !!byId('ascending').checked : false;
  
  // Use user's location from state if available (from "Use my location" button or address input)
  let lat = state.user.lat != null ? String(state.user.lat) : '';
  let lon = state.user.lon != null ? String(state.user.lon) : '';
  
  // If address is provided instead of coordinates, use that
  const addressInput = byId('user-address');
  const userAddress = state.user.address || (addressInput ? addressInput.value.trim() : '');

  const params = new URLSearchParams();
  // send tag and sorting intent to backend. Backend handles all sorting.
  if(tag) params.set('tag', tag);
  if(sort_method) params.set('sort_method', sort_method);
  params.set('ascending', ascending ? '1' : '0');
  if(lat && lon){
    params.set('lat', lat);
    params.set('lon', lon);
  } else if(userAddress){
    // If address is provided, send it as lat/lon will be geocoded on backend
    params.set('address', userAddress);
  }

  try{
    const res = await fetch('/api/restaurants?' + params.toString());
    if(!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    // Backend already sorted the data, so just use it directly
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
  // keep loading element, but clear the other nodes
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

    const right = document.createElement('div');
    if(it.distance_miles !== null && it.distance_miles !== undefined){
      const d = document.createElement('div'); d.className = 'distance'; d.textContent = `${it.distance_miles} mi`;
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


function mergeSortStrings(arr){
  if(arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSortStrings(arr.slice(0, mid));
  const right = mergeSortStrings(arr.slice(mid));
  return mergeStrings(left, right);
}

function mergeStrings(left, right){
  const result = [];
  let i = 0, j = 0;
  while(i < left.length && j < right.length){
    if(left[i].toLowerCase() <= right[j].toLowerCase()){
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  while(i < left.length) result.push(left[i++]);
  while(j < right.length) result.push(right[j++]);
  return result;
}

function buildTagSuggestions(){
  const set = new Set();
  for(const r of state.items){
    (r.tags || []).forEach(t=>set.add(t));
  }
  const dl = byId('tag-suggestions'); dl.innerHTML = '';
  const sortedTags = mergeSortStrings(Array.from(set));
  sortedTags.forEach(t=>{
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
  const tagInput = byId('tag');
  if(tagInput) tagInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') fetchResults(); });
  // Location input and geolocation functionality
  const useLocBtn = byId('use-location');
  const userAddressInput = byId('user-address');
  const userLocSpan = byId('user-loc');
  
  // Handle address input
  if(userAddressInput){
    userAddressInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        const address = userAddressInput.value.trim();
        if(address){
          // Clear lat/lon and use address instead
          state.user.lat = null;
          state.user.lon = null;
          state.user.address = address;
          if(userLocSpan) userLocSpan.textContent = `Using address: ${address}`;
          fetchResults();
        }
      }
    });
  }
  
  // Handle geolocation button
  if(useLocBtn){
    useLocBtn.addEventListener('click', ()=>{
      if(!navigator.geolocation){
        if(userLocSpan) userLocSpan.textContent = 'Geolocation not supported by browser';
        return;
      }
      if(userLocSpan) userLocSpan.textContent = 'Locating…';
      navigator.geolocation.getCurrentPosition(pos=>{
        state.user.lat = Number(pos.coords.latitude.toFixed(6));
        state.user.lon = Number(pos.coords.longitude.toFixed(6));
        state.user.address = null;
        if(userAddressInput) userAddressInput.value = '';
        if(userLocSpan) userLocSpan.textContent = `Using my location (${state.user.lat}, ${state.user.lon})`;
        // Trigger a new search with the user's location so backend can sort by distance
        fetchResults();
      }, err=>{ if(userLocSpan) userLocSpan.textContent = 'Location denied or unavailable'; });
    });
  }

  // Auto-refresh when sort method or ascending changes
  const sortMethodSelect = byId('sort_method');
  const ascendingCheckbox = byId('ascending');
  if(sortMethodSelect){
    sortMethodSelect.addEventListener('change', fetchResults);
  }
  if(ascendingCheckbox){
    ascendingCheckbox.addEventListener('change', fetchResults);
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

  fetchResults();
});

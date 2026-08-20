/**
 * ==============================================================================
 * PIZZERÍA BELLA NAPOLI - MAIN JAVASCRIPT
 * Arquitectura Full-Stack + Tailwind CSS (Utility-First) + Dark Mode
 * ==============================================================================
 */

// CONFIGURACIÓN DE ENDPOINTS
const API_BASE = '/api';

// ESTADO GLOBAL DE LA APLICACIÓN
const state = {
  userMode: 'cliente',        // 'cliente' | 'cocinero' | 'admin'
  currentClientView: 'landing', // 'landing' | 'menu' | 'tracking'
  activePersonalTab: 'cocina',  // 'cocina' | 'mostrador' | 'carta' | 'mesas'
  
  // Datos
  pizzas: [],
  pedidos: [],
  mesas: [],
  
  // Carrito de compras
  cart: [],
  orderType: 'domicilio',     // 'domicilio' | 'recoger' | 'mesa'
  selectedMesa: 3,
  
  // Seguimiento de pedido
  activeTrackingId: localStorage.getItem('last_pedido_id') || null,
  trackingInterval: null,
  
  // KDS auto-refresco
  kdsInterval: null,
  kdsFilter: 'all',
  
  // PIN Auth
  currentPin: '',
};

// ==============================================================================
// INICIALIZACIÓN
// ==============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initEventListeners();
  checkUrlParamsForTable();
  await checkApiHealth();
  await loadPizzas();
  await loadMesas();

  // Si hay un pedido activo previo, activar el badge
  if (state.activeTrackingId) {
    document.getElementById('badge-tracking')?.classList.remove('hidden');
    startTrackingPolling();
  }
});

// ==============================================================================
// GESTIÓN DE TEMA (DARK / LIGHT MODE CON TAILWIND)
// ==============================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('pizzeria_theme') || 'dark';
  applyTheme(savedTheme);

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem('pizzeria_theme', nextTheme);
    showToast(nextTheme === 'dark' ? '🌙 Modo Oscuro activado' : '☀️ Modo Claro activado', 'info');
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  const icon = document.getElementById('theme-icon');
  const btn = document.getElementById('btn-theme-toggle');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (icon) icon.textContent = '☀️';
    if (btn) btn.title = 'Cambiar a Modo Claro';
  } else {
    root.classList.remove('dark');
    if (icon) icon.textContent = '🌙';
    if (btn) btn.title = 'Cambiar a Modo Oscuro';
  }
}

// ==============================================================================
// DETECCIÓN DE CÓDIGO QR EN LA URL (?mesa=X)
// ==============================================================================
function checkUrlParamsForTable() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('mesa')) {
    const mesaNum = parseInt(params.get('mesa'), 10) || 1;
    state.selectedMesa = mesaNum;
    state.orderType = 'mesa';

    const radioMesaLabel = document.getElementById('radio-label-mesa');
    const radioMesa = document.querySelector('input[name="order-type"][value="mesa"]');
    const txtLabelMesa = document.getElementById('txt-label-mesa');
    
    if (radioMesaLabel) radioMesaLabel.classList.remove('hidden');
    if (txtLabelMesa) txtLabelMesa.textContent = `📍 En Mesa ${mesaNum}`;
    if (radioMesa) radioMesa.checked = true;

    // Ocultar Domicilio y Recoger para el cliente en sala
    document.querySelector('input[name="order-type"][value="domicilio"]')?.parentElement.classList.add('hidden');
    document.querySelector('input[name="order-type"][value="recoger"]')?.parentElement.classList.add('hidden');

    switchClientView('menu');
    updateOrderModeUI();

    showToast(`🍽️ ¡Bienvenido! Estás pidiendo desde la Mesa ${mesaNum}.`, 'info');
  } else {
    document.getElementById('radio-label-mesa')?.classList.add('hidden');
    document.querySelector('input[name="order-type"][value="domicilio"]')?.parentElement.classList.remove('hidden');
    document.querySelector('input[name="order-type"][value="recoger"]')?.parentElement.classList.remove('hidden');
  }
}

// ==============================================================================
// COMPROBAR CONEXIÓN API
// ==============================================================================
async function checkApiHealth() {
  const statusEl = document.getElementById('api-status');
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (res.ok) {
      statusEl.querySelector('.status-dot').className = 'w-2 h-2 rounded-full bg-emerald-500 status-dot';
      statusEl.querySelector('.status-text').textContent = 'API Conectada';
    } else {
      throw new Error('API no OK');
    }
  } catch (err) {
    statusEl.querySelector('.status-dot').className = 'w-2 h-2 rounded-full bg-amber-500 status-dot';
    statusEl.querySelector('.status-text').textContent = 'Modo Local';
  }
}

// ==============================================================================
// GESTIÓN DE VISTAS Y NAVEGACIÓN
// ==============================================================================
function switchClientView(viewName) {
  state.currentClientView = viewName;
  
  // Ocultar todas las vistas de cliente
  document.querySelectorAll('.client-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${viewName}`)?.classList.remove('hidden');

  // Actualizar botones de navegación cliente
  document.querySelectorAll('#nav-cliente .nav-tab').forEach(tab => {
    const isActive = tab.dataset.view === viewName;
    if (isActive) {
      tab.className = 'nav-tab active px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 shadow-sm flex items-center gap-2 transition-all';
    } else {
      tab.className = 'nav-tab px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-all';
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'tracking' && state.activeTrackingId) {
    fetchTrackingData(state.activeTrackingId);
  }
}

function switchPersonalTab(tabName) {
  state.activePersonalTab = tabName;

  // Actualizar tabs
  document.querySelectorAll('#nav-personal .nav-tab').forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    if (isActive) {
      tab.className = `nav-tab active px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 shadow-sm flex items-center gap-2 transition-all ${tab.classList.contains('admin-only') && state.userMode !== 'admin' ? 'hidden' : ''}`;
    } else {
      tab.className = `nav-tab px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-all ${tab.classList.contains('admin-only') && state.userMode !== 'admin' ? 'hidden' : ''}`;
    }
  });

  // Mostrar sección
  document.querySelectorAll('#view-personal-container .tab-content').forEach(section => {
    section.classList.toggle('hidden', section.id !== `tab-${tabName}`);
  });

  if (tabName === 'cocina') {
    loadPedidosKDS();
  } else if (tabName === 'carta') {
    renderAdminPizzas();
  } else if (tabName === 'mesas') {
    loadMesas();
  } else if (tabName === 'mostrador') {
    renderPosCatalog();
  }
}

// ==============================================================================
// AUTENTICACIÓN PERSONAL (PIN 1111 / 9999)
// ==============================================================================
function openStaffModal() {
  state.currentPin = '';
  document.getElementById('staff-pin-input').value = '';
  document.getElementById('staff-modal').classList.remove('hidden');
}

function closeStaffModal() {
  document.getElementById('staff-modal').classList.add('hidden');
  state.currentPin = '';
}

function handlePinInput(digit) {
  if (state.currentPin.length < 4) {
    state.currentPin += digit;
    document.getElementById('staff-pin-input').value = state.currentPin;
    
    if (state.currentPin.length === 4) {
      verifyStaffPin(state.currentPin);
    }
  }
}

function verifyStaffPin(pin) {
  if (pin === '1111') {
    loginStaff('cocinero');
  } else if (pin === '9999') {
    loginStaff('admin');
  } else {
    showToast('❌ PIN incorrecto (Prueba 1111 para Cocina o 9999 para Admin)', 'error');
    state.currentPin = '';
    document.getElementById('staff-pin-input').value = '';
  }
}

function loginStaff(role) {
  state.userMode = role;
  closeStaffModal();

  // Ocultar vistas de cliente y mostrar intranet
  document.querySelectorAll('.client-view').forEach(v => v.classList.add('hidden'));
  
  const navCliente = document.getElementById('nav-cliente');
  const navPersonal = document.getElementById('nav-personal');

  if (navCliente) navCliente.className = 'hidden items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60';
  if (navPersonal) navPersonal.className = 'hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60';

  document.getElementById('btn-header-cart')?.classList.add('hidden');
  document.getElementById('view-personal-container')?.classList.remove('hidden');
  document.getElementById('staff-active-bar')?.classList.remove('hidden');

  // Menú móvil
  document.getElementById('mobile-nav-cliente')?.classList.add('hidden');
  document.getElementById('mobile-nav-personal')?.classList.remove('hidden');

  const roleNameEl = document.getElementById('staff-role-name');
  const roleBadgeEl = document.getElementById('staff-role-badge');
  const avatarEl = document.getElementById('staff-avatar');
  const appSubtitle = document.getElementById('app-subtitle');

  if (role === 'cocinero') {
    roleNameEl.textContent = 'Cocinero (Turno Activo)';
    roleBadgeEl.textContent = 'KDS Cocina';
    roleBadgeEl.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase';
    avatarEl.textContent = '👨‍🍳';
    appSubtitle.textContent = 'Sistema KDS de Cocina en Vivo';

    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    switchPersonalTab('cocina');
  } else {
    roleNameEl.textContent = 'Administrador General';
    roleBadgeEl.textContent = 'Acceso Total';
    roleBadgeEl.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40 uppercase';
    avatarEl.textContent = '👑';
    appSubtitle.textContent = 'Panel de Administración & Control';

    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    switchPersonalTab('cocina');
  }

  startKdsPolling();
  showToast(`✅ Sesión iniciada como ${role.toUpperCase()}`, 'success');
}

function logoutStaff() {
  state.userMode = 'cliente';
  clearInterval(state.kdsInterval);

  const navCliente = document.getElementById('nav-cliente');
  const navPersonal = document.getElementById('nav-personal');

  if (navPersonal) navPersonal.className = 'hidden items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60';
  if (navCliente) navCliente.className = 'hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60';

  document.getElementById('view-personal-container')?.classList.add('hidden');
  document.getElementById('staff-active-bar')?.classList.add('hidden');
  document.getElementById('btn-header-cart')?.classList.remove('hidden');
  document.getElementById('app-subtitle').textContent = 'Auténtica Pizza Napolitana';

  // Menú móvil
  document.getElementById('mobile-nav-cliente')?.classList.remove('hidden');
  document.getElementById('mobile-nav-personal')?.classList.add('hidden');

  switchClientView('landing');
  showToast('👋 Has vuelto al modo público de cliente', 'info');
}

// ==============================================================================
// CARGA Y RENDERIZADO DE PIZZAS (CON CLASES TAILWIND)
// ==============================================================================
async function loadPizzas() {
  try {
    const res = await fetch(`${API_BASE}/pizzas`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      state.pizzas = data.data;
      renderClientPizzas();
      renderFeaturedLandingPizzas();
    }
  } catch (err) {
    console.error('Error al cargar pizzas:', err);
  }
}

function renderFeaturedLandingPizzas() {
  const container = document.getElementById('landing-featured-pizzas');
  if (!container) return;

  const topPizzas = state.pizzas.slice(0, 3);
  container.innerHTML = topPizzas.map(pizza => `
    <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      <div class="h-52 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
        <img src="${pizza.imagen_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591'}" alt="${pizza.nombre}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" loading="lazy">
        <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold bg-black/60 backdrop-blur-md text-white border border-white/20">
          ⭐ Destacada
        </span>
      </div>
      <div class="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 class="font-display font-bold text-xl text-slate-900 dark:text-white">${pizza.nombre}</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">${pizza.descripcion}</p>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <span class="font-display font-extrabold text-2xl text-slate-900 dark:text-white">${parseFloat(pizza.precio).toFixed(2)} €</span>
          <button onclick="addToCart(${pizza.id})" class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md hover:scale-105 transition-all cursor-pointer">
            🛒 Pedir
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderClientPizzas(filterCat = 'all', searchTerm = '') {
  const grid = document.getElementById('client-pizzas-grid');
  if (!grid) return;

  let filtered = state.pizzas.filter(p => p.disponible !== false);

  if (filterCat !== 'all') {
    filtered = filtered.filter(p => p.categoria_id == filterCat);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p => 
      p.nombre.toLowerCase().includes(term) || 
      p.descripcion.toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500">No se encontraron pizzas disponibles con ese criterio.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(pizza => `
    <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      <div class="h-48 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
        <img src="${pizza.imagen_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591'}" alt="${pizza.nombre}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" loading="lazy">
        <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold bg-black/60 backdrop-blur-md text-white border border-white/20">
          ${getCategoryName(pizza.categoria_id)}
        </span>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 class="font-display font-bold text-lg text-slate-900 dark:text-white">${pizza.nombre}</h3>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">${pizza.descripcion}</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span class="font-display font-black text-xl text-slate-900 dark:text-white">${parseFloat(pizza.precio).toFixed(2)} €</span>
          <button onclick="addToCart(${pizza.id})" class="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5">
            <span>➕</span> <span>Añadir</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function getCategoryName(catId) {
  if (catId == 1) return '🍕 Clásica';
  if (catId == 2) return '⭐ Especial';
  if (catId == 3) return '👑 Gourmet';
  return '🍕 Pizza';
}

// ==============================================================================
// GESTIÓN DEL CARRITO & MODALIDADES DE PEDIDO
// ==============================================================================
window.addToCart = function(pizzaId) {
  const pizza = state.pizzas.find(p => p.id === pizzaId);
  if (!pizza) return;

  const existing = state.cart.find(item => item.pizza_id === pizzaId);
  if (existing) {
    existing.cantidad += 1;
  } else {
    state.cart.push({
      pizza_id: pizza.id,
      nombre: pizza.nombre,
      precio: parseFloat(pizza.precio),
      cantidad: 1,
      notas: '',
    });
  }

  updateCartBadge();
  renderCartDrawer();
  showToast(`🛒 "${pizza.nombre}" añadida a la cesta`, 'success');
};

function updateCartQty(pizzaId, change) {
  const item = state.cart.find(i => i.pizza_id === pizzaId);
  if (!item) return;

  item.cantidad += change;
  if (item.cantidad <= 0) {
    state.cart = state.cart.filter(i => i.pizza_id !== pizzaId);
  }

  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const totalCount = state.cart.reduce((sum, i) => sum + i.cantidad, 0);
  const badgeHeader = document.getElementById('header-cart-count');
  if (badgeHeader) badgeHeader.textContent = totalCount;
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const totalEl = document.getElementById('cart-total-amount');
  const btnSubmit = document.getElementById('btn-submit-order');

  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 dark:text-slate-400 text-center py-6">Tu cesta está vacía. ¡Añade pizzas desde la carta!</p>`;
    totalEl.textContent = '0.00 €';
    btnSubmit.disabled = true;
    return;
  }

  let total = 0;
  container.innerHTML = state.cart.map(item => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    return `
      <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div class="flex-1">
          <h5 class="font-bold text-slate-900 dark:text-white">${item.nombre}</h5>
          <p class="text-xs text-slate-500">${item.precio.toFixed(2)} € x ${item.cantidad} = <strong class="text-slate-800 dark:text-slate-200">${subtotal.toFixed(2)} €</strong></p>
        </div>
        <div class="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-xl">
          <button class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer" onclick="updateCartQty(${item.pizza_id}, -1)">-</button>
          <span class="font-bold text-xs min-w-[16px] text-center">${item.cantidad}</span>
          <button class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer" onclick="updateCartQty(${item.pizza_id}, 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = `${total.toFixed(2)} €`;
  btnSubmit.disabled = false;
}

function updateOrderModeUI() {
  const radio = document.querySelector('input[name="order-type"]:checked');
  if (!radio) return;

  state.orderType = radio.value;

  const banner = document.getElementById('order-mode-info-banner');
  const bannerIcon = document.getElementById('mode-info-icon');
  const bannerText = document.getElementById('mode-info-text');

  const cartIcon = document.getElementById('cart-mode-icon');
  const cartDetails = document.getElementById('cart-mode-details');

  const telGroup = document.getElementById('checkout-tel-group');
  const dirGroup = document.getElementById('checkout-dir-group');
  const mesaGroup = document.getElementById('checkout-mesa-group');
  const mesaDisplay = document.getElementById('checkout-mesa-display');

  if (state.orderType === 'domicilio') {
    telGroup?.classList.remove('hidden');
    dirGroup?.classList.remove('hidden');
    mesaGroup?.classList.add('hidden');

    banner.className = 'p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 text-sm flex items-center gap-3';
    bannerIcon.textContent = '🛵';
    bannerText.innerHTML = '<strong>Pedido a Domicilio:</strong> Te lo llevamos caliente a casa en 30-40 min. Pago al repartidor en efectivo o datáfono.';

    cartIcon.textContent = '🛵';
    cartDetails.innerHTML = '<strong class="block text-sm text-slate-900 dark:text-white">Modalidad: A Domicilio</strong><small class="text-slate-500 dark:text-slate-400">Entrega en 30-40 min</small>';

  } else if (state.orderType === 'recoger') {
    telGroup?.classList.remove('hidden');
    dirGroup?.classList.add('hidden');
    mesaGroup?.classList.add('hidden');

    banner.className = 'p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-3';
    bannerIcon.textContent = '🥡';
    bannerText.innerHTML = '<strong>Para Recoger en Local:</strong> Pasa a buscarlo sin colas. Te avisamos en cuanto esté recién salido del horno.';

    cartIcon.textContent = '🥡';
    cartDetails.innerHTML = '<strong class="block text-sm text-slate-900 dark:text-white">Modalidad: Para Recoger</strong><small class="text-slate-500 dark:text-slate-400">Recogida en mostrador</small>';

  } else if (state.orderType === 'mesa') {
    telGroup?.classList.add('hidden');
    dirGroup?.classList.add('hidden');
    mesaGroup?.classList.remove('hidden');

    if (mesaDisplay) mesaDisplay.value = `Mesa ${state.selectedMesa}`;

    banner.className = 'p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3';
    bannerIcon.textContent = '🍽️';
    bannerText.innerHTML = `<strong>En Mesa (${state.selectedMesa}):</strong> Enviamos tu comanda directamente al horno sin esperas.`;

    cartIcon.textContent = '🍽️';
    cartDetails.innerHTML = `<strong class="block text-sm text-slate-900 dark:text-white">Modalidad: En Mesa ${state.selectedMesa}</strong><small class="text-slate-500 dark:text-slate-400">Servido directo a tu mesa</small>`;
  }
}

// ==============================================================================
// ENVÍO DE PEDIDO ONLINE (POST /api/pedidos)
// ==============================================================================
async function submitClientOrder() {
  if (state.cart.length === 0) return;

  const nombre = document.getElementById('checkout-cliente-nombre').value.trim();
  const tel = document.getElementById('checkout-cliente-tel').value.trim();
  const dir = document.getElementById('checkout-cliente-dir').value.trim();
  const obs = document.getElementById('checkout-observaciones').value.trim();
  const pagoRadio = document.querySelector('input[name="payment-method"]:checked');
  const metodoPago = pagoRadio ? pagoRadio.value : 'efectivo_entrega';

  if (!nombre) {
    showToast('⚠️ Por favor, indica tu nombre', 'error');
    return;
  }

  if (state.orderType === 'domicilio') {
    if (!tel || !dir) {
      showToast('⚠️ Teléfono y Dirección son obligatorios para entrega a domicilio', 'error');
      return;
    }
  } else if (state.orderType === 'recoger') {
    if (!tel) {
      showToast('⚠️ Indica un teléfono de contacto para el aviso de recogida', 'error');
      return;
    }
  }

  const payload = {
    tipo_pedido: state.orderType,
    mesa_numero: state.orderType === 'mesa' ? state.selectedMesa : null,
    cliente_nombre: nombre,
    cliente_telefono: tel || null,
    cliente_direccion: state.orderType === 'domicilio' ? dir : null,
    metodo_pago: metodoPago,
    observaciones: obs || null,
    lineas: state.cart.map(item => ({
      pizza_id: item.pizza_id,
      cantidad: item.cantidad,
      notas: item.notas || null,
    })),
  };

  const btnSubmit = document.getElementById('btn-submit-order');
  btnSubmit.disabled = true;
  btnSubmit.textContent = '⏳ Enviando a Cocina...';

  try {
    const res = await fetch(`${API_BASE}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      const pedidoCreado = data.data;
      state.cart = [];
      updateCartBadge();
      closeCartDrawer();

      state.activeTrackingId = pedidoCreado.id;
      localStorage.setItem('last_pedido_id', pedidoCreado.id);
      document.getElementById('badge-tracking')?.classList.remove('hidden');

      showToast(`🎉 ¡Pedido #${pedidoCreado.id} enviado a cocina!`, 'success');

      switchClientView('tracking');
      startTrackingPolling();
    } else {
      throw new Error(data.message || 'Error al tramitar el pedido');
    }
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = '🚀 Confirmar y Enviar Pedido';
  }
}

// ==============================================================================
// SEGUIMIENTO DE PEDIDO EN VIVO (TRACKING)
// ==============================================================================
async function fetchTrackingData(orderId) {
  try {
    const res = await fetch(`${API_BASE}/pedidos/${orderId}`);
    const data = await res.json();
    if (res.ok && data.success) {
      renderTrackingUI(data.data);
    }
  } catch (err) {
    console.error('Error al consultar tracking:', err);
  }
}

function renderTrackingUI(pedido) {
  document.getElementById('tracking-order-title').textContent = `Estado de tu Pedido #${pedido.id}`;
  
  const badgeType = document.getElementById('tracking-type-badge');
  if (pedido.tipo_pedido === 'domicilio') {
    badgeType.textContent = '🛵 PEDIDO A DOMICILIO';
  } else if (pedido.tipo_pedido === 'recoger') {
    badgeType.textContent = '🥡 PEDIDO PARA RECOGER';
  } else {
    badgeType.textContent = `🍽️ PEDIDO EN MESA ${pedido.mesa_numero}`;
  }

  const stepPendiente = document.getElementById('step-pendiente');
  const stepPrep = document.getElementById('step-preparacion');
  const stepCamino = document.getElementById('step-camino');
  const stepEntregado = document.getElementById('step-entregado');

  const steps = [stepPendiente, stepPrep, stepCamino, stepEntregado];
  steps.forEach(s => s.className = 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1 text-slate-500');

  const estado = pedido.estado;

  if (estado === 'pendiente') {
    stepPendiente.className = 'p-3 rounded-2xl bg-brand-500/10 border border-brand-500 text-brand-500 font-bold space-y-1';
  } else if (estado === 'en_preparacion') {
    stepPendiente.className = 'p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500 text-emerald-500 font-bold space-y-1';
    stepPrep.className = 'p-3 rounded-2xl bg-orange-500/10 border border-orange-500 text-orange-500 font-bold space-y-1';
  } else if (estado === 'en_reparto' || estado === 'listo') {
    stepPendiente.className = 'p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500 text-emerald-500 font-bold space-y-1';
    stepPrep.className = 'p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500 text-emerald-500 font-bold space-y-1';
    stepCamino.className = 'p-3 rounded-2xl bg-brand-500/10 border border-brand-500 text-brand-500 font-bold space-y-1';
  } else if (estado === 'servido' || estado === 'entregado') {
    steps.forEach(s => s.className = 'p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500 text-emerald-500 font-bold space-y-1');
  }

  const itemsContainer = document.getElementById('tracking-items-list');
  if (itemsContainer && Array.isArray(pedido.lineas)) {
    itemsContainer.innerHTML = pedido.lineas.map(l => `
      <div class="flex justify-between">
        <span>${l.cantidad}x ${l.nombre}</span>
        <strong>${parseFloat(l.subtotal).toFixed(2)} €</strong>
      </div>
    `).join('');
  }

  document.getElementById('tracking-total-val').textContent = `${parseFloat(pedido.total).toFixed(2)} €`;

  const destInfo = document.getElementById('tracking-dest-info');
  if (destInfo) {
    if (pedido.tipo_pedido === 'domicilio') {
      destInfo.innerHTML = `
        <p><strong>Cliente:</strong> ${pedido.cliente_nombre}</p>
        <p><strong>Teléfono:</strong> ${pedido.cliente_telefono || '--'}</p>
        <p><strong>Dirección:</strong> ${pedido.cliente_direccion || '--'}</p>
      `;
    } else if (pedido.tipo_pedido === 'recoger') {
      destInfo.innerHTML = `
        <p><strong>Cliente:</strong> ${pedido.cliente_nombre}</p>
        <p><strong>Teléfono:</strong> ${pedido.cliente_telefono || '--'}</p>
        <p><strong>Recogida:</strong> Mostrador Pizzería</p>
      `;
    } else {
      destInfo.innerHTML = `
        <p><strong>Mesa:</strong> #${pedido.mesa_numero}</p>
        <p><strong>Cliente:</strong> ${pedido.cliente_nombre}</p>
      `;
    }
  }
}

function startTrackingPolling() {
  if (state.trackingInterval) clearInterval(state.trackingInterval);
  state.trackingInterval = setInterval(() => {
    if (state.activeTrackingId && state.currentClientView === 'tracking') {
      fetchTrackingData(state.activeTrackingId);
    }
  }, 4000);
}

// ==============================================================================
// COCINA KDS (KANBAN EN TIEMPO REAL CON TAILWIND)
// ==============================================================================
async function loadPedidosKDS() {
  try {
    const res = await fetch(`${API_BASE}/pedidos`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      state.pedidos = data.data;
      renderKDSBoard();
    }
  } catch (err) {
    console.error('Error al cargar comandas KDS:', err);
  }
}

function renderKDSBoard() {
  const listPendiente = document.getElementById('list-pedidos-pendiente');
  const listPrep = document.getElementById('list-pedidos-preparacion');
  const listListo = document.getElementById('list-pedidos-listo');

  if (!listPendiente) return;

  let pedidosFiltrados = state.pedidos;
  if (state.kdsFilter !== 'all') {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo_pedido === state.kdsFilter);
  }

  const pendientes = pedidosFiltrados.filter(p => p.estado === 'pendiente');
  const preparacion = pedidosFiltrados.filter(p => p.estado === 'en_preparacion' || p.estado === 'en_reparto');
  const listos = pedidosFiltrados.filter(p => p.estado === 'listo' || p.estado === 'servido' || p.estado === 'entregado');

  document.getElementById('count-pendiente').textContent = pendientes.length;
  document.getElementById('count-preparacion').textContent = preparacion.length;
  document.getElementById('count-listo').textContent = listos.length;
  document.getElementById('badge-cocina-count').textContent = pendientes.length;

  listPendiente.innerHTML = pendientes.map(p => renderKDSCard(p)).join('') || '<p class="text-xs text-slate-400 text-center py-8">Sin comandas pendientes</p>';
  listPrep.innerHTML = preparacion.map(p => renderKDSCard(p)).join('') || '<p class="text-xs text-slate-400 text-center py-8">Horno despejado</p>';
  listListo.innerHTML = listos.map(p => renderKDSCard(p)).join('') || '<p class="text-xs text-slate-400 text-center py-8">No hay pedidos en espera</p>';
}

function renderKDSCard(p) {
  let badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  let badgeText = `🍽️ Mesa ${p.mesa_numero || '--'}`;

  if (p.tipo_pedido === 'domicilio') {
    badgeColor = 'bg-brand-500/10 text-brand-500 border-brand-500/30';
    badgeText = `🛵 Domicilio`;
  } else if (p.tipo_pedido === 'recoger') {
    badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    badgeText = `🥡 Recoger`;
  }

  const lineasHtml = (p.lineas || []).map(l => `
    <div class="flex items-start gap-2 text-xs sm:text-sm">
      <span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold text-xs">${l.cantidad}x</span>
      <div>
        <strong class="text-slate-900 dark:text-white">${l.nombre}</strong>
        ${l.notas ? `<span class="block text-xs text-amber-500 italic font-medium">"${l.notas}"</span>` : ''}
      </div>
    </div>
  `).join('');

  let actionButtons = '';
  if (p.estado === 'pendiente') {
    actionButtons = `
      <button onclick="updateOrderStatus(${p.id}, 'en_preparacion')" class="w-full py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer">
        🔥 Meter al Horno
      </button>
    `;
  } else if (p.estado === 'en_preparacion') {
    actionButtons = `
      <button onclick="updateOrderStatus(${p.id}, '${p.tipo_pedido === 'domicilio' ? 'en_reparto' : 'listo'}')" class="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer">
        ${p.tipo_pedido === 'domicilio' ? '🛵 A Reparto' : '✅ Marcar Listo'}
      </button>
    `;
  } else if (p.estado === 'en_reparto' || p.estado === 'listo') {
    actionButtons = `
      <button onclick="updateOrderStatus(${p.id}, '${p.tipo_pedido === 'mesa' ? 'servido' : 'entregado'}')" class="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer">
        📦 Entregado / Servido
      </button>
    `;
  }

  return `
    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-sm hover:border-slate-400 transition-colors">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeColor} uppercase">${badgeText}</span>
          <strong class="font-bold text-sm">#${p.id}</strong>
        </div>
        <span class="text-xs text-slate-400">${formatTime(p.fecha)}</span>
      </div>

      <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <strong class="block text-slate-900 dark:text-white text-sm">${p.cliente_nombre || 'Cliente'}</strong>
        ${p.cliente_telefono ? `<span class="text-slate-500 block">📞 Tel: ${p.cliente_telefono}</span>` : ''}
        ${p.cliente_direccion ? `<span class="text-blue-500 dark:text-blue-400 block font-medium mt-0.5">📍 ${p.cliente_direccion}</span>` : ''}
      </div>

      <div class="space-y-1.5 pt-1">
        ${lineasHtml}
      </div>

      ${p.observaciones ? `<div class="p-2 rounded-lg bg-amber-500/10 border-l-2 border-amber-500 text-xs text-amber-600 dark:text-amber-400">💬 ${p.observaciones}</div>` : ''}

      <div class="pt-1">
        ${actionButtons}
      </div>
    </div>
  `;
}

window.updateOrderStatus = async function(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/pedidos/${orderId}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newStatus }),
    });

    if (res.ok) {
      showToast(`⚡ Pedido #${orderId} actualizado a "${newStatus}"`, 'success');
      await loadPedidosKDS();
    } else {
      throw new Error('Error al actualizar estado');
    }
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
};

function startKdsPolling() {
  if (state.kdsInterval) clearInterval(state.kdsInterval);
  state.kdsInterval = setInterval(() => {
    if (state.userMode !== 'cliente' && state.activePersonalTab === 'cocina') {
      loadPedidosKDS();
    }
  }, 5000);
}

// ==============================================================================
// ADMINISTRACIÓN DE PIZZAS (CRUD ADMIN CON TAILWIND)
// ==============================================================================
function renderAdminPizzas() {
  const container = document.getElementById('admin-pizzas-grid');
  if (!container) return;

  container.innerHTML = state.pizzas.map(p => `
    <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
      <div class="h-36 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
        <img src="${p.imagen_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591'}" class="w-full h-full object-cover">
        <span class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-black/60 text-white">
          ${getCategoryName(p.categoria_id)}
        </span>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4 class="font-display font-bold text-base text-slate-900 dark:text-white">${p.nombre}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mt-1">${p.descripcion}</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <strong class="text-lg font-bold">${parseFloat(p.precio).toFixed(2)} €</strong>
          <div class="flex gap-1.5">
            <button class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs cursor-pointer" onclick="editPizzaModal(${p.id})">✏️</button>
            <button class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-xs cursor-pointer" onclick="deletePizza(${p.id})">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

window.editPizzaModal = function(pizzaId) {
  const pizza = state.pizzas.find(p => p.id === pizzaId);
  if (!pizza) return;

  document.getElementById('pizza-modal-title').textContent = '✏️ Editar Pizza';
  document.getElementById('form-pizza-id').value = pizza.id;
  document.getElementById('form-pizza-nombre').value = pizza.nombre;
  document.getElementById('form-pizza-categoria').value = pizza.categoria_id || '1';
  document.getElementById('form-pizza-precio').value = pizza.precio;
  document.getElementById('form-pizza-imagen').value = pizza.imagen_url || '';
  document.getElementById('form-pizza-desc').value = pizza.descripcion || '';
  document.getElementById('form-pizza-disponible').checked = pizza.disponible !== false;

  document.getElementById('pizza-modal').classList.remove('hidden');
};

window.deletePizza = async function(pizzaId) {
  if (!confirm(`¿Seguro que deseas eliminar la pizza #${pizzaId}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/pizzas/${pizzaId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('🗑️ Pizza eliminada con éxito', 'success');
      await loadPizzas();
      renderAdminPizzas();
    }
  } catch (err) {
    showToast('❌ Error al eliminar pizza', 'error');
  }
};

async function savePizzaForm(e) {
  e.preventDefault();
  const id = document.getElementById('form-pizza-id').value;
  const nombre = document.getElementById('form-pizza-nombre').value.trim();
  const categoria_id = parseInt(document.getElementById('form-pizza-categoria').value, 10);
  const precio = parseFloat(document.getElementById('form-pizza-precio').value);
  const imagen_url = document.getElementById('form-pizza-imagen').value.trim();
  const descripcion = document.getElementById('form-pizza-desc').value.trim();
  const disponible = document.getElementById('form-pizza-disponible').checked;

  const payload = { nombre, categoria_id, precio, imagen_url, descripcion, disponible };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/pizzas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/pizzas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      showToast(id ? '✅ Pizza actualizada' : '🎉 Nueva pizza añadida', 'success');
      document.getElementById('pizza-modal').classList.add('hidden');
      await loadPizzas();
      renderAdminPizzas();
    } else {
      throw new Error('Error al guardar pizza');
    }
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ==============================================================================
// GESTIÓN DE SALA & MESAS (QR CODES CON TAILWIND)
// ==============================================================================
async function loadMesas() {
  try {
    const res = await fetch(`${API_BASE}/mesas`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      state.mesas = data.data;
      renderMesas();
    }
  } catch (err) {
    console.error('Error al cargar mesas:', err);
  }
}

function renderMesas() {
  const container = document.getElementById('mesas-grid');
  if (!container) return;

  container.innerHTML = state.mesas.map(m => `
    <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      <div class="flex items-center justify-between">
        <h3 class="font-display font-black text-xl text-slate-900 dark:text-white">Mesa ${m.numero}</h3>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${m.estado === 'ocupada' ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'}">
          ${m.estado}
        </span>
      </div>
      <p class="text-xs text-slate-500">Capacidad: <strong class="text-slate-800 dark:text-slate-200">${m.capacidad} comensales</strong></p>
      <button class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer" onclick="showQrModal(${m.numero})">
        📱 Ver Código QR
      </button>
    </div>
  `).join('');
}

window.showQrModal = function(mesaNum) {
  const modal = document.getElementById('qr-modal');
  const title = document.getElementById('modal-qr-title');
  const qrImg = document.getElementById('qr-image');
  const qrInput = document.getElementById('qr-url-input');
  const openLink = document.getElementById('qr-open-link');

  const tableUrl = `${window.location.origin}/?mesa=${mesaNum}`;

  title.textContent = `Código QR - Mesa #${mesaNum}`;
  qrInput.value = tableUrl;
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(tableUrl)}`;
  openLink.href = tableUrl;

  modal.classList.remove('hidden');
};

// ==============================================================================
// TPV MOSTRADOR
// ==============================================================================
function renderPosCatalog() {
  const container = document.getElementById('pos-pizzas-list');
  if (!container) return;

  container.innerHTML = state.pizzas.map(p => `
    <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all cursor-pointer" onclick="addPosItem(${p.id})">
      <strong class="block text-sm text-slate-900 dark:text-white leading-tight">${p.nombre}</strong>
      <div class="text-xs font-bold text-slate-500 mt-1">${parseFloat(p.precio).toFixed(2)} €</div>
    </div>
  `).join('');
}

let posItems = [];
window.addPosItem = function(pizzaId) {
  const pizza = state.pizzas.find(p => p.id === pizzaId);
  if (!pizza) return;

  const existing = posItems.find(i => i.pizza_id === pizzaId);
  if (existing) {
    existing.cantidad += 1;
  } else {
    posItems.push({
      pizza_id: pizza.id,
      nombre: pizza.nombre,
      precio: parseFloat(pizza.precio),
      cantidad: 1,
    });
  }
  renderPosTicket();
};

function renderPosTicket() {
  const container = document.getElementById('pos-ticket-items');
  const totalEl = document.getElementById('pos-total-amount');
  const btnSubmit = document.getElementById('btn-submit-pos');

  if (posItems.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No has añadido ninguna pizza todavía.</p>`;
    totalEl.textContent = '0.00 €';
    btnSubmit.disabled = true;
    return;
  }

  let total = 0;
  container.innerHTML = posItems.map(item => {
    const sub = item.precio * item.cantidad;
    total += sub;
    return `
      <div class="flex justify-between items-center text-xs">
        <span>${item.cantidad}x ${item.nombre}</span>
        <strong>${sub.toFixed(2)} €</strong>
      </div>
    `;
  }).join('');

  totalEl.textContent = `${total.toFixed(2)} €`;
  btnSubmit.disabled = false;
}

// ==============================================================================
// HELPERS Y EVENT LISTENERS
// ==============================================================================
function initEventListeners() {
  document.getElementById('brand-logo')?.addEventListener('click', () => {
    if (state.userMode === 'cliente') switchClientView('landing');
  });

  document.querySelectorAll('#nav-cliente .nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchClientView(tab.dataset.view));
  });

  document.querySelectorAll('#nav-personal .nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPersonalTab(tab.dataset.tab));
  });

  document.getElementById('btn-hero-domicilio')?.addEventListener('click', () => {
    switchClientView('menu');
    const r = document.querySelector('input[name="order-type"][value="domicilio"]');
    if (r) { r.checked = true; updateOrderModeUI(); }
  });

  document.getElementById('btn-hero-recoger')?.addEventListener('click', () => {
    switchClientView('menu');
    const r = document.querySelector('input[name="order-type"][value="recoger"]');
    if (r) { r.checked = true; updateOrderModeUI(); }
  });

  document.getElementById('btn-ver-todas-landing')?.addEventListener('click', () => switchClientView('menu'));

  document.querySelectorAll('input[name="order-type"]').forEach(radio => {
    radio.addEventListener('change', updateOrderModeUI);
  });

  document.querySelectorAll('#client-cat-filters .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#client-cat-filters .pill-btn').forEach(b => {
        b.className = 'pill-btn px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-400 whitespace-nowrap cursor-pointer transition-all';
      });
      btn.className = 'pill-btn active px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-slate-900 dark:border-white whitespace-nowrap cursor-pointer transition-all';
      renderClientPizzas(btn.dataset.cat, document.getElementById('input-search-pizzas').value);
    });
  });

  document.getElementById('input-search-pizzas')?.addEventListener('input', (e) => {
    const activeCat = document.querySelector('#client-cat-filters .pill-btn.active')?.dataset.cat || 'all';
    renderClientPizzas(activeCat, e.target.value);
  });

  document.getElementById('btn-header-cart')?.addEventListener('click', openCartDrawer);
  document.getElementById('btn-close-cart')?.addEventListener('click', closeCartDrawer);
  document.getElementById('btn-submit-order')?.addEventListener('click', submitClientOrder);

  document.getElementById('btn-staff-auth')?.addEventListener('click', openStaffModal);
  document.getElementById('btn-footer-staff')?.addEventListener('click', openStaffModal);
  document.getElementById('btn-close-staff-modal')?.addEventListener('click', closeStaffModal);
  document.getElementById('btn-logout-staff')?.addEventListener('click', logoutStaff);

  // Footer Links
  document.getElementById('footer-link-menu')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchClientView('menu');
  });
  document.getElementById('footer-link-domicilio')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchClientView('menu');
    const r = document.querySelector('input[name="order-type"][value="domicilio"]');
    if (r) { r.checked = true; updateOrderModeUI(); }
  });
  document.getElementById('footer-link-recoger')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchClientView('menu');
    const r = document.querySelector('input[name="order-type"][value="recoger"]');
    if (r) { r.checked = true; updateOrderModeUI(); }
  });
  document.getElementById('footer-link-tracking')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchClientView('tracking');
  });

  // Keypad
  document.querySelectorAll('.key-btn[data-val]').forEach(btn => {
    btn.addEventListener('click', () => handlePinInput(btn.dataset.val));
  });

  document.getElementById('btn-pin-clear')?.addEventListener('click', () => {
    state.currentPin = '';
    document.getElementById('staff-pin-input').value = '';
  });

  document.getElementById('btn-pin-enter')?.addEventListener('click', () => {
    if (state.currentPin.length === 4) verifyStaffPin(state.currentPin);
  });

  document.getElementById('btn-demo-cocina')?.addEventListener('click', () => loginStaff('cocinero'));
  document.getElementById('btn-demo-admin')?.addEventListener('click', () => loginStaff('admin'));

  document.getElementById('btn-open-new-pizza')?.addEventListener('click', () => {
    document.getElementById('pizza-form').reset();
    document.getElementById('form-pizza-id').value = '';
    document.getElementById('pizza-modal-title').textContent = '🍕 Añadir Nueva Pizza';
    document.getElementById('pizza-modal').classList.remove('hidden');
  });

  document.getElementById('btn-close-pizza-modal')?.addEventListener('click', () => {
    document.getElementById('pizza-modal').classList.add('hidden');
  });

  document.getElementById('btn-cancel-pizza-modal')?.addEventListener('click', () => {
    document.getElementById('pizza-modal').classList.add('hidden');
  });

  // Menú Hamburguesa Móvil
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const mobileMenuDropdown = document.getElementById('mobile-menu-dropdown');
  const hamburgerIcon = document.getElementById('hamburger-icon');

  btnMobileMenu?.addEventListener('click', () => {
    const isHidden = mobileMenuDropdown.classList.contains('hidden');
    mobileMenuDropdown.classList.toggle('hidden', !isHidden);
    if (hamburgerIcon) hamburgerIcon.textContent = isHidden ? '✕' : '☰';
  });

  document.querySelectorAll('.mobile-nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchClientView(tab.dataset.view);
      mobileMenuDropdown?.classList.add('hidden');
      if (hamburgerIcon) hamburgerIcon.textContent = '☰';
    });
  });

  document.querySelectorAll('.mobile-personal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchPersonalTab(tab.dataset.tab);
      mobileMenuDropdown?.classList.add('hidden');
      if (hamburgerIcon) hamburgerIcon.textContent = '☰';
    });
  });

  document.getElementById('btn-mobile-staff-auth')?.addEventListener('click', () => {
    mobileMenuDropdown?.classList.add('hidden');
    if (hamburgerIcon) hamburgerIcon.textContent = '☰';
    openStaffModal();
  });

  document.getElementById('pizza-form')?.addEventListener('submit', savePizzaForm);

  document.getElementById('btn-close-qr-modal')?.addEventListener('click', () => {
    document.getElementById('qr-modal').classList.add('hidden');
  });

  document.getElementById('btn-tracking-back-menu')?.addEventListener('click', () => switchClientView('menu'));

  // KDS Filter Chips
  document.querySelectorAll('.chip-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-filter').forEach(c => {
        c.className = 'chip-filter px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      });
      chip.className = 'chip-filter active px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 cursor-pointer';
      state.kdsFilter = chip.dataset.filterType;
      renderKDSBoard();
    });
  });

  document.getElementById('pos-tipo-pedido')?.addEventListener('change', (e) => {
    const tipo = e.target.value;
    document.getElementById('pos-mesa-wrap')?.classList.toggle('hidden', tipo !== 'mesa');
    document.getElementById('pos-dir-wrap')?.classList.toggle('hidden', tipo !== 'domicilio');
    document.getElementById('pos-tel-wrap')?.classList.toggle('hidden', tipo === 'mesa');
  });

  document.getElementById('btn-submit-pos')?.addEventListener('click', submitPosOrder);
}

async function submitPosOrder() {
  if (posItems.length === 0) return;

  const tipo = document.getElementById('pos-tipo-pedido').value;
  const mesa = document.getElementById('pos-mesa').value;
  const cliente = document.getElementById('pos-cliente').value.trim() || 'Cliente Mostrador';
  const dir = document.getElementById('pos-direccion')?.value.trim();
  const tel = document.getElementById('pos-telefono')?.value.trim();
  const obs = document.getElementById('pos-obs').value.trim();

  const payload = {
    tipo_pedido: tipo,
    mesa_numero: tipo === 'mesa' ? parseInt(mesa, 10) : null,
    cliente_nombre: cliente,
    cliente_telefono: tel || null,
    cliente_direccion: dir || null,
    observaciones: obs || null,
    lineas: posItems.map(i => ({ pizza_id: i.pizza_id, cantidad: i.cantidad })),
  };

  try {
    const res = await fetch(`${API_BASE}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast('🚀 Pedido de mostrador enviado a cocina', 'success');
      posItems = [];
      renderPosTicket();
      document.getElementById('pos-cliente').value = '';
      document.getElementById('pos-obs').value = '';
      if (state.activePersonalTab === 'cocina') loadPedidosKDS();
    }
  } catch (err) {
    showToast(`❌ Error al tramitar comanda: ${err.message}`, 'error');
  }
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById('cart-drawer-modal').classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer-modal').classList.add('hidden');
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderColor = type === 'success' ? 'border-emerald-500' : type === 'error' ? 'border-brand-500' : 'border-blue-500';
  
  toast.className = `px-4 py-3 rounded-2xl bg-slate-900 text-white border-l-4 ${borderColor} shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 pointer-events-auto animate-slide-up`;
  toast.innerHTML = msg;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

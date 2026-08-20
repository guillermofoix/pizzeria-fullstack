/**
 * ==============================================================================
 * JAVASCRIPT PRINCIPAL: WEBAPP MÓVIL CLIENTE QR (MÓDULO DAM)
 * ==============================================================================
 */

// Base URL de la API REST (Usa proxy relativo o localhost:3000)
const API_BASE_URL = window.location.port === '8081' || window.location.port === '80'
  ? '/api'
  : 'http://localhost:3000/api';

// Estado local de la aplicación móvil
const state = {
  mesa: null,
  pizzas: [],
  cart: {}, // Formato: { [pizzaId]: { pizza, cantidad } }
  activeCategory: 'all',
  activeOrderId: sessionStorage.getItem('pizzeria_active_order_id') || null,
  trackingInterval: null
};

// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initMesaDetection();
  setupEventListeners();
  await loadPizzas();

  // Si hay un pedido activo guardado en la sesión, reanudar el seguimiento
  if (state.activeOrderId) {
    startOrderTracking(state.activeOrderId);
  }
});

// ─── DETECCIÓN DE MESA DESDE LA URL O SELECTOR ──────────────────────────────
function initMesaDetection() {
  const urlParams = new URLSearchParams(window.location.search);
  const mesaParam = urlParams.get('mesa');

  const mesaDisplay = document.getElementById('mesa-numero-display');
  const mesaPickerBar = document.getElementById('mesa-picker-bar');
  const mesaSelect = document.getElementById('mesa-select');

  if (mesaParam) {
    state.mesa = parseInt(mesaParam, 10);
    mesaDisplay.textContent = `#${state.mesa}`;
    mesaPickerBar.classList.add('hidden');
  } else {
    // Si no se escaneó con parámetro de mesa, mostrar selector manual
    state.mesa = parseInt(mesaSelect.value, 10);
    mesaDisplay.textContent = `#${state.mesa}`;
    mesaPickerBar.classList.remove('hidden');

    mesaSelect.addEventListener('change', (e) => {
      state.mesa = parseInt(e.target.value, 10);
      mesaDisplay.textContent = `#${state.mesa}`;
      if (!document.getElementById('checkout-modal').classList.contains('hidden')) {
        renderCheckoutDrawer();
      }
    });
  }
}

// ─── EVENT LISTENERS ────────────────────────────────────────────────────────
function setupEventListeners() {
  // Filtros de categoría
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeCategory = btn.getAttribute('data-cat');
      renderPizzas();
    });
  });

  // Abrir Drawer de Checkout
  document.getElementById('btn-checkout').addEventListener('click', openCheckoutDrawer);
  document.getElementById('btn-open-cart').addEventListener('click', openCheckoutDrawer);

  // Cerrar Drawer
  document.getElementById('btn-close-drawer').addEventListener('click', closeCheckoutDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', closeCheckoutDrawer);

  // Enviar Pedido
  document.getElementById('btn-send-order').addEventListener('click', submitOrder);
}

// ─── CARGA DE PIZZAS ────────────────────────────────────────────────────────
async function loadPizzas() {
  const container = document.getElementById('pizzas-container');
  try {
    const res = await fetch(`${API_BASE_URL}/pizzas`);
    const data = await res.json();
    if (data.success) {
      state.pizzas = data.data;
      renderPizzas();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error al cargar la carta:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #f87171;">
        <p>⚠️ No se pudo conectar con la cocina.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="loadPizzas()">Reintentar</button>
      </div>
    `;
  }
}

// ─── RENDER DE LA CARTA ─────────────────────────────────────────────────────
function renderPizzas() {
  const container = document.getElementById('pizzas-container');
  let filtered = state.pizzas;

  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(p => String(p.categoria_id) === String(state.activeCategory));
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#8b949e;">No hay pizzas en esta categoría.</p>';
    return;
  }

  container.innerHTML = filtered.map(pizza => {
    const inCartQty = state.cart[pizza.id] ? state.cart[pizza.id].cantidad : 0;
    
    return `
      <article class="pizza-card" data-id="${pizza.id}">
        <div class="pizza-img-wrap">
          <img class="pizza-img" src="${pizza.imagen_url}" alt="${pizza.nombre}" loading="lazy">
          <span class="pizza-price-tag">${parseFloat(pizza.precio).toFixed(2)} €</span>
        </div>
        <div class="pizza-info">
          <h3 class="pizza-title">${pizza.nombre}</h3>
          <p class="pizza-desc">${pizza.descripcion}</p>
          
          <div class="pizza-card-action">
            <span style="font-size: 0.75rem; color: #8b949e;">
              ${pizza.ingredientes && pizza.ingredientes.length ? `${pizza.ingredientes.length} ingredientes` : 'Artesanal'}
            </span>

            ${inCartQty > 0 ? `
              <div class="quantity-stepper">
                <button class="stepper-btn" onclick="updateItemQuantity(${pizza.id}, -1)">-</button>
                <span class="stepper-qty">${inCartQty}</span>
                <button class="stepper-btn" onclick="updateItemQuantity(${pizza.id}, 1)">+</button>
              </div>
            ` : `
              <button class="btn-add" onclick="addItemToCart(${pizza.id})">
                + Añadir
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ─── GESTIÓN DEL CARRITO REACTIVO ───────────────────────────────────────────
window.addItemToCart = function(pizzaId) {
  const pizza = state.pizzas.find(p => p.id === pizzaId);
  if (!pizza) return;

  state.cart[pizzaId] = {
    pizza: pizza,
    cantidad: 1,
    notas: ''
  };

  updateCartUi();
  renderPizzas();
};

window.updateItemQuantity = function(pizzaId, delta) {
  if (!state.cart[pizzaId]) return;

  state.cart[pizzaId].cantidad += delta;

  if (state.cart[pizzaId].cantidad <= 0) {
    delete state.cart[pizzaId];
  }

  updateCartUi();
  renderPizzas();
};

window.updateItemNotes = function(pizzaId, notes) {
  if (state.cart[pizzaId]) {
    state.cart[pizzaId].notas = notes;
  }
};

function updateCartUi() {
  const floatingCart = document.getElementById('floating-cart');
  const countEl = document.getElementById('cart-item-count');
  const totalEl = document.getElementById('cart-total-price');

  const items = Object.values(state.cart);
  const totalCount = items.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.pizza.precio) * item.cantidad), 0);

  if (totalCount > 0) {
    countEl.textContent = totalCount;
    totalEl.textContent = `${totalPrice.toFixed(2)} €`;
    floatingCart.classList.remove('hidden');
  } else {
    floatingCart.classList.add('hidden');
    closeCheckoutDrawer();
  }

  // Si el modal de confirmación de pedido (Drawer) está abierto, actualizar su vista en tiempo real
  const modal = document.getElementById('checkout-modal');
  if (modal && !modal.classList.contains('hidden')) {
    renderCheckoutDrawer();
  }
}

// ─── CHECKOUT DRAWER (MODAL DE PEDIDO) ──────────────────────────────────────
function renderCheckoutDrawer() {
  const items = Object.values(state.cart);
  if (items.length === 0) {
    closeCheckoutDrawer();
    return;
  }

  document.getElementById('checkout-mesa-val').textContent = state.mesa;
  const itemsContainer = document.getElementById('checkout-items-list');
  const totalEl = document.getElementById('checkout-total-val');

  let total = 0;
  itemsContainer.innerHTML = items.map(item => {
    const subtotal = parseFloat(item.pizza.precio) * item.cantidad;
    total += subtotal;
    return `
      <div class="checkout-item-card">
        <div class="checkout-item-row">
          <div>
            <strong>${item.cantidad}x</strong> ${item.pizza.nombre}
          </div>
          <div style="display:flex; align-items:center; gap: 0.5rem;">
            <span style="font-weight:700; color:var(--color-amber);">${subtotal.toFixed(2)} €</span>
            <div class="quantity-stepper" style="padding: 0.1rem 0.2rem;">
              <button class="stepper-btn" style="width:22px; height:22px; font-size:0.8rem;" onclick="updateItemQuantity(${item.pizza.id}, -1)">-</button>
              <span class="stepper-qty" style="font-size:0.8rem;">${item.cantidad}</span>
              <button class="stepper-btn" style="width:22px; height:22px; font-size:0.8rem;" onclick="updateItemQuantity(${item.pizza.id}, 1)">+</button>
            </div>
          </div>
        </div>
        <input 
          type="text" 
          class="item-note-input" 
          placeholder="Personalizar pizza: ej. sin cebolla, masa fina..." 
          value="${item.notas ? item.notas.replace(/"/g, '&quot;') : ''}" 
          oninput="updateItemNotes(${item.pizza.id}, this.value)"
        >
      </div>
    `;
  }).join('');

  totalEl.textContent = `${total.toFixed(2)} €`;
}

function openCheckoutDrawer() {
  const items = Object.values(state.cart);
  if (items.length === 0) return;

  renderCheckoutDrawer();
  document.getElementById('checkout-modal').classList.remove('hidden');
}

function closeCheckoutDrawer() {
  document.getElementById('checkout-modal').classList.add('hidden');
}

// ─── ENVÍO DEL PEDIDO A LA API REST ─────────────────────────────────────────
async function submitOrder() {
  const sendBtn = document.getElementById('btn-send-order');
  const clienteNombre = document.getElementById('cliente-nombre').value.trim() || `Comensal Mesa ${state.mesa}`;
  const observaciones = document.getElementById('cliente-observaciones').value.trim();

  const lineas = Object.values(state.cart).map(item => ({
    pizza_id: item.pizza.id,
    cantidad: item.cantidad,
    notas: item.notas && item.notas.trim() ? item.notas.trim() : null
  }));

  const payload = {
    mesa_numero: state.mesa,
    cliente_nombre: clienteNombre,
    observaciones: observaciones,
    lineas: lineas
  };

  try {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Enviando a cocina...';

    const res = await fetch(`${API_BASE_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      const orderId = data.data.id;
      sessionStorage.setItem('pizzeria_active_order_id', orderId);
      state.activeOrderId = orderId;

      // Limpiar carrito
      state.cart = {};
      updateCartUi();
      renderPizzas();
      closeCheckoutDrawer();

      // Iniciar seguimiento
      startOrderTracking(orderId);
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error al tramitar pedido:', error);
    alert('Fallo de conexión al enviar el pedido.');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '🚀 Enviar Pedido a Cocina';
  }
}

// ─── SEGUIMIENTO EN TIEMPO REAL DEL PEDIDO (POLLING) ────────────────────────
function startOrderTracking(orderId) {
  clearInterval(state.trackingInterval);
  const banner = document.getElementById('active-order-banner');
  banner.classList.remove('hidden');

  const poll = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pedidos/${orderId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        const order = data.data;
        updateTrackingUi(order);

        if (order.estado === 'servido' || order.estado === 'cancelado') {
          clearInterval(state.trackingInterval);
          sessionStorage.removeItem('pizzeria_active_order_id');
        }
      }
    } catch (err) {
      console.warn('Error en polling de seguimiento:', err);
    }
  };

  poll();
  state.trackingInterval = setInterval(poll, 4000);
}

function updateTrackingUi(order) {
  const title = document.getElementById('tracking-title');
  const statusText = document.getElementById('tracking-status-text');
  const progressFill = document.getElementById('progress-bar-fill');

  title.textContent = `Pedido #${order.id} en marcha (Mesa ${order.mesa_numero})`;

  if (order.estado === 'pendiente') {
    statusText.textContent = 'Estado: Recibido en cocina • Esperando horno';
    progressFill.style.width = '25%';
  } else if (order.estado === 'en_preparacion') {
    statusText.textContent = 'Estado: 🔥 En el horno ahora mismo';
    progressFill.style.width = '65%';
  } else if (order.estado === 'listo') {
    statusText.textContent = 'Estado: 🍕 ¡Listo para servir en tu mesa!';
    progressFill.style.width = '100%';
  } else if (order.estado === 'servido') {
    statusText.textContent = 'Estado: ✅ ¡Que aproveche!';
    progressFill.style.width = '100%';
  }
}

-- ==============================================================================
-- DATABASE INITIALIZATION SCRIPT: PIZZERÍA FULL-STACK
-- Compatible con PostgreSQL 14 / 15 / 16 / 18
-- ==============================================================================

-- 1. TABLA: CATEGORIAS (Para clasificar pizzas, bebidas y postres)
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(10) DEFAULT '🍕'
);

-- 2. TABLA: PIZZAS (Catálogo principal de la pizzería)
CREATE TABLE IF NOT EXISTS pizzas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    precio NUMERIC(6, 2) NOT NULL CHECK (precio >= 0),
    imagen_url TEXT,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    disponible BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: INGREDIENTES (Para detalle pedagógico de alérgenos e ingredientes)
CREATE TABLE IF NOT EXISTS ingredientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    alergeno BOOLEAN DEFAULT FALSE
);

-- 4. TABLA INTERMEDIA: PIZZA_INGREDIENTES
CREATE TABLE IF NOT EXISTS pizza_ingredientes (
    pizza_id INT REFERENCES pizzas(id) ON DELETE CASCADE,
    ingrediente_id INT REFERENCES ingredientes(id) ON DELETE CASCADE,
    PRIMARY KEY (pizza_id, ingrediente_id)
);

-- 5. TABLA: MESAS (Para la gestión de sala y lectura QR)
CREATE TABLE IF NOT EXISTS mesas (
    id SERIAL PRIMARY KEY,
    numero INT NOT NULL UNIQUE,
    capacidad INT DEFAULT 4,
    estado VARCHAR(20) DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada', 'cuenta_pedida', 'reservada'))
);

-- 6. TABLA: PEDIDOS (Cabecera de pedidos realizados por QR, web domicilio/recoger o mostrador)
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    tipo_pedido VARCHAR(20) DEFAULT 'mesa' CHECK (tipo_pedido IN ('mesa', 'domicilio', 'recoger')),
    mesa_numero INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_preparacion', 'en_reparto', 'listo', 'servido', 'entregado', 'cancelado')),
    total NUMERIC(8, 2) DEFAULT 0.00 CHECK (total >= 0),
    cliente_nombre VARCHAR(100) DEFAULT 'Cliente',
    cliente_telefono VARCHAR(30),
    cliente_direccion TEXT,
    metodo_pago VARCHAR(30) DEFAULT 'efectivo_entrega',
    observaciones TEXT
);

-- 7. TABLA: LINEAS_PEDIDO (Detalle de cada pizza pedida)
CREATE TABLE IF NOT EXISTS lineas_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    pizza_id INT NOT NULL REFERENCES pizzas(id),
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario NUMERIC(6, 2) NOT NULL CHECK (precio_unitario >= 0),
    notas VARCHAR(255)
);

-- ==============================================================================
-- DATOS SEMILLA INICIALES (DML)
-- ==============================================================================

-- Inserción de Categorías
INSERT INTO categorias (nombre, icono) VALUES
('Clásicas', '🍕'),
('Especiales', '⭐'),
('Gourmet', '👑'),
('Bebidas y Postres', '🥤')
ON CONFLICT (nombre) DO NOTHING;

-- Inserción de Ingredientes
INSERT INTO ingredientes (nombre, alergeno) VALUES
('Salsa de Tomate San Marzano', FALSE),
('Mozzarella Fior di Latte', TRUE),
('Albahaca Fresca', FALSE),
('Pepperoni Picante', FALSE),
('Gorgonzola D.O.P.', TRUE),
('Parmesano Reggiano', TRUE),
('Queso de Cabra', TRUE),
('Bacon Crujiente', FALSE),
('Carne Picada BBQ', FALSE),
('Cebolla Caramelizada', FALSE),
('Crema de Trufa Negra', FALSE),
('Champiñones Portobello', FALSE),
('Jamón Ibérico', FALSE),
('Rúcula Fresca', FALSE),
('Piña Asada', FALSE),
('Jamón York', FALSE)
ON CONFLICT (nombre) DO NOTHING;

-- Inserción de Pizzas Iniciales
INSERT INTO pizzas (nombre, descripcion, precio, imagen_url, categoria_id, disponible) VALUES
(
    'Margherita Clásica',
    'La auténtica reina de Nápoles: salsa de tomate San Marzano, mozzarella Fior di Latte fresca, hojas de albahaca fresca y aceite de oliva virgen extra.',
    9.50,
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    1,
    TRUE
),
(
    'Diávolo Pepperoni',
    'Para los amantes del toque picante: base de tomate, doble mozzarella fundida y generosas rodajas de pepperoni artesanal curado con orégano silvestre.',
    12.00,
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    1,
    TRUE
),
(
    'Cuatro Quesos Cremosa',
    'Una armonía de quesos seleccionados: mozzarella Fior di Latte, gorgonzola cremoso, queso de cabra suave y lascas de parmesano curado 24 meses.',
    13.50,
    'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=800&q=80',
    1,
    TRUE
),
(
    'Barbacoa Texas Crunch',
    'Salsa barbacoa ahumada artesanal, carne picada de vacuno seleccionada, bacon crujiente, cebolla caramelizada y mozzarella fundente.',
    14.00,
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    2,
    TRUE
),
(
    'Tartufo & Funghi Gourmet',
    'Base blanca de crema de trufa negra, mezcla de champiñones portobello salteados, mozzarella, jamón ibérico de bellota y un toque de rúcula fresca.',
    15.50,
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    3,
    TRUE
),
(
    'Hawaiana Especial',
    'Base de tomate, mozzarella fundente, jamón york de primera calidad y piña asada al horno con un toque de miel especiada.',
    11.50,
    'https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?auto=format&fit=crop&w=800&q=80',
    2,
    TRUE
)
ON CONFLICT DO NOTHING;

-- Relación Pizza - Ingredientes
-- Margherita (ID 1)
INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES
(1, 1), (1, 2), (1, 3)
ON CONFLICT DO NOTHING;

-- Diávolo (ID 2)
INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES
(2, 1), (2, 2), (2, 4)
ON CONFLICT DO NOTHING;

-- Cuatro Quesos (ID 3)
INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES
(3, 2), (3, 5), (3, 6), (3, 7)
ON CONFLICT DO NOTHING;

-- Barbacoa (ID 4)
INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES
(4, 2), (4, 8), (4, 9), (4, 10)
ON CONFLICT DO NOTHING;

-- Tartufo (ID 5)
INSERT INTO pizza_ingredientes (pizza_id, ingrediente_id) VALUES
(5, 2), (5, 11), (5, 12), (5, 13), (5, 14)
ON CONFLICT DO NOTHING;

-- Inserción de Mesas (1 a 8)
INSERT INTO mesas (numero, capacidad, estado) VALUES
(1, 2, 'libre'),
(2, 4, 'ocupada'),
(3, 4, 'libre'),
(4, 6, 'libre'),
(5, 2, 'libre'),
(6, 8, 'libre'),
(7, 4, 'libre'),
(8, 4, 'libre')
ON CONFLICT (numero) DO NOTHING;

-- Inserción de Pedidos de Ejemplo para mostrar en Cocina inmediatamente
INSERT INTO pedidos (id, tipo_pedido, mesa_numero, fecha, estado, total, cliente_nombre, cliente_telefono, cliente_direccion, metodo_pago, observaciones) VALUES
(101, 'mesa', 2, CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'en_preparacion', 25.50, 'Carlos Ruiz', '600000001', NULL, 'pago_mesa', 'Masa fina bien tostada'),
(102, 'domicilio', NULL, CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'pendiente', 29.50, 'Laura Martínez', '600000002', 'Calle Falsa 123, 3º B', 'efectivo_entrega', 'Sin cebolla en la Barbacoa. Llamar al telefonillo.'),
(103, 'recoger', NULL, CURRENT_TIMESTAMP - INTERVAL '25 minutes', 'listo', 13.50, 'Pedro Sánchez', '600000003', NULL, 'tarjeta_recogida', 'Pasa a recoger a las 14:15h')
ON CONFLICT (id) DO NOTHING;

-- Reiniciar la secuencia de pedidos para que nuevos pedidos empiecen desde 104
SELECT setval('pedidos_id_seq', 103, true);

-- Inserción de Líneas de Pedido de Ejemplo
INSERT INTO lineas_pedido (pedido_id, pizza_id, cantidad, precio_unitario, notas) VALUES
(101, 2, 1, 12.00, 'Bien crujiente'),
(101, 3, 1, 13.50, NULL),
(102, 4, 1, 14.00, 'Sin cebolla'),
(102, 5, 1, 15.50, NULL),
(103, 3, 1, 13.50, NULL)
ON CONFLICT DO NOTHING;

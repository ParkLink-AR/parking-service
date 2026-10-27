# Parking Service — ParkLink

Microservicio encargado de la gestión y búsqueda de cocheras. No maneja reservas ni pagos (eso vive en booking-service y payment-service).

## Stack

- **Framework:** NestJS + TypeScript
- **Base de datos:** PostgreSQL + PostGIS (búsquedas geoespaciales por radio)
- **Geocoding:** Nominatim (OpenStreetMap) — gratis, sin API key

## Cómo arrancar

### 1. Levantar la base de datos

Necesitás Docker instalado. Desde la raíz del proyecto:

```bash
docker compose up -d
```

Esto levanta Postgres con la extensión PostGIS ya incluida (imagen `postgis/postgis`), escuchando en `localhost:5432`.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `NOMINATIM_USER_AGENT` con tu email/nombre de proyecto — Nominatim pide identificar quién hace los requests, no hace falta ninguna API key.

### 4. Habilitar la extensión PostGIS en la base (una sola vez)

Conectate a la base y corré:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

(La imagen de Docker usada ya trae PostGIS instalado, solo falta activar la extensión en la base `parking_service`.)

### 5. Levantar el servicio

```bash
npm run start:dev
```

El servicio queda escuchando en `http://localhost:3001`.

## Endpoints implementados en este starter

| Método | Endpoint | Estado |
|---|---|---|
| GET | `/parking-spots/search` | ✅ Implementado (búsqueda por lat/lng/radio/precio con PostGIS) |
| GET | `/parking-spots/{id}` | ✅ Implementado |
| POST | `/parking-spots` | ✅ Implementado (geocodifica la dirección con Nominatim) |
| GET | `/users/{id}/parking-spots` | ✅ Implementado |
| PUT | `/parking-spots/{id}` | ⬜ Pendiente |
| PUT | `/parking-spots/{id}/pricing` | ⬜ Pendiente |
| PUT | `/parking-spots/{id}/schedule` | ⬜ Pendiente |
| PATCH | `/parking-spots/{id}/status` | ⬜ Pendiente |
| DELETE | `/parking-spots/{id}` | ⬜ Pendiente (soft-delete) |
| POST/GET/DELETE | `/parking-spots/{id}/photos` | ⬜ Pendiente |

## Notas importantes

- El `ownerId` de `POST /parking-spots` (y de toda acción sobre una cochera propia) sale del header `x-user-id` que agrega el gateway después de validar el JWT. El servicio solo acepta requests que traigan el secreto del gateway (`GATEWAY_INTERNAL_SECRET`) o la clave entre servicios (`INTERNAL_SERVICE_KEY`) -- ver `src/trusted-caller.middleware.ts`.
- El orden de coordenadas en PostGIS es `POINT(lng lat)`, **no** `POINT(lat lng)` — es un error clásico, ya está resuelto en `parking-spots.service.ts` pero tenelo en cuenta si tocás esa parte.
- `synchronize: true` en TypeORM está bien para desarrollo/TFI, pero si en algún momento migran a un entorno más "serio" conviene pasar a migraciones versionadas.

## Probar el endpoint de búsqueda rápido

```bash
curl "http://localhost:3001/parking-spots/search?lat=-34.6037&lng=-58.3816&radius=2000"
```

## Probar creación de una cochera (geocodifica automáticamente)

```bash
curl -X POST http://localhost:3001/parking-spots \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cochera cubierta a 2 cuadras de Plaza de Mayo",
    "address": "Av. de Mayo 800, Buenos Aires, Argentina",
    "pricePerHour": 1500
  }'
```

## Datos de demostración

Al arrancar, tres servicios cargan datos de ejemplo para que la app se vea con uso real
(cocheras con nombre, dirección, descripción, foto y reseñas). **Está activado por defecto en auth-service, parking-service y
booking-service; `SEED_DEMO_DATA=false` en el deploy de cada uno lo apaga.**

| Servicio | Qué carga |
|---|---|
| auth-service | 10 dueños y 60 conductores de ejemplo (`app/demo_seed.py`). No se puede entrar con ellos: la contraseña es un valor aleatorio que no se guarda. |
| parking-service | Toma las cocheras marcadas con `[parklink-demo-spread]` (las que cargó el generador de datos demo) y les pone título, dirección, descripción, reglas, indicaciones de acceso, un dueño de ejemplo y una foto (`src/demo/`). Anota cada una en la tabla `demo_spots` y le saca la marca a la descripción. Expone la lista en `GET /internal/demo-spots` (solo entre servicios). |
| booking-service | Pide esa lista y le agrega a cada cochera entre 20 y 50 reseñas de los conductores de ejemplo. Cada cochera recibe una reserva ya terminada y **sin pagar** de la que cuelgan las reseñas (una reseña necesita una reserva), así nunca genera cobros ni liquidaciones. Reintenta hasta 10 minutos si parking-service todavía no terminó. |

Todo es idempotente: reiniciar no duplica nada. Lo que se genera depende solo del id de la cochera, así que es siempre lo mismo.
El orden de arranque no importa.

**Fotos.** Están en `assets/demo-photos/` (`covered-*` para cocheras cubiertas y `open-*` para descubiertas) y se suben al mismo
almacenamiento R2 que las fotos reales, bajo `parking-spots/demo/`. Si R2 no está configurado, las cocheras se completan sin foto
y la agregan en un arranque posterior. `DEMO_PHOTOS_BASE_URL` permite alojarlas en otro lado sin subirlas.

**Ids compartidos.** Los dueños (`0e000000-0000-4000-8000-0000000000NN`, 1 a 10) y los conductores (`de000000-0000-4000-8000-0000000000NN`, 1 a 60)
tienen ids fijos que repiten parking-service (`src/demo/demo-content.ts`), booking-service (`internal/domain/constants/demo.go`) y
auth-service (`app/demo_seed.py`). Si cambia uno, hay que cambiar los otros.

**Quitar los datos de ejemplo** (las cocheras conservan el contenido nuevo; el título original no se guarda):

```sql
-- booking-service
DELETE FROM reviews  WHERE reviewer_id::text LIKE 'de000000-%';
DELETE FROM bookings WHERE user_id::text     LIKE 'de000000-%';
-- auth-service
DELETE FROM users WHERE email LIKE '%@demo.parklink.com.ar';
-- parking-service (para que una próxima carga las vuelva a tomar, hay que restaurar antes la marca de la descripción)
DELETE FROM demo_spots;
```

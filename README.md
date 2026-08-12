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

- El `ownerId` en `POST /parking-spots` está hardcodeado (`temp-owner-id`) hasta integrar el JWT real de auth-service. Buscá el `TODO` en `parking-spots.controller.ts`.
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

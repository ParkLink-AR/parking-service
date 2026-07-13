# parking-service

Gestión de las cocheras, búsqueda de cocheras por cercanía/filtros de geolocalización

GET /parking-spots/search: Buscar cocheras disponibles en el mapa aplicando filtros de ubicación (lat/lng), radio, precio y horario.
GET /parking-spots/{id}: Obtener el detalle público de una cochera específica (fotos, dimensiones, reglas).
POST /parking-spots: Publicar una nueva cochera (exclusivo rol Propietario).
PUT /parking-spots/{id}: Modificar los datos, fotos o tarifas de una cochera existente.
DELETE /parking-spots/{id}: Pausar o dar de baja la publicación de una cochera.
GET /users/{id}/parking-spots: Listar todas las cocheras que pertenecen al propietario.

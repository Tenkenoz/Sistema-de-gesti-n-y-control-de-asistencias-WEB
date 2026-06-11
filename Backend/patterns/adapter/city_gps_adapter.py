"""
╔══════════════════════════════════════════════════════════╗
║  🔌 PATRÓN ADAPTER — CityToGPSAdapter                   ║
╠══════════════════════════════════════════════════════════╣
║  Propósito:                                              ║
║    Adapta nombres de ciudades (strings del formulario)   ║
║    a coordenadas GPS reales (lat/lng) que Leaflet y el   ║
║    mapa interactivo del frontend pueden consumir.        ║
║                                                          ║
║  Problema resuelto:                                      ║
║    El formulario recibe texto libre ("Quito", "GUAYAQUIL"║
║    etc.) pero la BD y el mapa necesitan lat/lng.         ║
║    El Adapter actúa como puente entre ambas interfaces.  ║
║                                                          ║
║  Uso en el sistema:                                      ║
║    routers/viajes.py → crear_viaje() y planificar_ruta() ║
╚══════════════════════════════════════════════════════════╝
"""

# ── Catálogo de ciudades de Ecuador con coordenadas GPS reales ─────────────────
CIUDADES_ECUADOR: dict[str, dict] = {
    "QUITO":        {"lat": -0.1807,  "lng": -78.4678},
    "GUAYAQUIL":    {"lat": -2.1708,  "lng": -79.9224},
    "CUENCA":       {"lat": -2.9001,  "lng": -79.0059},
    "MANTA":        {"lat": -0.9621,  "lng": -80.7127},
    "PORTOVIEJO":   {"lat": -1.0546,  "lng": -80.4542},
    "MACHALA":      {"lat": -3.2581,  "lng": -79.9553},
    "AMBATO":       {"lat": -1.2491,  "lng": -78.6168},
    "RIOBAMBA":     {"lat": -1.6731,  "lng": -78.6483},
    "ESMERALDAS":   {"lat":  0.9682,  "lng": -79.6517},
    "LOJA":         {"lat": -3.9931,  "lng": -79.2042},
    "IBARRA":       {"lat":  0.3517,  "lng": -78.1222},
    "QUEVEDO":      {"lat": -1.0225,  "lng": -79.4601},
    "SANTO DOMINGO":{"lat": -0.2530,  "lng": -79.1754},
    "LATACUNGA":    {"lat": -0.9316,  "lng": -78.6056},
    "TULCAN":       {"lat":  0.8119,  "lng": -77.7180},
    "BABAHOYO":     {"lat": -1.8022,  "lng": -79.5344},
}

# ── Interfaz Adaptee (simulada) ────────────────────────────────────────────────
class _CoordinateCatalog:
    """
    Clase 'incompatible' que el Adapter envuelve.
    Representa un servicio de catálogo que devuelve coordenadas
    en un formato interno {nombre: {lat, lng}}.
    """
    @staticmethod
    def lookup(city_key: str) -> dict | None:
        return CIUDADES_ECUADOR.get(city_key)


# ── Adapter ────────────────────────────────────────────────────────────────────
class CityToGPSAdapter:
    """
    🔌 ADAPTER: Adapta un nombre de ciudad (string) a coordenadas GPS (dict).

    Interfaz esperada por el cliente  →  get_coordinates(city_name: str) -> {lat, lng}
    Interfaz del catálogo interno     →  _CoordinateCatalog.lookup(city_key: str)

    El Adapter normaliza el texto (mayúsculas, strip) y provee un valor
    por defecto (Quito) cuando la ciudad no está en el catálogo.
    """
    _catalog = _CoordinateCatalog()

    @classmethod
    def get_coordinates(cls, city_name: str) -> dict:
        """Devuelve {'lat': float, 'lng': float} para la ciudad indicada."""
        normalized = city_name.strip().upper()
        result = cls._catalog.lookup(normalized)
        if result is None:
            # Fallback: Quito si la ciudad no existe en el catálogo
            return {"lat": -0.1807, "lng": -78.4678}
        return result

"""
╔══════════════════════════════════════════════════════════╗
║  ⚙️ PATRÓN STRATEGY — GPS Tracking Strategy             ║
╠══════════════════════════════════════════════════════════╣
║  Propósito:                                              ║
║    Definir una familia de algoritmos para obtener la     ║
║    posición GPS de un vehículo, encapsularlos y          ║
║    hacerlos intercambiables en tiempo de ejecución.      ║
║                                                          ║
║  Estrategias implementadas:                              ║
║    RealGPSTrackingStrategy       → Coordenadas de BD     ║
║    SimulatedInterpolationStrategy→ Interpolación lineal  ║
║                                   origen→destino (60s)   ║
║                                                          ║
║  Uso en el sistema:                                      ║
║    routers/monitoreo.py → obtener_ubicacion()            ║
║    Parámetro ?strategy_type=real|simulado               ║
╚══════════════════════════════════════════════════════════╝
"""
import time


# ── Interfaz base Strategy ─────────────────────────────────────────────────────
class GPSTrackingStrategy:
    """
    ⚙️ STRATEGY (interfaz base):
    Define el contrato que todas las estrategias de GPS deben cumplir.
    """
    def get_location(self, viaje) -> dict:
        """Retorna {'lat': float, 'lng': float, 'tipo_gps': str}"""
        raise NotImplementedError


# ── Estrategia concreta: GPS Real ──────────────────────────────────────────────
class RealGPSTrackingStrategy(GPSTrackingStrategy):
    """
    ⚙️ STRATEGY CONCRETA — GPS Real (Telemetría Activa):
    Obtiene la última posición registrada en la base de datos.
    Si no hay posición actual, usa las coordenadas de origen.
    """
    def get_location(self, viaje) -> dict:
        lat = (
            float(viaje.latitud_actual)
            if viaje.latitud_actual
            else (float(viaje.latitud_origen) if viaje.latitud_origen else -0.1807)
        )
        lng = (
            float(viaje.longitud_actual)
            if viaje.longitud_actual
            else (float(viaje.longitud_origen) if viaje.longitud_origen else -78.4678)
        )
        return {"lat": lat, "lng": lng, "tipo_gps": "GPS Real (Telemetría Activa)"}


# ── Estrategia concreta: GPS Simulado ──────────────────────────────────────────
class SimulatedInterpolationStrategy(GPSTrackingStrategy):
    """
    ⚙️ STRATEGY CONCRETA — GPS Simulado (Interpolación Lineal):
    Calcula la posición interpolando linealmente entre origen y destino
    en un bucle continuo de 60 segundos usando el reloj del sistema.
    Ideal para demos y entornos sin telemetría real.
    """
    def get_location(self, viaje) -> dict:
        from models.models import EstadoViajeEnum

        lat_ori = float(viaje.latitud_origen)  if viaje.latitud_origen  else -0.1807
        lng_ori = float(viaje.longitud_origen) if viaje.longitud_origen else -78.4678
        lat_des = float(viaje.latitud_destino)  if viaje.latitud_destino  else -2.1708
        lng_des = float(viaje.longitud_destino) if viaje.longitud_destino else -79.9224

        if viaje.estado != EstadoViajeEnum.EN_EJECUCION:
            return {
                "lat": lat_ori,
                "lng": lng_ori,
                "tipo_gps": "Simulado (Esperando Inicio)",
            }

        # Bucle continuo de 60 segundos usando el tiempo del sistema
        segundo_actual = time.time() % 60.0
        pct = segundo_actual / 60.0

        return {
            "lat": lat_ori + (lat_des - lat_ori) * pct,
            "lng": lng_ori + (lng_des - lng_ori) * pct,
            "tipo_gps": f"Simulado (En Movimiento: {int(pct * 100)}%)",
        }


# ── Context (ejecutor de estrategia) ──────────────────────────────────────────
class GPSTrackerContext:
    """
    ⚙️ CONTEXT:
    Mantiene una referencia a la estrategia activa y delega la ejecución.
    Permite cambiar la estrategia en tiempo de ejecución con set_strategy().
    """
    def __init__(self, strategy: GPSTrackingStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: GPSTrackingStrategy):
        """Cambia la estrategia GPS en tiempo de ejecución."""
        self._strategy = strategy

    def execute(self, viaje) -> dict:
        """Ejecuta la estrategia actual y retorna la posición."""
        return self._strategy.get_location(viaje)

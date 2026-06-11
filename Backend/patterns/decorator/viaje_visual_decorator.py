"""
╔══════════════════════════════════════════════════════════╗
║  🎁 PATRÓN DECORATOR — ViajeVisualDecorator              ║
╠══════════════════════════════════════════════════════════╣
║  Propósito:                                              ║
║    Envuelve dinámicamente el dict de un viaje y añade    ║
║    campos visuales (badge de alerta, color, mensaje,     ║
║    clima) sin modificar la clase Viaje original.         ║
║                                                          ║
║  Problema resuelto:                                      ║
║    La respuesta JSON base del viaje no contiene info     ║
║    visual para la UI (colores de riesgo, alertas, etc.). ║
║    El Decorator agrega esa capa sin tocar el modelo.     ║
║                                                          ║
║  Uso en el sistema:                                      ║
║    routers/monitoreo.py → _viaje_monitoreo()             ║
╚══════════════════════════════════════════════════════════╝
"""


class ViajeVisualDecorator:
    """
    🎁 DECORATOR: Agrega información visual dinámica al dict de un viaje.

    Toma el diccionario 'raw' producido por el router y lo decora
    con campos adicionales para la UI sin alterar el modelo de datos:

    Campos decorados añadidos:
      - decoracion_alerta  : nivel de riesgo ('ALTO RIESGO', 'RIESGO MODERADO', 'OPERACIÓN NORMAL')
      - decoracion_color   : color sugerido para la UI ('red', 'orange', 'green')
      - decoracion_mensaje : mensaje descriptivo del estado
      - decoracion_clima   : información de clima del trayecto (simulada)
    """

    def __init__(self, viaje_dict: dict):
        self._viaje_dict = viaje_dict

    def get_decorated_data(self) -> dict:
        """Retorna el dict del viaje con campos visuales adicionales."""
        decorated = dict(self._viaje_dict)
        retraso = decorated.get("horas_retraso", 0)

        # ── Decorar con nivel de riesgo dinámico según las horas de retraso ──
        if retraso > 2.0:
            decorated["decoracion_alerta"]  = "ALTO RIESGO"
            decorated["decoracion_color"]   = "red"
            decorated["decoracion_mensaje"] = (
                "⚠️ Retraso crítico en la planificación. Llamar inmediatamente."
            )
        elif retraso > 0:
            decorated["decoracion_alerta"]  = "RIESGO MODERADO"
            decorated["decoracion_color"]   = "orange"
            decorated["decoracion_mensaje"] = "⏱️ Demora registrada en el trayecto."
        else:
            decorated["decoracion_alerta"]  = "OPERACIÓN NORMAL"
            decorated["decoracion_color"]   = "green"
            decorated["decoracion_mensaje"] = "✓ Vehículo en ruta y sin novedades."

        # ── Decorar con información de clima (simulada) ────────────────────
        decorated["decoracion_clima"] = "Clima Reportado: Despejado (22°C)"

        return decorated

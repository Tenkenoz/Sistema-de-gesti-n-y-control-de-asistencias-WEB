"""
╔══════════════════════════════════════════════════════════════════════╗
║          PATRONES DE DISEÑO - TransControl SGCV                     ║
║                                                                      ║
║  Este paquete contiene la implementación explícita de los cuatro     ║
║  patrones de diseño aplicados en el sistema:                         ║
║                                                                      ║
║   📁 adapter/   → Patrón Adapter  (CityToGPSAdapter)                ║
║   📁 decorator/ → Patrón Decorator (ViajeVisualDecorator)            ║
║   📁 observer/  → Patrón Observer  (TripSubject, TripObserver, ...)  ║
║   📁 strategy/  → Patrón Strategy  (GPSTrackingStrategy, ...)        ║
╚══════════════════════════════════════════════════════════════════════╝
"""

from patterns.adapter.city_gps_adapter import CityToGPSAdapter, CIUDADES_ECUADOR
from patterns.decorator.viaje_visual_decorator import ViajeVisualDecorator
from patterns.observer.trip_observer import (
    TripObserver,
    AuditObserver,
    NotificationObserver,
    TripSubject,
    global_notification_observer,
)
from patterns.strategy.gps_tracking_strategy import (
    GPSTrackingStrategy,
    RealGPSTrackingStrategy,
    SimulatedInterpolationStrategy,
    GPSTrackerContext,
)

__all__ = [
    # Adapter
    "CityToGPSAdapter",
    "CIUDADES_ECUADOR",
    # Decorator
    "ViajeVisualDecorator",
    # Observer
    "TripObserver",
    "AuditObserver",
    "NotificationObserver",
    "TripSubject",
    "global_notification_observer",
    # Strategy
    "GPSTrackingStrategy",
    "RealGPSTrackingStrategy",
    "SimulatedInterpolationStrategy",
    "GPSTrackerContext",
]

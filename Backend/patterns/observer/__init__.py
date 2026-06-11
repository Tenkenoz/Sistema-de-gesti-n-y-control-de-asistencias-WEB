"""Patrón Observer — sub-paquete observer"""
from patterns.observer.trip_observer import (
    TripObserver,
    AuditObserver,
    NotificationObserver,
    TripSubject,
    global_notification_observer,
)

__all__ = [
    "TripObserver",
    "AuditObserver",
    "NotificationObserver",
    "TripSubject",
    "global_notification_observer",
]

"""
╔══════════════════════════════════════════════════════════╗
║  👁️ PATRÓN OBSERVER — TripSubject + TripObserver        ║
╠══════════════════════════════════════════════════════════╣
║  Propósito:                                              ║
║    Notificar automáticamente a múltiples observadores    ║
║    cuando ocurre un evento de viaje (cambio de ruta,     ║
║    desvío, etc.) sin acoplar el código del router a      ║
║    lógica de notificación o auditoría.                   ║
║                                                          ║
║  Componentes:                                            ║
║    TripObserver       → Interfaz base de observador      ║
║    AuditObserver      → Persiste eventos en la BD        ║
║    NotificationObserver → Simula Push/SMS al conductor   ║
║    TripSubject        → Gestor de suscripciones y        ║
║                         notificaciones (Subject)         ║
║                                                          ║
║  Uso en el sistema:                                      ║
║    routers/monitoreo.py → modificar_ruta()               ║
╚══════════════════════════════════════════════════════════╝
"""
from datetime import datetime


# ── Interfaz base Observer ─────────────────────────────────────────────────────
class TripObserver:
    """
    👁️ OBSERVER (interfaz base):
    Todos los observadores deben implementar notify().
    """
    def notify(self, event_type: str, viaje, db_session, extra_info: str = ""):
        """Llamado por TripSubject cuando se produce un evento."""
        pass


# ── Observador concreto: Auditoría ─────────────────────────────────────────────
class AuditObserver(TripObserver):
    """
    👁️ OBSERVER CONCRETO — Auditoría:
    Persiste cada evento en la tabla de auditoría de la base de datos
    para generar un registro inmutable de todas las operaciones críticas.
    """
    def notify(self, event_type: str, viaje, db_session, extra_info: str = ""):
        from utils.auditoria import registrar_auditoria
        registrar_auditoria(
            db_session,
            accion=event_type,
            usuario_id=viaje.creado_por_id,
            viaje_id=viaje.id,
            descripcion=f"Evento: {event_type}. Viaje {viaje.codigo}. {extra_info}",
        )


# ── Observador concreto: Notificaciones Push/SMS ───────────────────────────────
class NotificationObserver(TripObserver):
    """
    👁️ OBSERVER CONCRETO — Notificaciones:
    Simula el envío de notificaciones Push/SMS al transportista y
    guarda un log en memoria accesible vía el endpoint /notificaciones-log.
    """
    def __init__(self):
        self.envios: list[str] = []

    def notify(self, event_type: str, viaje, db_session, extra_info: str = ""):
        ts = datetime.utcnow().strftime("%H:%M:%S")
        msg = (
            f"[{ts}] Notificación Push/SMS enviada a Transportista. "
            f"Evento: {event_type}. Viaje: {viaje.codigo}. Incidencia: {extra_info}"
        )
        self.envios.append(msg)
        print(msg)


# ── Subject (publicador) ───────────────────────────────────────────────────────
class TripSubject:
    """
    👁️ SUBJECT:
    Mantiene la lista de observadores registrados y los notifica
    a todos cuando se produce un evento de viaje.
    """
    _observers: list[TripObserver] = []

    @classmethod
    def register_observer(cls, observer: TripObserver):
        """Suscribe un nuevo observador (evita duplicados)."""
        if observer not in cls._observers:
            cls._observers.append(observer)

    @classmethod
    def remove_observer(cls, observer: TripObserver):
        """Cancela la suscripción de un observador."""
        cls._observers = [o for o in cls._observers if o is not observer]

    @classmethod
    def notify_all(cls, event_type: str, viaje, db_session, extra_info: str = ""):
        """Notifica a todos los observadores registrados."""
        for obs in cls._observers:
            obs.notify(event_type, viaje, db_session, extra_info)


# ── Instancias globales y registro inicial ─────────────────────────────────────
global_notification_observer = NotificationObserver()
TripSubject.register_observer(AuditObserver())
TripSubject.register_observer(global_notification_observer)

"""
RF-6.1  Controlar Viaje
RF-6.2  Modificar Ruta
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.security import get_current_user, require_roles
from database import get_db
from models.models import EstadoViajeEnum, Transportista, Viaje
from schemas.viaje_schemas import ModificarRutaRequest
from utils.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/monitoreo", tags=["Monitoreo"])


# =====================================================================
# ⚙️ [PATRÓN STRATEGY] - GPS & Route Tracking Simulation Strategy
# Define algoritmos intercambiables para calcular la posición actual de un vehículo.
# Permite cambiar entre coordenadas simuladas por tiempo y coordenadas fijas de BD.
# =====================================================================
class GPSTrackingStrategy:
    def get_location(self, viaje) -> dict:
        pass

class RealGPSTrackingStrategy(GPSTrackingStrategy):
    """Estrategia de GPS Real: Obtiene la última posición registrada en base de datos"""
    def get_location(self, viaje) -> dict:
        return {
            "lat": float(viaje.latitud_actual) if viaje.latitud_actual else (float(viaje.latitud_origen) if viaje.latitud_origen else -0.1807),
            "lng": float(viaje.longitud_actual) if viaje.longitud_actual else (float(viaje.longitud_origen) if viaje.longitud_origen else -78.4678),
            "tipo_gps": "GPS Real (Telemetría Activa)"
        }

class SimulatedInterpolationStrategy(GPSTrackingStrategy):
    """Estrategia de GPS Simulado: Interpolación lineal origen-destino en bucle continuo (60s)"""
    def get_location(self, viaje) -> dict:
        lat_ori = float(viaje.latitud_origen) if viaje.latitud_origen else -0.1807
        lng_ori = float(viaje.longitud_origen) if viaje.longitud_origen else -78.4678
        lat_des = float(viaje.latitud_destino) if viaje.latitud_destino else -2.1708
        lng_des = float(viaje.longitud_destino) if viaje.longitud_destino else -79.9224
        
        if viaje.estado != EstadoViajeEnum.EN_EJECUCION:
            return {
                "lat": lat_ori,
                "lng": lng_ori,
                "tipo_gps": "Simulado (Esperando Inicio)"
            }
        
        # Bucle continuo de 60 segundos usando el tiempo del sistema
        import time
        segundo_actual = time.time() % 60.0
        pct = segundo_actual / 60.0
        
        lat_act = lat_ori + (lat_des - lat_ori) * pct
        lng_act = lng_ori + (lng_des - lng_ori) * pct
        
        return {
            "lat": lat_act,
            "lng": lng_act,
            "tipo_gps": f"Simulado (En Movimiento: {int(pct * 100)}%)"
        }

class GPSTrackerContext:
    def __init__(self, strategy: GPSTrackingStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: GPSTrackingStrategy):
        self._strategy = strategy

    def execute(self, viaje) -> dict:
        return self._strategy.get_location(viaje)


# =====================================================================
# 👁️ [PATRÓN OBSERVER] - Notification & Alert Observer
# Suscribe y notifica observadores cuando ocurren eventos de monitoreo o desvíos.
# =====================================================================
class TripObserver:
    def notify(self, event_type: str, viaje, db_session, extra_info: str = ""):
        pass

class AuditObserver(TripObserver):
    """Observer para auditoría persistente e inmutable en base de datos"""
    def notify(self, event_type: str, viaje, db_session, extra_info: str = ""):
        from utils.auditoria import registrar_auditoria
        registrar_auditoria(
            db_session,
            accion=event_type,
            usuario_id=viaje.creado_por_id,
            viaje_id=viaje.id,
            descripcion=f"Evento: {event_type}. Viaje {viaje.codigo}. {extra_info}"
        )

class NotificationObserver(TripObserver):
    """Observer para simular el envío de notificaciones automáticas (Push/SMS)"""
    def __init__(self):
        self.envios = []

    def notify(self, event_type: str, viaje, db_session, extra_info: str = ""):
        log_msg = f"[{datetime.utcnow().strftime('%H:%M:%S')}] Notificación Push/SMS enviada a Transportista. Evento: {event_type}. Viaje: {viaje.codigo}. Incidencia: {extra_info}"
        self.envios.append(log_msg)
        print(log_msg)

class TripSubject:
    _observers = []

    @classmethod
    def register_observer(cls, observer: TripObserver):
        if observer not in cls._observers:
            cls._observers.append(observer)

    @classmethod
    def notify_all(cls, event_type: str, viaje, db_session, extra_info: str = ""):
        for obs in cls._observers:
            obs.notify(event_type, viaje, db_session, extra_info)

# Registramos observadores globales
global_notification_observer = NotificationObserver()
TripSubject.register_observer(AuditObserver())
TripSubject.register_observer(global_notification_observer)


# =====================================================================
# 🎁 [PATRÓN DECORATOR] - Visual Data Badge Decorator
# Envuelve la respuesta JSON del viaje agregando campos de badges, colores y alertas para UI.
# =====================================================================
class ViajeVisualDecorator:
    def __init__(self, viaje_dict: dict):
        self._viaje_dict = viaje_dict

    def get_decorated_data(self) -> dict:
        decorated = dict(self._viaje_dict)
        retraso = decorated.get("horas_retraso", 0)
        
        # Decorar con nivel de riesgo dinámico
        if retraso > 2.0:
            decorated["decoracion_alerta"] = "ALTO RIESGO"
            decorated["decoracion_color"] = "red"
            decorated["decoracion_mensaje"] = "⚠️ Retraso crítico en la planificación. Llamar inmediatamente."
        elif retraso > 0:
            decorated["decoracion_alerta"] = "RIESGO MODERADO"
            decorated["decoracion_color"] = "orange"
            decorated["decoracion_mensaje"] = "⏱️ Demora registrada en el trayecto."
        else:
            decorated["decoracion_alerta"] = "OPERACIÓN NORMAL"
            decorated["decoracion_color"] = "green"
            decorated["decoracion_mensaje"] = "✓ Vehículo en ruta y sin novedades."
            
        decorated["decoracion_clima"] = "Clima Reportado: Despejado (22°C)"
        return decorated


def _viaje_monitoreo(v: Viaje) -> dict:
    nombres = v.transportista.usuario.nombres if v.transportista else None
    placa = v.transportista.placa_vehiculo if v.transportista else None
    
    raw_dict = {
        "id": v.id,
        "codigo": v.codigo,
        "estado": v.estado.value if hasattr(v.estado, "value") else str(v.estado),
        "origen": v.origen,
        "destino": v.destino,
        "ruta_json": v.ruta_json,
        "fecha_salida": v.fecha_salida,
        "fecha_llegada_est": v.fecha_llegada_est,
        "horas_retraso": float(v.horas_retraso) if v.horas_retraso else 0,
        "transportista_nombres": nombres,
        "placa_vehiculo": placa,
        "observaciones": v.observaciones,
        # Coordenadas GPS para renderizar en Leaflet
        "latitud_origen": float(v.latitud_origen) if v.latitud_origen else None,
        "longitud_origen": float(v.longitud_origen) if v.longitud_origen else None,
        "latitud_destino": float(v.latitud_destino) if v.latitud_destino else None,
        "longitud_destino": float(v.longitud_destino) if v.longitud_destino else None,
        "latitud_actual": float(v.latitud_actual) if v.latitud_actual else None,
        "longitud_actual": float(v.longitud_actual) if v.longitud_actual else None,
    }
    
    # 🎁 [Uso de PATRÓN DECORATOR]
    return ViajeVisualDecorator(raw_dict).get_decorated_data()


# ── RF-6.1  Controlar Viaje ───────────────────────────────────────────────────

@router.get("/viajes-en-ejecucion")
def viajes_en_ejecucion(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("COORDINADOR", "GERENTE", "PRESIDENTE")),
):
    """Lista todos los viajes activos para monitoreo, priorizando sin revisión."""
    viajes = (
        db.query(Viaje)
        .filter(Viaje.estado.in_([
            EstadoViajeEnum.EN_EJECUCION,
            EstadoViajeEnum.TRANSPORTISTA_ASIGNADO,
        ]))
        .order_by(Viaje.fecha_salida)
        .all()
    )
    return [_viaje_monitoreo(v) for v in viajes]


@router.post("/viajes/{viaje_id}/iniciar")
def iniciar_viaje(
    viaje_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("COORDINADOR", "SECRETARIA")),
    request: Request = None,
):
    v = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not v:
        raise HTTPException(404, "Viaje no encontrado")
    if v.estado != EstadoViajeEnum.TRANSPORTISTA_ASIGNADO:
        raise HTTPException(409, f"El viaje no está listo para iniciar (estado: {v.estado})")

    v.estado = EstadoViajeEnum.EN_EJECUCION
    v.fecha_salida = v.fecha_salida or datetime.utcnow()
    db.commit()

    registrar_auditoria(
        db, "INICIAR_VIAJE", usuario_id=current_user.id, viaje_id=viaje_id,
        descripcion=f"Viaje {v.codigo} iniciado",
        ip_address=request.client.host if request else None,
    )
    return _viaje_monitoreo(v)


@router.post("/viajes/{viaje_id}/completar")
def completar_viaje(
    viaje_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("COORDINADOR", "SECRETARIA")),
    request: Request = None,
):
    v = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not v:
        raise HTTPException(404, "Viaje no encontrado")
    if v.estado != EstadoViajeEnum.EN_EJECUCION:
        raise HTTPException(409, "El viaje no está en ejecución")

    v.estado = EstadoViajeEnum.COMPLETADO
    v.fecha_llegada_real = datetime.utcnow()
    db.commit()

    registrar_auditoria(
        db, "COMPLETAR_VIAJE", usuario_id=current_user.id, viaje_id=viaje_id,
        descripcion=f"Viaje {v.codigo} completado",
        ip_address=request.client.host if request else None,
    )
    return _viaje_monitoreo(v)


# ── RF-6.2  Modificar Ruta ────────────────────────────────────────────────────

@router.patch("/viajes/{viaje_id}/ruta")
def modificar_ruta(
    viaje_id: int,
    body: ModificarRutaRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("COORDINADOR")),
    request: Request = None,
):
    v = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not v:
        raise HTTPException(404, "Viaje no encontrado")
    if v.estado != EstadoViajeEnum.EN_EJECUCION:
        raise HTTPException(409, "Solo se puede modificar la ruta de un viaje en ejecución")

    if not body.nueva_ruta_json:
        raise HTTPException(400, "La nueva ruta no puede estar vacía")

    v.ruta_json = body.nueva_ruta_json
    db.commit()

    # 👁️ [Uso de PATRÓN OBSERVER] - Notificar cambio de ruta a observadores (Auditoría + SMS/Push)
    TripSubject.notify_all(
        event_type="MODIFICAR_RUTA",
        viaje=v,
        db_session=db,
        extra_info=f"Nueva ruta modificada. Motivo: {body.motivo}"
    )

    return _viaje_monitoreo(v)


# ── Telemetría GPS con Patrón Strategy ────────────────────────────────────────

@router.get("/ubicacion/{viaje_id}")
def obtener_ubicacion(
    viaje_id: int,
    strategy_type: str = "simulado",
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("COORDINADOR", "SECRETARIA", "GERENTE")),
):
    """
    Obtiene la ubicación en tiempo real utilizando la estrategia GPS seleccionada.
    Estrategias: 'real' o 'simulado'
    """
    v = db.query(Viaje).filter(Viaje.id == viaje_id).first()
    if not v:
        raise HTTPException(404, "Viaje no encontrado")

    # ⚙️ [Uso de PATRÓN STRATEGY] - Elegir la estrategia según el parámetro
    if strategy_type.lower() == "real":
        tracker = GPSTrackerContext(RealGPSTrackingStrategy())
    else:
        tracker = GPSTrackerContext(SimulatedInterpolationStrategy())

    pos = tracker.execute(v)

    return {
        "viaje_id": v.id,
        "codigo": v.codigo,
        "lat": pos["lat"],
        "lng": pos["lng"],
        "tipo_gps": pos["tipo_gps"]
    }


@router.get("/notificaciones-log")
def ver_log_notificaciones(
    current_user=Depends(require_roles("COORDINADOR", "SECRETARIA", "GERENTE")),
):
    """Retorna los logs de notificaciones enviados a los transportistas (Observer log)"""
    return global_notification_observer.envios


# ── Pista de auditoría (solo admin) ───────────────────────────────────────────

@router.get("/auditoria")
def ver_auditoria(
    viaje_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
    limite: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("GERENTE", "PRESIDENTE")),
):
    from models.models import Auditoria
    q = db.query(Auditoria)
    if viaje_id:
        q = q.filter(Auditoria.viaje_id == viaje_id)
    if usuario_id:
        q = q.filter(Auditoria.usuario_id == usuario_id)
    registros = q.order_by(Auditoria.fecha.desc()).limit(limite).all()
    return [
        {
            "id": r.id,
            "accion": r.accion,
            "descripcion": r.descripcion,
            "usuario_id": r.usuario_id,
            "viaje_id": r.viaje_id,
            "ip": r.ip_address,
            "fecha": r.fecha,
        }
        for r in registros
    ]
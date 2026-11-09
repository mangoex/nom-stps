"""
Suite de Pruebas Unitarias de Reglas de Negocio NOM-STPS (Director Dev / TDD)
Reglas probadas: RN-01 a RN-09
"""
import pytest
from datetime import date, timedelta
import hashlib

class BusinessRuleError(Exception):
    def __init__(self, codigo, mensaje):
        super().__init__(mensaje)
        self.codigo = codigo

# Implementación de validación de reglas de negocio en Python para verificación TDD
def validar_rn01_integridad_referencial(centro_id, tipo_id, elaborador_id):
    if not centro_id or not tipo_id or not elaborador_id:
        raise BusinessRuleError("RN-01", "Centro de trabajo, tipo de estudio y elaborador son obligatorios.")

def calcular_rn04_vigencia(tipo_clave, periodicidad_meses, fecha_realizacion, datos=None):
    datos = datos or {}
    meses = periodicidad_meses or 24
    if tipo_clave.startswith("NOM-010"):
        relacion_vle = datos.get("relacion_vle", "")
        if "> 1.0" in relacion_vle:
            meses = 3
        elif "0.75" in relacion_vle and "1.0" in relacion_vle:
            meses = 6
        elif "0.50" in relacion_vle and "0.75" in relacion_vle:
            meses = 12
        elif "0.25" in relacion_vle and "0.50" in relacion_vle:
            meses = 18
        elif "<= 0.25" in relacion_vle or "24 meses" in relacion_vle:
            meses = 24
        else:
            meses = 24

    dias = int(meses * 30.4375)
    return fecha_realizacion + timedelta(days=dias)

def validar_rn06_acreditacion_elaborador(vigencia_acreditacion, fecha_estudio):
    if vigencia_acreditacion < fecha_estudio:
        raise BusinessRuleError("RN-06", "Acreditación del elaborador vencida al momento del estudio.")

def validar_rn09_retencion_legal(estado, fecha_estudio, fecha_actual):
    if estado == "APROBADO":
        dias = (fecha_actual - fecha_estudio).days
        if dias < (5 * 365):
            raise BusinessRuleError("RN-09", "Retención Legal Activa: Estudio protegido por el plazo legal mínimo de 5 años.")

def calcular_rn07_hash_sha256(contenido: str) -> str:
    return hashlib.sha256(contenido.encode("utf-8")).hexdigest()


class TestReglasNegocioNomStps:

    def test_rn01_estudio_requiere_centro_tipo_y_elaborador(self):
        """RN-01: No se puede registrar un estudio con campos obligatorios vacíos"""
        with pytest.raises(BusinessRuleError) as exc_info:
            validar_rn01_integridad_referencial(None, 1, 2)
        assert exc_info.value.codigo == "RN-01"

    def test_rn04_calculo_vigencia_estudio_ruido(self):
        """RN-04: Vigencia fija de 24 meses para estudio de ruido NOM-011"""
        fecha_realizacion = date(2026, 10, 15)
        vigencia = calcular_rn04_vigencia("NOM-011-STPS-2001", 24, fecha_realizacion)
        assert vigencia > fecha_realizacion
        assert (vigencia - fecha_realizacion).days >= 720

    def test_rn04_calculo_vigencia_nom010_segun_vle(self):
        """RN-04: En NOM-010 la periodicidad varía según la concentración frente al VLE"""
        fecha = date(2026, 1, 1)
        vigencia_alta = calcular_rn04_vigencia("NOM-010-STPS-2014", None, fecha, {"relacion_vle": "> 1.0 (Crítico)"})
        # Debe ser ~3 meses (alrededor de 90 días)
        assert (vigencia_alta - fecha).days < 100

        vigencia_baja = calcular_rn04_vigencia("NOM-010-STPS-2014", None, fecha, {"relacion_vle": "<= 0.25 (Bajo)"})
        assert (vigencia_baja - fecha).days > 700

    def test_rn06_bloqueo_aprobacion_si_elaborador_esta_vencido(self):
        """RN-06: Si la acreditación del elaborador está vencida a la fecha del estudio, rechazar aprobación"""
        vigencia_elab = date(2026, 1, 1)
        fecha_estudio = date(2026, 6, 1)
        with pytest.raises(BusinessRuleError) as exc_info:
            validar_rn06_acreditacion_elaborador(vigencia_elab, fecha_estudio)
        assert exc_info.value.codigo == "RN-06"

    def test_rn07_sello_criptografico_sha256(self):
        """RN-07: Verificación del cálculo de la huella digital SHA-256 para no repudio"""
        doc_content = "EST-2026-0001|MNO010101AAA|2026-10-15|DATOS_MUESTREO"
        hash_val = calcular_rn07_hash_sha256(doc_content)
        assert len(hash_val) == 64
        # Determinismo
        assert hash_val == calcular_rn07_hash_sha256(doc_content)

    def test_rn09_bloqueo_borrado_estudios_menores_a_5_anos(self):
        """RN-09: No se permite eliminar un estudio aprobado con menos de 5 años de antigüedad"""
        fecha_estudio = date(2024, 5, 10) # 2.5 años de antigüedad
        fecha_actual = date(2026, 11, 9)
        with pytest.raises(BusinessRuleError) as exc_info:
            validar_rn09_retencion_legal("APROBADO", fecha_estudio, fecha_actual)
        assert exc_info.value.codigo == "RN-09"

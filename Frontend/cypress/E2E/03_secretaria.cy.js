// ============================================================
// SUITE 3: SECRETARIA - Validación Documental y Control de Despacho
// Objetivo: Verificar la revisión de documentos y gestión
// completa del ciclo de vida de un viaje.
// ============================================================

// Helper: simular sesión de secretaria
const loginSecretaria = () => {
  cy.window().then((win) => {
    win.localStorage.setItem("access_token", "token-secretaria-fake");
    win.localStorage.setItem("user_rol", "SECRETARIA");
    win.localStorage.setItem("user_nombres", "María Secretaria");
    win.localStorage.setItem("user_id", "1");
  });
};

// Datos mock de transportistas
const mockTransportistas = [
  {
    id: 10,
    nombres: "Pedro González",
    cedula: "1712345678",
    correo: "pedro@transcontrol.ec",
    placa_vehiculo: "ABC-1234",
    capacidad_ton: 5.0,
    activo: true,
    estado_documentacion: "APROBADO",
  },
];

// Datos mock de documentos pendientes
// NOTA: incluimos 'subido_en' y 'nombre_archivo' solo para que renderDocumentos()
// no lance errores al generar las filas HTML. NO se prueban las funciones
// abrirPDF() ni descargarPDF() — eso queda fuera del alcance de estas pruebas E2E.
const mockDocumentosPendientes = {
  documentos: [
    {
      id: 101,
      tipo: "CEDULA",
      estado: "PENDIENTE",
      nombre_archivo: "cedula_pedro.pdf",
      subido_en: "2026-06-01T10:00:00",
      transportista_nombre: "Pedro González",
      transportista_id: 10,
    },
    {
      id: 102,
      tipo: "LICENCIA_E",
      estado: "RECHAZADO",
      nombre_archivo: "licencia_pedro.pdf",
      subido_en: "2026-06-01T11:00:00",
      transportista_nombre: "Pedro González",
      transportista_id: 10,
    },
  ],
};

// Datos mock de viajes
const mockViajes = [
  {
    id: 201,
    codigo: "VJ-2026-001",
    tipo_mercancia: "Electrodomésticos",
    peso_total_kg: 1500,
    origen: "QUITO",
    destino: "GUAYAQUIL",
    estado: "DISPONIBLE",
    destinatario_nombre: "Empresa ABC",
    destinatario_tel: "0998887776",
  },
  {
    id: 202,
    codigo: "VJ-2026-002",
    tipo_mercancia: "Textiles",
    peso_total_kg: 800,
    origen: "CUENCA",
    destino: "MANTA",
    estado: "TRANSPORTISTA_ASIGNADO",
    destinatario_nombre: "Empresa XYZ",
    destinatario_tel: "0987654321",
    transportista: { nombres: "Pedro González", placa_vehiculo: "ABC-1234" },
  },
  {
    id: 203,
    codigo: "VJ-2026-003",
    tipo_mercancia: "Alimentos",
    peso_total_kg: 2000,
    origen: "GUAYAQUIL",
    destino: "QUITO",
    estado: "EN_EJECUCION",
    destinatario_nombre: "Distribuidora Z",
    destinatario_tel: "0956789012",
    transportista: { nombres: "Luis Méndez", placa_vehiculo: "XYZ-9999" },
  },
];

describe("SUITE 3 - Secretaria: Validación Documental", () => {

  beforeEach(() => {
    cy.clearLocalStorage();

    // Interceptar lista de transportistas
    cy.intercept("GET", "**/api/transportistas/**", {
      statusCode: 200,
      body: mockTransportistas,
    }).as("getTransportistas");

    // Interceptar documentos del transportista 10
    cy.intercept("GET", "**/api/transportistas/10/documentos", {
      statusCode: 200,
      body: mockDocumentosPendientes,
    }).as("getDocs");

    // Interceptar viajes
    cy.intercept("GET", "**/api/viajes/", {
      statusCode: 200,
      body: mockViajes,
    }).as("getViajes");

    loginSecretaria();
    cy.visit("http://localhost:3000/views/secretaria_view.html");
  });

  // ----------------------------------------------------------
  // GRUPO A: Estructura visual del panel de Secretaria
  // ----------------------------------------------------------
  context("A) Vista del panel de Secretaria", () => {

    it("A1 - Debe mostrar el título 'Validación Documental'", () => {
      cy.contains("Validación Documental").should("be.visible");
    });

    it("A2 - Debe mostrar los botones de navegación del sidebar", () => {
      cy.get("#tab-btn-validacion").should("be.visible");
      cy.get("#tab-btn-despacho").should("be.visible");
    });

    it("A3 - Debe mostrar la tabla de documentos pendientes", () => {
      cy.get("#tbody-docs").should("be.visible");
    });

    it("A4 - Debe navegar correctamente a Control de Despacho", () => {
      cy.get("#tab-btn-despacho").click();
      cy.get("#view-despacho").should("not.have.class", "hidden-view");
      cy.contains("Control de Despacho").should("be.visible");
    });

    it("A5 - Debe cerrar sesión y redirigir al login", () => {
      cy.contains("Cerrar Sesión").click();
      cy.url().should("include", "index.html");
    });

  });

  // ----------------------------------------------------------
  // GRUPO B: Revisión de documentos (VÁLIDO - Aprobar)
  // ----------------------------------------------------------
  context("B) Revisión de Documentos - Aprobar (VÁLIDO)", () => {

    it("B1 - Debe abrir el modal de revisión al hacer clic en Revisar", () => {
      cy.wait(["@getTransportistas", "@getDocs"]);
      // Invocamos directamente la función JS que abre el modal con docId=101, transpId=10
      cy.window().then((win) => win.openModalReview(101, 10));
      cy.get("#modal-review").should("have.class", "active");
      cy.contains("Revisión de Documento").should("be.visible");
    });

    it("B2 - Debe aprobar un documento correctamente con radio button", () => {
      cy.intercept("PUT", "**/api/transportistas/10/documentos/101/revisar", {
        statusCode: 200,
        body: { mensaje: "Documento actualizado" },
      }).as("aprobarDoc");

      cy.wait(["@getTransportistas", "@getDocs"]);
      cy.window().then((win) => win.openModalReview(101, 10));

      cy.get('input[name="estado"][value="APROBADO"]').click({ force: true });
      cy.get("#btn-revisar").click();

      cy.wait("@aprobarDoc");
      cy.contains("Documento revisado correctamente").should("be.visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO C: Revisión de documentos (INVÁLIDO - Rechazar)
  // ----------------------------------------------------------
  context("C) Revisión de Documentos - Rechazar (Casos INVÁLIDOS)", () => {

    it("C1 - NO debe guardar revisión sin seleccionar veredicto", () => {
      cy.wait(["@getTransportistas", "@getDocs"]);
      // Abrimos modal directamente (más robusto que buscar el botón en la tabla)
      cy.window().then((win) => win.openModalReview(101, 10));
      cy.get("#modal-review").should("have.class", "active");
      // Sin seleccionar ningún radio, hacemos submit
      cy.get("#btn-revisar").click();
      // El JS del sistema agrega clase 'visible' al error cuando no hay veredicto
      cy.get("#rev-estado-error").should("have.class", "visible");
    });

    it("C2 - NO debe rechazar un documento sin escribir observación", () => {
      cy.wait(["@getTransportistas", "@getDocs"]);
      cy.window().then((win) => win.openModalReview(101, 10));
      cy.get("#modal-review").should("have.class", "active");

      cy.get('input[name="estado"][value="RECHAZADO"]').click({ force: true });
      // Sin escribir observación → debe mostrar error
      cy.get("#btn-revisar").click();
      cy.get("#rev-observacion-error").should("have.class", "visible");
    });

    it("C3 - Debe rechazar documento con observación obligatoria", () => {
      cy.intercept("PUT", "**/api/transportistas/10/documentos/101/revisar", {
        statusCode: 200,
        body: { mensaje: "Documento rechazado" },
      }).as("rechazarDoc");

      cy.wait(["@getTransportistas", "@getDocs"]);
      cy.window().then((win) => win.openModalReview(101, 10));

      cy.get('input[name="estado"][value="RECHAZADO"]').click({ force: true });
      cy.get("#rev-observacion").type("Documento ilegible, la foto está borrosa");
      cy.get("#btn-revisar").click();

      cy.wait("@rechazarDoc");
      cy.contains("Documento revisado correctamente").should("be.visible");
    });

    it("C4 - Debe cerrar modal de revisión al cancelar", () => {
      cy.wait(["@getTransportistas", "@getDocs"]);
      cy.window().then((win) => win.openModalReview(101, 10));
      cy.get("#modal-review").should("have.class", "active");
      cy.contains("Cancelar").click();
      cy.get("#modal-review").should("not.have.class", "active");
    });

  });

});

// ============================================================
// SUITE 3B: Control de Despacho (Viajes)
// ============================================================
describe("SUITE 3B - Secretaria: Control de Despacho", () => {

  beforeEach(() => {
    cy.clearLocalStorage();

    cy.intercept("GET", "**/api/transportistas/**", {
      statusCode: 200,
      body: mockTransportistas,
    }).as("getTransportistas");

    cy.intercept("GET", "**/api/transportistas/10/documentos", {
      statusCode: 200,
      body: {
        documentos: [
          { id: 1, tipo: "CEDULA", estado: "APROBADO" },
          { id: 2, tipo: "LICENCIA_E", estado: "APROBADO" },
          { id: 3, tipo: "MATRICULA", estado: "APROBADO" },
          { id: 4, tipo: "REVISION_TECNICA", estado: "APROBADO" },
          { id: 5, tipo: "SOAT", estado: "APROBADO" },
          { id: 6, tipo: "PERMISO_PESOS", estado: "APROBADO" },
        ],
      },
    }).as("getDocAprobados");

    cy.intercept("GET", "**/api/viajes/", {
      statusCode: 200,
      body: mockViajes,
    }).as("getViajes");

    loginSecretaria();
    cy.visit("http://localhost:3000/views/secretaria_view.html");
    cy.get("#tab-btn-despacho").click();
  });

  // ----------------------------------------------------------
  // GRUPO D: Crear nuevo viaje - Casos VÁLIDOS
  // ----------------------------------------------------------
  context("D) Crear nuevo Viaje - Casos VÁLIDOS", () => {

    it("D1 - Debe abrir el modal de creación de viaje", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#modal-crear-viaje").should("have.class", "active");
      cy.contains("Registrar Nuevo Viaje").should("be.visible");
    });

    it("D2 - Debe crear un viaje con todos los datos válidos", () => {
      cy.intercept("POST", "**/api/viajes/", {
        statusCode: 201,
        body: {
          id: 204,
          codigo: "VJ-2026-004",
          estado: "DISPONIBLE",
          tipo_mercancia: "Electrodomésticos",
        },
      }).as("crearViaje");

      cy.contains("Crear Nuevo Viaje").click();

      cy.get("#viaje-mercancia").type("Electrodomésticos");
      cy.get("#viaje-peso").type("1500");
      cy.get("#viaje-origen").select("QUITO");
      cy.get("#viaje-destino").select("GUAYAQUIL");
      cy.get("#viaje-dest-nombre").type("Empresa Compradora");
      cy.get("#viaje-dest-tel").type("0998887776");
      cy.get("#btn-crear-viaje").click();

      cy.wait("@crearViaje");
      cy.contains("Viaje creado exitosamente").should("be.visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO E: Crear viaje - Casos INVÁLIDOS
  // ----------------------------------------------------------
  context("E) Crear Viaje - Casos INVÁLIDOS", () => {

    it("E1 - NO debe crear viaje con tipo de mercancía vacío", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#btn-crear-viaje").click();
      cy.get("#viaje-mercancia-error").should("have.class", "visible");
    });

    it("E2 - NO debe crear viaje con peso negativo o cero", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#viaje-mercancia").type("Alimentos");
      cy.get("#viaje-peso").type("-100");
      cy.get("#btn-crear-viaje").click();
      cy.get("#viaje-peso-error").should("have.class", "visible");
    });

    it("E3 - NO debe crear viaje con origen igual al destino", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#viaje-mercancia").type("Ropa");
      cy.get("#viaje-peso").type("500");
      cy.get("#viaje-origen").select("QUITO");
      cy.get("#viaje-destino").select("QUITO"); // mismo origen
      cy.get("#btn-crear-viaje").click();
      cy.get("#viaje-destino-error").should("have.class", "visible");
    });

    it("E4 - NO debe crear viaje con teléfono de destinatario inválido", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#viaje-mercancia").type("Muebles");
      cy.get("#viaje-peso").type("800");
      cy.get("#viaje-origen").select("CUENCA");
      cy.get("#viaje-destino").select("MANTA");
      cy.get("#viaje-dest-nombre").type("Mueblería Norte");
      cy.get("#viaje-dest-tel").type("12345"); // formato incorrecto
      cy.get("#btn-crear-viaje").click();
      cy.get("#viaje-dest-tel-error").should("have.class", "visible");
    });

    it("E5 - NO debe crear viaje con nombre de destinatario que contiene números", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#viaje-mercancia").type("Computadoras");
      cy.get("#viaje-peso").type("300");
      cy.get("#viaje-origen").select("IBARRA");
      cy.get("#viaje-destino").select("LOJA");
      cy.get("#viaje-dest-nombre").type("Empresa123"); // contiene números
      cy.get("#btn-crear-viaje").click();
      cy.get("#viaje-dest-nombre-error").should("have.class", "visible");
    });

    it("E6 - NO debe crear viaje con notación científica en el peso", () => {
      cy.contains("Crear Nuevo Viaje").click();
      cy.get("#viaje-peso").type("1e5"); // notación científica
      cy.get("#btn-crear-viaje").click();
      cy.get("#viaje-peso-error").should("have.class", "visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO F: Filtros de viajes
  // ----------------------------------------------------------
  context("F) Filtros del Control de Despacho", () => {

    it("F1 - Debe mostrar todos los viajes al seleccionar 'Todos'", () => {
      cy.wait("@getViajes");
      cy.get("#flt-TODOS").click();
      cy.get("#flt-TODOS").should("have.class", "bg-gray-800");
    });

    it("F2 - Debe filtrar viajes disponibles", () => {
      cy.wait("@getViajes");
      cy.get("#flt-DISPONIBLE").click();
      cy.get("#flt-DISPONIBLE").should("have.class", "bg-gray-800");
    });

    it("F3 - Debe filtrar viajes asignados", () => {
      cy.wait("@getViajes");
      cy.get("#flt-ASIGNADO").click();
      cy.get("#flt-ASIGNADO").should("have.class", "bg-gray-800");
    });

    it("F4 - Debe filtrar viajes en ejecución", () => {
      cy.wait("@getViajes");
      cy.get("#flt-EJECUCION").click();
      cy.get("#flt-EJECUCION").should("have.class", "bg-gray-800");
    });

  });

});

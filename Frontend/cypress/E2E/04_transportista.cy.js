// ============================================================
// SUITE 4: TRANSPORTISTA - Expediente Documental y Mi Viaje
// Objetivo: Verificar la subida de documentos, estados del
// expediente y visualización del viaje asignado.
// ============================================================

// Helper: simular sesión de transportista
const loginTransportista = () => {
  cy.window().then((win) => {
    win.localStorage.setItem("access_token", "token-transportista-fake");
    win.localStorage.setItem("user_rol", "TRANSPORTISTA");
    win.localStorage.setItem("user_nombres", "Juan Transportista");
    win.localStorage.setItem("user_id", "3");
  });
};

describe("SUITE 4 - Transportista: Expediente Documental", () => {

  beforeEach(() => {
    cy.clearLocalStorage();

    // Mock del perfil del usuario autenticado
    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 200,
      body: { id: 3, rol: "TRANSPORTISTA", nombres: "Juan Transportista" },
    }).as("authMe");

    // Mock de la lista de transportistas para encontrar al actual
    cy.intercept("GET", "**/api/transportistas/**", {
      statusCode: 200,
      body: [
        {
          id: 30,
          nombres: "Juan Transportista",
          cedula: "1722334455",
          correo: "transportista@transcontrol.ec",
          placa_vehiculo: "TRA-0001",
          capacidad_ton: 10.0,
          activo: true,
          usuario_id: 3,
        },
      ],
    }).as("getTransportistas");

    // Mock de documentos con estados variados
    cy.intercept("GET", "**/api/transportistas/30/documentos", {
      statusCode: 200,
      body: {
        documentos: [
          {
            id: 301,
            tipo: "CEDULA",
            estado: "APROBADO",
            fecha_subida: "2026-05-01T10:00:00",
            observacion: null,
          },
          {
            id: 302,
            tipo: "LICENCIA_E",
            estado: "RECHAZADO",
            fecha_subida: "2026-05-02T10:00:00",
            observacion: "La imagen está desenfocada",
          },
          {
            id: 303,
            tipo: "MATRICULA",
            estado: "PENDIENTE",
            fecha_subida: "2026-05-03T10:00:00",
            observacion: null,
          },
        ],
      },
    }).as("getDocumentos");

    // Mock de viajes asignados al transportista
    cy.intercept("GET", "**/api/viajes/", {
      statusCode: 200,
      body: [
        {
          id: 201,
          codigo: "VJ-2026-001",
          tipo_mercancia: "Electrodomésticos",
          peso_total_kg: 1500,
          origen: "QUITO",
          destino: "GUAYAQUIL",
          estado: "EN_EJECUCION",
          transportista_id: 30,
          destinatario_nombre: "Empresa ABC",
          destinatario_tel: "0998887776",
          observaciones: "Entregar en horario de oficina",
        },
      ],
    }).as("getViajes");

    loginTransportista();
    cy.visit("http://localhost:3000/views/transportista_view.html");
  });

  // ----------------------------------------------------------
  // GRUPO A: Estructura visual del panel del transportista
  // ----------------------------------------------------------
  context("A) Vista del panel del Transportista", () => {

    it("A1 - Debe mostrar el nombre del transportista en el sidebar", () => {
      cy.get("#perfil-nombre").should("contain", "Juan Transportista");
    });

    it("A2 - Debe mostrar los tabs de navegación 'Mi Expediente' y 'Mi Viaje Actual'", () => {
      cy.get("#tab-btn-documentos").should("be.visible");
      cy.get("#tab-btn-viaje").should("be.visible");
    });

    it("A3 - Debe mostrar el título 'Mi Expediente Operativo'", () => {
      cy.contains("Mi Expediente Operativo").should("be.visible");
    });

    it("A4 - Debe mostrar la grilla de documentos", () => {
      cy.get("#documentos-grid").should("be.visible");
    });

    it("A5 - Debe navegar a 'Mi Viaje Actual' al hacer clic", () => {
      cy.get("#tab-btn-viaje").click();
      cy.get("#view-viaje").should("not.have.class", "hidden-view");
      cy.contains("Mi Viaje Actual").should("be.visible");
    });

    it("A6 - Debe cerrar sesión y redirigir al login", () => {
      cy.contains("Cerrar Sesión").click();
      cy.url().should("include", "index.html");
    });

  });

  // ----------------------------------------------------------
  // GRUPO B: Estado del expediente documental
  // ----------------------------------------------------------
  context("B) Estado del Expediente - Banners informativos", () => {

    it("B1 - Debe mostrar banner de documentos rechazados cuando hay rechazos", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      // Con LICENCIA_E rechazado, debe aparecer el banner de error
      cy.get("#expediente-banner").should("contain", "Rechazados");
    });

    it("B2 - Debe mostrar badge de alerta en el sidebar cuando hay rechazos", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.get("#badge-alert").should("not.have.class", "hidden");
    });

  });

  // ----------------------------------------------------------
  // GRUPO C: Tarjetas de documentos con estados
  // ----------------------------------------------------------
  context("C) Tarjetas de documentos - Diferentes estados", () => {

    it("C1 - Debe mostrar el motivo de rechazo en el documento rechazado", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.contains("La imagen está desenfocada").should("be.visible");
    });

    it("C2 - Debe mostrar el botón 'Subir' para documentos faltantes", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      // SOAT, REVISION_TECNICA y PERMISO_PESOS están faltantes
      cy.contains("📤 Subir").should("be.visible");
    });

    it("C3 - Debe mostrar el botón 'Corregir y Reenviar' para documentos rechazados", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.contains("🔄 Corregir y Reenviar").should("be.visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO D: Modal de subida de documentos
  // ----------------------------------------------------------
  context("D) Subida de Documentos - Modal", () => {

    it("D1 - Debe abrir el modal al hacer clic en 'Subir'", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.contains("📤 Subir").first().click();
      cy.get("#modal-upload").should("have.class", "active");
      cy.contains("Subir Documento").should("be.visible");
    });

    it("D2 - Debe mostrar el nombre del documento que se está subiendo", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.contains("📤 Subir").first().click();
      cy.get("#upload-nombre").should("not.be.empty");
    });

    it("D3 - NO debe subir sin adjuntar ningún archivo", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.contains("📤 Subir").first().click();
      cy.get("#btn-upload-submit").click();
      // Sin archivo seleccionado, el formulario no debe proceder
      cy.get("#modal-upload").should("have.class", "active");
    });

    it("D4 - Debe cerrar el modal de subida al cancelar", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);
      cy.contains("📤 Subir").first().click();
      cy.get("#modal-upload").should("have.class", "active");
      cy.contains("Cancelar").click();
      cy.get("#modal-upload").should("not.have.class", "active");
    });

    it("D5 - Debe indicar el tipo de documento que se está subiendo (SOAT)", () => {
      cy.wait(["@getTransportistas", "@getDocumentos"]);

      // Hacer clic en Subir SOAT específicamente
      cy.contains("SOAT")
        .parents(".rounded-xl")
        .find("button")
        .contains("Subir")
        .click();

      cy.get("#upload-tipo").should("have.value", "SOAT");
    });

  });

  // ----------------------------------------------------------
  // GRUPO E: Vista de Mi Viaje Actual
  // ----------------------------------------------------------
  context("E) Mi Viaje Actual", () => {

    it("E1 - Debe mostrar el código del viaje asignado", () => {
      cy.wait(["@getTransportistas", "@getDocumentos", "@getViajes"]);
      cy.get("#tab-btn-viaje").click();
      cy.get("#container-viaje").should("contain", "VJ-2026-001");
    });

    it("E2 - Debe mostrar el origen y destino del viaje", () => {
      cy.wait(["@getTransportistas", "@getDocumentos", "@getViajes"]);
      cy.get("#tab-btn-viaje").click();
      cy.get("#container-viaje").should("contain", "QUITO");
      cy.get("#container-viaje").should("contain", "GUAYAQUIL");
    });

    it("E3 - Debe mostrar el tipo de mercancía del viaje", () => {
      cy.wait(["@getTransportistas", "@getDocumentos", "@getViajes"]);
      cy.get("#tab-btn-viaje").click();
      cy.get("#container-viaje").should("contain", "Electrodomésticos");
    });

    it("E4 - Debe mostrar las instrucciones operativas del viaje", () => {
      cy.wait(["@getTransportistas", "@getDocumentos", "@getViajes"]);
      cy.get("#tab-btn-viaje").click();
      cy.get("#container-viaje").should("contain", "Entregar en horario de oficina");
    });

  });

});

// ============================================================
// SUITE 4B: Transportista con documentación completa
// ============================================================
describe("SUITE 4B - Transportista: Expediente Completo ✅", () => {

  beforeEach(() => {
    cy.clearLocalStorage();

    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 200,
      body: { id: 3, rol: "TRANSPORTISTA", nombres: "Juan Transportista" },
    }).as("authMe");

    cy.intercept("GET", "**/api/transportistas/**", {
      statusCode: 200,
      body: [
        {
          id: 30, nombres: "Juan Transportista", cedula: "1722334455",
          placa_vehiculo: "TRA-0001", capacidad_ton: 10.0,
          activo: true, usuario_id: 3,
        },
      ],
    }).as("getTransportistas");

    // Todos los 6 documentos aprobados
    cy.intercept("GET", "**/api/transportistas/30/documentos", {
      statusCode: 200,
      body: {
        documentos: [
          { id: 301, tipo: "CEDULA",          estado: "APROBADO", observacion: null },
          { id: 302, tipo: "LICENCIA_E",       estado: "APROBADO", observacion: null },
          { id: 303, tipo: "MATRICULA",        estado: "APROBADO", observacion: null },
          { id: 304, tipo: "SOAT",             estado: "APROBADO", observacion: null },
          { id: 305, tipo: "REVISION_TECNICA", estado: "APROBADO", observacion: null },
          { id: 306, tipo: "PERMISO_PESOS",    estado: "APROBADO", observacion: null },
        ],
      },
    }).as("getDocumentosCompletos");

    cy.intercept("GET", "**/api/viajes/", { statusCode: 200, body: [] }).as("getViajes");

    loginTransportista();
    cy.visit("http://localhost:3000/views/transportista_view.html");
  });

  it("F1 - Debe mostrar banner '¡Expediente Completo!' cuando todos están aprobados", () => {
    cy.wait(["@getTransportistas", "@getDocumentosCompletos"]);
    cy.get("#expediente-banner").should("contain", "¡Expediente Completo!");
  });

  it("F2 - NO debe mostrar badge de alerta cuando expediente está completo", () => {
    cy.wait(["@getTransportistas", "@getDocumentosCompletos"]);
    cy.get("#badge-alert").should("have.class", "hidden");
  });

  it("F3 - Debe mostrar mensaje de sin viajes cuando no hay asignación", () => {
    cy.wait(["@getTransportistas", "@getDocumentosCompletos", "@getViajes"]);
    cy.get("#tab-btn-viaje").click();
    cy.get("#container-viaje").should("contain", "No tienes viajes asignados");
  });

});

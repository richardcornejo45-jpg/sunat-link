const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Escapa caracteres especiales para evitar XML mal formado
function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Determina el tipo de comprobante UBL 2.1 según la serie (F... -> 01 Factura, B... -> 03 Boleta)
function getTipoComprobante(serie) {
  if (serie.startsWith("B")) {
    return { codigo: "03", nombre: "Boleta de Venta" };
  }
  return { codigo: "01", nombre: "Factura" };
}

// Valida los campos mínimos requeridos y devuelve una lista de mensajes claros
function validateComprobanteData(data = {}) {
  const errores = [];

  const serie = String(data.serie ?? "").trim().toUpperCase();
  const correlativo = String(data.correlativo ?? "").trim();
  const emisorRuc = String(data.emisorRuc ?? "").trim();
  const emisorNombre = String(data.emisorNombre ?? "").trim();
  const descripcion = String(data.descripcion ?? "").trim();

  if (!serie) {
    errores.push("La serie es obligatoria (ejemplo: F001 para factura o B001 para boleta).");
  } else if (!/^[FB][A-Z0-9]{3}$/.test(serie)) {
    errores.push("La serie debe iniciar con 'F' o 'B' y tener 4 caracteres alfanuméricos (ej. F001 o B001).");
  }

  if (!correlativo) {
    errores.push("El correlativo es obligatorio (ejemplo: 00000001).");
  } else if (!/^\d{1,8}$/.test(correlativo)) {
    errores.push("El correlativo debe contener solo números (de 1 a 8 dígitos).");
  }

  if (!emisorRuc) {
    errores.push("El RUC del emisor es obligatorio.");
  } else if (!/^\d{11}$/.test(emisorRuc)) {
    errores.push("El RUC del emisor debe tener exactamente 11 dígitos numéricos.");
  }

  if (!emisorNombre) {
    errores.push("La razón social del emisor es obligatoria.");
  }

  if (!descripcion) {
    errores.push("La descripción del ítem es obligatoria.");
  }

  if (data.cantidad === undefined || data.cantidad === null || String(data.cantidad).trim() === "") {
    errores.push("La cantidad es obligatoria.");
  } else {
    const qty = Number(data.cantidad);
    if (!Number.isFinite(qty) || qty <= 0) {
      errores.push("La cantidad debe ser un número mayor a 0.");
    }
  }

  if (
    data.precioUnitario === undefined ||
    data.precioUnitario === null ||
    String(data.precioUnitario).trim() === ""
  ) {
    errores.push("El precio unitario es obligatorio.");
  } else {
    const unitPrice = Number(data.precioUnitario);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errores.push("El precio unitario debe ser un número mayor o igual a 0.");
    }
  }

  return errores;
}

// Genera una estructura base de Factura (01) o Boleta (03) en formato UBL 2.1
function buildUbl21Xml(data) {
  const serie = String(data.serie).trim().toUpperCase();
  const correlativo = String(data.correlativo).trim().padStart(8, "0");
  const fechaEmision = String(data.fechaEmision || new Date().toISOString().slice(0, 10)).trim();
  const moneda = String(data.moneda || "PEN").trim().toUpperCase();
  const emisorRuc = String(data.emisorRuc).trim();
  const emisorNombre = String(data.emisorNombre).trim();
  const clienteDoc = String(data.clienteDoc || "10456789012").trim();
  const clienteNombre = String(data.clienteNombre || "CLIENTE EJEMPLO").trim();
  const descripcion = String(data.descripcion).trim();

  const qty = Number(data.cantidad);
  const unitPrice = Number(data.precioUnitario);

  const subtotalNum = Number((qty * unitPrice).toFixed(2));
  const igvNum = Number((subtotalNum * 0.18).toFixed(2));
  const totalNum = Number((subtotalNum + igvNum).toFixed(2));

  const subtotal = subtotalNum.toFixed(2);
  const igv = igvNum.toFixed(2);
  const importeTotal = totalNum.toFixed(2);
  const idDocumento = `${serie}-${correlativo}`;
  const tipoComprobante = getTipoComprobante(serie);
  const clienteSchemeId = clienteDoc.length === 11 ? "6" : "1";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(idDocumento)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(fechaEmision)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">${tipoComprobante.codigo}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(moneda)}</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${escapeXml(emisorRuc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(emisorNombre)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${clienteSchemeId}">${escapeXml(clienteDoc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(clienteNombre)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(moneda)}">${igv}</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(moneda)}">${subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(moneda)}">${importeTotal}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(moneda)}">${importeTotal}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(moneda)}">${subtotal}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(descripcion)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(moneda)}">${unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}

app.post("/api/comprobante/xml", (req, res) => {
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const errores = validateComprobanteData(payload);

  if (errores.length > 0) {
    return res.status(400).json({
      error: "Datos del comprobante inválidos",
      detalles: errores
    });
  }

  try {
    const xml = buildUbl21Xml(payload);
    res.set("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(400).json({
      error: "Error al generar el XML UBL 2.1",
      detalles: [error.message]
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`sunat-link corriendo en http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  escapeXml,
  getTipoComprobante,
  validateComprobanteData,
  buildUbl21Xml
};
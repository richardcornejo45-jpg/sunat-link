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

// Genera una estructura base de Factura / Boleta UBL 2.1
function buildUbl21Xml(data) {
  const {
    serie = "F001",
    correlativo = "00000001",
    fechaEmision = new Date().toISOString().slice(0, 10),
    moneda = "PEN",
    emisorRuc = "20123456789",
    emisorNombre = "MI EMPRESA SAC",
    clienteDoc = "10456789012",
    clienteNombre = "CLIENTE EJEMPLO",
    descripcion = "Servicio de desarrollo web",
    cantidad = 1,
    precioUnitario = 100.0
  } = data;

  const qty = Number(cantidad);
  const unitPrice = Number(precioUnitario);
  const totalVenta = (qty * unitPrice).toFixed(2);
  const igv = (totalVenta * 0.18).toFixed(2);
  const importeTotal = (Number(totalVenta) + Number(igv)).toFixed(2);
  const idDocumento = `${serie}-${correlativo}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(idDocumento)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(fechaEmision)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>
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
        <cbc:ID schemeID="6">${escapeXml(clienteDoc)}</cbc:ID>
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
    <cbc:LineExtensionAmount currencyID="${escapeXml(moneda)}">${totalVenta}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(moneda)}">${importeTotal}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(moneda)}">${importeTotal}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(moneda)}">${totalVenta}</cbc:LineExtensionAmount>
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
  try {
    const xml = buildUbl21Xml(req.body || {});
    res.set("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(400).json({ error: "Error al generar el XML UBL 2.1", detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`sunat-link corriendo en http://localhost:${PORT}`);
});
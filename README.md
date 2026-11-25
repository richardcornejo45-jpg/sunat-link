# sunat-link

Proyecto académico en **Node.js** y **Express** para generar comprobantes electrónicos en formato **XML UBL 2.1** (Facturas `01` y Boletas de Venta `03`), acompañado de una interfaz web sencilla servida desde `/public`.

> **Nota importante:** Este proyecto es una implementación académica/de demostración enfocada en la construcción de la estructura XML UBL 2.1 y el cálculo de IGV (18%). **No incluye firma digital (XMLDSig) ni envío real a los servicios web de SUNAT / OSE.**

## Características principales

- Endpoint `POST /api/comprobante/xml` con validación de campos requeridos y respuestas claras (`400 Bad Request` si falta o es inválido algún dato).
- Soporte para **Factura** (serie que inicia en `F`, código `01`) y **Boleta de Venta** (serie que inicia en `B`, código `03`).
- Cálculo automático de **Subtotal**, **IGV (18%)** e **Importe Total**.
- Escapado de caracteres especiales XML (`&`, `<`, `>`, `"`, `'`) para evitar documentos mal formados.
- Interfaz web en `public/index.html` con vista previa del comprobante, visor de XML UBL 2.1, copiado al portapapeles y descarga directa del archivo `.xml`.

## Requisitos e instalación

- [Node.js](https://nodejs.org/) (v18 o superior recomendada)

1. Clona o descarga el repositorio e instala las dependencias:

```bash
npm install
```

2. Inicia el servidor:

```bash
npm start
```

3. Abre en tu navegador:

```text
http://localhost:3000
```

## Ejemplo de uso de la API

### `POST /api/comprobante/xml`

Envía un JSON con los datos del comprobante. Si la serie empieza con `F` se genera una Factura (`01`); si empieza con `B`, una Boleta de Venta (`03`).

```bash
curl -X POST http://localhost:3000/api/comprobante/xml \
  -H "Content-Type: application/json" \
  -d '{
    "serie": "F001",
    "correlativo": "00000001",
    "emisorRuc": "20601234567",
    "emisorNombre": "TECNOLOGIA SUR SAC",
    "descripcion": "Servicio de desarrollo y soporte web",
    "cantidad": 1,
    "precioUnitario": 500
  }'
```

- **Respuesta exitosa (`200 OK`):** devuelve el documento XML (`Content-Type: application/xml; charset=utf-8`).
- **Error de validación (`400 Bad Request`):** devuelve un JSON con el resumen del error y el arreglo `detalles` indicando qué campos corregir.

## Estructura del proyecto

```text
sunat-link/
├── index.js           # Servidor Express, validación y generador XML UBL 2.1
├── package.json       # Dependencias y script de inicio
├── public/
│   └── index.html     # Interfaz web (formulario, vista previa y visor/descarga XML)
└── README.md          # Documentación del proyecto
```

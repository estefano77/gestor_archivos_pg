"""
Genera los archivos de muestra que consume `seed-help.mjs` para producir las
capturas del manual de usuario.

Solo usa la biblioteca estandar: el PDF y el PNG se escriben a mano y los
formatos de Office se arman como paquetes OOXML validos dentro de un ZIP.

    python seed-help-samples.py [directorio_destino]
"""

import os
import struct
import sys
import zipfile
import zlib

# --------------------------------------------------------------------------- #
# PDF
# --------------------------------------------------------------------------- #


def _pdf_escape(text: str) -> str:
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def build_pdf(pages) -> bytes:
    """Arma un PDF multipagina con texto. Los offsets del xref se calculan aqui
    mismo, que es la parte que suele romperse al escribir un PDF a mano."""
    # 1 = Catalog, 2 = Pages, 3 y 4 = las dos fuentes. Las paginas empiezan en 5.
    catalog_id, pages_id, f1_id, f2_id = 1, 2, 3, 4
    objects = {
        catalog_id: f"<< /Type /Catalog /Pages {pages_id} 0 R >>",
        pages_id: "",
        f1_id: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f2_id: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    }

    page_ids = []
    next_id = 5

    for heading, lines in pages:
        content_id = next_id
        page_id = next_id + 1
        next_id += 2

        parts = [
            "0.55 0.58 0.95 RG 3 w 40 40 532 712 re S",  # marco de la pagina
            "BT /F2 22 Tf 1 0 0 1 62 705 Tm",
            f"({_pdf_escape(heading)}) Tj ET",
        ]
        y = 655
        for line in lines:
            if line:
                parts += [
                    "BT /F1 12 Tf 1 0 0 1 62 %d Tm" % y,
                    f"({_pdf_escape(line)}) Tj ET",
                ]
            y -= 21

        stream = "\n".join(parts).encode("latin-1", "replace")

        objects[content_id] = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1")
            + stream
            + b"\nendstream"
        )
        objects[page_id] = (
            "<< /Type /Page /Parent %d 0 R /MediaBox [0 0 612 792] "
            "/Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> "
            "/Contents %d 0 R >>" % (pages_id, f1_id, f2_id, content_id)
        )
        page_ids.append(page_id)

    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[pages_id] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>"

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = {}

    for number in sorted(objects):
        body = objects[number]
        if isinstance(body, str):
            body = body.encode("latin-1", "replace")
        offsets[number] = len(out)
        out += f"{number} 0 obj\n".encode("latin-1") + body + b"\nendobj\n"

    size = max(objects) + 1
    xref_offset = len(out)
    out += f"xref\n0 {size}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"
    for number in range(1, size):
        out += f"{offsets[number]:010d} 00000 n \n".encode("latin-1")
    out += (
        f"trailer\n<< /Size {size} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("latin-1")

    return bytes(out)


# --------------------------------------------------------------------------- #
# PNG
# --------------------------------------------------------------------------- #


def _png_chunk(tag: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def build_png(width: int, height: int, pixel_fn) -> bytes:
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filtro "None" por scanline
        for x in range(width):
            r, g, b = pixel_fn(x, y)
            raw += bytes((r, g, b))

    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _png_chunk(b"IEND", b"")
    )


def sample_pixel(x: int, y: int):
    """Degradado diagonal con un circulo claro al centro: se distingue de un
    bloque de color plano en la miniatura y en el visor."""
    t = (x / 900.0 + y / 600.0) / 2.0
    r = int(40 + 150 * t)
    g = int(60 + 90 * t)
    b = int(180 + 60 * (1 - t))

    dx, dy = x - 450, y - 300
    if dx * dx + dy * dy < 150 * 150:
        return 250, 250, 255
    if 300 * 300 < dx * dx + dy * dy < 330 * 330:
        return 255, 255, 255
    return r, g, b


# --------------------------------------------------------------------------- #
# OOXML (docx / xlsx / pptx)
# --------------------------------------------------------------------------- #

CONTENT_TYPES_DOCX = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

CONTENT_TYPES_XLSX = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"""

CONTENT_TYPES_PPTX = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>"""

ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="{target}"/>
</Relationships>"""


def build_docx(path: str, title: str, paragraphs) -> None:
    body = "".join(
        f"<w:p><w:r><w:t xml:space='preserve'>{p}</w:t></w:r></w:p>" for p in paragraphs
    )
    document = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body><w:p><w:r><w:t>{title}</w:t></w:r></w:p>{body}"
        "<w:sectPr><w:pgSz w:w='12240' w:h='15840'/></w:sectPr></w:body></w:document>"
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES_DOCX)
        z.writestr("_rels/.rels", ROOT_RELS.format(target="word/document.xml"))
        z.writestr("word/document.xml", document)


def build_xlsx(path: str, rows) -> None:
    def cell(ref: str, value, bold: bool = False) -> str:
        style = ' s="1"' if bold else ""
        return f'<c r="{ref}"{style}><v>{value}</v></c>'

    xml_rows = []
    for index, (label, value) in enumerate(rows, start=1):
        cells = cell(f"A{index}", label, bold=True) + cell(f"B{index}", value)
        xml_rows.append(f'<row r="{index}">{cells}</row>')

    sheet = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<sheetData>{''.join(xml_rows)}</sheetData></worksheet>"
    )
    workbook = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/></sheets></workbook>'
    )
    workbook_rels = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        "</Relationships>"
    )

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES_XLSX)
        z.writestr("_rels/.rels", ROOT_RELS.format(target="xl/workbook.xml"))
        z.writestr("xl/workbook.xml", workbook)
        z.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        z.writestr("xl/worksheets/sheet1.xml", sheet)


def build_pptx(path: str, title: str, bullets) -> None:
    paragraphs = "".join(
        f"<a:p><a:r><a:t>{b}</a:t></a:r></a:p>" for b in bullets
    )
    slide = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        "<p:cSld><p:spTree><p:sp><p:txBody>"
        f"<a:p><a:r><a:t>{title}</a:t></a:r></a:p>{paragraphs}"
        "</p:txBody></p:sp></p:spTree></p:cSld></p:sld>"
    )
    presentation = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        '<p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>'
        '<p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/>'
        "</p:presentation>"
    )
    presentation_rels = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>'
        "</Relationships>"
    )

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES_PPTX)
        z.writestr("_rels/.rels", ROOT_RELS.format(target="ppt/presentation.xml"))
        z.writestr("ppt/presentation.xml", presentation)
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels)
        z.writestr("ppt/slides/slide1.xml", slide)


# --------------------------------------------------------------------------- #


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else ".help-samples"
    os.makedirs(target, exist_ok=True)

    def out(name: str) -> str:
        return os.path.join(target, name)

    with open(out("Informe-Trimestral.pdf"), "wb") as fh:
        fh.write(
            build_pdf(
                [
                    (
                        "Informe Trimestral 2026",
                        [
                            "CloudVault - documento de muestra para el manual de usuario.",
                            "Este PDF existe para ilustrar como se ve el visor integrado.",
                            "",
                            "El visor incluye la barra nativa del navegador:",
                            "miniaturas, navegacion de paginas, zoom e impresion.",
                        ],
                    ),
                    (
                        "Detalle por categoria",
                        [
                            "PDF .................. 15 MB maximo por archivo",
                            "Imagen ............... 15 MB maximo por archivo",
                            "Word / Excel / PPT ... 15 MB maximo por archivo",
                            "",
                            "Cuota total del usuario: 25 MB.",
                        ],
                    ),
                ]
            )
        )

    with open(out("Captura-De-Pantalla.png"), "wb") as fh:
        fh.write(build_png(900, 600, sample_pixel))

    build_docx(
        out("Contrato-Servicios.docx"),
        "Contrato de Servicios",
        [
            "Documento de Word de muestra para el manual de usuario.",
            "CloudVault no previsualiza el contenido de los archivos de Office:",
            "muestra los metadatos y ofrece la descarga directa.",
        ],
    )

    build_xlsx(
        out("Presupuesto-Anual.xlsx"),
        [
            ("Concepto", "Importe"),
            ("Licencias", "1200"),
            ("Almacenamiento", "350"),
            ("Soporte", "480"),
        ],
    )

    build_pptx(
        out("Presentacion-Resultados.pptx"),
        "Presentacion de Resultados",
        [
            "Archivo de PowerPoint de muestra.",
            "Se descarga para abrirlo en Office.",
        ],
    )

    for name in sorted(os.listdir(target)):
        size = os.path.getsize(os.path.join(target, name))
        print(f"  {name:34s} {size:>8,d} bytes")


if __name__ == "__main__":
    main()

"""Generación puntual de assets DEMO; no se ejecuta en build ni en el servidor.

Usa qrcode 8.2 ya disponible en el equipo de desarrollo. No añade dependencias
a Angular/Flask. El logo es el vector existente en header.component.html.
"""
from pathlib import Path
from xml.etree import ElementTree as ET

import qrcode


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'src/assets/qr-demo'
SAMPLES = {f'{kind}-{number:03}': f'VOID:DEMO:{prefix}:{number:03}'
           for kind, prefix in [('ticket', 'ENT'), ('drink', 'CON')]
           for number in range(1, 4)}
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)


def element(parent, tag, **attrs):
    return ET.SubElement(parent, f'{{{SVG}}}{tag}', attrs)


def generate(name, payload):
    qr = qrcode.QRCode(version=3, error_correction=qrcode.constants.ERROR_CORRECT_H,
                       box_size=10, border=4)
    qr.add_data(payload)
    qr.make(fit=False)
    matrix = qr.get_matrix()
    size = len(matrix) * 10
    svg = ET.Element(f'{{{SVG}}}svg', {'viewBox': f'0 0 {size} {size}',
                                    'width': str(size), 'height': str(size)})
    element(svg, 'title').text = 'QR DEMO con logo VOID — sin validez real'
    element(svg, 'desc').text = f'{payload}. Referencia ficticia, sin acceso ni canje.'
    element(svg, 'rect', width=str(size), height=str(size), fill='#fff')
    path = ' '.join(f'M{x*10} {y*10}h10v10h-10z' for y, row in enumerate(matrix)
                    for x, dark in enumerate(row) if dark)
    element(svg, 'path', d=path, fill='#000', **{'shape-rendering': 'crispEdges'})
    # Placa de 9 x 5 módulos, lejos de los patrones de búsqueda y del margen.
    element(svg, 'rect', x=str(size/2-45), y=str(size/2-25), width='90', height='50',
            rx='4', fill='#fff')
    scale = .48
    logo = element(svg, 'g', transform=f'translate({size/2-74*scale} {size/2-17.5*scale}) scale({scale})',
                   fill='none', stroke='#000', **{'stroke-width': '2.8'})
    element(logo, 'path', d='M3 3 18 31 33 3M96 3v28M115 3h12a14 14 0 0 1 0 28h-12')
    element(logo, 'ellipse', cx='64', cy='17', rx='15', ry='14')
    ET.ElementTree(svg).write(OUTPUT / f'{name}.svg', encoding='utf-8', xml_declaration=True)


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, payload in SAMPLES.items():
        generate(name, payload)
        print(f'{name}.svg: {payload} (v3, H, borde 4)')

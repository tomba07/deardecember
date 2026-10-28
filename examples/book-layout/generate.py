"""Standalone A5 design proof. Not connected to the application's PDF export."""
from pathlib import Path
import argparse
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=ROOT / 'output/pdf/dear-december-a5-sample.pdf')
parser.add_argument('--font-dir', type=Path, default=Path('/System/Library/Fonts/Supplemental'))
args = parser.parse_args()
for face, file in [('Book', 'Georgia.ttf'), ('BookItalic', 'Georgia Italic.ttf')]:
    pdfmetrics.registerFont(TTFont(face, str(args.font_dir / file)))
pdfmetrics.registerFontFamily('Book', normal='Book', italic='BookItalic', bold='Book', boldItalic='BookItalic')
W, H = 148 * mm, 210 * mm
INK, MUTED, PAPER = HexColor('#252522'), HexColor('#73716b'), HexColor('#fdfcf8')
args.output.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(args.output), pagesize=(W, H), pageCompression=1)
c.setTitle('Alex Morgan - A5 book design sample')
c.setAuthor('Dear December')
c.setSubject('Design proof using supplied childhood details and a labelled illustrative photograph')


def margins(page):
    # A slightly larger inside margin leaves room for binding.
    return (21 * mm, 18 * mm) if page % 2 else (18 * mm, 21 * mm)


def start(page):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    if page > 1:
        left, right = margins(page)
        c.setFillColor(MUTED)
        c.setFont('Book', 9)
        x = W - right if page % 2 else left
        (c.drawRightString if page % 2 else c.drawString)(x, 13 * mm, str(page - 1))


def para(text, top, page, size=15.5, leading=23, italic=False, color=INK, width=None):
    left, right = margins(page)
    style = ParagraphStyle('book', fontName='BookItalic' if italic else 'Book', fontSize=size,
                           leading=leading, textColor=color, splitLongWords=False)
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width or W-left-right, H)
    assert top-height >= 23*mm, f'Text overflow on page {page}'
    paragraph.drawOn(c, left, top-height)
    return top-height


def chapter(page, number, title, paragraphs):
    start(page)
    left, _ = margins(page)
    c.setFillColor(MUTED)
    c.setFont('Book', 10)
    c.drawString(left, H-29*mm, number)
    y = para(title, H-40*mm, page, size=31, leading=35)
    y -= 13*mm
    for text in paragraphs:
        y = para(text, y, page)
        y -= 6*mm
    return y

# 1. Quiet typographic cover.
start(1)
left, _ = margins(1)
y = para('Alex<br/>Morgan', H-55*mm, 1, size=43, leading=48)
para('A few memories', y-13*mm, 1, size=16, leading=23, italic=True)
c.setFillColor(MUTED)
c.setFont('Book', 9)
c.drawString(left, 27*mm, 'Dear December')
c.drawString(left, 21*mm, 'A5 design sample')
c.showPage()

# 2. Basic facts in plain language, with a compact timeline.
start(2)
y = para('A place to begin', H-31*mm, 2, size=30, leading=35)
y = para('My name is Alex Morgan.<br/>I was born on 12 April 1988 in Brookfield, Germany.', y-13*mm, 2)
y = para('I lived in Seabrook from 1991 to 1994. Then we moved to Oakridge.', y-7*mm, 2)
y -= 15*mm
for year, place in [('1988', 'Brookfield'), ('1991–1994', 'Seabrook'), ('From 1994', 'Oakridge')]:
    y = para(year, y, 2, size=10, leading=14, color=MUTED)
    y = para(place, y-2*mm, 2, size=17, leading=23)-7*mm
c.showPage()

# 3. A short chapter with a larger opening sentence.
start(3)
left, _ = margins(3)
c.setFillColor(MUTED);c.setFont('Book',10);c.drawString(left,H-29*mm,'01')
y = para('The beaches<br/>of Seabrook', H-40*mm, 3, size=31, leading=35)
y = para('I have fond memories of the beaches in Seabrook.', y-15*mm, 3, size=19, leading=28)
y = para('We lived there from 1991 to 1994, before moving to Oakridge.', y-9*mm, 3)
para('Seabrook was part of my early childhood. The beaches are what I remember especially fondly from those years.', y-7*mm, 3)
c.showPage()

# 4. Photograph kept separate from invented family history.
start(4)
photo = Path(__file__).parent / 'assets/seabrook-beach.jpg'
image = ImageReader(str(photo)); iw, ih = image.getSize()
left, right = margins(4)
width = W-left-right
height = width * ih/iw
image_top = H-35*mm
c.drawImage(image, left, image_top-height, width=width, height=height, mask='auto')
y = image_top-height-7*mm
y = para('Seabrook', y, 4, size=20, leading=25)
para('Illustrative photograph, not a family photo.', y-3*mm, 4, size=10, leading=15, italic=True, color=MUTED)
para('Trevaunance Cove, St Agnes<br/>Photograph: Mike Coates · CC0<br/>PublicDomainPictures.net, image 8313', 52*mm, 4, size=8.5, leading=13, color=MUTED)
c.linkURL('https://www.publicdomainpictures.net/en/view-image.php?image=8313&picture=seabrook-beach',(left,31*mm,W-right,52*mm),relative=0)
c.showPage()

# 5. Short memories do not need filler or invented lessons.
chapter(5, '02', 'The hill<br/>in Oakridge', [
    'In 1994 we moved to Oakridge.',
    'One of my fond memories from there is sledding on the hill.',
    'The Seabrook beaches and that hill in Oakridge are two places I remember from growing up.'
])
c.showPage()

# 6. A clearly marked fiction specimen shows a denser page without claiming more personal facts.
start(6)
left, _ = margins(6)
c.setFillColor(MUTED);c.setFont('Book',9);c.drawString(left,H-22*mm,'FICTIONAL TEXT FOR LAYOUT ONLY')
y = para('An ordinary<br/>Saturday', H-34*mm, 6, size=30, leading=34)
y = para('On Saturdays I like a slow breakfast. There is usually coffee, bread and something to read. If the weather is good, I go out for a walk before deciding what to do next.', y-11*mm, 6)
y = para('An afternoon might be spent cooking, fixing something at home or meeting a friend. Sometimes there is a film in the evening. Often, the best part is having a day without much of a plan.', y-6*mm, 6)
para('This page is invented to demonstrate a fuller text layout. Pages 2–5 use the childhood details supplied for this sample. The photograph demonstrates placement only.', 43*mm, 6, size=8.5, leading=12, color=MUTED)
c.showPage()
c.save()
print(args.output)

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
c.setSubject('Design proof using entirely fictional details and a neutral image placeholder')


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
y = para('I grew up in Oakridge. Later, I moved to Riverside.', y-7*mm, 2)
y -= 15*mm
for year, place in [('1988', 'Brookfield'), ('Childhood', 'Oakridge'), ('Adulthood', 'Riverside')]:
    y = para(year, y, 2, size=10, leading=14, color=MUTED)
    y = para(place, y-2*mm, 2, size=17, leading=23)-7*mm
c.showPage()

# 3. A short chapter with a larger opening sentence.
start(3)
left, _ = margins(3)
c.setFillColor(MUTED);c.setFont('Book',10);c.drawString(left,H-29*mm,'01')
y = para('Walks beside<br/>the river', H-40*mm, 3, size=31, leading=35)
y = para('The canal in Riverside became a favourite place for a walk.', y-15*mm, 3, size=19, leading=28)
y = para('My first flat in Riverside was near the water.', y-9*mm, 3)
para('When I wanted to get outside for a while, I could follow the towpath and watch the boats go by.', y-7*mm, 3)
c.showPage()

# 4. Neutral placeholder for photo placement.
start(4)
left, right = margins(4)
width, height = W-left-right, 75*mm
image_top = H-35*mm
c.setFillColor(HexColor('#eeede8'));c.rect(left,image_top-height,width,height,stroke=0,fill=1)
c.setFillColor(MUTED);c.setFont('BookItalic',14)
c.drawCentredString(left+width/2,image_top-height/2,'Your photograph')
y = image_top-height-7*mm
y = para('A place to remember', y, 4, size=20, leading=25)
para('A neutral placeholder to demonstrate photo placement.', y-3*mm, 4, size=10, leading=15, italic=True, color=MUTED)
c.showPage()

# 5. Short memories do not need filler or invented lessons.
chapter(5, '02', 'Growing up<br/>in Oakridge', [
    'I spent most of my childhood in Oakridge.',
    'I often visited the library after school or rode my bike around the park.',
    'On rainy afternoons, I drew pictures at the kitchen table.'
])
c.showPage()

# 6. A denser fictional text page.
start(6)
left, _ = margins(6)
c.setFillColor(MUTED);c.setFont('Book',9);c.drawString(left,H-22*mm,'FICTIONAL TEXT FOR LAYOUT ONLY')
y = para('An ordinary<br/>Saturday', H-34*mm, 6, size=30, leading=34)
y = para('On Saturdays I like a slow breakfast. There is usually coffee, bread and something to read. If the weather is good, I go out for a walk before deciding what to do next.', y-11*mm, 6)
y = para('An afternoon might be spent cooking, fixing something at home or meeting a friend. Sometimes there is a film in the evening. Often, the best part is having a day without much of a plan.', y-6*mm, 6)
para('All names, dates, places and memories in this sample are fictional. The image placeholder demonstrates placement only.', 43*mm, 6, size=8.5, leading=12, color=MUTED)
c.showPage()
c.save()
print(args.output)

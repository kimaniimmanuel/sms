const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  TabStopType, TabStopPosition, PageNumber, PageBreak
} = require('docx');

const COLOR_PRIMARY = "1F4E79";   // deep blue
const COLOR_ACCENT  = "2E75B6";   // mid blue
const COLOR_MUTED   = "595959";
const COLOR_LIGHT   = "F2F2F2";
const FONT          = "Calibri";

const border = (color = "BFBFBF") => ({ style: BorderStyle.SINGLE, size: 4, color });
const allBorders = (color = "BFBFBF") => ({
  top: border(color), bottom: border(color), left: border(color), right: border(color),
  insideHorizontal: border(color), insideVertical: border(color),
});

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, ...(opts.spacing || {}) },
    alignment: opts.alignment,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })],
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 36, color: COLOR_PRIMARY })],
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: COLOR_ACCENT })],
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: COLOR_MUTED })],
  });
}

function Bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: textRuns(text),
  });
}

function Numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 60 },
    children: textRuns(text),
  });
}

// Parse simple **bold** markers within plain text
function textRuns(text) {
  if (typeof text !== "string") return [text];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(p => p.length > 0).map(p => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return new TextRun({ text: p.slice(2, -2), bold: true });
    }
    return new TextRun({ text: p });
  });
}

function tableCell(text, opts = {}) {
  const isHeader = opts.header === true;
  const widthDxa = opts.widthDxa;
  return new TableCell({
    borders: allBorders(),
    width: widthDxa ? { size: widthDxa, type: WidthType.DXA } : undefined,
    shading: isHeader ? { fill: COLOR_PRIMARY, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: (Array.isArray(text) ? text : [text]).map(t => new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({
        text: typeof t === "string" ? t : String(t),
        bold: isHeader, color: isHeader ? "FFFFFF" : undefined,
      })],
    })),
  });
}

// Build a table from a 2D array. First row is header.
function tableFromRows(rows, columnWidths) {
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: rows.map((row, ri) => new TableRow({
      tableHeader: ri === 0,
      children: row.map((cell, ci) => tableCell(cell, { header: ri === 0, widthDxa: columnWidths[ci] })),
    })),
  });
}

function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function blankLine() { return new Paragraph({ spacing: { after: 80 }, children: [new TextRun("")] }); }

function callout(title, body) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: border(COLOR_ACCENT), bottom: border(COLOR_ACCENT), left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_ACCENT }, right: border(COLOR_ACCENT) },
      shading: { fill: COLOR_LIGHT, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
      width: { size: 9360, type: WidthType.DXA },
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, color: COLOR_PRIMARY, size: 24 })] }),
        new Paragraph({ spacing: { before: 40 }, children: textRuns(body) }),
      ],
    })] })],
  });
}

function buildDocument({ title, subtitle, sections }) {
  const headerFooterFont = { font: FONT, size: 18, color: COLOR_MUTED };

  const docHeader = new Header({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: "SMS SaaS — School Management System", ...headerFooterFont }),
        new TextRun({ text: "\t", ...headerFooterFont }),
        new TextRun({ text: title, ...headerFooterFont, italics: true }),
      ],
    })],
  });

  const docFooter = new Footer({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: "Confidential — Prepared for stakeholder review", ...headerFooterFont }),
        new TextRun({ text: "\tPage ", ...headerFooterFont }),
        new TextRun({ children: [PageNumber.CURRENT], ...headerFooterFont }),
        new TextRun({ text: " of ", ...headerFooterFont }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], ...headerFooterFont }),
      ],
    })],
  });

  // Cover page
  const cover = [
    new Paragraph({ spacing: { before: 2400 }, children: [new TextRun("")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "School Management System", bold: true, size: 56, color: COLOR_PRIMARY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [
      new TextRun({ text: "Local-First Multi-Tenant SaaS", size: 32, color: COLOR_ACCENT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [
      new TextRun({ text: title, bold: true, size: 44 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [
      new TextRun({ text: subtitle || "", italics: true, size: 26, color: COLOR_MUTED })] }),
    new Paragraph({ spacing: { before: 1200 }, children: [new TextRun("")] }),
    tableFromRows([
      ["Field", "Value"],
      ["Project", "SMS SaaS — Local-First Multi-tenant"],
      ["Prepared by", "Product owner (sole builder)"],
      ["Document type", title],
      ["Version", "0.1 (Prototype phase)"],
      ["Date", new Date().toISOString().slice(0, 10)],
      ["Status", "Draft for stakeholder review"],
      ["Cloud target", "GCP Cloud Run + Cloud SQL · africa-south1 (Johannesburg)"],
      ["Pricing model", "Micro-access via M-Pesa STK Push + school flat fee"],
    ], [3000, 6360]),
    pageBreak(),
  ];

  return new Document({
    creator: "SMS SaaS Project",
    title,
    description: subtitle,
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: FONT, color: COLOR_PRIMARY },
          paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: FONT, color: COLOR_ACCENT },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: FONT, color: COLOR_MUTED },
          paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
        { reference: "numbers", levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [...cover, ...sections.flat()],
    }],
  });
}

module.exports = {
  Packer, P, H1, H2, H3, Bullet, Numbered, tableFromRows, pageBreak, blankLine, callout,
  buildDocument, textRuns,
};

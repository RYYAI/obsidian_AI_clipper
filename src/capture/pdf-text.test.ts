import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownContent } from 'defuddle/full';
import { describe, expect, it } from 'vitest';
import * as pdfjs from 'pdfjs-dist';
import {
	composePdfPageText,
	extractPdfPlainText,
	mightBePdfUrl,
	plainTextToHtml,
	resolveDirectPdfUrl
} from './pdf-text';

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
	path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
).href;

describe('pdf text layout', () => {
	it('joins glyphs on the same baseline and keeps the next line', () => {
		const text = composePdfPageText([
			{ str: 'Hello', transform: [1, 0, 0, 1, 100, 700], width: 40, height: 12 },
			{ str: 'world', transform: [1, 0, 0, 1, 150, 700], width: 40, height: 12 },
			{ str: 'Next', transform: [1, 0, 0, 1, 100, 680], width: 30, height: 12 }
		]);
		expect(text).toBe('Hello world\nNext');
	});

	it('breaks a paragraph when the vertical gap is large', () => {
		const text = composePdfPageText([
			{ str: '第一段', transform: [1, 0, 0, 1, 100, 700], width: 30, height: 12 },
			{ str: '第二段', transform: [1, 0, 0, 1, 100, 660], width: 30, height: 12 }
		]);
		expect(text).toBe('第一段\n\n第二段');
	});

	it('turns paragraphs into HTML the clipper can convert', () => {
		const html = plainTextToHtml('第一段\n仍在同一段\n\n第二段 <tag>');
		const markdown = createMarkdownContent(html, 'https://example.com/a.pdf');
		expect(markdown).toContain('第一段');
		expect(markdown).toContain('仍在同一段');
		expect(markdown).toContain('第二段');
		expect(html).toContain('&lt;tag&gt;');
	});
});

describe('pdf url detection', () => {
	it('treats a .pdf path and the built-in viewer as a PDF', () => {
		expect(resolveDirectPdfUrl('https://example.com/files/paper.pdf?download=1')).toBe('https://example.com/files/paper.pdf?download=1');
		expect(resolveDirectPdfUrl('chrome-extension://abc/index.html?file=https%3A%2F%2Fexample.com%2Fa.pdf')).toBe('https://example.com/a.pdf');
	});

	it('keeps suffix-less /pdf/ links as a probe', () => {
		expect(resolveDirectPdfUrl('https://arxiv.org/pdf/2401.00001')).toBeNull();
		expect(mightBePdfUrl('https://arxiv.org/pdf/2401.00001')).toBe(true);
		expect(mightBePdfUrl('https://example.com/article')).toBe(false);
	});
});

describe('pdf.js text extraction', () => {
	it('reads a text-layer PDF in order', async () => {
		const extracted = await extractPdfPlainText(buildSimplePdf('Hello PDF text layer for the browser clipper'), pdfjs as any);
		expect(extracted.text).toContain('Hello PDF text layer for the browser clipper');
		expect(extracted.truncated).toBe(false);
	});

	it('rejects a page with no text layer', async () => {
		await expect(extractPdfPlainText(buildSimplePdf(''), pdfjs as any)).rejects.toThrow('这份 PDF 没有可提取的文字层');
	});
});

function buildSimplePdf(message: string): Uint8Array {
	const safe = message.replace(/[()\\]/g, '');
	const stream = safe ? `BT\n/F1 24 Tf\n100 700 Td\n(${safe}) Tj\nET\n` : '';
	const objects = [
		'1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
		'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
		'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
		`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
		'5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
	];
	let body = '%PDF-1.4\n';
	const offsets = [0];
	for (const object of objects) {
		offsets.push(body.length);
		body += object;
	}
	const startxref = body.length;
	let xref = 'xref\n0 6\n0000000000 65535 f \n';
	for (let index = 1; index <= 5; index++) {
		xref += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
	}
	body += xref;
	body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
	return new TextEncoder().encode(body);
}

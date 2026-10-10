import browser from '../utils/browser-polyfill';

const MAX_PAGES = 60;
const MAX_CHARS = 80_000;
const MAX_BYTES = 30 * 1024 * 1024;
const MIN_TEXT_CHARS = 30;

export class NotAPdfError extends Error {
	constructor() {
		super('不是 PDF');
		this.name = 'NotAPdfError';
	}
}

export interface PdfGlyph {
	str?: string;
	transform?: number[];
	width?: number;
	height?: number;
}

interface PdfTextLine {
	y: number;
	height: number;
	parts: { x: number; str: string; end: number }[];
}

interface PdfJsModule {
	getDocument: (params: any) => {
		promise: Promise<PdfDocument>;
		destroy: () => Promise<void>;
	};
	GlobalWorkerOptions: { workerSrc: string };
}

interface PdfDocument {
	numPages: number;
	getPage: (pageNumber: number) => Promise<{
		getTextContent: () => Promise<{ items: PdfGlyph[] }>;
		cleanup: () => void;
	}>;
	getMetadata: () => Promise<{ info?: { Title?: string; Author?: string } }>;
	destroy: () => Promise<void>;
}

export interface PdfPlainText {
	title: string;
	author: string;
	text: string;
	truncated: boolean;
}

export interface PdfDocumentContent extends PdfPlainText {
	html: string;
	description: string;
	domain: string;
	wordCount: number;
	parseTime: number;
}

export function isPdfViewerUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'chrome-extension:' && parsed.protocol !== 'moz-extension:' && parsed.protocol !== 'edge:') {
			return false;
		}
		return Boolean(parsed.searchParams.get('file') || parsed.searchParams.get('src'));
	} catch {
		return false;
	}
}

/** Direct PDF locations, including the built-in viewer wrapper. Other /pdf/ paths stay a probe. */
export function resolveDirectPdfUrl(tabUrl: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(tabUrl);
	} catch {
		return null;
	}

	if (parsed.protocol === 'chrome-extension:' || parsed.protocol === 'moz-extension:' || parsed.protocol === 'edge:') {
		const file = parsed.searchParams.get('file') || parsed.searchParams.get('src');
		return file || null;
	}

	if (parsed.pathname.toLowerCase().endsWith('.pdf')) return tabUrl;
	return null;
}

export function mightBePdfUrl(tabUrl: string): boolean {
	try {
		return /\/pdf(\/|$)/i.test(new URL(tabUrl).pathname);
	} catch {
		return false;
	}
}

/**
 * Reading order is top to bottom, then left to right on each line.
 * A wide vertical gap becomes a paragraph. Multi-column pages stay approximate.
 */
export function composePdfPageText(items: PdfGlyph[]): string {
	const lines: PdfTextLine[] = [];
	for (const item of items) {
		if (!item.str || !item.transform || item.transform.length < 6) continue;
		const x = item.transform[4];
		const y = item.transform[5];
		let line = lines.find(existing => Math.abs(existing.y - y) <= 2);
		if (!line) {
			line = { y, height: item.height || 12, parts: [] };
			lines.push(line);
		}
		line.height = Math.max(line.height, item.height || 0);
		line.parts.push({ x, str: item.str, end: x + (item.width || 0) });
	}
	if (!lines.length) return '';

	lines.sort((a, b) => b.y - a.y);
	const paragraphs: string[] = [];
	let current: string[] = [];
	let previous: PdfTextLine | null = null;
	for (const line of lines) {
		const text = joinLine(line.parts);
		if (!text) continue;
		if (previous && previous.y - line.y > Math.max(previous.height, line.height, 8) * 1.8) {
			paragraphs.push(current.join('\n'));
			current = [];
		}
		current.push(text);
		previous = line;
	}
	if (current.length) paragraphs.push(current.join('\n'));
	return paragraphs.join('\n\n').trim();
}

export function plainTextToHtml(text: string): string {
	return text
		.split(/\n{2,}/)
		.map(paragraph => paragraph.trim())
		.filter(Boolean)
		.map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

export async function extractPdfPlainText(
	data: Uint8Array,
	pdfjs: PdfJsModule,
	assets: { cMapUrl?: string; standardFontDataUrl?: string } = {}
): Promise<PdfPlainText> {
	const task = pdfjs.getDocument({
		data,
		isEvalSupported: false,
		useSystemFonts: true,
		cMapUrl: assets.cMapUrl,
		cMapPacked: true,
		standardFontDataUrl: assets.standardFontDataUrl,
		verbosity: 0
	});

	try {
		const pdf = await task.promise;
		try {
			const metadata = await pdf.getMetadata().catch(() => null);
			const info = (metadata?.info ?? {}) as { Title?: string; Author?: string };
			const pageCount = Math.min(pdf.numPages, MAX_PAGES);
			let truncated = pdf.numPages > MAX_PAGES;
			const chunks: string[] = [];
			let chars = 0;

			for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
				const page = await pdf.getPage(pageNumber);
				try {
					const content = await page.getTextContent();
					const pageText = composePdfPageText(content.items);
					if (!pageText) continue;
					if (chars + pageText.length > MAX_CHARS) {
						const remaining = MAX_CHARS - chars;
						if (remaining > 0) chunks.push(pageText.slice(0, remaining));
						truncated = true;
						break;
					}
					chunks.push(pageText);
					chars += pageText.length + 2;
				} finally {
					page.cleanup();
				}
			}

			let text = chunks.join('\n\n').trim();
			if (meaningfulLength(text) < MIN_TEXT_CHARS) {
				throw new Error('这份 PDF 没有可提取的文字层');
			}
			if (truncated) text += '\n\n[后面的页面已截断]';

			return {
				title: cleanMeta(info.Title),
				author: cleanMeta(info.Author),
				text,
				truncated
			};
		} finally {
			await pdf.destroy();
		}
	} catch (error) {
		await task.destroy().catch(() => undefined);
		throw mapPdfError(error);
	}
}

export async function readPdfContent(pageUrl: string, options: { probe?: boolean } = {}): Promise<PdfDocumentContent> {
	const started = Date.now();
	const bytes = await fetchPdfBytes(pageUrl, options.probe === true);
	const pdfjs = await loadExtensionPdfJs();
	const extracted = await extractPdfPlainText(bytes, pdfjs, {
		cMapUrl: browser.runtime.getURL('pdfjs/cmaps/'),
		standardFontDataUrl: browser.runtime.getURL('pdfjs/standard_fonts/')
	});
	const title = extracted.title || titleFromPdfUrl(pageUrl);
	const description = extracted.text.replace(/\s+/g, ' ').slice(0, 180);
	return {
		...extracted,
		title,
		html: plainTextToHtml(extracted.text),
		description,
		domain: domainFromUrl(pageUrl),
		wordCount: countWords(extracted.text),
		parseTime: Date.now() - started
	};
}

function joinLine(parts: { x: number; str: string; end: number }[]): string {
	const ordered = [...parts].sort((a, b) => a.x - b.x);
	let line = '';
	let cursor = 0;
	ordered.forEach((part, index) => {
		if (index > 0 && part.x > cursor + 1 && !line.endsWith(' ') && !part.str.startsWith(' ')) {
			line += ' ';
		}
		line += part.str;
		cursor = Math.max(cursor, part.end || part.x);
	});
	return line.replace(/[ \t]{2,}/g, ' ').trim();
}

async function loadExtensionPdfJs(): Promise<PdfJsModule> {
	const moduleUrl = browser.runtime.getURL('pdf.min.mjs');
	try {
		const pdfjs = await import(/* webpackIgnore: true */ moduleUrl) as PdfJsModule;
		pdfjs.GlobalWorkerOptions.workerSrc = browser.runtime.getURL('pdf.worker.min.mjs');
		return pdfjs;
	} catch (error) {
		console.error('Failed to load pdf.js', error);
		throw new Error('无法加载 PDF 解析器，请重新加载扩展后再试。');
	}
}

async function fetchPdfBytes(url: string, probe: boolean): Promise<Uint8Array> {
	if (url.startsWith('file:')) {
		throw new Error('无法读取这个 PDF，请用 http(s) 链接打开');
	}

	let response: Response;
	try {
		response = await fetch(url, { credentials: 'include' });
	} catch {
		throw new Error('无法读取这个 PDF，请用 http(s) 链接打开');
	}
	if (!response.ok) {
		throw new Error(`无法读取 PDF（HTTP ${response.status}）`);
	}

	const contentType = (response.headers.get('content-type') || '').toLowerCase();
	if (contentType.includes('text/html')) {
		throw probe ? new NotAPdfError() : new Error('无法读取这个 PDF。页面没有返回 PDF 文件，可能需要先登录。');
	}

	const declaredLength = Number(response.headers.get('content-length') || 0);
	if (declaredLength > MAX_BYTES) {
		throw new Error('这份 PDF 太大，暂时只处理 30MB 以内的文件。');
	}

	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.byteLength > MAX_BYTES) {
		throw new Error('这份 PDF 太大，暂时只处理 30MB 以内的文件。');
	}
	if (!isPdfBytes(bytes)) {
		throw probe ? new NotAPdfError() : new Error('无法读取这个 PDF。页面没有返回 PDF 文件，可能需要先登录。');
	}
	return bytes;
}

function isPdfBytes(bytes: Uint8Array): boolean {
	return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function meaningfulLength(text: string): number {
	return text.replace(/\s/g, '').length;
}

function cleanMeta(value: unknown): string {
	return typeof value === 'string' ? value.replace(/\0/g, '').trim() : '';
}

function titleFromPdfUrl(url: string): string {
	try {
		const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
		const title = name.replace(/\.pdf$/i, '').trim();
		return title || 'PDF';
	} catch {
		return 'PDF';
	}
}

function domainFromUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.protocol === 'file:') return 'local';
		return parsed.hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

function countWords(text: string): number {
	const cjk = text.match(/[\u3400-\u9FFF]/g)?.length ?? 0;
	const words = text.replace(/[\u3400-\u9FFF]/g, ' ').split(/\s+/).filter(Boolean).length;
	return cjk + words;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function mapPdfError(error: unknown): Error {
	if (!(error instanceof Error)) return new Error('无法解析这个 PDF');
	if (error.message === '这份 PDF 没有可提取的文字层' || error.message.startsWith('这份 PDF')) return error;
	const name = error.name || '';
	if (name === 'PasswordException' || /password/i.test(error.message)) {
		return new Error('这份 PDF 受密码保护，无法提取文字');
	}
	if (name === 'InvalidPDFException') {
		return new Error('无法解析这个 PDF');
	}
	return error;
}

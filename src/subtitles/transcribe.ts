import { loadSettings, generalSettings } from '../utils/storage-utils';

export interface TranscribePayload {
	sourceUrl?: string;
	audioUrl?: string;
	referrer?: string;
	filename?: string;
	title?: string;
	pageUrl?: string;
	platform?: string;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function extractTranscriptText(data: any): string {
	if (!data || typeof data !== 'object') return '';
	if (typeof data.text === 'string' && data.text.trim()) return data.text.trim();
	if (Array.isArray(data.transcripts)) {
		return data.transcripts
			.map((item: any) => (item && typeof item.text === 'string' ? item.text.trim() : ''))
			.filter(Boolean)
			.join('\n\n');
	}
	return '';
}

export async function transcribeAudio(payload: TranscribePayload, onProgress?: (message: string) => void): Promise<string> {
	await loadSettings();
	const settings = generalSettings.captureSettings;
	const apiKey = (settings.elevenLabsApiKey || '').trim();
	if (!apiKey) throw new Error('NO_API_KEY');

	const apiBase = (settings.elevenLabsApiBase || 'https://api.elevenlabs.io').replace(/\/+$/, '');
	const form = new FormData();
	form.append('model_id', settings.elevenLabsModelId || 'scribe_v2');
	form.append('tag_audio_events', 'false');
	if (settings.languageCode) form.append('language_code', settings.languageCode);

	if (payload.sourceUrl) {
		form.append('source_url', payload.sourceUrl);
		onProgress?.('已提交 YouTube 链接，正在等待 ElevenLabs 返回转写…');
	} else if (payload.audioUrl) {
		onProgress?.('正在下载音频并提交 ElevenLabs…');
		const file = await downloadAudioFile(payload.audioUrl, payload.referrer, payload.filename);
		form.append('file', file, file.name);
	} else {
		throw new Error('没有可识别的音频');
	}

	const response = await fetch(`${apiBase}/v1/speech-to-text`, {
		method: 'POST',
		headers: { 'xi-api-key': apiKey },
		body: form
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok && response.status !== 202) {
		throw new Error(extractElevenLabsError(data, response.status));
	}
	return resolveTranscriptText(apiBase, apiKey, data, onProgress);
}

async function resolveTranscriptText(apiBase: string, apiKey: string, data: any, onProgress?: (message: string) => void): Promise<string> {
	const immediate = extractTranscriptText(data);
	if (immediate) return immediate;

	const transcriptionId = data && data.transcription_id;
	if (!transcriptionId) {
		throw new Error('ElevenLabs 没有返回转写正文');
	}

	onProgress?.('ElevenLabs 仍在转写，正在获取结果…');
	const deadline = Date.now() + 12 * 60 * 1000;
	while (Date.now() < deadline) {
		await sleep(5000);
		const response = await fetch(
			`${apiBase}/v1/speech-to-text/transcripts/${encodeURIComponent(transcriptionId)}`,
			{ headers: { 'xi-api-key': apiKey } }
		);
		const body = await response.json().catch(() => ({}));
		if (response.status === 404 || response.status === 425) continue;
		if (!response.ok) throw new Error(extractElevenLabsError(body, response.status));
		const text = extractTranscriptText(body);
		if (text) return text;
	}
	throw new Error('等待转写结果超时，请稍后重试');
}

async function downloadAudioFile(url: string, referrer?: string, filename?: string): Promise<File> {
	const headers: Record<string, string> = {};
	if (referrer) {
		headers.Referer = referrer;
		try {
			headers.Origin = new URL(referrer).origin;
		} catch {
			// Ignore a malformed referrer.
		}
	}
	const response = await fetch(url, { headers, credentials: 'omit' });
	if (!response.ok) throw new Error(`音频下载失败 HTTP ${response.status}`);
	const buffer = await response.arrayBuffer();
	if (!buffer.byteLength) throw new Error('音频内容为空');
	const type = response.headers.get('content-type') || guessMime(filename);
	const name = normalizeUploadName(filename, type);
	return new File([buffer], name, { type: guessMime(name) });
}

function guessMime(filename?: string): string {
	if (!filename) return 'application/octet-stream';
	if (filename.endsWith('.m4a') || filename.endsWith('.m4s') || filename.endsWith('.mp4')) return 'audio/mp4';
	if (filename.endsWith('.webm')) return 'audio/webm';
	if (filename.endsWith('.mp3')) return 'audio/mpeg';
	return 'application/octet-stream';
}

function guessFilename(mime?: string): string {
	if ((mime || '').includes('webm')) return 'audio.webm';
	if ((mime || '').includes('mpeg') || (mime || '').includes('mp3')) return 'audio.mp3';
	if ((mime || '').includes('mp4') || (mime || '').includes('m4a') || (mime || '').includes('aac')) return 'audio.m4a';
	return 'audio.m4a';
}

function normalizeUploadName(filename: string | undefined, mime: string): string {
	const raw = (filename || '').toLowerCase();
	if (raw.endsWith('.m4s') || raw.endsWith('.mp4') || raw.endsWith('.aac')) return 'audio.m4a';
	if (raw.endsWith('.webm')) return 'audio.webm';
	if (raw.endsWith('.mp3')) return 'audio.mp3';
	if (raw.endsWith('.m4a') || raw.endsWith('.wav') || raw.endsWith('.ogg') || raw.endsWith('.flac')) return filename || 'audio.m4a';
	return guessFilename(mime);
}

function extractElevenLabsError(data: any, status: number): string {
	const detail = data && data.detail;
	if (typeof detail === 'string' && detail.trim()) return detail;
	if (detail && typeof detail.message === 'string' && detail.message.trim()) return detail.message;
	if (Array.isArray(detail) && detail[0] && detail[0].msg) return detail[0].msg;
	if (data && typeof data.message === 'string' && data.message.trim() && !data.request_id) return data.message.trim();
	if (status === 401) return 'ElevenLabs API Key 无效';
	if (status === 429) return 'ElevenLabs 请求过于频繁，请稍后再试';
	return `ElevenLabs HTTP ${status}`;
}

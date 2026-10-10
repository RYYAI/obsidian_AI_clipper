import browser from '../utils/browser-polyfill';
import { loadSettings, generalSettings } from '../utils/storage-utils';
import { saveSubtitleCapture } from '../capture/save';
import { transcribeAudio } from './transcribe';

const PAGE_SOURCE = 'sub-copier-page';
const BRIDGE_SOURCE = 'sub-copier-bridge';

window.addEventListener('message', (event: MessageEvent) => {
	if (event.source !== window) return;
	const data = event.data;
	if (!data || data.source !== PAGE_SOURCE || !data.requestId || !data.type) return;

	const post = (payload: Record<string, unknown>) => {
		window.postMessage({ source: BRIDGE_SOURCE, requestId: data.requestId, ...payload }, '*');
	};

	void handlePageMessage(data, post);
});

async function handlePageMessage(
	data: { type: string; requestId: string; payload?: any },
	post: (payload: Record<string, unknown>) => void
): Promise<void> {
	try {
		if (data.type === 'HAS_API_KEY') {
			await loadSettings();
			post({
				ok: true,
				result: { configured: Boolean(generalSettings.captureSettings.elevenLabsApiKey.trim()) }
			});
			return;
		}

		if (data.type === 'OPEN_OPTIONS') {
			await browser.runtime.sendMessage({ action: 'openSettings', section: 'capture' });
			post({ ok: true, result: true });
			return;
		}

		if (data.type === 'TRANSCRIBE') {
			const payload = data.payload || {};
			post({
				progress: payload.sourceUrl
					? '已提交 YouTube 链接，正在等待 ElevenLabs 返回转写…'
					: '正在提交音频给 ElevenLabs…'
			});
			const text = await transcribeAudio(payload, (message) => post({ progress: message }));
			const saved = await saveSubtitleCapture({
				text,
				title: payload.title,
				pageUrl: payload.pageUrl || payload.sourceUrl,
				platform: payload.platform,
				engine: 'elevenlabs'
			});
			post({ ok: true, result: saved });
			return;
		}

		if (data.type === 'SAVE_CAPTURE') {
			post({ progress: '正在保存到 Obsidian…' });
			const saved = await saveSubtitleCapture(data.payload || {});
			post({ ok: true, result: saved });
			return;
		}

		throw new Error('未知的字幕消息');
	} catch (error) {
		post({
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

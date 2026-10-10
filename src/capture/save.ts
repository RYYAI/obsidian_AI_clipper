import { loadSettings, generalSettings } from '../utils/storage-utils';
import { saveToObsidian } from '../utils/obsidian-note-creator';
import { completeAsMarkdown, resolveEnabledModel } from './llm';
import { buildCaptureMarkdown, buildSubtitleNoteName, composeProcessedBody, resolveInstruction } from './note';

export interface SubtitlePayload {
	text: string;
	title?: string;
	pageUrl?: string;
	platform?: string;
	engine?: string;
}

export async function saveSubtitleCapture(payload: SubtitlePayload): Promise<{ message: string; path: string }> {
	await loadSettings();
	const text = typeof payload.text === 'string' ? payload.text.trim() : '';
	if (!text) throw new Error('没有可保存的字幕内容');

	const capture = generalSettings.captureSettings;
	const processed = await applyInstruction(text, capture.subtitleInstructionId);
	const title = (payload.title || '未命名视频').trim();
	const markdown = buildCaptureMarkdown({
		title,
		pageUrl: payload.pageUrl || '',
		platform: payload.platform || '',
		engine: payload.engine || '',
		instructionName: processed.instructionName,
		body: processed.body
	});
	const noteName = buildSubtitleNoteName(title);
	const folder = capture.subtitleFolder.replace(/^\/+|\/+$/g, '') || 'Clippings/Subtitles';
	const vault = capture.subtitleVault || '';
	await saveToObsidian(markdown, noteName, folder, vault, 'create', { quiet: true, forceClipboard: true });
	const where = vault ? `${vault} / ${folder}/${noteName}` : `${folder}/${noteName}`;
	return { message: `已保存到 Obsidian：${where}`, path: `${folder}/${noteName}` };
}

export async function applyClipInstruction(content: string, instructionId: string): Promise<string> {
	await loadSettings();
	const processed = await applyInstruction(content, instructionId);
	return processed.body;
}

async function applyInstruction(content: string, instructionId: string): Promise<{ body: string; instructionName: string }> {
	const capture = generalSettings.captureSettings;
	const instruction = resolveInstruction(capture.instructions, instructionId);
	if (!instruction) {
		return { body: content.trim(), instructionName: '' };
	}
	const model = resolveEnabledModel();
	if (!model) {
		throw new Error('已选择 AI 指令，但还没有可用模型。请先在「解释器」里添加模型并填写 API Key。');
	}
	const ai = await completeAsMarkdown(instruction.prompt, content, model);
	return {
		body: composeProcessedBody(content, ai, capture.keepOriginal),
		instructionName: instruction.name
	};
}

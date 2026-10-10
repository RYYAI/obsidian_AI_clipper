import { AiInstruction } from '../types/types';

export function resolveInstruction(instructions: AiInstruction[], instructionId: string): AiInstruction | null {
	if (!instructionId) return null;
	const found = instructions.find(item => item.id === instructionId);
	if (!found || !found.prompt.trim()) return null;
	return found;
}

export function composeProcessedBody(original: string, aiText: string, keepOriginal: boolean): string {
	const ai = aiText.trim();
	const source = original.trim();
	if (!keepOriginal) return ai;
	return `${ai}\n\n---\n\n## 原文\n\n${source}`;
}

export function platformLabel(platform: string): string {
	if (platform === 'youtube') return 'YouTube';
	if (platform === 'bilibili') return 'Bilibili';
	return platform;
}

export function engineLabel(engine: string): string {
	if (engine === 'elevenlabs') return 'ElevenLabs';
	if (engine === 'captions') return 'CC 字幕';
	return engine;
}

export function buildSubtitleNoteName(title: string, now = new Date()): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}${pad(now.getMinutes())}`;
	const base = String(title || '')
		.replace(/[\\/:*?"<>|#^[\]^]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
	return `${base || '字幕'} ${stamp}`;
}

export function buildCaptureMarkdown(input: {
	title: string;
	pageUrl: string;
	platform?: string;
	engine?: string;
	instructionName?: string;
	body: string;
	now?: Date;
}): string {
	const now = input.now || new Date();
	const pad = (value: number) => String(value).padStart(2, '0');
	const when = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
	const site = platformLabel(input.platform || '');
	const engine = engineLabel(input.engine || '');
	const lines = [
		'---',
		`source: "${(input.pageUrl || '').replace(/"/g, '\\"')}"`,
		site ? `platform: "${site}"` : null,
		engine ? `engine: "${engine}"` : null,
		input.instructionName ? `instruction: "${input.instructionName.replace(/"/g, '\\"')}"` : null,
		`saved: "${when}"`,
		'---',
		'',
		`# ${input.title || '未命名'}`,
		'',
		input.body.trim(),
		''
	];
	return lines.filter(line => line !== null).join('\n');
}

import { describe, expect, it } from 'vitest';
import { buildCaptureMarkdown, composeProcessedBody, resolveInstruction } from './note';

describe('capture notes', () => {
	it('returns the selected instruction only when it has a prompt', () => {
		const instructions = [
			{ id: 'summary', name: '总结要点', prompt: '总结' },
			{ id: 'empty', name: '空', prompt: '   ' }
		];
		expect(resolveInstruction(instructions, '')).toBeNull();
		expect(resolveInstruction(instructions, 'missing')).toBeNull();
		expect(resolveInstruction(instructions, 'empty')).toBeNull();
		expect(resolveInstruction(instructions, 'summary')?.name).toBe('总结要点');
	});

	it('keeps the source under the model output when asked', () => {
		expect(composeProcessedBody('原文', '要点', false)).toBe('要点');
		expect(composeProcessedBody('原文', '要点', true)).toContain('## 原文');
		expect(composeProcessedBody('原文', '要点', true)).toContain('要点');
	});

	it('writes source metadata into the note', () => {
		const markdown = buildCaptureMarkdown({
			title: '示例视频',
			pageUrl: 'https://www.bilibili.com/video/BV1',
			platform: 'bilibili',
			engine: 'captions',
			instructionName: '总结要点',
			body: '- 要点',
			now: new Date('2026-10-10T09:50:00')
		});
		expect(markdown).toContain('platform: "Bilibili"');
		expect(markdown).toContain('engine: "CC 字幕"');
		expect(markdown).toContain('# 示例视频');
		expect(markdown).toContain('- 要点');
	});
});

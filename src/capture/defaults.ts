import { AiInstruction, CaptureSettings } from '../types/types';

export const SUMMARY_INSTRUCTION_ID = 'summary';

export function defaultInstructions(): AiInstruction[] {
	return [
		{
			id: SUMMARY_INSTRUCTION_ID,
			name: '总结要点',
			prompt: '请用中文总结以下内容的要点。使用 Markdown 无序列表，保留关键事实、数字、人名和结论。不要编造原文没有的信息，不要复述全文。'
		}
	];
}

export function defaultCaptureSettings(): CaptureSettings {
	return {
		subtitleFolder: 'Clippings/Subtitles',
		subtitleVault: '',
		elevenLabsApiKey: '',
		elevenLabsApiBase: 'https://api.elevenlabs.io',
		elevenLabsModelId: 'scribe_v2',
		languageCode: '',
		keepOriginal: true,
		subtitleInstructionId: '',
		clipInstructionId: '',
		instructions: defaultInstructions()
	};
}

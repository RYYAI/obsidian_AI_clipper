import { generalSettings } from '../utils/storage-utils';
import { ModelConfig, Provider } from '../types/types';

const SOURCE_LIMIT = 80000;

export function resolveEnabledModel(): ModelConfig | null {
	const enabled = generalSettings.models.filter(model => model && model.enabled);
	if (enabled.length === 0) return null;
	return enabled.find(model => model.id === generalSettings.interpreterModel) || enabled[0];
}

export async function completeAsMarkdown(instruction: string, source: string, model: ModelConfig): Promise<string> {
	const provider = generalSettings.providers.find(item => item.id === model.providerId);
	if (!provider) {
		throw new Error(`找不到模型 ${model.name} 对应的服务商`);
	}
	if (provider.apiKeyRequired !== false && !provider.apiKey) {
		throw new Error(`请先在解释器里填写 ${provider.name} 的 API Key`);
	}

	let clipped = source;
	if (source.length > SOURCE_LIMIT) {
		clipped = `${source.slice(0, SOURCE_LIMIT)}\n\n[后面的内容已截断]`;
	}

	const system = '你在为 Obsidian 笔记处理材料。严格按用户指令输出 Markdown。不要把整篇回答包进代码块，不要编造材料里没有的事实。';
	const user = `${instruction.trim()}\n\n---\n\n${clipped}`;
	return requestProviderText(provider, model, system, user);
}

async function requestProviderText(provider: Provider, model: ModelConfig, system: string, user: string): Promise<string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	};
	let requestUrl = provider.baseUrl;
	let requestBody: Record<string, unknown> = {};
	const name = provider.name.toLowerCase();

	if (name.includes('hugging')) {
		requestUrl = provider.baseUrl.replace('{model-id}', model.providerModelId);
		requestBody = {
			model: model.providerModelId,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			max_tokens: 4000,
			stream: false
		};
		headers.Authorization = `Bearer ${provider.apiKey}`;
	} else if (provider.baseUrl.includes('openai.azure.com')) {
		requestUrl = provider.baseUrl.replace('{deployment-id}', model.providerModelId);
		requestBody = {
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			max_completion_tokens: 8000,
			stream: false
		};
		headers['api-key'] = provider.apiKey;
	} else if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
		requestUrl = provider.baseUrl.includes('{model-id}')
			? provider.baseUrl.replace('{model-id}', model.providerModelId)
			: `https://generativelanguage.googleapis.com/v1beta/models/${model.providerModelId}:generateContent`;
		requestBody = {
			systemInstruction: { parts: [{ text: system }] },
			contents: [{ role: 'user', parts: [{ text: user }] }],
			generationConfig: { maxOutputTokens: 8000 }
		};
		headers['X-goog-api-key'] = provider.apiKey;
	} else if (name.includes('anthropic')) {
		requestBody = {
			model: model.providerModelId,
			max_tokens: 8000,
			system,
			messages: [{ role: 'user', content: user }]
		};
		headers['x-api-key'] = provider.apiKey;
		headers['anthropic-version'] = '2023-06-01';
		headers['anthropic-dangerous-direct-browser-access'] = 'true';
	} else if (name.includes('ollama')) {
		requestBody = {
			model: model.providerModelId,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			stream: false
		};
	} else {
		requestBody = {
			model: model.providerModelId,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			stream: false
		};
		if (provider.apiKey) {
			headers.Authorization = `Bearer ${provider.apiKey}`;
			headers['HTTP-Referer'] = 'https://obsidian.md/';
			headers['X-Title'] = 'Obsidian Web Clipper';
		}
	}

	const response = await fetch(requestUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify(requestBody)
	});
	const responseText = await response.text();
	if (!response.ok) {
		throw new Error(`${provider.name} 请求失败：${response.status} ${responseText.slice(0, 300)}`);
	}

	let data: any;
	try {
		data = JSON.parse(responseText);
	} catch {
		throw new Error(`${provider.name} 返回的不是 JSON`);
	}

	const text = extractText(provider, data);
	if (!text.trim()) {
		throw new Error(`${provider.name} 没有返回文本`);
	}
	return text.trim();
}

function extractText(provider: Provider, data: any): string {
	const name = provider.name.toLowerCase();
	if (name.includes('anthropic')) {
		const blocks = Array.isArray(data.content) ? data.content : [];
		return blocks.filter((block: any) => block.type === 'text').map((block: any) => block.text || '').join('\n');
	}
	if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
		const parts = data.candidates?.[0]?.content?.parts;
		return Array.isArray(parts) ? parts.map((part: any) => part.text || '').join('') : '';
	}
	if (name.includes('ollama')) {
		return data.message?.content || '';
	}
	return data.choices?.[0]?.message?.content || '';
}

import { generalSettings, loadSettings, saveSettings } from '../utils/storage-utils';
import { AiInstruction } from '../types/types';
import { debounce } from '../utils/debounce';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function initializeCaptureSettings(): Promise<void> {
	await loadSettings();
	const form = document.getElementById('capture-settings-form');
	if (!form) return;

	renderCaptureForm();

	const scheduleSave = debounce(() => {
		readCaptureForm();
		renderInstructionSelects();
		void saveSettings().then(() => setStatus('已保存'));
	}, 400);

	form.addEventListener('input', () => scheduleSave());
	form.addEventListener('change', () => scheduleSave());

	document.getElementById('capture-add-instruction')?.addEventListener('click', () => {
		readCaptureForm();
		generalSettings.captureSettings.instructions.push({
			id: `instruction-${Date.now().toString(36)}`,
			name: '新指令',
			prompt: '请按我的要求处理下面的内容，并用 Markdown 输出。'
		});
		renderInstructionList();
		renderInstructionSelects();
		void saveSettings().then(() => setStatus('已保存'));
	});

	document.getElementById('capture-instruction-list')?.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		const remove = target.closest('.capture-instruction-remove') as HTMLElement | null;
		if (!remove) return;
		const id = remove.dataset.id;
		if (!id) return;
		readCaptureForm();
		generalSettings.captureSettings.instructions = generalSettings.captureSettings.instructions.filter(item => item.id !== id);
		if (generalSettings.captureSettings.subtitleInstructionId === id) {
			generalSettings.captureSettings.subtitleInstructionId = '';
		}
		if (generalSettings.captureSettings.clipInstructionId === id) {
			generalSettings.captureSettings.clipInstructionId = '';
		}
		renderInstructionList();
		renderInstructionSelects();
		void saveSettings().then(() => setStatus('已保存'));
	});

	if (saveTimer) clearTimeout(saveTimer);
}

function renderCaptureForm(): void {
	const capture = generalSettings.captureSettings;
	setValue('capture-subtitle-folder', capture.subtitleFolder);
	setValue('capture-elevenlabs-key', capture.elevenLabsApiKey);
	setValue('capture-elevenlabs-base', capture.elevenLabsApiBase);
	setValue('capture-elevenlabs-model', capture.elevenLabsModelId);
	setValue('capture-language', capture.languageCode);
	const keep = document.getElementById('capture-keep-original') as HTMLInputElement | null;
	if (keep) keep.checked = capture.keepOriginal;
	renderVaultSelect();
	renderInstructionList();
	renderInstructionSelects();
}

function renderVaultSelect(): void {
	const select = document.getElementById('capture-subtitle-vault') as HTMLSelectElement | null;
	if (!select) return;
	select.textContent = '';
	const current = document.createElement('option');
	current.value = '';
	current.textContent = '当前打开的仓库';
	select.appendChild(current);
	for (const vault of generalSettings.vaults) {
		const option = document.createElement('option');
		option.value = vault;
		option.textContent = vault;
		select.appendChild(option);
	}
	select.value = generalSettings.captureSettings.subtitleVault || '';
}

function renderInstructionList(): void {
	const list = document.getElementById('capture-instruction-list');
	if (!list) return;
	list.textContent = '';
	for (const instruction of generalSettings.captureSettings.instructions) {
		list.appendChild(renderInstruction(instruction));
	}
}

function renderInstruction(instruction: AiInstruction): HTMLElement {
	const wrap = document.createElement('div');
	wrap.className = 'capture-instruction';
	wrap.dataset.id = instruction.id;

	const name = document.createElement('input');
	name.className = 'capture-instruction-name';
	name.value = instruction.name;
	name.placeholder = '指令名称';
	name.spellcheck = false;

	const prompt = document.createElement('textarea');
	prompt.className = 'capture-instruction-prompt';
	prompt.value = instruction.prompt;
	prompt.rows = 4;
	prompt.placeholder = '告诉模型如何处理字幕或网页正文';

	const remove = document.createElement('button');
	remove.type = 'button';
	remove.className = 'capture-instruction-remove';
	remove.dataset.id = instruction.id;
	remove.textContent = '删除';

	wrap.append(name, prompt, remove);
	return wrap;
}

function renderInstructionSelects(): void {
	fillInstructionSelect('capture-subtitle-instruction', generalSettings.captureSettings.subtitleInstructionId, '不处理，只保存原文');
	fillInstructionSelect('capture-clip-instruction', generalSettings.captureSettings.clipInstructionId, '不使用 AI');
}

function fillInstructionSelect(id: string, selected: string, emptyLabel: string): void {
	const select = document.getElementById(id) as HTMLSelectElement | null;
	if (!select) return;
	select.textContent = '';
	const empty = document.createElement('option');
	empty.value = '';
	empty.textContent = emptyLabel;
	select.appendChild(empty);
	for (const instruction of generalSettings.captureSettings.instructions) {
		const option = document.createElement('option');
		option.value = instruction.id;
		option.textContent = instruction.name || '未命名指令';
		select.appendChild(option);
	}
	select.value = generalSettings.captureSettings.instructions.some(item => item.id === selected) ? selected : '';
}

function readCaptureForm(): void {
	const capture = generalSettings.captureSettings;
	capture.subtitleFolder = readValue('capture-subtitle-folder') || 'Clippings/Subtitles';
	capture.subtitleVault = readValue('capture-subtitle-vault');
	capture.elevenLabsApiKey = readValue('capture-elevenlabs-key');
	capture.elevenLabsApiBase = readValue('capture-elevenlabs-base') || 'https://api.elevenlabs.io';
	capture.elevenLabsModelId = readValue('capture-elevenlabs-model') || 'scribe_v2';
	capture.languageCode = readValue('capture-language');
	capture.keepOriginal = Boolean((document.getElementById('capture-keep-original') as HTMLInputElement | null)?.checked);
	capture.subtitleInstructionId = readValue('capture-subtitle-instruction');
	capture.clipInstructionId = readValue('capture-clip-instruction');
	capture.instructions = Array.from(document.querySelectorAll('.capture-instruction')).map(element => {
		const row = element as HTMLElement;
		return {
			id: row.dataset.id || `instruction-${Date.now().toString(36)}`,
			name: (row.querySelector('.capture-instruction-name') as HTMLInputElement).value.trim() || '未命名指令',
			prompt: (row.querySelector('.capture-instruction-prompt') as HTMLTextAreaElement).value
		};
	});
}

function readValue(id: string): string {
	const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
	return element ? element.value.trim() : '';
}

function setValue(id: string, value: string): void {
	const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
	if (element) element.value = value || '';
}

function setStatus(message: string): void {
	const status = document.getElementById('capture-status');
	if (!status) return;
	status.textContent = message;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		status.textContent = '';
	}, 1600);
}

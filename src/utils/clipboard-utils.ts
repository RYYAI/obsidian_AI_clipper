import browser from './browser-polyfill';

/**
 * Attempts to copy text to clipboard using multiple fallback methods.
 * This is particularly useful in iframe contexts where the standard Clipboard API may be blocked.
 *
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fall through to a DOM copy, then the content-script fallback.
	}

	try {
		if (typeof document !== 'undefined' && document.body) {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.setAttribute('readonly', '');
			textArea.style.position = 'fixed';
			textArea.style.left = '-9999px';
			document.body.appendChild(textArea);
			textArea.select();
			const ok = document.execCommand('copy');
			textArea.remove();
			if (ok) return true;
		}
	} catch {
		// Fall through to content script fallback
	}

	try {
		const response = await browser.runtime.sendMessage({
			action: 'copy-to-clipboard',
			text: text
		}) as { success: boolean; error?: string } | undefined;

		if (response && response.success) {
			return true;
		} else {
			console.error('Content script clipboard fallback failed:', response?.error);
			return false;
		}
	} catch (contentScriptError) {
		console.error('All clipboard methods failed:', contentScriptError);
		return false;
	}
}
/* ============================================================
 * 轻量级 MD5 实现 (WBI 签名需要，crypto.subtle 不支持 MD5)
 * ============================================================ */
const md5 = (function () {
    function safeAdd(x, y) {
        const lsw = (x & 0xffff) + (y & 0xffff);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
    }
    function bitRol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }
    function cmn(q, a, b, x, s, t) {
        return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

    function coreMD5(x, len) {
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
        for (let i = 0; i < x.length; i += 16) {
            const olda = a, oldb = b, oldc = c, oldd = d;
            a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
            a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
            a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
            a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222);
            c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
            a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
        }
        return [a, b, c, d];
    }
    function str2blks(str) {
        const bin = [];
        const mask = (1 << 8) - 1;
        for (let i = 0; i < str.length * 8; i += 8) {
            bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
        }
        return bin;
    }
    function binl2hex(binarray) {
        const hexTab = '0123456789abcdef';
        let str = '';
        for (let i = 0; i < binarray.length * 4; i++) {
            str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) +
                hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf);
        }
        return str;
    }
    return function (str) {
        // UTF-8 编码后再计算，保证中文/特殊字符正确
        const utf8 = unescape(encodeURIComponent(str));
        return binl2hex(coreMD5(str2blks(utf8), utf8.length * 8));
    };
})();

/* ============================================================
 * WBI 签名
 * ============================================================ */
const MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
];

function getMixinKey(orig) {
    return MIXIN_KEY_ENC_TAB.map(n => orig[n]).join('').slice(0, 32);
}

let wbiKeysCache = null;

async function getWbiKeys() {
    if (wbiKeysCache) return wbiKeysCache;
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', { credentials: 'include' });
    const json = await res.json();
    const imgUrl = json.data.wbi_img.img_url;
    const subUrl = json.data.wbi_img.sub_url;
    const imgKey = imgUrl.slice(imgUrl.lastIndexOf('/') + 1, imgUrl.lastIndexOf('.'));
    const subKey = subUrl.slice(subUrl.lastIndexOf('/') + 1, subUrl.lastIndexOf('.'));
    wbiKeysCache = getMixinKey(imgKey + subKey);
    return wbiKeysCache;
}

async function encWbi(params) {
    const mixinKey = await getWbiKeys();
    const wts = Math.round(Date.now() / 1000);
    params.wts = wts;
    const query = Object.keys(params)
        .sort()
        .map(key => {
            // 过滤 value 中的 "!'()*" 字符
            const value = ('' + params[key]).replace(/[!'()*]/g, '');
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');
    const wRid = md5(query + mixinKey);
    return `${query}&w_rid=${wRid}`;
}

/* ============================================================
 * UI 提示
 * durationMs = 0 表示一直显示（识别过程中的进度）
 * ============================================================ */
let toastHideTimer = null;
let toastRemoveTimer = null;

function showToast(message, isError = false, durationMs = 3000) {
    const existingToast = document.getElementById('bili-sub-toast');
    if (existingToast) existingToast.remove();
    if (toastHideTimer) clearTimeout(toastHideTimer);
    if (toastRemoveTimer) clearTimeout(toastRemoveTimer);

    const toast = document.createElement('div');
    toast.id = 'bili-sub-toast';
    toast.textContent = message;
    if (isError) {
        toast.style.backgroundColor = '#f44336';
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    if (!durationMs) return;

    toastHideTimer = setTimeout(() => {
        toast.classList.remove('show');
        toastRemoveTimer = setTimeout(() => toast.remove(), 300);
    }, durationMs);
}

const captionState = {
    key: '',
    hasCaptions: null,
    checking: false,
    busy: false
};

function getVideoKey() {
    if (SITE === 'bilibili') {
        const bvid = (window.location.pathname.match(/(BV\w+)/) || [])[1] || '';
        const part = new URLSearchParams(window.location.search).get('p') || '1';
        return `bili:${bvid}:${part}`;
    }
    if (SITE === 'youtube') {
        return `yt:${getYoutubeVideoId() || window.location.pathname}`;
    }
    return window.location.href;
}

function getIdleButtonLabel() {
    return captionState.hasCaptions === false ? '识别字幕' : '复制字幕';
}

function updateButtonLabel() {
    const btn = document.getElementById('bili-sub-copier-btn');
    if (!btn || captionState.busy) return;
    const label = btn.querySelector('span');
    const idleLabel = getIdleButtonLabel();
    if (label) label.textContent = idleLabel;
    btn.dataset.mode = captionState.hasCaptions === false ? 'transcribe' : 'copy';
    btn.title = captionState.hasCaptions === false ? '当前视频没有字幕，将进行语音识别' : '复制当前视频字幕';
}

function setButtonBusy(busy, mode) {
    captionState.busy = Boolean(busy);
    const btn = document.getElementById('bili-sub-copier-btn');
    if (!btn) return;
    const label = btn.querySelector('span');
    btn.style.opacity = busy ? '0.72' : '';
    btn.style.pointerEvents = busy ? 'none' : '';
    if (!label) return;
    if (busy) {
        label.textContent = mode === 'copy' ? '复制中...' : '识别中...';
        return;
    }
    updateButtonLabel();
}

function peekYoutubeHasCaptions() {
    const videoId = getYoutubeVideoId();
    const player = findYoutubePlayer();
    const playerResponse = getYoutubePlayerResponse(player);
    if (!playerResponse || !playerResponse.videoDetails) return null;
    if (videoId && playerResponse.videoDetails.videoId && playerResponse.videoDetails.videoId !== videoId) {
        return null;
    }
    const tracks =
        playerResponse.captions &&
        playerResponse.captions.playerCaptionsTracklistRenderer &&
        playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    return Array.isArray(tracks) && tracks.length > 0;
}

function readBilibiliSubtitlesFromState() {
    const state = window.__INITIAL_STATE__;
    const videoData = state && state.videoData;
    if (!videoData) return null;
    const subtitle = videoData.subtitle;
    if (Array.isArray(subtitle)) return subtitle;
    if (subtitle && Array.isArray(subtitle.list)) return subtitle.list;
    if (subtitle && Array.isArray(subtitle.subtitles)) return subtitle.subtitles;
    return null;
}

async function peekBilibiliHasCaptions() {
    const fromState = readBilibiliSubtitlesFromState();
    if (Array.isArray(fromState) && fromState.length > 0) return true;

    const bvidMatch = window.location.pathname.match(/(BV\w+)/);
    if (!bvidMatch) return null;
    const bvid = bvidMatch[1];

    let cid = window.__INITIAL_STATE__ && window.__INITIAL_STATE__.videoData && window.__INITIAL_STATE__.videoData.cid;
    const pParam = new URLSearchParams(window.location.search).get('p');
    if (pParam && window.__INITIAL_STATE__ && window.__INITIAL_STATE__.videoData && Array.isArray(window.__INITIAL_STATE__.videoData.pages)) {
        const page = window.__INITIAL_STATE__.videoData.pages[parseInt(pParam, 10) - 1];
        if (page && page.cid) cid = page.cid;
    }
    if (!cid) return Array.isArray(fromState) ? fromState.length > 0 : null;

    const signedQuery = await encWbi({ bvid, cid });
    const playerRes = await fetch(`https://api.bilibili.com/x/player/wbi/v2?${signedQuery}`, { credentials: 'include' });
    const playerData = await playerRes.json();
    const subtitles =
        playerData &&
        playerData.data &&
        playerData.data.subtitle &&
        playerData.data.subtitle.subtitles;
    return Array.isArray(subtitles) && subtitles.length > 0;
}

async function refreshCaptionState() {
    if (!shouldShowButton()) {
        captionState.key = '';
        captionState.hasCaptions = null;
        return;
    }

    const key = getVideoKey();
    if (captionState.key !== key) {
        captionState.key = key;
        captionState.hasCaptions = null;
        updateButtonLabel();
    }
    if (captionState.hasCaptions !== null || captionState.checking) return;

    captionState.checking = true;
    try {
        const hasCaptions = SITE === 'youtube'
            ? peekYoutubeHasCaptions()
            : await peekBilibiliHasCaptions();
        if (captionState.key !== key) return;
        if (hasCaptions === null) return;
        captionState.hasCaptions = hasCaptions;
        updateButtonLabel();
    } catch (error) {
        console.warn('[SubCopier] caption state check failed:', error);
    } finally {
        captionState.checking = false;
    }
}

const PAGE_SOURCE = 'sub-copier-page';
const BRIDGE_SOURCE = 'sub-copier-bridge';

function sendExtensionMessage(type, payload) {
    return new Promise((resolve, reject) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        let settled = false;
        let heard = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(ackTimer);
            clearTimeout(hardTimer);
            window.removeEventListener('message', onMessage);
            fn(value);
        };
        const onMessage = (event) => {
            if (event.source !== window) return;
            const data = event.data;
            if (!data || data.source !== BRIDGE_SOURCE || data.requestId !== requestId) return;
            heard = true;
            if (data.progress) {
                showToast(data.progress, false, 0);
                return;
            }
            if (data.ok) finish(resolve, data.result);
            else finish(reject, new Error(data.error || '扩展通信失败'));
        };
        window.addEventListener('message', onMessage);
        window.postMessage({ source: PAGE_SOURCE, requestId, type, payload }, '*');
        const ackTimer = setTimeout(() => {
            if (!heard) finish(reject, new Error('STALE_PAGE'));
        }, 4000);
        const hardTimer = setTimeout(() => {
            finish(reject, new Error('语音识别超时，请稍后重试'));
        }, 15 * 60 * 1000);
    });
}

/* ============================================================
 * 站点识别
 * ============================================================ */
const SITE = (() => {
    const h = window.location.hostname;
    if (h.includes('bilibili.com')) return 'bilibili';
    if (h === 'youtube.com' || h.endsWith('.youtube.com')) return 'youtube';
    return null;
})();

/* ============================================================
 * 核心分发：根据站点调用对应的复制逻辑
 * ============================================================ */
let copyInFlight = false;

async function deliverSubtitle(text, meta) {
    setButtonBusy(true, 'copy');
    showToast('正在保存到 Obsidian…', false, 0);
    try {
        const result = await sendExtensionMessage('SAVE_CAPTURE', {
            text,
            title: meta.title,
            pageUrl: meta.pageUrl || window.location.href,
            platform: meta.platform,
            engine: meta.engine || 'captions'
        });
        const message = (result && result.message) || '已保存到 Obsidian';
        showToast(`✅ ${message}`, false, 8000);
    } catch (error) {
        console.error('[SubCopier] save failed:', error);
        showToast((error && error.message) || '保存到 Obsidian 失败', true, 6000);
    } finally {
        setButtonBusy(false);
    }
}

async function copySubtitles() {
    if (copyInFlight) return;
    copyInFlight = true;
    try {
        if (SITE === 'youtube') await copySubtitlesYouTube();
        else await copySubtitlesBilibili();
    } finally {
        copyInFlight = false;
    }
}

/* ============================================================
 * 核心：复制字幕（B 站）
 * ============================================================ */
async function copySubtitlesBilibili() {
    try {
        const bvidMatch = window.location.pathname.match(/(BV\w+)/);
        if (!bvidMatch) {
            showToast('当前页面不是视频页或无法获取 BVID', true);
            return;
        }
        const bvid = bvidMatch[1];

        const fetchOpts = { credentials: 'include' }; // 必须包含 cookie，否则获取不到 AI 字幕

        // 1. 获取视频 cid（优先用页面已加载的数据，避免多余请求）
        let cid = null;
        if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.videoData && window.__INITIAL_STATE__.videoData.cid) {
            cid = window.__INITIAL_STATE__.videoData.cid;
        } else {
            const viewRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, fetchOpts);
            const viewData = await viewRes.json();
            if (viewData.code !== 0) {
                showToast(`获取视频信息失败: ${viewData.message}`, true);
                return;
            }
            cid = viewData.data.cid;
        }

        // 处理分 P：从 URL 的 p 参数定位对应分 P 的 cid
        const pParam = new URLSearchParams(window.location.search).get('p');
        if (pParam && window.__INITIAL_STATE__ && window.__INITIAL_STATE__.videoData && Array.isArray(window.__INITIAL_STATE__.videoData.pages)) {
            const page = window.__INITIAL_STATE__.videoData.pages[parseInt(pParam, 10) - 1];
            if (page && page.cid) cid = page.cid;
        }

        if (!cid) {
            showToast('无法获取视频 cid', true);
            return;
        }

        // 2. 通过 WBI 签名请求 player/wbi/v2（关键：未签名接口的 subtitle_url 会为空）
        const signedQuery = await encWbi({ bvid, cid });
        const playerRes = await fetch(`https://api.bilibili.com/x/player/wbi/v2?${signedQuery}`, fetchOpts);
        const playerData = await playerRes.json();

        if (playerData.code !== 0) {
            showToast(`获取播放器信息失败: ${playerData.message}`, true);
            return;
        }

        let subtitles = [];
        if (playerData.data && playerData.data.subtitle && Array.isArray(playerData.data.subtitle.subtitles)) {
            subtitles = playerData.data.subtitle.subtitles;
        }

        if (subtitles.length === 0) {
            captionState.hasCaptions = false;
            updateButtonLabel();
            await transcribeCurrentVideo({ platform: 'bilibili', bvid, cid });
            return;
        }

        // 优先中文（包括 AI 生成的 zh-CN, zh-Hans, ai-zh），否则取第一个
        let sub = subtitles.find(s => s.lan === 'zh-CN' || s.lan === 'zh-Hans' || s.lan === 'ai-zh' || (s.lan_doc && s.lan_doc.includes('中')));
        if (!sub) sub = subtitles[0];

        console.log('[BiliSub] Selected subtitle object:', sub);

        let subUrl = sub.subtitle_url || sub.url || sub.sub_url;
        if (!subUrl) {
            console.error('[BiliSub] Subtitle URL not found in object:', sub);
            captionState.hasCaptions = false;
            updateButtonLabel();
            await transcribeCurrentVideo({ platform: 'bilibili', bvid, cid });
            return;
        }

        if (subUrl.startsWith('//')) {
            subUrl = 'https:' + subUrl;
        }

        // 3. 下载字幕 JSON
        // 注意：字幕 CDN(aisubtitle.hdslb.com) 返回 Access-Control-Allow-Origin: *，
        // 与 credentials: 'include' 冲突会被 CORS 拦截。该 URL 自带 auth_key，无需 cookie，
        // 因此这里必须用 credentials: 'omit'。
        const subRes = await fetch(subUrl, { credentials: 'omit' });
        const subData = await subRes.json();

        if (!subData.body || subData.body.length === 0) {
            captionState.hasCaptions = false;
            updateButtonLabel();
            await transcribeCurrentVideo({ platform: 'bilibili', bvid, cid });
            return;
        }

        const text = subData.body.map(item => item.content).join(' ');
        await deliverSubtitle(text, {
            title: getBilibiliTitle(),
            pageUrl: window.location.href,
            platform: 'bilibili',
            engine: 'captions'
        });

    } catch (e) {
        console.error('Copy Subtitle Error:', e);
        showToast('复制字幕时发生错误，请查看控制台', true);
    }
}

/* ============================================================
 * YouTube：POT 缓存 + 播放器辅助
 * YouTube 对 MAIN 世界强制 Trusted Types，且 timedtext 常要求 pot。
 * ============================================================ */
const ytTimedtextCache = Object.create(null);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getYoutubeVideoId() {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('v');
    if (fromQuery) return fromQuery;
    const shorts = url.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1];
    const live = url.pathname.match(/\/live\/([^/?]+)/);
    if (live) return live[1];
    return null;
}

function cacheYoutubeTimedtextUrl(rawUrl) {
    if (!rawUrl) return;
    try {
        const parsed = new URL(String(rawUrl), location.origin);
        if (!parsed.pathname.includes('/api/timedtext')) return;
        const videoId = parsed.searchParams.get('v');
        const pot = parsed.searchParams.get('pot');
        if (videoId && pot) {
            ytTimedtextCache[videoId] = parsed.toString();
        }
    } catch (_) { /* ignore malformed URLs */ }
}

function getYoutubeSourceUrl() {
    const videoId = getYoutubeVideoId();
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
    return window.location.href;
}

function setupYoutubeTimedtextObserver() {
    if (window.__subCopierTimedtextHooked) return;
    window.__subCopierTimedtextHooked = true;

    const origFetch = window.fetch;
    if (typeof origFetch === 'function') {
        window.fetch = function (...args) {
            try {
                const input = args[0];
                const url = typeof input === 'string' ? input : (input && input.url);
                cacheYoutubeTimedtextUrl(url);
            } catch (_) { /* ignore */ }
            return origFetch.apply(this, args);
        };
    }

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        try { cacheYoutubeTimedtextUrl(url); } catch (_) { /* ignore */ }
        return origOpen.call(this, method, url, ...rest);
    };
}

function findYoutubePlayer() {
    return document.querySelector('#movie_player')
        || document.querySelector('#shorts-player')
        || document.querySelector('.html5-video-player');
}

function getYoutubePlayerResponse(player) {
    if (player && typeof player.getPlayerResponse === 'function') {
        try {
            const live = player.getPlayerResponse();
            if (live && live.videoDetails) return live;
        } catch (_) { /* ignore */ }
    }
    return window.ytInitialPlayerResponse || null;
}

function extractPotFromUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
        const parsed = new URL(String(rawUrl), location.origin);
        const pot = parsed.searchParams.get('pot');
        if (!pot) return null;
        return { pot, potc: parsed.searchParams.get('potc') || '1' };
    } catch (_) {
        return null;
    }
}

function collectYoutubePot(player, videoId, tracks) {
    const urls = [];

    if (Array.isArray(tracks)) {
        for (const track of tracks) {
            if (track && track.baseUrl) urls.push(track.baseUrl);
        }
    }

    try {
        const audio = player && typeof player.getAudioTrack === 'function' && player.getAudioTrack();
        const audioTracks = (audio && audio.captionTracks) || [];
        for (const track of audioTracks) {
            if (track && track.url) urls.push(track.url);
        }
    } catch (_) { /* ignore */ }

    if (videoId && ytTimedtextCache[videoId]) {
        urls.push(ytTimedtextCache[videoId]);
    }

    for (const url of urls) {
        const pot = extractPotFromUrl(url);
        if (pot) return pot;
    }
    return null;
}

function isYoutubeCaptionsOn() {
    const btn = document.querySelector('.ytp-subtitles-button');
    return !!(btn && btn.getAttribute('aria-pressed') === 'true');
}

function toggleYoutubeCaptions(player) {
    try {
        if (player && typeof player.toggleSubtitles === 'function') {
            player.toggleSubtitles();
            return;
        }
    } catch (_) { /* fall through */ }
    const btn = document.querySelector('.ytp-subtitles-button');
    if (btn) btn.click();
}

async function ensureYoutubePot(player, videoId, tracks) {
    let pot = collectYoutubePot(player, videoId, tracks);
    if (pot) return pot;

    const alreadyOn = isYoutubeCaptionsOn();
    if (!alreadyOn) toggleYoutubeCaptions(player);

    for (let i = 0; i < 10; i++) {
        await sleep(350);
        pot = collectYoutubePot(player, videoId, tracks);
        if (pot) {
            if (!alreadyOn) toggleYoutubeCaptions(player);
            return pot;
        }
    }

    if (!alreadyOn && isYoutubeCaptionsOn()) toggleYoutubeCaptions(player);
    return null;
}

function buildYoutubeTimedtextUrl(baseUrl, pot, player) {
    const url = new URL(baseUrl, location.origin);
    url.searchParams.set('fmt', 'json3');
    url.searchParams.set('c', 'WEB');
    url.searchParams.set('cplayer', 'UNIPLAYER');
    url.searchParams.set('xorb', '2');
    url.searchParams.set('xobt', '3');
    url.searchParams.set('xovt', '3');

    try {
        const cfg = player && typeof player.getWebPlayerContextConfig === 'function'
            && player.getWebPlayerContextConfig();
        if (cfg && cfg.innertubeContextClientVersion) {
            url.searchParams.set('cver', cfg.innertubeContextClientVersion);
        }
    } catch (_) { /* ignore */ }

    try {
        const device = window.ytcfg && typeof window.ytcfg.get === 'function' && window.ytcfg.get('DEVICE');
        if (device) {
            const params = new URLSearchParams(device);
            ['cbrand', 'cbr', 'cbrver', 'cos', 'cosver', 'cplatform'].forEach(key => {
                const value = params.get(key);
                if (value) url.searchParams.set(key, value);
            });
        }
    } catch (_) { /* ignore */ }

    if (pot && pot.pot) {
        url.searchParams.set('pot', pot.pot);
        url.searchParams.set('potc', pot.potc || '1');
    }

    return url.toString();
}

function parseYoutubeJson3(data) {
    const events = Array.isArray(data && data.events) ? data.events : [];
    return events
        .filter(e => Array.isArray(e.segs))
        .map(e => e.segs.map(s => s.utf8 || '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchYoutubeTimedtext(url) {
    const res = await fetch(url, { credentials: 'include' });
    const raw = await res.text();
    if (!res.ok) {
        throw new Error(`timedtext HTTP ${res.status}`);
    }
    if (!raw) return '';
    let data;
    try {
        data = JSON.parse(raw);
    } catch (_) {
        throw new Error('字幕接口返回了无法解析的内容');
    }
    return parseYoutubeJson3(data);
}

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return;
    } catch (_) { /* fall through to execCommand */ }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    if (!ok) throw new Error('clipboard write failed');
}

/* ============================================================
 * 核心：复制字幕（YouTube）
 * ============================================================ */
async function copySubtitlesYouTube() {
    try {
        const videoId = getYoutubeVideoId();
        const player = findYoutubePlayer();
        const playerResponse = getYoutubePlayerResponse(player);

        const tracks =
            playerResponse &&
            playerResponse.captions &&
            playerResponse.captions.playerCaptionsTracklistRenderer &&
            playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;

        if (!tracks || tracks.length === 0) {
            captionState.hasCaptions = false;
            updateButtonLabel();
            await transcribeCurrentVideo({
                platform: 'youtube',
                pageUrl: getYoutubeSourceUrl()
            });
            return;
        }

        let selected = null;
        try {
            selected = player && typeof player.getOption === 'function'
                && player.getOption('captions', 'track');
        } catch (_) { /* ignore */ }

        let track = null;
        if (selected && selected.languageCode) {
            track = tracks.find(t => t.languageCode === selected.languageCode)
                || tracks.find(t => selected.languageCode.startsWith(t.languageCode));
        }
        if (!track) track = tracks.find(t => t.languageCode && t.languageCode.startsWith('zh'));
        if (!track) track = tracks.find(t => t.kind !== 'asr');
        if (!track) track = tracks[0];

        console.log('[SubCopier] Selected YouTube track:', track);

        let subUrl = track.baseUrl;
        if (!subUrl) {
            showToast('字幕链接获取失败', true);
            return;
        }
        if (!subUrl.includes('://')) {
            subUrl = location.origin + subUrl;
        }

        const pot = await ensureYoutubePot(player, videoId, tracks);
        const timedtextUrl = buildYoutubeTimedtextUrl(subUrl, pot, player);
        console.log('[SubCopier] Fetching timedtext:', timedtextUrl.replace(/([?&]pot=)[^&]+/, '$1***'));

        let text = await fetchYoutubeTimedtext(timedtextUrl);
        if (!text) {
            captionState.hasCaptions = false;
            updateButtonLabel();
            await transcribeCurrentVideo({
                platform: 'youtube',
                pageUrl: getYoutubeSourceUrl()
            });
            return;
        }

        await deliverSubtitle(text, {
            title: getYoutubeTitle(player),
            pageUrl: window.location.href,
            platform: 'youtube',
            engine: 'captions'
        });

    } catch (e) {
        console.error('Copy Subtitle Error:', e);
        showToast('复制字幕时发生错误，请查看控制台', true);
    }
}

function formatAsrError(error) {
    const message = (error && error.message) || String(error);
    if (message === 'NO_API_KEY') return '请先在设置的「字幕与 AI」里填写 ElevenLabs API Key';
    if (message === 'NO_AUDIO_SOURCE') return '无法获取视频音频，请先播放视频后再试';
    if (message === 'EMPTY_TRANSCRIPT') return '语音识别结果为空';
    if (message === 'STALE_PAGE' || message.includes('Extension context invalidated')) {
        return '插件已更新，请刷新当前页面后再点识别字幕';
    }
    return message;
}

async function fetchBilibiliPlayurl(bvid, cid, fnval) {
    const signedQuery = await encWbi({ bvid, cid, fnval, fnver: 0, fourk: 1 });
    const res = await fetch(`https://api.bilibili.com/x/player/wbi/playurl?${signedQuery}`, {
        credentials: 'include'
    });
    return res.json();
}

async function resolveBilibiliAudio(bvid, cid) {
    const json = await fetchBilibiliPlayurl(bvid, cid, 16);
    if (json.code !== 0) {
        throw new Error(json.message || '获取 B 站音频失败');
    }

    const audios = (json.data && json.data.dash && json.data.dash.audio) || [];
    if (audios.length) {
        const sorted = [...audios].sort((a, b) => (a.bandwidth || 0) - (b.bandwidth || 0));
        const pick = sorted[0];
        const url = pick.baseUrl || pick.base_url || (pick.backupUrl && pick.backupUrl[0]) || (pick.backup_url && pick.backup_url[0]);
        if (url) {
            return {
                url,
                referrer: 'https://www.bilibili.com/',
                filename: 'audio.m4s'
            };
        }
    }

    const durl = json.data && json.data.durl && json.data.durl[0];
    if (durl && durl.url) {
        return {
            url: durl.url,
            referrer: 'https://www.bilibili.com/',
            filename: 'audio.mp4'
        };
    }

    throw new Error('NO_AUDIO_SOURCE');
}

function getBilibiliTitle() {
    try {
        const title = window.__INITIAL_STATE__ && window.__INITIAL_STATE__.videoData && window.__INITIAL_STATE__.videoData.title;
        if (title) return String(title).trim();
    } catch (_) { /* ignore */ }
    const heading = document.querySelector('h1');
    if (heading && heading.textContent) return heading.textContent.trim();
    return document.title.replace(/_哔哩哔哩.*$/, '').trim();
}

function getYoutubeTitle(player) {
    try {
        const data = player && typeof player.getVideoData === 'function' && player.getVideoData();
        if (data && data.title) return String(data.title).trim();
    } catch (_) { /* ignore */ }
    const heading = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1, h2.ytShortsVideoTitleViewModelShortsVideoTitle');
    if (heading && heading.textContent) return heading.textContent.trim();
    return document.title.replace(/\s*-\s*YouTube$/, '').trim();
}

async function finishTranscript(result) {
    const message = (result && result.message) || '已保存到 Obsidian';
    showToast(`✅ ${message}`, false, 8000);
}

async function transcribeCurrentVideo(context) {
    setButtonBusy(true, 'transcribe');
    const isYoutube = context.platform === 'youtube';
    showToast(isYoutube
        ? '未找到字幕，正在提交 YouTube 链接给 ElevenLabs…'
        : '未找到字幕，正在用 ElevenLabs 识别语音…', false, 0);
    try {
        const status = await sendExtensionMessage('HAS_API_KEY');
        if (!status || !status.configured) {
            showToast('请先在设置的「字幕与 AI」里填写 ElevenLabs API Key', true, 6000);
            await sendExtensionMessage('OPEN_OPTIONS');
            return;
        }

        const meta = {
            platform: context.platform,
            title: isYoutube ? getYoutubeTitle(findYoutubePlayer()) : getBilibiliTitle(),
            pageUrl: context.pageUrl || window.location.href
        };

        if (isYoutube) {
            const sourceUrl = getYoutubeSourceUrl();
            meta.pageUrl = sourceUrl;
            const result = await sendExtensionMessage('TRANSCRIBE', {
                sourceUrl,
                ...meta
            });
            await finishTranscript(result);
            return;
        }

        showToast('未找到字幕，正在后台下载音频…', false, 0);
        const audio = await resolveBilibiliAudio(context.bvid, context.cid);
        showToast('音频已下载，正在提交 ElevenLabs Speech to Text…', false, 0);
        const result = await sendExtensionMessage('TRANSCRIBE', {
            audioUrl: audio.url,
            referrer: audio.referrer,
            filename: audio.filename,
            ...meta
        });
        await finishTranscript(result);
    } catch (error) {
        console.error('[SubCopier] ASR failed:', error);
        showToast(formatAsrError(error), true, 6000);
    } finally {
        setButtonBusy(false);
    }
}

/* ============================================================
 * 注入按钮
 * YouTube 强制 Trusted Types，禁止 MAIN 世界使用 innerHTML。
 * ============================================================ */
function shouldShowButton() {
    if (SITE === 'bilibili') return window.location.pathname.includes('/video/');
    if (SITE === 'youtube') {
        const path = window.location.pathname;
        return path === '/watch' || path.startsWith('/shorts/') || path.startsWith('/live/');
    }
    return false;
}

function createCopyIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('fill', 'currentColor');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z');
    svg.appendChild(path);
    return svg;
}

function injectButton() {
    try {
        if (!shouldShowButton()) {
            const existing = document.getElementById('bili-sub-copier-btn');
            if (existing) existing.remove();
            return;
        }

        if (document.getElementById('bili-sub-copier-btn') || !document.body) {
            updateButtonLabel();
            refreshCaptionState();
            return;
        }

        const btn = document.createElement('div');
        btn.id = 'bili-sub-copier-btn';
        if (SITE === 'youtube') btn.classList.add('yt-theme');
        btn.appendChild(createCopyIcon());
        const label = document.createElement('span');
        label.textContent = getIdleButtonLabel();
        btn.appendChild(label);

        btn.addEventListener('click', () => {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => { btn.style.transform = ''; }, 150);
            copySubtitles();
        });

        document.body.appendChild(btn);
        updateButtonLabel();
        refreshCaptionState();
    } catch (e) {
        console.error('[SubCopier] injectButton failed:', e);
    }
}

if (SITE === 'youtube') {
    setupYoutubeTimedtextObserver();
}

// B 站和 YouTube 都是 SPA，定时检查是否需要注入按钮，并刷新字幕状态
setInterval(() => {
    injectButton();
    refreshCaptionState();
}, 1000);
injectButton();
refreshCaptionState();

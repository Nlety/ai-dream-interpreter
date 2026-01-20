const CONFIG_KEY = 'ai_dream_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';
function decryptConfig(e) { try { const d = CryptoJS.RC4.decrypt(e, DECRYPT_KEY).toString(CryptoJS.enc.Utf8); if (!d) return null; const c = JSON.parse(d); c.modelName = 'GLM-4-Flash'; return c; } catch (e) { return null; } }
async function fetchRemoteConfig() { try { const r = await fetch(REMOTE_CONFIG_URL); if (!r.ok) return null; const d = await r.json(); if (d && d.value) { const c = decryptConfig(d.value); if (c && c.apiUrl && c.apiKey) { localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(c)); return c; } } return null; } catch (e) { return null; } }
function getModelConfig() { try { const u = localStorage.getItem(CONFIG_KEY); if (u) { const p = JSON.parse(u); if (p && p.apiUrl && p.apiKey && p.modelName) return p; } const r = localStorage.getItem(CONFIG_KEY + '_remote'); if (r) return JSON.parse(r); return null; } catch (e) { return null; } }
function saveModelConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }

async function interpret(dream, mood, style, onMessage, onComplete, onError) {
    let config = getModelConfig(); if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config) { onError(new Error('请先配置模型')); return; }
    const moodMap = { happy: '愉快平和', anxious: '紧张焦虑', scared: '恐惧害怕', sad: '悲伤失落', confused: '困惑迷茫', exciting: '兴奋刺激' };
    const styleMap = { psychology: '心理分析角度', traditional: '传统周公解梦', symbol: '象征寓意解读', life: '现实生活关联' };
    const prompt = `你是一位专业的梦境解读师，擅长从${styleMap[style]}解读梦境。

用户描述的梦境：
${dream}
${mood ? `梦境中的主要情绪：${moodMap[mood]}` : ''}

请从以下几个方面解读这个梦境：

## 🌙 梦境概述
（简要总结梦境的主要内容和特点）

## 🔮 深度解读
（从${styleMap[style]}详细分析梦境的含义）

## 💭 象征元素
（解释梦境中出现的关键元素各自代表什么）

## 🌟 潜在启示
（这个梦境可能暗示的信息或给予的启发）

## 💡 生活建议
（基于梦境解读，给出的温馨建议）

请用温和、专业的语气，让用户感到被理解和支持。`;

    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.modelName, messages: [{ role: 'user', content: prompt }], stream: true, temperature: 0.8 }), signal: controller.signal });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        while (true) { const { done, value } = await reader.read(); if (done) { onComplete(); break; } buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { if (line.startsWith('data: ')) { const data = line.slice(6).trim(); if (data === '[DONE]') { onComplete(); return; } try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { } } } }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
}
window.AIService = { getModelConfig, saveModelConfig, initConfig, interpret };

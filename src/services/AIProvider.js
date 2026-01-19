/**
 * AI Provider Service
 * 统一管理云端和本地 AI 提供商
 */

class AIProvider {
    constructor() {
        // 模式：cloud（云端）或 local（本地）
        this.mode = localStorage.getItem('aiMode') || 'cloud';

        // 本地 Claude Code 的 Token
        this.token = localStorage.getItem('claudeToken') || null;

        // WebSocket 连接
        this.localWs = null;

        // 连接状态
        this.isLocalConnected = false;

        // 消息处理器
        this.messageHandlers = new Map();
    }

    /**
     * 初始化
     */
    async init() {
        console.log('🚀 AIProvider 初始化');
        console.log('   模式:', this.mode);
        console.log('   Token:', this.token ? '已配对' : '未配对');

        // OpenCode 使用 HTTP API，不需要预先建立连接
        if (this.mode === 'local') {
            console.log('💡 本地模式：将使用 OpenCode (http://localhost:4096)');
        }
    }

    /**
     * 检查是否已配对
     */
    isPaired() {
        return !!this.token;
    }

    /**
     * 连接本地 Claude Code
     */
    async connectLocal() {
        if (!this.token) {
            throw new Error('未配对。请先运行配对工具。');
        }

        try {
            console.log('🔗 正在连接本地 Claude Code...');

            // 连接到本地 WebSocket 服务器
            // Claude Desktop 默认端口是 52699
            this.localWs = new WebSocket('ws://localhost:52699');

            // 连接成功
            this.localWs.onopen = () => {
                console.log('✅ WebSocket 连接已建立');

                // 发送认证
                this.localWs.send(JSON.stringify({
                    type: 'auth',
                    token: this.token
                }));
            };

            // 接收消息
            this.localWs.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'auth_success') {
                    console.log('✅ 认证成功，已连接到本地 Claude Code');
                    this.isLocalConnected = true;
                } else if (data.type === 'auth_failed') {
                    console.error('❌ 认证失败，Token 可能已过期');
                    this.isLocalConnected = false;
                    this.unpair();
                } else {
                    // 处理其他消息
                    this.handleMessage(data);
                }
            };

            // 连接错误
            this.localWs.onerror = (error) => {
                console.error('❌ WebSocket 错误:', error);
                this.isLocalConnected = false;
            };

            // 连接关闭
            this.localWs.onclose = () => {
                console.log('🔌 WebSocket 连接已关闭');
                this.isLocalConnected = false;

                // 自动降级到云端模式
                if (this.mode === 'local') {
                    console.log('⚠️ 本地连接断开，自动切换到云端模式');
                    this.mode = 'cloud';
                }
            };

        } catch (error) {
            console.error('连接失败:', error);
            this.isLocalConnected = false;
            throw error;
        }
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(data) {
        const handler = this.messageHandlers.get(data.id);
        if (handler) {
            handler(data);
        }
    }

    /**
     * 统一的生成接口
     * @param {string} prompt - 提示词
     * @param {object} options - 选项
     * @returns {Promise<string>} - 生成的代码
     */
    async generate(prompt, options = {}) {
        // 根据模式选择：本地 OpenCode 或云端 Gemini
        if (this.mode === 'local') {
            console.log('📍 使用本地 OpenCode');
            return this.generateLocal(prompt, options);
        } else {
            console.log('☁️ 使用云端 Gemini API');
            return this.generateCloud(prompt, options);
        }
    }

    /**
     * 本地生成（OpenCode HTTP API）
     */
    /**
     * 对话模式 (支持上下文记忆)
     * @param {string} prompt - 用户输入
     * @param {string} sessionId - (可选) 会话ID，用于保持上下文
     * @returns {Promise<{text: string, sessionId: string}>}
     */
    async chat(prompt, sessionId = null) {
        if (this.mode === 'local') {
            return this.chatLocal(prompt, sessionId);
        } else {
            // 云端模式暂时没做 session，直接返回单次结果
            const text = await this.generateCloud(prompt);
            return { text, sessionId: 'cloud-session' };
        }
    }

    /**
     * 本地对话（OpenCode HTTP API）
     */
    async chatLocal(prompt, existingSessionId = null) {
        // 直接连接 OpenCode (HTTP)
        const PORT = 4096;
        const BASE_URL = `http://localhost:${PORT}`;
        let sessionId = existingSessionId;

        try {
            console.log(`📍 连接本机 OpenCode (${BASE_URL})...`);

            // 1. 如果没有会话ID，创建新会话
            if (!sessionId) {
                console.log('   ① 创建新会话...');
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

                try {
                    const sessionRes = await fetch(`${BASE_URL}/session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!sessionRes.ok) throw new Error(`创建会话失败: ${sessionRes.status}`);
                    const sessionData = await sessionRes.json();
                    sessionId = sessionData.id;
                    console.log('   ✅ 新会话 ID:', sessionId);
                } catch (err) {
                    clearTimeout(timeoutId);
                    throw err;
                }
            } else {
                console.log('   🔄 复用会话 ID:', sessionId);
            }

            // 2. 发送消息
            console.log('   ② 发送指令...');
            const requestBody = {
                parts: [
                    { type: "text", text: prompt }
                ]
            };

            const msgController = new AbortController();
            const msgTimeoutId = setTimeout(() => msgController.abort(), 180000); // 180秒超时

            let messageRes;
            try {
                messageRes = await fetch(`${BASE_URL}/session/${sessionId}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: msgController.signal
                });
            } finally {
                clearTimeout(msgTimeoutId);
            }

            if (!messageRes.ok) throw new Error(`发送消息失败: ${messageRes.status}`);

            // 解析响应
            const messageData = await messageRes.json();

            // 提取内容
            let content = '';
            if (messageData.content) content = messageData.content;
            else if (messageData.parts && Array.isArray(messageData.parts)) {
                content = messageData.parts
                    .filter(p => {
                        // 1. 只保留文本类型
                        if (p.type && p.type !== 'text') return false;

                        // 2. 这里的 p 可能是字符串对象或包含 text 属性的对象
                        const text = typeof p === 'string' ? p : p.text;
                        if (!text) return false;

                        // 3. 过滤掉元数据/日志行 (例如: ("id": "...", "type": "step-start") )
                        const trimmed = text.trim();
                        if (trimmed.startsWith('("id":') || trimmed.startsWith('{"id":')) return false;

                        // 4. 过滤掉明显的思考过程 (这一步比较激进，如果需要看思考过程可以去掉)
                        if (trimmed.startsWith('**') && (trimmed.includes('Response') || trimmed.includes('Thinking'))) return false;

                        return true;
                    })
                    .map(p => typeof p === 'string' ? p : p.text)
                    .join('\n')
                    .trim();
            }
            else if (typeof messageData === 'string') content = messageData;
            else content = JSON.stringify(messageData);

            return {
                text: content,
                sessionId: sessionId
            };

        } catch (error) {
            console.error('❌ OpenCode 调用失败:', error);
            if (error.name === 'AbortError') {
                throw new Error('请求超时 (OpenCode 响应过慢)');
            }
            if (error.message.includes('Failed to fetch')) {
                throw new Error(`无法连接 OpenCode (端口 ${PORT})。\n请确保运行: opencode serve --port ${PORT} --cors http://localhost:5173`);
            }
            throw error;
        }
    }

    // 保留旧接口兼容性
    async generateLocal(prompt) {
        const result = await this.chatLocal(prompt);
        return result.text;
    }

    /**
     * 云端生成（Gemini API）
     */
    async generateCloud(prompt, options = {}) {
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    ...options
                })
            });

            if (!response.ok) {
                throw new Error(`API 错误: ${response.status}`);
            }

            const data = await response.json();

            // 提取生成的文本
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return text;

        } catch (error) {
            console.error('云端生成失败:', error);
            throw error;
        }
    }

    /**
     * 设置模式
     */
    setMode(mode) {
        console.log(`🔄 切换模式: ${this.mode} → ${mode}`);
        this.mode = mode;
        localStorage.setItem('aiMode', mode);

        if (mode === 'local' && !this.isLocalConnected && this.token) {
            this.connectLocal();
        }
    }

    /**
     * 保存配对 Token
     */
    pair(token) {
        console.log('✅ 保存配对 Token');
        this.token = token;
        localStorage.setItem('claudeToken', token);

        // 如果当前是本地模式，立即连接
        if (this.mode === 'local') {
            this.connectLocal();
        }
    }

    /**
     * 取消配对
     */
    unpair() {
        console.log('🗑️ 取消配对');
        this.token = null;
        localStorage.removeItem('claudeToken');

        if (this.localWs) {
            this.localWs.close();
            this.localWs = null;
        }

        this.isLocalConnected = false;

        // 切换到云端模式
        this.setMode('cloud');
    }

    /**
     * 获取状态
     */
    getStatus() {
        return {
            mode: this.mode,
            isPaired: this.isPaired(),
            isLocalConnected: this.isLocalConnected
        };
    }
}

// 创建并导出单例
const aiProvider = new AIProvider();

// 自动初始化
if (typeof window !== 'undefined') {
    aiProvider.init().catch(err => {
        console.error('AIProvider 初始化失败:', err);
    });
}

export default aiProvider;

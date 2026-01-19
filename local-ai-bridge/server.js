/**
 * 本地 AI 桥接服务器 - Ollama 版本
 * 完全本地化，无需 Claude Desktop
 */

const WebSocket = require('ws');
const http = require('http');

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Local AI Bridge Server (Ollama) Running\n');
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

console.log('🚀 本地 AI 桥接服务器启动中（Ollama 版本）...');

// 检查 Ollama 是否运行（带缓存）
let isOllamaRunning = false;
async function checkOllama() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            isOllamaRunning = true;
            console.log('✅ Ollama 检测在线');
            return true;
        }
    } catch (e) { isOllamaRunning = false; }
    return false;
}
// 定期检查
setInterval(checkOllama, 30000);
checkOllama();


// 处理客户端连接
wss.on('connection', (ws) => {
    console.log('✅ 前端客户端已连接');

    ws.on('message', async (message) => {
        try {
            const request = JSON.parse(message);
            console.log('📨 收到请求:', request.type);

            if (request.type === 'auth') {
                // 简单认证（本地模式）
                ws.send(JSON.stringify({
                    type: 'auth_success'
                }));
                console.log('✅ 前端认证成功');
            }
            else if (request.type === 'generate' || request.type === 'chat') {
                const isChat = request.type === 'chat';
                console.log(isChat ? '💬 收到对话请求...' : '🤖 开始生成代码...');

                // 获取 prompt
                const prompt = request.prompt;

                try {
                    // 调用 Ollama API
                    // 注意：这里为了简单，无论是 chat 还是 generate，我们都调用 generate 接口
                    // 因为我们还没有完善的上下文管理，直接用 generate 当做单次对话也行
                    // 或者我们可以尝试调用 chat 接口

                    const apiData = isChat ? {
                        model: 'qwen2.5-coder:latest', // 尝试使用更智能的模型，如果没有会自动 fallback 到 codellama
                        messages: [{ role: 'user', content: prompt }],
                        stream: false
                    } : {
                        model: 'codellama',
                        prompt: prompt,
                        stream: false
                    };

                    const endpoint = isChat ? 'http://localhost:11434/api/chat' : 'http://localhost:11434/api/generate';

                    // 如果是 chat，我们先检查一下有没有 qwen2.5-coder，没有就用 codellama
                    // 这里简化处理，直接用 fetch，如果失败再退回

                    let response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(apiData)
                    });

                    // 如果 chat 模式下 qwen 失败 (404)，尝试退回 codellama
                    if (!response.ok && isChat) {
                        console.log('⚠️ 首选模型不可用，尝试使用 codellama...');
                        response = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...apiData, model: 'codellama' })
                        });
                    }

                    if (!response.ok) {
                        throw new Error(`Ollama API 错误: ${response.status}`);
                    }

                    const data = await response.json();

                    // 提取回复内容
                    let reply = '';
                    if (isChat) {
                        reply = data.message?.content || '';
                    } else {
                        reply = data.response || '';
                    }

                    // 发送响应
                    ws.send(JSON.stringify({
                        id: request.id, // 必须把 ID 传回去，前端靠这个匹配 Promise
                        type: isChat ? 'chat_response' : 'complete', // 前端其实只认 ID，type 不重要，但为了规范
                        content: reply, // AIProvider 里的 handler 是取这个字段
                        code: reply // 兼容 generate 接口
                    }));

                    console.log('✅ 响应已发送');

                } catch (error) {
                    console.error('❌ Ollama 调用失败:', error.message);

                    // 自动降级处理：如果 Ollama 没开，返回一个模拟回复，防止前端超时
                    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
                        ws.send(JSON.stringify({
                            id: request.id,
                            type: isChat ? 'chat_response' : 'complete',
                            content: '🔴 **Ollama 未启动或无法连接**\n\n请在终端运行 `ollama serve`。\n\n不过既然我们拥抱了错误，说明 WebSocket Bridge 服务是好的！我是自动回复测试。',
                            code: '// Ollama Offline'
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            id: request.id,
                            type: 'error',
                            error: `Ollama 错误: ${error.message}`,
                            message: `Ollama 错误: ${error.message}`
                        }));
                    }
                }
            }

        } catch (error) {
            console.error('❌ 错误:', error);

            ws.send(JSON.stringify({
                id: request?.id,
                type: 'error',
                message: error.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('❌ 前端客户端已断开');
    });

    ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
    });
});

// 监听端口 52699
const PORT = 52699;
server.listen(PORT, () => {
    console.log('\n✅ 本地 AI 桥接服务器运行在:');
    console.log(`   HTTP: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log('\n📝 使用说明:');
    console.log('   1. 确保 Ollama 正在运行: ollama serve');
    console.log('   2. 确保已下载模型: ollama pull codellama');
    console.log('   3. 在浏览器中打开应用');
    console.log('   4. AI Terminal 会自动连接');
    console.log('\n💡 如果没有 Ollama:');
    console.log('   macOS: brew install ollama');
    console.log('   其他: https://ollama.ai');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');

    wss.close(() => {
        server.close(() => {
            console.log('✅ 服务器已关闭');
            process.exit(0);
        });
    });
});

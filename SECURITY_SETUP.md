# 🔐 安全设置指南

## ⚠️ 重要：API 密钥已泄露

如果您之前将包含 API 密钥的代码推送到了 GitHub，请立即执行以下步骤：

### 1. 撤销旧密钥
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 找到被泄露的密钥
3. 点击删除/撤销

### 2. 生成新密钥
1. 在同一页面点击"Create API Key"
2. 复制新生成的密钥

### 3. 配置环境变量
1. 在项目根目录创建 `.env` 文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入您的新密钥：
   ```
   VITE_GEMINI_API_KEY=你的新密钥
   ```

3. **确认 `.env` 已被 git 忽略**：
   ```bash
   git status
   ```
   如果看到 `.env` 文件，说明配置有问题！

### 4. 清理 Git 历史（可选但推荐）

如果密钥已经被提交到 git 历史中，需要清理：

```bash
# 从所有历史记录中删除包含密钥的文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/components/TldrawBoard.jsx" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送（⚠️ 这会重写远程历史）
git push origin --force --all
```

**更简单的方法**：如果这是一个新项目，考虑删除整个仓库重新开始。

### 5. 重启开发服务器

修改 `.env` 后需要重启：
```bash
npm run dev
```

## ✅ 验证配置

启动后，打开浏览器控制台，如果看到类似错误：
```
API_KEY is empty! Please set VITE_GEMINI_API_KEY in .env file
```

说明环境变量没有正确加载。

## 📚 更多信息

- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [Google AI Studio](https://aistudio.google.com/)

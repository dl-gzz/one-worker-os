# 防止僵尸引用问题

## 问题说明

当删除组件时，如果画布上还有该组件的实例，会导致：
1. 实例被保存到 localStorage
2. 刷新页面时 Tldraw 尝试加载实例
3. 但找不到组件定义（已被删除）
4. 报错：`ValidationError: got "xxx", expected one of ...`

## 解决方案：增强 deleteRegistryApp 函数

### 在 `src/components/TldrawBoard.jsx` 中

找到 `deleteRegistryApp` 函数（大约第 1146 行），替换为：

```javascript
const deleteRegistryApp = async (shapeType) => {
    console.log('🗑️ 开始删除组件:', shapeType);

    try {
        // 🆕 Step 1: 删除画布上所有该类型的实例
        console.log('🧹 清理画布上的实例...');
        const allShapes = editor.getCurrentPageShapes();
        const shapesToDelete = allShapes.filter(shape => shape.type === shapeType);
        
        if (shapesToDelete.length > 0) {
            console.log(`📍 找到 ${shapesToDelete.length} 个实例，正在删除...`);
            editor.deleteShapes(shapesToDelete.map(s => s.id));
            
            // 等待一下，确保 localStorage 更新
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            console.log('✓ 画布上没有该组件的实例');
        }

        // Step 2: 调用后端删除文件
        const url = 'http://localhost:3008/api/shapes/delete';
        console.log('📡 发送请求到:', url);

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shapeType })
        });

        console.log('📨 收到响应:', res.status, res.statusText);

        if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ HTTP 错误:', errorText);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log('📄 响应数据:', data);

        if (data.success) {
            console.log(`✅ 删除成功: ${data.file}`);
            // 直接刷新，无需 alert
            window.location.reload();
        } else {
            alert(`❌ 删除失败: ${data.error}`);
        }
    } catch (error) {
        console.error('💥 删除过程出错:', error);
        alert(`❌ 删除失败: ${error.message}`);
    }
};
```

## 核心改进

**新增的步骤：**
```javascript
// 删除画布上所有该类型的实例
const allShapes = editor.getCurrentPageShapes();
const shapesToDelete = allShapes.filter(shape => shape.type === shapeType);

if (shapesToDelete.length > 0) {
    editor.deleteShapes(shapesToDelete.map(s => s.id));
    await new Promise(resolve => setTimeout(resolve, 100)); // 等待 localStorage 更新
}
```

## 工作流程

**修改前：**
```
点击删除 → 调用后端 → 删除文件 → 刷新 → 💥 错误（localStorage 里还有实例）
```

**修改后：**
```
点击删除 → 清理画布实例 → 等待 100ms → 调用后端 → 删除文件 → 刷新 → ✅ 正常
```

## 临时解决方法

如果再次遇到这个问题，有三种方法：

### 方法 1：清除 localStorage（推荐）
在浏览器控制台执行：
```javascript
localStorage.clear()
location.reload()
```

### 方法 2：只清除 Tldraw 数据
```javascript
localStorage.removeItem('TLDRAW_DOCUMENT_v2')
localStorage.removeItem('flush-v5-clean')
location.reload()
```

### 方法 3：更换 persistenceKey
在 `TldrawBoard.jsx` 第 834 行，把：
```javascript
persistenceKey="flush-v5-clean"
```
改成：
```javascript
persistenceKey="flush-v6-clean"
```

## 最佳实践

1. **删除前先检查**：删除组件前，先确保画布上没有该组件的实例
2. **备份重要内容**：删除核心组件前，先导出画布内容
3. **定期清理**：定期清除不用的 localStorage 数据

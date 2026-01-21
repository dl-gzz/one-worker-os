#!/usr/bin/env node

/**
 * Registry Guard - 自动验证和修复 registry.js
 * 运行: node scripts/registry-guard.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHAPES_DIR = path.join(__dirname, '../src/components/shapes');
const REGISTRY_FILE = path.join(SHAPES_DIR, 'registry.js');

console.log('🛡️ Registry Guard - 开始检查...\n');

// 1. 读取 registry.js
let registryContent = fs.readFileSync(REGISTRY_FILE, 'utf-8');
console.log('📖 读取 registry.js');

// 2. 提取所有 import 语句
const importRegex = /import\s+{\s*(\w+)\s*}\s+from\s+['"]\.\/(\w+)['"]/g;
const imports = [];
let match;

while ((match = importRegex.exec(registryContent)) !== null) {
    imports.push({
        className: match[1],
        fileName: match[2] + '.jsx',
        fullMatch: match[0]
    });
}

console.log(`找到 ${imports.length} 个导入声明\n`);

// 3. 检查文件是否存在
const invalidImports = [];
const validImports = [];

imports.forEach(imp => {
    const filePath = path.join(SHAPES_DIR, imp.fileName);
    const exists = fs.existsSync(filePath);

    if (exists) {
        validImports.push(imp);
        console.log(`✅ ${imp.fileName} - 存在`);
    } else {
        invalidImports.push(imp);
        console.log(`❌ ${imp.fileName} - 不存在`);
    }
});

// 4. 如果有无效引用，自动修复
if (invalidImports.length > 0) {
    console.log(`\n⚠️ 发现 ${invalidImports.length} 个无效引用，开始自动修复...\n`);

    // 备份原文件
    const backupFile = REGISTRY_FILE + '.backup';
    fs.copyFileSync(REGISTRY_FILE, backupFile);
    console.log(`💾 已备份到: ${backupFile}`);

    // 移除无效的 import
    invalidImports.forEach(imp => {
        const importLine = imp.fullMatch;
        registryContent = registryContent.replace(importLine + ';\n', '');
        console.log(`🗑️  移除导入: ${imp.className}`);
    });

    // 移除数组中的无效注册
    invalidImports.forEach(imp => {
        const arrayItemRegex = new RegExp(`\\s*${imp.className},?\\s*\n`, 'g');
        registryContent = registryContent.replace(arrayItemRegex, '');
        console.log(`🗑️  移除注册: ${imp.className}`);
    });

    // 写回文件
    fs.writeFileSync(REGISTRY_FILE, registryContent);
    console.log('\n✅ registry.js 已自动修复！');
    console.log('📝 现在只包含以下有效组件:');
    validImports.forEach(imp => console.log(`   - ${imp.className}`));

} else {
    console.log('\n✅ 所有引用都有效，无需修复！');
}

console.log('\n🎉 检查完成！');

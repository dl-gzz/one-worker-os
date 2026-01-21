/**
 * Vite Plugin: Auto Registry Guard (Enhanced v3)
 * 自动修复 + 智能等待 + 重试机制
 */

import fs from 'fs';
import path from 'path';

export function autoRegistryGuard() {
    const SHAPES_DIR = 'src/components/shapes';
    const REGISTRY_FILE = path.join(SHAPES_DIR, 'registry.js');

    // 新增：等待文件创建的最大时间（秒）
    const MAX_WAIT_TIME = 5;

    // 新增：检查文件是否存在，带重试
    async function waitForFile(filePath, maxWaitMs = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            if (fs.existsSync(filePath)) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    async function checkAndFix(forceWait = false) {
        try {
            if (!fs.existsSync(REGISTRY_FILE)) return;

            let registryContent = fs.readFileSync(REGISTRY_FILE, 'utf-8');
            let fixed = false;

            // 1. 提取所有导入
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

            const invalidImports = [];
            const validClasses = [];
            const pendingFiles = [];

            // 新增：检测数组中使用但未导入的类名
            const arrayMatch = registryContent.match(/export const customShapeUtils = \[([\s\S]*?)\];/);
            if (arrayMatch) {
                const arrayContent = arrayMatch[1];
                // 提取数组中的所有类名（忽略注释）
                const usedClassRegex = /(\w+ShapeUtil)/g;
                const usedClasses = [];
                let classMatch;
                while ((classMatch = usedClassRegex.exec(arrayContent)) !== null) {
                    // 不在注释中
                    const lineStart = arrayContent.lastIndexOf('\n', classMatch.index);
                    const lineEnd = arrayContent.indexOf('\n', classMatch.index);
                    const line = arrayContent.substring(lineStart, lineEnd);
                    if (!line.trim().startsWith('//')) {
                        usedClasses.push(classMatch[1]);
                    }
                }

                // 检查哪些类名在数组中使用但没有导入
                const importedClasses = imports.map(imp => imp.className);
                const undefinedClasses = usedClasses.filter(cls => !importedClasses.includes(cls));

                if (undefinedClasses.length > 0) {
                    console.log(`⚠️  检测到 ${undefinedClasses.length} 个未导入的类名: ${undefinedClasses.join(', ')}`);
                    // 将这些类名从数组中移除
                    undefinedClasses.forEach(cls => {
                        const removeRegex = new RegExp(`\\s*${cls},?\\s*\\n`, 'g');
                        registryContent = registryContent.replace(removeRegex, '\n');
                        console.log(`   🗑️  移除未定义: ${cls}`);
                    });
                    fixed = true;
                }
            }

            // 2. 检查文件是否存在（带等待）
            for (const imp of imports) {
                const filePath = path.join(SHAPES_DIR, imp.fileName);
                const exists = fs.existsSync(filePath);

                if (exists) {
                    validClasses.push(imp.className);
                } else {
                    // 新增：可能正在创建，等待一下
                    if (forceWait) {
                        console.log(`⏳ 等待文件创建: ${imp.fileName}...`);
                        const appeared = await waitForFile(filePath, 3000);
                        if (appeared) {
                            console.log(`✅ 文件已创建: ${imp.fileName}`);
                            validClasses.push(imp.className);
                        } else {
                            console.log(`❌ 超时: ${imp.fileName} 未创建`);
                            invalidImports.push(imp);
                        }
                    } else {
                        // 标记为可能正在创建
                        pendingFiles.push(imp);
                    }
                }
            }

            // 3. 如果有待定文件，延迟处理
            if (pendingFiles.length > 0 && !forceWait) {
                console.log(`🔄 检测到 ${pendingFiles.length} 个待定文件，3秒后重新检查...`);
                setTimeout(() => {
                    checkAndFix(true); // 强制等待模式
                }, 3000);
                return; // 暂时不修复
            }

            // 4. 移除确认无效的引用
            if (invalidImports.length > 0) {
                fixed = true;
                console.log('\n🛡️ Registry Guard: 检测到无效引用');

                invalidImports.forEach(imp => {
                    registryContent = registryContent.replace(imp.fullMatch + ';\n', '');
                    registryContent = registryContent.replace(imp.fullMatch + ';', '');
                    console.log(`   ❌ 移除: ${imp.className} (文件不存在)`);
                });
            }

            // 5. 重新格式化数组
            const arrayMatch2 = registryContent.match(/export const customShapeUtils = \[([\s\S]*?)\];/);
            if (arrayMatch2 && validClasses.length > 0) {
                const currentArrayContent = arrayMatch2[1];
                const hasFormatIssue = /\/\/.*?(\w+ShapeUtil)/.test(currentArrayContent);

                if (hasFormatIssue || invalidImports.length > 0) {
                    fixed = true;
                    console.log('   🔧 重新格式化数组...');

                    const coreClasses = ['BrowserShapeUtil', 'AITerminalShapeUtil'];
                    const otherClasses = validClasses.filter(cls => !coreClasses.includes(cls));

                    const arrayItems = [
                        ...coreClasses.filter(cls => validClasses.includes(cls)).map(cls => `    ${cls},`),
                        ...otherClasses.map(cls => `    ${cls},`),
                        '    // AI_INSERT_POINT (AI 将在这里插入新的 Shape)'
                    ];

                    const newArrayContent = arrayItems.join('\n');

                    registryContent = registryContent.replace(
                        /export const customShapeUtils = \[[\s\S]*?\];/,
                        `export const customShapeUtils = [\n${newArrayContent}\n];`
                    );

                    console.log('   ✅ 数组已规范化');
                }
            }

            // 6. 保存修复后的文件
            if (fixed) {
                const backupFile = REGISTRY_FILE + '.backup';
                fs.copyFileSync(REGISTRY_FILE, backupFile);
                fs.writeFileSync(REGISTRY_FILE, registryContent);
                console.log('   💾 已自动修复并备份\n');
            }
        } catch (error) {
            console.error('❌ Registry Guard Error:', error.message);
        }
    }

    return {
        name: 'auto-registry-guard',

        // 服务器启动时检查
        buildStart() {
            console.log('🛡️ Registry Guard v3: 已启动（智能等待模式）');
            checkAndFix();
        },

        // 关键：强制完整刷新
        handleHotUpdate({ file, server }) {
            // registry.js 改变时强制完整刷新
            if (file.endsWith('registry.js')) {
                console.log('\n🔄 Registry 已更新，延迟检查...');

                // 延迟更长时间，给 OpenCode 时间创建文件
                setTimeout(async () => {
                    await checkAndFix(true); // 强制等待模式

                    // 检查完成后才刷新
                    server.ws.send({
                        type: 'full-reload',
                        path: '*'
                    });
                }, 1000); // 增加到 1 秒

                // 暂时不刷新，等检查完成
                return [];
            }
        },

        // 监控 shapes 目录
        configureServer(server) {
            const shapesPath = path.resolve(SHAPES_DIR);

            server.watcher.on('all', (event, filePath) => {
                // 新组件文件创建时检查
                if (filePath.includes(shapesPath) && filePath.endsWith('.jsx')) {
                    if (event === 'add') {
                        console.log(`📁 新文件创建: ${path.basename(filePath)}`);
                        // 文件创建后，重新检查 registry
                        setTimeout(() => {
                            checkAndFix();
                        }, 500);
                    }
                }
            });
        }
    };
}

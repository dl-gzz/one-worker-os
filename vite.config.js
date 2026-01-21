import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { autoRegistryGuard } from './vite-plugins/auto-registry-guard.js'
import eslint from 'vite-plugin-eslint'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    autoRegistryGuard(), // 自动修复 registry.js 中的无效引用
    eslint({
      cache: false,
      include: ['src/**/*.js', 'src/**/*.jsx'],
      exclude: ['node_modules', 'dist'],
      // 只检查特定文件以提高性能
      lintOnStart: false,
      // 编辑时实时检查
      emitWarning: true,
      emitError: true,
      failOnError: false, // 不阻止开发服务器，只显示错误
    })
  ],
  server: {
    watch: {
      // 强制完整刷新的文件（Shape 注册必须重新加载整个应用）
      ignored: ['!**/src/components/shapes/registry.js']
    },
    hmr: {
      // registry.js 改变时不使用 HMR，而是完全刷新
      overlay: true
    }
  }
})

#!/bin/bash
# 发布新版本脚本
# 用法: ./release.sh 0.2.0

if [ -z "$1" ]; then
  echo "用法: ./release.sh <版本号>"
  echo "例如: ./release.sh 0.2.0"
  exit 1
fi

VERSION=$1

echo "📦 准备发布 v${VERSION}"

# 更新 package.json 版本
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json

# 更新 Cargo.toml 版本
sed -i "s/^version = \".*\"/version = \"${VERSION}\"/" src-tauri/Cargo.toml

# 更新 tauri.conf.json 版本
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json

echo "✅ 版本号已更新为 ${VERSION}"

# 提交并打 tag
git add -A
git commit -m "release: v${VERSION}"
git tag "v${VERSION}"

echo "🏷️  已创建 tag: v${VERSION}"
echo ""
echo "推送到远程仓库触发自动构建:"
echo "  # GitHub:"
echo "  git push origin master --tags"
echo ""
echo "  # GitLab:"
echo "  git push origin main --tags"
echo ""
echo "CI 会自动构建:"
echo "  - macOS (.dmg)"
echo "  - Linux (.AppImage, .deb)"
echo "  - Windows (.msi, .exe)"

#!/bin/bash

echo "🔧 Setting up development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Please run this script from the project root directory"
  exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install app_code dependencies
echo "📦 Installing app_code dependencies..."
cd app_code
pnpm install

# Install and setup Husky (modern approach)
echo "🐕 Setting up Husky git hooks..."
cd ..
npx husky init

# Ensure our custom hooks are in place and executable
echo "📋 Setting up custom git hooks..."
cp .husky/pre-commit .husky/pre-commit.bak 2>/dev/null || true
cp .husky/pre-push .husky/pre-push.bak 2>/dev/null || true

# Make sure git hooks are executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# Verify husky is working
echo "🔍 Verifying Husky setup..."
if [ -f ".husky/_/husky.sh" ]; then
  echo "✅ Husky is properly configured"
else
  echo "⚠️  Husky may not be fully configured - check manually"
fi

echo "✅ Development environment setup complete!"
echo ""
echo "📋 What was installed:"
echo "  • Git pre-commit hooks (format, lint, typecheck)"
echo "  • Git pre-push hooks (tests, build)"
echo "  • All project dependencies"
echo "  • Modern Husky git hook management"
echo ""
echo "💡 Tips:"
echo "  • Run 'cd app_code && pnpm format' to auto-fix formatting issues"
echo "  • Run 'cd app_code && pnpm lint --fix' to auto-fix linting issues"
echo "  • Run 'cd app_code && pnpm test' to run tests locally"
echo "  • Git hooks will automatically run these checks before commits/pushes"
echo ""
echo "🧪 Test your setup:"
echo "  • Make a small change and try to commit - hooks should run automatically"
echo "  • Check hook status: ls -la .husky/" 
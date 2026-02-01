# 🤝 Contributing to QualityHub CLI

Thank you for your interest in contributing!

## 🚀 Quick Start

```bash
# Fork and clone
git clone https://github.com/ybentlili/qualityhub-cli.git
cd qualityhub-cli

# Install dependencies
npm install

# Build
npm run build

# Link locally
npm link

# Test
qualityhub --help
qualityhub parse jest ./examples/jest
```

## 🔧 Development

### Adding a New Parser

1. Create parser in `src/parsers/your-parser.ts`
2. Extend `BaseParser` class
3. Implement `parse()` method
4. Add tests in `examples/your-format/`
5. Update README.md

Example:
```typescript
import { BaseParser, QAResultOutput } from './base.parser';

export class YourParser extends BaseParser {
  async parse(filePath: string): Promise<QAResultOutput> {
    // Your implementation
  }
}
```

### Testing Your Changes

```bash
# Build
npm run build

# Test with examples
qualityhub parse jest ./examples/jest
qualityhub parse jacoco ./examples/jacoco/jacoco.xml
qualityhub parse junit ./examples/junit
```

## 📝 Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(parser): add pytest parser
fix(jest): correct coverage calculation
docs: update README examples
```

## 🔀 Pull Requests

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request

## 🐛 Reporting Bugs

Open an [issue](https://github.com/ybentlili/qualityhub-cli/issues) with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version)

## 💡 Feature Requests

We welcome feature ideas! Please open an [issue](https://github.com/ybentlili/qualityhub-cli/issues) describing:
- The use case
- Why it's valuable
- Possible implementation

## 📋 Code Style

- TypeScript strict mode
- ESLint rules (auto-fixed on commit)
- Meaningful variable names
- Comments for complex logic

## ✅ Checklist

Before submitting a PR:
- [ ] Code builds without errors
- [ ] All parsers work with examples
- [ ] README updated (if needed)
- [ ] No TypeScript errors
- [ ] Conventional commit messages

---

Thank you for contributing! 🚀
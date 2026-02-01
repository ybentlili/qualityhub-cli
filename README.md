# 🔧 QualityHub CLI

[![npm version](https://img.shields.io/npm/v/qualityhub-cli.svg)](https://www.npmjs.com/package/qualityhub-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

Command-line tool to parse test results, generate `qa-result.json`, and push to QualityHub for AI-powered quality analysis.

## ✨ Features

- 🧪 **Parse test results** from Jest, JaCoCo, JUnit
- 📊 **Generate qa-result.json** automatically
- 🚀 **Push to QualityHub** backend
- 🎨 **Colorful output** with risk analysis
- ⚡ **Fast and lightweight**

---

## 🚀 Installation

### Global Installation (Recommended)

```bash
npm install -g qualityhub-cli
```

### Local Development

```bash
git clone https://github.com/ybentlili/qualityhub-cli
cd qualityhub-cli
npm install
npm run build
npm link
```

---

## 📖 Usage

### 1️⃣ Initialize Project

```bash
qualityhub init
```

Creates `.qualityhub.yaml`:
```yaml
api_endpoint: http://localhost:8080
project_name: ''
```

---

### 2️⃣ Parse Test Results

#### **Jest** (JavaScript/TypeScript)

```bash
# Parse Jest coverage
qualityhub parse jest ./coverage

# With options
qualityhub parse jest ./coverage \
  --output qa-result.json \
  --project my-app \
  --version 1.2.3 \
  --commit abc123 \
  --branch main
```

**Required files**:
- `coverage/coverage-summary.json` (required)
- `test-results.json` (optional)

---

#### **JaCoCo** (Java Coverage)

```bash
# Parse JaCoCo XML report
qualityhub parse jacoco ./target/site/jacoco/jacoco.xml

# With options
qualityhub parse jacoco ./build/reports/jacoco/test/jacocoTestReport.xml \
  --output qa-result.json \
  --project my-java-app
```

**Required files**:
- `jacoco.xml`

---

#### **JUnit** (Java/Kotlin/Python Tests)

```bash
# Parse JUnit XML reports
qualityhub parse junit ./build/test-results/test

# With options
qualityhub parse junit ./target/surefire-reports \
  --output qa-result.json \
  --project my-api
```

**Required files**:
- `TEST-*.xml` files

---

### 3️⃣ Push to QualityHub

```bash
qualityhub push qa-result.json
```

**Output example**:
```
✅ QA results uploaded successfully!

Result ID: 123e4567-e89b-12d3-a456-426614174000
Risk Score: 85/100
Status: SAFE
Decision: PROCEED

View details: http://localhost:3000/dashboard
```

---

## 🎯 Complete Workflow

```bash
# 1. Initialize (once)
qualityhub init

# 2. Run your tests with coverage
npm test -- --coverage              # Jest
./gradlew test jacocoTestReport     # Java/Gradle
mvn test jacoco:report               # Java/Maven

# 3. Parse results
qualityhub parse jest ./coverage

# 4. Push to QualityHub
qualityhub push qa-result.json

# 5. View in dashboard
open http://localhost:3000/dashboard
```

---

## 📄 qa-result.json Format

Generated `qa-result.json`:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-app",
    "version": "1.0.0",
    "commit": "abc123",
    "branch": "main",
    "timestamp": "2026-01-31T20:00:00Z"
  },
  "quality": {
    "tests": {
      "total": 247,
      "passed": 245,
      "failed": 2,
      "skipped": 0,
      "duration_ms": 8234,
      "flaky_tests": ["UserAuthTest.testTimeout"]
    },
    "coverage": {
      "lines": 87.33,
      "branches": 82.24,
      "functions": 91.28,
      "statements": 88.74
    }
  },
  "metadata": {
    "ci_provider": "github-actions",
    "adapters": ["jest"]
  }
}
```

---

## 🧪 Examples

See `examples/` directory for mock test files:

- `examples/jest/` - Jest coverage + test results
- `examples/jacoco/` - JaCoCo XML report
- `examples/junit/` - JUnit XML reports

### Test with examples:

```bash
qualityhub parse jest ./examples/jest
qualityhub parse jacoco ./examples/jacoco/jacoco.xml
qualityhub parse junit ./examples/junit
```

---

## 🔧 CLI Options

### `parse` command

```bash
qualityhub parse <format> <path> [options]
```

**Arguments**:
- `<format>`: Parser type (`jest`, `jacoco`, `junit`)
- `<path>`: Path to test results

**Options**:
- `-o, --output <file>`: Output file (default: `qa-result.json`)
- `-p, --project <name>`: Project name
- `-v, --version <version>`: Project version
- `-c, --commit <hash>`: Git commit hash
- `-b, --branch <name>`: Git branch name

---

## 🎨 Supported Frameworks

| Framework | Language | Parser | Coverage | Tests |
|-----------|----------|--------|----------|-------|
| **Jest** | JavaScript/TypeScript | ✅ | ✅ | ✅ |
| **JaCoCo** | Java/Kotlin | ✅ | ✅ | ❌ |
| **JUnit** | Java/Kotlin/Python | ✅ | ❌ | ✅ |

**Combine parsers** for complete coverage:
```bash
# Java project: JUnit (tests) + JaCoCo (coverage)
qualityhub parse junit ./target/surefire-reports
# Then merge coverage from JaCoCo manually
```

---

## 🐛 Troubleshooting

### Parser not finding files

```bash
# Check file locations
ls -la coverage/
ls -la target/site/jacoco/
ls -la build/test-results/

# Use absolute paths
qualityhub parse jest /Users/me/project/coverage
```

### Backend connection refused

```bash
# Check backend is running
curl http://localhost:8080/api/v1/health

# Update .qualityhub.yaml
api_endpoint: http://localhost:8080
```

---

## 🔗 Links

- **Main Repository**: [qualityhub](https://github.com/ybentlili/qualityhub)
- **Issues**: [GitHub Issues](https://github.com/ybentlili/qualityhub-cli/issues)
- **npm Package**: [qualityhub-cli](https://www.npmjs.com/package/qualityhub-cli)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

**Built with ❤️ by the QualityHub community**
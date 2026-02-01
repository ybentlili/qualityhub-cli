# Changelog

All notable changes to QualityHub CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-01

### Added
- Initial release of QualityHub CLI
- `qualityhub init` - Initialize project configuration
- `qualityhub parse` - Parse test results and generate qa-result.json
- `qualityhub push` - Upload results to QualityHub backend
- Jest parser - Parse Jest coverage and test results
- JaCoCo parser - Parse JaCoCo XML coverage reports
- JUnit parser - Parse JUnit XML test results
- Example files for all parsers
- Colorful terminal output with risk score visualization
- Auto-detection of CI/CD environment variables
- Support for custom project metadata

### Features
- 🧪 Parse Jest coverage (coverage-summary.json + test-results.json)
- 📊 Parse JaCoCo XML reports (jacoco.xml)
- ✅ Parse JUnit XML reports (TEST-*.xml)
- 🎨 Beautiful colored CLI output
- 🔧 Configurable via .qualityhub.yaml
- 🚀 Push results to backend with risk analysis
- 📦 Examples included for testing

### Documentation
- Complete README with usage examples
- Parser-specific documentation
- Example files for all supported formats
- Contributing guidelines

## [Unreleased]

### Planned Features
- [ ] pytest parser (Python)
- [ ] XCTest parser (iOS/Swift)
- [ ] Rust test parser
- [ ] Auto-detection of test framework
- [ ] CI/CD pipeline templates
- [ ] GitHub Action
- [ ] GitLab CI template

---

For more details, see the [GitHub Releases](https://github.com/ybentlili/qualityhub-cli/releases) page.
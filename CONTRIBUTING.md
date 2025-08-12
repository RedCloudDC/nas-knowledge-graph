# Contributing to NAS Knowledge Graph Demo

Thank you for your interest in contributing to the NAS Knowledge Graph Demo project! This document outlines the development workflow and guidelines for contributing.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Python 3 (for local development server)

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/USERNAME/nas-knowledge-graph-demo.git
   cd nas-knowledge-graph-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Git hooks:
   ```bash
   npm run prepare
   ```

## 🛠️ Local Development Workflow

### Development Server

Start the local development server:
```bash
npm run dev
```

This will start a Python HTTP server on `http://localhost:8080`. Open this URL in your browser to view the application.

### Code Quality Tools

This project uses several tools to maintain code quality:

#### ESLint (Linting)
```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors where possible
npm run lint:fix
```

#### Prettier (Code Formatting)
```bash
# Check if files are properly formatted
npm run format:check

# Format all files
npm run format
```

#### Jest (Unit Testing)
```bash
# Run tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch
```

### Pre-commit Hooks

The project uses Husky to run pre-commit hooks that:
1. Format code with Prettier
2. Fix ESLint issues
3. Run all tests

These run automatically when you commit, but you can also run them manually:
```bash
npx lint-staged
```

## 📁 Project Structure

```
nas-knowledge-graph-demo/
├── .github/
│   └── workflows/
│       └── gh-pages.yml          # GitHub Actions for deployment
├── assets/
│   └── styles.css                # Main stylesheet
├── data/
│   └── sample-data.json          # Sample knowledge graph data
├── docs/                         # Generated documentation (auto-created)
├── src/
│   ├── main.js                   # Main application logic
│   └── main.test.js              # Unit tests for main.js
├── tests/
│   └── setup.js                  # Jest test setup
├── .eslintrc.js                  # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .husky/                       # Git hooks
├── jest.config.js                # Jest configuration
├── package.json                  # Project dependencies and scripts
└── index.html                    # Main HTML file
```

## 🔧 Development Guidelines

### Code Style

- Use ES6+ features and modern JavaScript
- Follow the configured ESLint rules
- Use single quotes for strings
- Use 4-space indentation
- Add JSDoc comments for functions and classes

### Testing

- Write unit tests for new features
- Maintain test coverage above 80%
- Use descriptive test names
- Mock external dependencies

### Commit Messages

Follow conventional commit format:
```
type(scope): description

Examples:
feat(graph): add node filtering functionality
fix(ui): resolve mobile layout issues
docs(readme): update installation instructions
test(graph): add tests for edge rendering
```

### Pull Request Process

1. **Fork the repository** and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding guidelines

3. **Test your changes**:
   ```bash
   npm run build  # This runs lint and tests
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork** and create a pull request

## 📦 Build and Deployment

### Local Build
```bash
npm run build
```

This command:
- Runs ESLint to check for code issues
- Runs all tests to ensure functionality

### GitHub Pages Deployment

The project automatically deploys to GitHub Pages when changes are pushed to the `main` branch. The deployment process:

1. Runs quality checks (linting, testing, formatting)
2. Builds the project
3. Copies files to the `docs/` directory
4. Deploys to GitHub Pages

To configure GitHub Pages:
1. Go to your repository's Settings
2. Navigate to Pages
3. Select "GitHub Actions" as the source

## 🐛 Debugging

### Common Issues

**Tests failing locally but passing in CI:**
- Check Node.js version compatibility
- Ensure all dependencies are installed: `npm ci`

**ESLint errors:**
- Run `npm run lint:fix` to auto-fix issues
- Check `eslint.config.js` for rule configurations

**Prettier formatting issues:**
- Run `npm run format` to format all files
- Check `.prettierrc` for formatting rules

### Debug Mode

To debug the application:
1. Open browser developer tools
2. Check console for JavaScript errors
3. Use browser debugger to step through code

## 🤝 Getting Help

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the README.md and inline code comments

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License.

## 🎯 Development Roadmap

Current focus areas for contributions:
- Enhanced graph visualization features
- Additional NAS knowledge domains
- Improved mobile responsiveness
- Performance optimizations
- Accessibility improvements

---

Thank you for contributing to the NAS Knowledge Graph Demo! 🚀

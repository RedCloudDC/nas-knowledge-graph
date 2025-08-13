# NAS Knowledge Graph Demo

Interactive visualization of NAS (Network Attached Storage) knowledge relationships using modern web technologies.

[![Deploy to GitHub Pages](https://github.com/USERNAME/nas-knowledge-graph-demo/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/USERNAME/nas-knowledge-graph-demo/actions/workflows/gh-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **Interactive Knowledge Graph**: Visual representation of NAS concepts and their relationships
- **Node Interaction**: Click nodes to view detailed information
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern JavaScript**: Built with ES6+ features and modern web APIs
- **Comprehensive Testing**: Unit tests with Jest for reliability
- **Code Quality**: ESLint and Prettier for consistent code formatting
- **Automated Deployment**: GitHub Actions for continuous deployment to GitHub Pages

## 🚀 Live Demo

Visit the live demo at: [https://USERNAME.github.io/nas-knowledge-graph-demo](https://USERNAME.github.io/nas-knowledge-graph-demo)

### Demo Features
- **Interactive Graph Visualization**: Explore NAS concepts through an interactive knowledge graph
- **Advanced Analytics**: Equipment failure analysis, geographic distribution, maintenance timelines
- **Smart Search**: Global search with advanced filtering capabilities
- **Path Finding**: Discover relationships between different NAS concepts
- **Real-time Analysis**: Performance monitoring and trend detection

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visualization**: SVG with custom graph rendering
- **Testing**: Jest with jsdom environment
- **Code Quality**: ESLint, Prettier, Husky
- **CI/CD**: GitHub Actions
- **Deployment**: GitHub Pages

## 📋 Prerequisites

- Node.js 18+ and npm
- Git
- Python 3 (for local development server)

## 🏗️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/USERNAME/nas-knowledge-graph-demo.git
   cd nas-knowledge-graph-demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Git hooks**:
   ```bash
   npm run prepare
   ```

## 🚀 Usage

### Development

Start the local development server:
```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local development server |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code for linting errors |
| `npm run lint:fix` | Fix linting errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check if code is properly formatted |
| `npm run build` | Run linting and tests |

## 📁 Project Structure

```
nas-knowledge-graph-demo/
├── .github/workflows/          # GitHub Actions workflows
├── assets/                     # Static assets (CSS, images)
├── data/                      # Knowledge graph data files
├── docs/                      # Documentation (auto-generated)
├── src/                       # Source code
│   ├── main.js               # Main application logic
│   └── main.test.js          # Unit tests
├── tests/                     # Test configuration
├── index.html                 # Main HTML file
├── package.json              # Dependencies and scripts
└── CONTRIBUTING.md           # Development guidelines
```

## 🎯 How It Works

The application creates an interactive knowledge graph that visualizes relationships between NAS-related concepts:

1. **Data Structure**: Knowledge is represented as nodes (concepts) and edges (relationships)
2. **Visualization**: SVG-based rendering with custom positioning and styling
3. **Interaction**: Click nodes to explore connections and view detailed information
4. **Responsive**: Adapts to different screen sizes for optimal viewing

### Sample Data

The demo includes sample NAS knowledge covering:
- Hardware components (NAS devices)
- Storage concepts (RAID, Storage pools)
- Network protocols (SMB, NFS, etc.)
- Management processes (Backup strategies)

## 🧪 Testing

The project includes comprehensive unit tests:

```bash
# Run tests once
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- main.test.js
```

## 🚀 Deployment

### Automatic Deployment

The project automatically deploys to GitHub Pages when changes are pushed to the `main` branch.

### Manual Deployment

To deploy manually:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Create GitHub Pages configuration**:
   - Go to repository Settings → Pages
   - Select "GitHub Actions" as source
   - The workflow will handle the rest

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Complete Documentation Index](docs/README.md)** - Overview of all documentation
- **[User Guide](docs/user-guide.md)** - Step-by-step tutorial with screenshots
- **[Technical Documentation](docs/technical.md)** - Architecture and development guide
- **[API Reference](docs/api/README.md)** - Auto-generated API documentation
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

### Quick Documentation Links
- 🎆 **New users**: Start with the [User Guide](docs/user-guide.md)
- 🛠️ **Developers**: Read [Technical Documentation](docs/technical.md)
- 🐛 **Issues**: Check [Troubleshooting Guide](docs/troubleshooting.md)
- 📝 **API**: Browse [API Reference](docs/api/README.md)

## 🔙 Acknowledgments

- Inspired by modern knowledge management and visualization techniques
- Built with love for the NAS and data storage community
- Thanks to all contributors who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/USERNAME/nas-knowledge-graph-demo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/USERNAME/nas-knowledge-graph-demo/discussions)
- **Documentation**: See [docs/README.md](docs/README.md) for comprehensive guides

---

**Made with ❤️ for the NAS community**

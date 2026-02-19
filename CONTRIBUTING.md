# Contributing to MD2PDF

Thank you for your interest in contributing to MD2PDF! We welcome contributions from the community to help make this tool even better.

## 🚀 Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/md2pdf.git
   cd md2pdf
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## 🛠️ Development

### Available Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run test`: Run unit tests (Vitest).
- `npm run typecheck`: Run TypeScript type checks.
- `npm run visual:test`: Run visual regression tests (Playwright).

### Code Style

- Use TypeScript for all new logic.
- Follow the existing project structure.
- Ensure all tests pass before submitting a Pull Request.

## 🧪 Testing

We use **Vitest** for unit testing and **Playwright** for visual regression tests.

- To run unit tests: `npm test`
- To run unit tests with coverage: `npm run test:coverage`

Please include tests for any new features or bug fixes.

## 📝 Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `chore:` for maintenance tasks

## 📬 Submitting a Pull Request

1. Push your changes to your fork.
2. Submit a Pull Request to the `main` branch.
3. Provide a clear description of the changes and any related issues.
4. Wait for review and address any feedback.

## 📜 Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

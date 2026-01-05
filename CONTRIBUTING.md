# Contributing to taiwan-holiday-cli

感謝您有興趣貢獻此專案！

## Development Setup

```bash
# Clone the repository
git clone https://github.com/lis186/taiwan-holiday-cli.git
cd taiwan-holiday-cli

# Install dependencies
npm install

# Run in development mode
npm run dev -- today

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build
```

## Project Structure

```
src/
├── cli.ts              # CLI entry point
├── commands/           # Command implementations
├── services/           # Business logic
│   ├── holiday-service.ts
│   └── holiday-repository.ts
├── lib/                # Utilities
│   ├── constants.ts    # Centralized constants
│   ├── date-parser.ts  # Date parsing utilities
│   ├── errors.ts       # Error classes
│   ├── formatter.ts    # Output formatting
│   └── output.ts       # Console output
└── types/              # TypeScript types
    └── holiday.ts
```

## Code Style

- TypeScript with strict mode enabled
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow existing code patterns

## Testing

We maintain 95%+ test coverage. Please ensure:

1. All new code has tests
2. All tests pass: `npm test`
3. Coverage doesn't drop: `npm run test:coverage`

```bash
# Run specific test file
npm test -- tests/unit/commands/check.test.ts

# Run tests in watch mode
npm run test:watch
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit with clear message: `git commit -m "feat: add new feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add support for lunar calendar holidays

- Add lunar date parsing
- Update holiday data structure
- Add tests for lunar dates
```

## Reporting Issues

When reporting issues, please include:

1. Node.js version (`node --version`)
2. OS and version
3. Steps to reproduce
4. Expected vs actual behavior
5. Error messages (if any)

## Questions?

Feel free to open an issue for questions or discussions.

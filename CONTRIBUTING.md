# Contributing to NestJS-Undici

Thank you for considering contributing to NestJS-Undici.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept responsibility and apologize when needed

## How to Contribute

### Reporting Bugs

Before creating bug reports, check existing issues to avoid duplicates.

When reporting a bug, include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Code samples or test cases
- Your environment (Node.js version, OS, etc.)
- Stack traces or error messages

### Suggesting Features

When suggesting a feature:
- Use a clear and descriptive title
- Provide a detailed description
- Include examples of usage
- Explain why it would be useful

### Pull Requests

1. Fork the repository and create your branch from `main`
2. Install dependencies: `npm install`
3. Make your changes following our coding standards
4. Add tests for new functionality
5. Run tests: `npm test`
6. Run linter: `npm run lint`
7. Commit using conventional commits
8. Push to your fork and submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/ricardogarim/nestjs-undici.git
cd nestjs-undici

# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run linter
npm run lint
```

## Coding Standards

### TypeScript
- Use TypeScript strict mode
- Provide types for all parameters and return values
- Avoid `any` type
- Use interfaces for object shapes
- Document complex types with JSDoc

### Code Style
- We use Biome for linting and formatting
- Run `npm run lint` before committing
- Follow existing code style
- Keep functions small and focused
- Use meaningful names

### Testing
- Write unit tests for all features
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases and errors
- Mock external dependencies

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

Examples:
```
feat(http): add retry mechanism
fix(interceptors): handle async errors
docs(readme): update installation
test(http-service): add streaming tests
```

## Project Structure

```
nestjs-undici/
├── src/             # Source code
├── test/            # Test files
├── examples/        # Example implementations
└── benchmarks/      # Performance benchmarks
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Debug tests
npm run test:debug
```

### Writing Tests

- Place test files next to code (`.spec.ts`)
- Use descriptive `describe` and `it` blocks
- Follow AAA pattern: Arrange, Act, Assert

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update examples for new features
- Include code examples

## Release Process

1. Changes are merged to `main`
2. CI runs tests and builds
3. Maintainer triggers release workflow
4. Version is bumped according to semver
5. Package is published to NPM
6. GitHub release is created

## Getting Help

- Create an issue for bugs
- Start a discussion for ideas
- Email: support@example.com

Thank you for contributing!
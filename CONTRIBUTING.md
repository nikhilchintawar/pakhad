# Contributing to pakhad

## Setup

```bash
# Clone the repo
git clone https://github.com/nikhilchintawar/pakhad.git
cd pakhad

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm test` to verify tests pass
4. Run `pnpm lint` and `pnpm format` to ensure code style
5. Add a changeset: `pnpm changeset`
6. Open a pull request

## Project Structure

```
packages/
  core/          @pakhad/core — detection engine
  train/         @pakhad/train — model training + serialization
  locale-en/     @pakhad/locale-en — English locale pack
  benchmark/     @pakhad/benchmark — benchmarks (not published)
docs/            Documentation
corpora/         Training data (gitignored, see corpora/README.md)
```

## Adding a Scorer

1. Create `packages/core/src/scorers/your-scorer.ts` implementing the `Scorer` interface
2. Export it from `packages/core/src/scorers/index.ts`
3. Add it to the `defaultScorers` array
4. Write tests in `packages/core/src/__tests__/scorers/your-scorer.test.ts`
5. Document it in `docs/scorer-reference.md`

## Adding a Locale Pack

See [docs/locale-guide.md](docs/locale-guide.md) for the complete guide.

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `pnpm format` before committing)
- Comment the *why*, not the *what*
- No emojis in code or commits
- American English

## Testing

- Unit tests for every scorer
- Integration tests for `detect()`
- 90%+ coverage target on core
- Run `pnpm test` before every PR

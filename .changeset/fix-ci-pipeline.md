---
"@ricardogarim/nestjs-undici": patch
---

Fix CI pipeline by adding package-lock.json and enhancing GitHub Actions workflows

- Add package-lock.json to repository for dependency caching
- Remove package-lock.json from .gitignore
- Add changesets validation to PRs
- Enhanced CI with separate lint, test, build, and security jobs
- Add automated release workflow with changesets
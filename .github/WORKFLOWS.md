# GitHub Workflows Documentation

## Available Workflows

### 1. CI Pipeline (`ci.yml`)
- **Trigger**: Push to main/develop, Pull Requests
- **Purpose**: Run tests, linting, and validate changesets
- **Status**: ✅ Working

### 2. Manual NPM Publish (`manual-publish.yml`)
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Publish to NPM when version is ready
- **Requirements**: 
  - `NPM_TOKEN` secret configured
  - Version already updated in package.json
- **Status**: ✅ Ready to use

### 3. Release with Changesets (`release.yml`)
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Create release PR with changesets
- **Known Issue**: Requires Personal Access Token (PAT) for PR creation
- **Status**: ⚠️ Needs PAT configuration

### 4. Create Version PR (`changeset-version.yml`)
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Create PR with version bumps
- **Status**: ⚠️ Needs PAT configuration

## Setup Requirements

### 1. NPM Token
```bash
# Generate NPM token
npm token create

# Add to GitHub Secrets
# Settings > Secrets > Actions > New repository secret
# Name: NPM_TOKEN
# Value: [your token]
```

### 2. Personal Access Token (PAT) - Optional
For automated PR creation by changesets:

1. Create PAT: https://github.com/settings/tokens/new
2. Scopes needed: `repo`, `workflow`
3. Add as secret: `GH_PAT`
4. Update workflows to use `${{ secrets.GH_PAT }}` instead of `${{ secrets.GITHUB_TOKEN }}`

## Release Process

### Option 1: Manual Release (Recommended)
1. Update version locally:
   ```bash
   npm version patch/minor/major
   ```
2. Push to main:
   ```bash
   git push origin main --tags
   ```
3. Run "Manual NPM Publish" workflow from Actions tab

### Option 2: Changesets (After PAT setup)
1. Create changesets during development:
   ```bash
   npx changeset
   ```
2. Run "Create Version PR" workflow
3. Merge the version PR
4. Run "Release" workflow

## Troubleshooting

### "GitHub Actions is not permitted to create pull requests"
- This is a GitHub limitation with default GITHUB_TOKEN
- Solution: Use Manual Release process or configure PAT

### NPM publish fails with 403
- Ensure NPM_TOKEN is correctly configured
- Verify token has publish permissions
- Check package name availability
# GitHub Actions Workflows

This directory contains CI/CD workflows for the GARA Frontend project.

## Workflows

### 🧪 test.yml - Main Test Workflow

**Triggers:** Push to main/master/develop/claude branches, PRs to main/master/develop

**Jobs:**
- ✅ Lint code with ESLint
- ✅ Run all tests with coverage
- ✅ Upload coverage to Codecov
- ✅ Build Next.js application
- ✅ Comment test results on PRs

**Environment Variables Required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `GARA_API_KEY` - API key for backend (use GitHub Secrets)
- `ADMIN_PASSWORD` - Admin password (use GitHub Secrets)
- `NEXTAUTH_SECRET` - NextAuth secret (use GitHub Secrets)
- `AWS_REGION` - AWS region for S3
- `S3_BUCKET_NAME` - S3 bucket name (use GitHub Secrets)

### 📊 coverage.yml - Coverage Reporting

**Triggers:** Push/PR to main/master

**Jobs:**
- ✅ Generate detailed coverage report
- ✅ Create coverage badge
- ✅ Upload to Codecov
- ✅ Comment coverage on PRs
- ✅ Enforce coverage thresholds (60% minimum)

### 🔍 pr-checks.yml - Pull Request Checks

**Triggers:** PR opened, synchronized, or reopened

**Jobs:**
1. **Lint and Type Check**
   - ESLint validation
   - TypeScript type checking

2. **Test**
   - Run all tests with coverage
   - Verify coverage thresholds
   - Detailed coverage reporting

3. **Build**
   - Build Next.js application
   - Verify build artifacts
   - Check for build errors

## Setup Instructions

### 1. Add GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:
- `GARA_API_KEY` - Your backend API key
- `ADMIN_PASSWORD` - Admin login password
- `NEXTAUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -base64 32`)
- `S3_BUCKET_NAME` - Your AWS S3 bucket name
- `CODECOV_TOKEN` (optional) - For Codecov integration

### 2. Enable GitHub Actions

Ensure GitHub Actions are enabled in your repository settings.

### 3. Configure Branch Protection (Recommended)

Settings → Branches → Add rule

Protect `main` branch with:
- ✅ Require status checks to pass before merging
  - Test workflow
  - Lint and Type Check
  - Build
- ✅ Require branches to be up to date before merging
- ✅ Require linear history

## Local Testing

You can test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run test workflow
act -j test

# Run specific workflow
act -W .github/workflows/test.yml
```

## Monitoring

### View Workflow Runs
- Go to Actions tab in GitHub repository
- Click on workflow name to see runs
- Click on specific run to see detailed logs

### Coverage Reports
- Coverage reports are uploaded to Codecov
- View at: https://codecov.io/gh/YOUR_USERNAME/gara-frontend

### Status Badges

Add to your README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/gara-frontend/workflows/Tests/badge.svg)
![Coverage](https://codecov.io/gh/YOUR_USERNAME/gara-frontend/branch/main/graph/badge.svg)
```

## Troubleshooting

### Tests Failing in CI but Passing Locally

1. **Check Node version:** Ensure local matches CI (20.x)
2. **Clean install:** Run `npm ci` instead of `npm install`
3. **Check env vars:** Verify all required env vars are set
4. **Increase workers:** Adjust `--maxWorkers` if tests timeout

### Build Failing

1. **Check env vars:** All required env vars must be set in workflow
2. **Check dependencies:** Run `npm ci` to ensure clean install
3. **Check TypeScript:** Run `npx tsc --noEmit` locally
4. **Check disk space:** Ensure runner has enough space

### Coverage Upload Failing

1. **Check Codecov token:** Verify `CODECOV_TOKEN` is set in secrets
2. **Check file path:** Ensure `coverage/lcov.info` exists
3. **Check permissions:** Ensure workflow has write permissions

## Performance Optimization

Current settings:
- `--maxWorkers=2` - Limits parallel test execution
- `--ci` - Optimizes for CI environment
- `npm ci` - Fast, clean install
- Node.js caching - Speeds up dependency installation

## Customization

### Change Coverage Threshold

Edit `coverage.yml` and `pr-checks.yml`:

```yaml
--coverageThreshold='{"global":{"branches":70,"functions":70,"lines":70,"statements":70}}'
```

### Add More Node Versions

Edit `test.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]
```

### Add Different OS

Edit any workflow:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [20.x]
runs-on: ${{ matrix.os }}
```

## Best Practices

1. ✅ Always use `npm ci` in CI (faster, more reliable)
2. ✅ Limit parallel workers to avoid flaky tests
3. ✅ Cache dependencies for faster builds
4. ✅ Use GitHub Secrets for sensitive data
5. ✅ Enable branch protection rules
6. ✅ Monitor workflow run times and optimize
7. ✅ Keep workflows focused and modular

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js CI Documentation](https://nextjs.org/docs/deployment#continuous-integration)
- [Jest CI Configuration](https://jestjs.io/docs/configuration#ci-boolean)
- [Codecov Documentation](https://docs.codecov.com)

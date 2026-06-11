# Honeydeck Public Release Governance Specification

> Observable behavior for monorepo CI checks, PR titles, and public `@honeydeck/honeydeck` publishing.

## Protected Branch

`main` is the canonical protected branch. Pull requests target `main`; direct pushes to `main` are not part of the normal release process.

Repository protection is enforced by GitHub branch protection or rulesets. Passing CI is required to merge.

## Pull Request Checks

Every pull request into `main` must pass non-mutating checks before merge:

- dependency installation from the root `package-lock.json`
- Biome formatting/lint validation without writing changes
- TypeScript type checking across workspaces
- workspace test suites
- production build smoke tests for both `@honeydeck/honeydeck` and `@honeydeck/marketing`
- package dry-run validation for publish/deployment package contents
- packed install smoke validation for `@honeydeck/honeydeck` on the minimum supported Node.js version, including `npx honeydeck --help`, `honeydeck init --name smoke --skip-install --skip-skill`, generated project dependency installation, and generated project build

The CI jobs must also run on pushes to `main` so the release branch is continuously verified after merge.

## Conventional Pull Request Titles

Pull request titles must follow Conventional Commits because squash merges use the pull request title as the merge commit subject.

Accepted examples:

```txt
feat: add presenter timer
fix(pdf): wait for custom assets before capture
docs!: reorganize public docs
```

Non-conforming pull request titles must fail a required status check.

## Automated Publishing

Merges to `main` drive automated publishing for the public `@honeydeck/honeydeck` workspace only. The private `@honeydeck/marketing` package is not published to npm.

Release automation must:

- derive the next semantic version from merged Conventional Commit subjects
- output `release=false` and exit successfully when no Conventional Commit subjects are found, so downstream publish and release steps are skipped cleanly
- update `packages/honeydeck/package.json` and the root lockfile metadata for the public package when a release is planned
- verify the packed `@honeydeck/honeydeck` tarball installs and can build a generated starter project on the minimum supported Node.js version before publishing
- publish a new `@honeydeck/honeydeck` npm version for every release-planning merge to `main`
- commit the release version metadata (`packages/honeydeck/package.json` and root `package-lock.json`) back to `main` after publication using a GitHub App installation token that can bypass the `main` ruleset and a non-Conventional Commit `[skip ci]` message so the release commit does not trigger another release
- create a GitHub release with generated release notes when a release is planned, targeting the release version metadata commit when one is created
- use least-privilege workflow permissions and npm trusted publishing through OIDC
- avoid publishing from pull request workflows

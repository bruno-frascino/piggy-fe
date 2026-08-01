# Context maintenance follow-ups

Tracked on 2026-08-01. These items are intentionally deferred; update this document when each item
is verified or resolved.

## Contract freshness

- `yarn context:check` validates the committed vendored contract, not whether it matches the latest
  backend branch. Continue running `yarn contract:pull` after backend API changes.
- Consider a cross-repository contract check or release artifact later. CI intentionally has no
  sibling checkout and cannot run `contract:pull` today.

## Hosted enforcement

- Push a documentation-only test change or use `workflow_dispatch` and confirm the `CI` workflow
  passes on GitHub-hosted Ubuntu. Local lint, test, build, and context checks pass, but the hosted
  workflow has not been verified yet.
- Check the GitHub Actions result after every direct push. The hosted workflow runs after `main` is
  updated, so failures require a follow-up fix or revert; local Husky hooks remain the preventive
  consistency check and can be bypassed.

## Generator maintenance

- Review generated context diffs whenever parser/tool versions change. `ts-morph`,
  dependency-cruiser, knip, Next.js, and OpenAPI tooling upgrades can legitimately reshape output.

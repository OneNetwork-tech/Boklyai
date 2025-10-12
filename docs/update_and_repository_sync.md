# Updating the BoklyAI Project and Syncing to GitHub

This guide explains how to refresh dependencies, run automated checks across the backend, frontend, and AI microservice, and push the resulting changes to GitHub. It is intended for maintainers who need a repeatable process for keeping the repository healthy.

## 1. Prepare your environment

1. Ensure you have recent versions of the following tools installed:
   - **Git** 2.40+ with access to the repository remote.
   - **Node.js** 18 LTS (includes `npm`).
   - **Python** 3.11 with `pip`.
   - **Docker** (optional) if you plan to validate the deployment stack locally.
2. Authenticate to GitHub using SSH or a personal access token so that `git push` succeeds.
3. If you work in a clean shell, run `git config user.name` and `git config user.email` to verify commit metadata.

## 2. Pull the latest code

```bash
cd /path/to/Boklyai
git checkout work
git pull --ff-only
```

Keeping the branch fast-forwarded guarantees you are building on top of the newest work.

## 3. Run the unified update script

From the repository root execute:

```bash
./scripts/update_all.sh
```

The script performs the following operations:

1. Pulls the latest remote changes (skipping if Git is unavailable).
2. Installs backend dependencies, builds the TypeScript sources, and executes Jest tests.
3. Installs frontend dependencies, builds the React application, and runs the React test suite.
4. Creates a Python virtual environment for the AI service, installs dependencies, and runs `pytest`.
5. Prints `git status` so you can review generated or modified files.

> **Tip:** The script tolerates missing toolchains by emitting warnings instead of failing, which is handy when running within minimal CI containers.

## 4. Review and commit changes

Inspect the output and review modifications:

```bash
git status
git diff
```

Stage and commit meaningful updates with a clear message:

```bash
git add <files>
git commit -m "Describe the updates"
```

## 5. Push to GitHub

Once tests pass locally and commits look correct, push the branch:

```bash
git push origin work
```

If you maintain multiple deployment branches (for example, `main` or `staging`), merge or cherry-pick the commit according to your branching model before pushing.

## 6. Update documentation or deployment manifests (optional)

If you changed infrastructure assets—such as `docker-compose.yml`, Kubernetes manifests, or GitHub Actions workflows—make sure `DEPLOYMENT.md` stays current. Commit those documentation updates alongside the code changes.

## 7. Monitor the GitHub workflow

The repository includes automation that builds, tests, and can deploy the application. After pushing, watch the **Actions** tab to confirm the pipeline succeeds. Address any failures before considering the update complete.

## 8. Tag releases when appropriate

For production-ready bundles, tag the repository so that Docker images and deployment artifacts can reference a stable version:

```bash
git tag -a vYYYY.MM.DD -m "Short description"
git push origin vYYYY.MM.DD
```

## 9. Keep credentials secure

Never commit secrets or `.env` files. Instead, manage sensitive values through GitHub repository secrets or your infrastructure’s secret store.

Following this checklist ensures every component of BoklyAI is refreshed and that the GitHub repository remains the source of truth for the latest verified state of the project.

# Repository working agreements

- Read README.md and the task-specific instructions before editing.
- Use git and GitHub CLI for normal status, commit, push, branch, pull request, and workflow operations.
- Confirm the working directory, branch, and remote destination before changing Git state.
- Keep credentials, .env files, private keys, local management documents, and unapproved personal information out of commits.
- Run the relevant checks and review the staged diff before commit. Use `node scripts/git-secret-check.cjs staged` before commit and `node scripts/git-secret-check.cjs history HEAD` before push.
- Hooks in .githooks are enabled locally with `git config core.hooksPath .githooks`; cloning alone does not enable them. Do not bypass the checks to make a push pass.
- Preserve unrelated work. Do not force-push, reset other work, or change visibility unless the task explicitly calls for it.
- Report the actual verification outcome. Keep operational notes where the project maintains them; never log credentials.

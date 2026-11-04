# Needs from the owner

- Branch protection on `main` could not be enabled: the repo is private on a free plan. Make the repo public or upgrade to GitHub Pro, then enable protection (require PRs, require the `check` status).
- Later: an LLM API key in `.env` (`LLM_API_KEY`) for the live AI provider. Tests use the fake provider and do not need it.

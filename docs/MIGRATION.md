# Migration record

- New repository, new initial commit, no merged history.
- Afu stays structurally recognizable under `apps/syno/`; changes are limited to Syno branding, Windows-only behavior and required extension seams.
- The tracked knowledge snapshot is copied under `vault/`; `.obsidian`, caches and credentials are excluded.
- Absolute paths in maintained scripts must resolve from the script/repository location or an explicit argument.
- Existing source repositories remain backups and are never modified by Syno migration.


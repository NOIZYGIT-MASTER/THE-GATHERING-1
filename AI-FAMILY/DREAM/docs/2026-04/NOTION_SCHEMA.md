# NOIZY_RUN_LOG — Notion Database Schema

Create this database in Notion, then copy its ID into `.env` as `NOTION_RUNLOG_DATABASE_ID`.

## Required Properties

| Name         | Type      | Required | Notes                                      |
|--------------|-----------|----------|--------------------------------------------|
| Run ID       | Title     | YES      | Primary key, e.g. `dc-20260402235800-abc1` |
| Intent       | Rich Text | YES      | `deploy_system`, `check_dns`, etc.         |
| Status       | Select    | YES      | See select values below                    |
| Summary      | Rich Text | YES      | Human-readable result                      |
| Error        | Rich Text | NO       | Failure details                            |

## Status Select Values (must exist before first write)

- `Queued`
- `Running`
- `Succeeded`
- `Failed`

## Optional Properties (add when ready)

| Name              | Type      | Notes                          |
|-------------------|-----------|--------------------------------|
| Actor             | Rich Text | `RSP001`                       |
| Source            | Rich Text | `dreamchamber_ui`              |
| Started At        | Date      | Timestamp                      |
| Completed At      | Date      | Timestamp                      |
| Artifact URL      | URL       | GitHub run / deploy link       |
| GitHub Run        | URL       | Actions run URL                |
| Cloudflare Status | Select    | `active`, `pending`, `missing` |
| n8n Status        | Select    | `notified`, `skipped`, `error` |

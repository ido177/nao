# Configuration Reference

Complete reference for the `nao_config.yaml` file. This page is auto-generated from the Pydantic models in [`cli/nao_core/config/`](https://github.com/getnao/nao/tree/main/cli/nao_core/config).

Values wrapped in `${{ env('VAR') }}` or `{{ env('VAR') }}` are resolved from environment variables at load time.

## Top-level properties

| Property       | Type                           | Required | Default | Description                 |
| -------------- | ------------------------------ | -------- | ------- | --------------------------- |
| `project_name` | string                         | **Yes**  | —       | The name of the nao project |
| `databases`    | [DatabaseConfig[]](#databases) | No       | `[]`    | The databases to use        |
| `repos`        | [RepoConfig[]](#repos)         | No       | `[]`    | The repositories to use     |
| `notion`       | [NotionConfig](#notion)        | No       | `null`  | The Notion configurations   |
| `llm`          | [LLMConfig](#llm)              | No       | `null`  | The LLM configuration       |
| `slack`        | [SlackConfig](#slack)          | No       | `null`  | The Slack configuration     |
| `mcp`          | [McpConfig](#mcp)              | No       | `null`  | The MCP configuration       |
| `skills`       | [SkillsConfig](#skills)        | No       | `null`  | The Skills configuration    |

## Databases

All database configurations share these common fields:

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | string — see below                                                        | **Yes**  | —                                      | —                                                                                                                                                           |
| `name`               | string                                                                    | **Yes**  | —                                      | A friendly name for this connection                                                                                                                         |
| `include`            | string[]                                                                  | No       | `[]`                                   | Glob patterns for schemas/tables to include (e.g., 'prod\*_._', 'analytics.dim\*\*'). Empty means include all.                                              |
| `exclude`            | string[]                                                                  | No       | `[]`                                   | Glob patterns for schemas/tables to exclude (e.g., 'temp\*_._', '\*.backup\*\*')                                                                            |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |

**Accessor values:** `columns`, `preview`, `profiling`, `ai_summary`, `how_to_use`

Patterns in `include` / `exclude` use glob syntax against `schema.table` (e.g. `prod_*.*`, `analytics.dim_*`).

### PostgreSQL (`type: postgres`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `host`               | string                                                                    | **Yes**  | —                                      | PostgreSQL host                                                                                                                                             |
| `port`               | integer                                                                   | No       | `5432`                                 | PostgreSQL port                                                                                                                                             |
| `database`           | string                                                                    | **Yes**  | —                                      | Database name                                                                                                                                               |
| `user`               | string                                                                    | **Yes**  | —                                      | Username                                                                                                                                                    |
| `password`           | string                                                                    | **Yes**  | —                                      | Password                                                                                                                                                    |
| `schema_name`        | string                                                                    | No       | `null`                                 | Default schema (optional, uses 'public' if not set)                                                                                                         |

### Snowflake (`type: snowflake`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `username`           | string                                                                    | **Yes**  | —                                      | Snowflake username                                                                                                                                          |
| `account_id`         | string                                                                    | **Yes**  | —                                      | Snowflake account identifier (e.g., 'xy12345.us-east-1')                                                                                                    |
| `password`           | string                                                                    | No       | `null`                                 | Snowflake password                                                                                                                                          |
| `database`           | string                                                                    | **Yes**  | —                                      | Snowflake database                                                                                                                                          |
| `schema_name`        | string                                                                    | No       | `null`                                 | Snowflake schema (optional)                                                                                                                                 |
| `warehouse`          | string                                                                    | No       | `null`                                 | Snowflake warehouse to use (optional)                                                                                                                       |
| `private_key_path`   | string                                                                    | No       | `null`                                 | Path to private key file for key-pair authentication                                                                                                        |
| `private_key`        | string                                                                    | No       | `null`                                 | PEM-encoded private key string for key-pair authentication (alternative to private_key_path)                                                                |
| `passphrase`         | string                                                                    | No       | `null`                                 | Passphrase for the private key if it is encrypted                                                                                                           |
| `authenticator`      | `"externalbrowser"`, `"username_password_mfa"`, `"jwt_token"`, `"oauth"`  | No       | `null`                                 | Authentication method (e.g., 'externalbrowser' for SSO)                                                                                                     |

### BigQuery (`type: bigquery`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview'].                                                                                      |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                                                                                                     |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                                                                                                           |
| `project_id`         | string                                                                    | **Yes**  | —                                      | GCP project ID                                                                                                                                                                                                                                   |
| `dataset_id`         | string                                                                    | No       | `null`                                 | Default BigQuery dataset                                                                                                                                                                                                                         |
| `credentials_path`   | string                                                                    | No       | `null`                                 | Path to service account JSON file. If not provided, uses Application Default Credentials (ADC)                                                                                                                                                   |
| `credentials_json`   | object                                                                    | No       | `null`                                 | Service account credentials as a dict or JSON string. Takes precedence over credentials_path if both are provided                                                                                                                                |
| `sso`                | boolean                                                                   | No       | `false`                                | Use Single Sign-On (SSO) for authentication                                                                                                                                                                                                      |
| `location`           | string                                                                    | No       | `null`                                 | BigQuery location                                                                                                                                                                                                                                |
| `partition_filters`  | dict[str, str]                                                            | No       | `{}`                                   | Custom partition filter expressions per table name, used when previewing tables that require a partition filter. Overrides the automatic last-partition detection. Example: {"events": "event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"} |
| `max_query_size`     | number                                                                    | No       | `null`                                 | Maximum query size in GB. If set, a dry run is performed before executing SQL and an error is raised if the estimated bytes processed exceeds this limit.                                                                                        |

### DuckDB (`type: duckdb`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `path`               | string                                                                    | No       | `":memory:"`                           | Path to the DuckDB database file                                                                                                                            |

### Databricks (`type: databricks`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `server_hostname`    | string                                                                    | **Yes**  | —                                      | Databricks server hostname (e.g., 'adb-xxxx.azuredatabricks.net')                                                                                           |
| `http_path`          | string                                                                    | **Yes**  | —                                      | HTTP path to the SQL warehouse or cluster                                                                                                                   |
| `access_token`       | string                                                                    | **Yes**  | —                                      | Databricks personal access token                                                                                                                            |
| `catalog`            | string                                                                    | No       | `null`                                 | Unity Catalog name (optional)                                                                                                                               |
| `schema_name`        | string                                                                    | No       | `null`                                 | Default schema (optional)                                                                                                                                   |

### Microsoft SQL Server (`type: mssql`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `host`               | string                                                                    | **Yes**  | —                                      | MSSQL host                                                                                                                                                  |
| `port`               | integer                                                                   | No       | `1433`                                 | MSSQL port                                                                                                                                                  |
| `database`           | string                                                                    | **Yes**  | —                                      | Database name                                                                                                                                               |
| `user`               | string                                                                    | **Yes**  | —                                      | Username                                                                                                                                                    |
| `password`           | string                                                                    | **Yes**  | —                                      | Password                                                                                                                                                    |
| `driver`             | string                                                                    | No       | `"FreeTDS"`                            | ODBC driver (FreeTDS on Mac/Linux, ODBC Driver 18 for SQL Server on Windows)                                                                                |
| `schema_name`        | string                                                                    | No       | `null`                                 | Default schema (optional, uses 'dbo' if not set)                                                                                                            |

### Amazon Redshift (`type: redshift`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview'].                                                       |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                                                                      |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                                                                            |
| `host`               | string                                                                    | **Yes**  | —                                      | Redshift cluster endpoint                                                                                                                                                                                         |
| `port`               | integer                                                                   | No       | `5439`                                 | Redshift port                                                                                                                                                                                                     |
| `database`           | string                                                                    | **Yes**  | —                                      | Database name                                                                                                                                                                                                     |
| `auth_mode`          | `"password"`, `"azure_entra_id"`                                          | No       | `"password"`                           | Authentication mode                                                                                                                                                                                               |
| `user`               | string                                                                    | No       | `null`                                 | Username. Required for password auth. In azure_entra_id mode it is optional but recommended: nao sync uses it to read metadata (columns, previews, query history). It is never used at runtime from /execute_sql. |
| `password`           | string                                                                    | No       | `null`                                 | Password. Required for password auth. In azure_entra_id mode it is optional but recommended: nao sync uses it to read metadata (columns, previews, query history). It is never used at runtime from /execute_sql. |
| `schema_name`        | string                                                                    | No       | `null`                                 | Default schema (optional, uses 'public' if not set)                                                                                                                                                               |
| `sslmode`            | string                                                                    | No       | `"require"`                            | SSL mode for the connection                                                                                                                                                                                       |
| `ssh_tunnel`         | [RedshiftSSHTunnelConfig](#redshiftsshtunnelconfig)                       | No       | `null`                                 | SSH tunnel configuration (optional)                                                                                                                                                                               |

### Trino (`type: trino`)

| Property             | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`          | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days` | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`          | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `host`               | string                                                                    | **Yes**  | —                                      | Trino coordinator host                                                                                                                                      |
| `port`               | integer                                                                   | No       | `8080`                                 | Trino coordinator port                                                                                                                                      |
| `catalog`            | string                                                                    | **Yes**  | —                                      | Catalog name                                                                                                                                                |
| `user`               | string                                                                    | **Yes**  | —                                      | Username                                                                                                                                                    |
| `schema_name`        | string                                                                    | No       | `null`                                 | Default schema (optional)                                                                                                                                   |
| `password`           | string                                                                    | No       | `null`                                 | Password (optional)                                                                                                                                         |

### Amazon Athena (`type: athena`)

| Property                | Type                                                                      | Required | Default                                | Description                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`             | `"columns"`, `"preview"`, `"profiling"`, `"ai_summary"`, `"how_to_use"`[] | No       | `["columns", "how_to_use", "preview"]` | Which default templates to render per table (e.g., ['columns', 'how_to_use', 'profiling', 'ai_summary']). Defaults to ['columns', 'how_to_use', 'preview']. |
| `query_history_days`    | integer                                                                   | No       | `null`                                 | Number of days to look back for query history (used by how_to_use template).                                                                                |
| `profiling`             | [ProfilingConfig](#profilingconfig)                                       | No       | —                                      | Profiling refresh policy configuration                                                                                                                      |
| `s3_staging_dir`        | string                                                                    | **Yes**  | —                                      | S3 staging directory for query results                                                                                                                      |
| `region_name`           | string                                                                    | **Yes**  | —                                      | AWS region name                                                                                                                                             |
| `aws_access_key_id`     | string                                                                    | No       | `null`                                 | AWS access key ID                                                                                                                                           |
| `aws_secret_access_key` | string                                                                    | No       | `null`                                 | AWS secret access key                                                                                                                                       |
| `aws_session_token`     | string                                                                    | No       | `null`                                 | AWS session token                                                                                                                                           |
| `profile_name`          | string                                                                    | No       | `null`                                 | AWS profile name                                                                                                                                            |
| `schema_name`           | string                                                                    | No       | `null`                                 | Athena schema name                                                                                                                                          |
| `work_group`            | string                                                                    | No       | `"primary"`                            | Athena workgroup                                                                                                                                            |

### RedshiftSSHTunnelConfig

Nested under `ssh_tunnel` in a Redshift database entry.

| Property                     | Type    | Required | Default | Description                           |
| ---------------------------- | ------- | -------- | ------- | ------------------------------------- |
| `ssh_host`                   | string  | **Yes**  | —       | SSH host                              |
| `ssh_port`                   | integer | No       | `22`    | SSH port                              |
| `ssh_username`               | string  | **Yes**  | —       | SSH username                          |
| `ssh_private_key_path`       | string  | **Yes**  | —       | Path to SSH private key file          |
| `ssh_private_key_passphrase` | string  | No       | `null`  | SSH private key passphrase (optional) |

## LLM

| Property               | Type                                                                                                    | Required | Default | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------- |
| `provider`             | `"openai"`, `"anthropic"`, `"mistral"`, `"gemini"`, `"openrouter"`, `"ollama"`, `"bedrock"`, `"vertex"` | **Yes**  | —       | The LLM provider to use                                                   |
| `api_key`              | string                                                                                                  | No       | `null`  | The API key to use                                                        |
| `base_url`             | string                                                                                                  | No       | `null`  | Optional custom base URL for the provider API                             |
| `access_key`           | string                                                                                                  | No       | `null`  | AWS access key (only for Bedrock)                                         |
| `secret_key`           | string                                                                                                  | No       | `null`  | AWS secret key (only for Bedrock)                                         |
| `aws_region`           | string                                                                                                  | No       | `null`  | AWS region (only for Bedrock)                                             |
| `aws_profile`          | string                                                                                                  | No       | `null`  | AWS CLI profile name (only for Bedrock, e.g. SSO profile)                 |
| `gcp_project`          | string                                                                                                  | No       | `null`  | GCP project ID (only for Vertex)                                          |
| `gcp_location`         | string                                                                                                  | No       | `null`  | GCP location (only for Vertex)                                            |
| `service_account_json` | string                                                                                                  | No       | `null`  | Service account JSON (only for Vertex)                                    |
| `key_file`             | string                                                                                                  | No       | `null`  | Path to service account key file (only for Vertex)                        |
| `annotation_model`     | string                                                                                                  | No       | `null`  | Model to use for ai_summary generation via prompt(...) in Jinja templates |

### Provider authentication

| Provider     | Env variable                         | API key  | Base URL env          |
| ------------ | ------------------------------------ | -------- | --------------------- |
| `openai`     | `OPENAI_API_KEY`                     | required | `OPENAI_BASE_URL`     |
| `anthropic`  | `ANTHROPIC_API_KEY`                  | required | `ANTHROPIC_BASE_URL`  |
| `mistral`    | `MISTRAL_API_KEY`                    | required | `MISTRAL_BASE_URL`    |
| `gemini`     | `GEMINI_API_KEY`                     | required | `GEMINI_BASE_URL`     |
| `openrouter` | `OPENROUTER_API_KEY`                 | required | `OPENROUTER_BASE_URL` |
| `ollama`     | `OLLAMA_API_KEY`                     | none     | `OLLAMA_BASE_URL`     |
| `bedrock`    | `AWS_BEARER_TOKEN_BEDROCK`           | optional | —                     |
| `vertex`     | `VERTEX_GOOGLE_SERVICE_ACCOUNT_JSON` | none     | —                     |

### Default annotation models

Used for `ai_summary` generation when `annotation_model` is not set.

| Provider     | Default model                               |
| ------------ | ------------------------------------------- |
| `openai`     | `gpt-4.1-mini`                              |
| `anthropic`  | `claude-3-5-sonnet-latest`                  |
| `mistral`    | `mistral-small-latest`                      |
| `gemini`     | `gemini-2.0-flash`                          |
| `openrouter` | `openai/gpt-4.1-mini`                       |
| `ollama`     | `llama3.2`                                  |
| `bedrock`    | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `vertex`     | `gemini-2.5-flash`                          |

## Repos

| Property     | Type     | Required | Default | Description                                                                            |
| ------------ | -------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `name`       | string   | **Yes**  | —       | The name of the repository                                                             |
| `url`        | string   | No       | `null`  | The URL of the repository                                                              |
| `branch`     | string   | No       | `null`  | The branch of the repository                                                           |
| `local_path` | string   | No       | `null`  | Local filesystem path (relative to nao_config.yaml or absolute)                        |
| `include`    | string[] | No       | `[]`    | Glob patterns for files to include (e.g. 'models/\*_/_.sql'). Empty means include all. |
| `exclude`    | string[] | No       | `[]`    | Glob patterns for files to exclude (e.g. '\*.pyc')                                     |

## Notion

| Property  | Type     | Required | Default | Description        |
| --------- | -------- | -------- | ------- | ------------------ |
| `api_key` | string   | **Yes**  | —       | The API key to use |
| `pages`   | string[] | **Yes**  | —       | The pages to sync  |

## Slack

| Property           | Type   | Required | Default                                    | Description                               |
| ------------------ | ------ | -------- | ------------------------------------------ | ----------------------------------------- |
| `bot_token`        | string | **Yes**  | —                                          | The bot token to use                      |
| `signing_secret`   | string | **Yes**  | —                                          | The signing secret for verifying requests |
| `post_message_url` | string | No       | `"https://slack.com/api/chat.postMessage"` | The Slack API URL for posting messages    |

## MCP

| Property         | Type   | Required | Default | Description                             |
| ---------------- | ------ | -------- | ------- | --------------------------------------- |
| `json_file_path` | string | **Yes**  | —       | Path to the MCP JSON configuration file |

## Skills

| Property      | Type   | Required | Default | Description               |
| ------------- | ------ | -------- | ------- | ------------------------- |
| `folder_path` | string | **Yes**  | —       | Path to the skills folder |

## Example

```yaml
project_name: my-project

databases:
    - type: postgres
      name: prod-db
      host: localhost
      port: 5432
      database: analytics
      user: ${{ env('DB_USER') }}
      password: ${{ env('DB_PASSWORD') }}
      include:
          - 'public.*'
      exclude:
          - 'public.tmp_*'
      accessors:
          - columns
          - description
          - preview
          - ai_summary

    - type: duckdb
      name: local
      path: ./warehouse.duckdb

repos:
    - name: dbt-models
      url: https://github.com/myorg/dbt-models.git
      branch: main

llm:
    provider: openai
    api_key: ${{ env('OPENAI_API_KEY') }}
    annotation_model: gpt-4.1-mini

notion:
    api_key: ${{ env('NOTION_API_KEY') }}
    pages:
        - https://notion.so/my-page-id

slack:
    bot_token: ${{ env('SLACK_BOT_TOKEN') }}
    signing_secret: ${{ env('SLACK_SIGNING_SECRET') }}

mcp:
    json_file_path: ./agent/mcps/mcp.json

skills:
    folder_path: ./agent/skills/
```

## JSON Schema

The raw JSON Schema is available at [`config-schema.json`](https://github.com/getnao/nao-docs/blob/main/public/config-schema.json).

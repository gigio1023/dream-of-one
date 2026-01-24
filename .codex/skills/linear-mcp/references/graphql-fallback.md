# Linear GraphQL fallback (no MCP)

Use this only when a Linear MCP integration is unavailable.

## Auth

Set one of:
- `LINEAR_API_TOKEN` (preferred)
- `LINEAR_TOKEN`
- `LINEAR_API_KEY`

Optional:
- `LINEAR_GRAPHQL_ENDPOINT` (defaults to `https://api.linear.app/graphql`)

## Script

From within this skill folder (`.codex/skills/linear-mcp/`), run GraphQL queries with:

```bash
bash scripts/linear_graphql.sh --query '{ viewer { id name email } }'
```

With variables:

```bash
bash scripts/linear_graphql.sh \
  --query 'query($first:Int!){ viewer { assignedIssues(first:$first){ nodes { id title } } } }' \
  --variables '{"first": 5}'
```

If you need schema details, consult Linear’s API docs for your workspace and build a query/mutation accordingly.

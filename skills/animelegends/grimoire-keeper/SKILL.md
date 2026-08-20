---
name: grimoire-keeper
description: Facade over Starlight Intelligence System (SIS). Every pipeline stage logs here. Seed-curation loop (top 10% → LoRA retrain). Contradiction detection. Counsel audit export with SHA256 tamper evidence. Fallback to local grimoire/log.json.
type: core
version: 0.1.0
when_to_use: |
  Always-on skill (+1 GRIMOIRE stage). Every skill in the AnimeLegends pipeline logs to grimoire-keeper. Provides durable audit trail, quality ratchet, contradiction detection, and production-to-training feedback loop. Also used for user queries: "what did we learn from Short X?" or "show me all Philosophy topics this week".
---

# grimoire-keeper

## Intent

Always-on (+1) logging and intelligence facade for the AnimeLegends generative pipeline. Every pipeline stage (signal-forge through publish-orchestrator) logs structured entries to the Grimoire via this skill. Acts as facade over the **Starlight Intelligence System (SIS)** MCP when available (primary substrate), with automatic fallback to local `grimoire/log.json` file (secondary substrate) if SIS MCP is not configured. Supports durable audit trail (tamper-evident SHA256 chaining), quality ratchet (seed-curation-from-production: top 10% engagement shorts feed next LoRA retrain cycle), contradiction detection (via `sis_contradict`), and counsel audit export (legal posture evidence trail). Also serves user queries: "What did we generate this week?", "Show me all Philosophy topics", "Which shorts had quality issues?".

## Inputs

What this skill expects to receive (from other pipeline skills):

```typescript
interface GrimoireLogEntry {
  stage: string;                            // "signal-forge" | "concept-forge" | "script-forge" | "storyboard-forge" | "gen-director" | "remotion-composer" | "publish-orchestrator"
  input_id: string | null;                  // UUID of input manifest (null for signal-forge, first stage)
  output_id: string | null;                 // UUID of output manifest (null if stage aborted)
  decision: string;                         // "accept" | "defer" | "reject" | "blocked" | "error" | "prepared"
  rationale: string;                        // one-line explanation (why this decision was made)
  cost_usd?: number;                        // cost incurred at this stage (0.00 if no paid APIs)
  duration_ms: number;                      // elapsed time for this stage
  metadata?: Record<string, any>;           // optional stage-specific metadata (scores, models used, retries, etc.)
  timestamp: string;                        // ISO 8601 UTC
}
```

What this skill expects for user queries:

```typescript
interface GrimoireQuery {
  query_type: "list" | "search" | "stats";  // query mode
  filters?: {
    stage?: string;                         // filter by pipeline stage
    decision?: string;                      // filter by decision type
    date_range?: { start: string; end: string }; // ISO 8601 date range
    topic?: string;                         // keyword search in rationale/metadata
  };
  limit?: number;                           // max results (default: 50)
}
```

Source of input: all pipeline skills (signal-forge, concept-forge, script-forge, storyboard-forge, gen-director, remotion-composer, publish-orchestrator) log to grimoire-keeper; user queries via `/grimoire-query` command.

## Outputs

What this skill produces (for logging):

```typescript
interface GrimoireLogResult {
  log_id: string;                           // UUID v4 for this log entry
  entry_hash: string;                       // SHA256 hash of this entry (tamper evidence)
  previous_hash: string;                    // SHA256 hash of previous entry (blockchain-style chaining)
  substrate: "sis" | "local";               // where entry was persisted
  timestamp: string;                        // ISO 8601 UTC
}
```

What this skill produces (for queries):

```typescript
interface GrimoireQueryResult {
  query_id: string;                         // UUID v4 for this query
  results: Array<GrimoireLogEntry>;         // matching log entries
  count: number;                            // total results (before limit applied)
  substrate: "sis" | "local";               // where query was executed
  timestamp: string;                        // ISO 8601 UTC
}
```

## Core logic / rules

### 0. **Substrate selection (SIS MCP or local fallback)**

**On first invocation**, determine which substrate to use:

1. **Check for SIS MCP** — Call `GetMcpTools(server="sis")` to enumerate SIS tools.
   - Expected tools: `sis_append_entry`, `sis_vault_search`, `sis_contradict`, `sis_stale`, etc. (10 tools total).
   - If SIS MCP is **available** and responding:
     - Set `substrate="sis"` for this session.
     - Log to console: `"grimoire-keeper: using SIS MCP substrate"`.
   - If SIS MCP is **NOT available** (404 / auth error / no tools):
     - Set `substrate="local"` for this session.
     - Log to console: `"grimoire-keeper: SIS MCP not available, using local fallback: grimoire/log.json"`.
     - Ensure `grimoire/` directory exists and `grimoire/log.json` is writable.

2. **No blocking on SIS unavailability** — Unlike `gen-director` (which is fail-closed), grimoire-keeper **always succeeds** by falling back to local storage. Logging must never block the pipeline.

### 1. **Logging entry to substrate**

When a pipeline skill calls `grimoire-keeper` to log an entry:

1. **Generate log_id** — UUID v4 for this entry.

2. **Compute entry_hash** — SHA256 hash of serialized entry (JSON canonical form, sorted keys).
   - Hash input: `{stage, input_id, output_id, decision, rationale, cost_usd, duration_ms, metadata, timestamp}`
   - Hash output: 64-char hex string (e.g., `a3f5d9...`)

3. **Retrieve previous_hash** — Query last entry's hash from substrate:
   - **SIS substrate**: call `sis_vault_search(vault="grimoire", query="latest", limit=1)`, extract hash from most recent entry.
   - **Local substrate**: read last line of `grimoire/log.json`, parse JSON, extract `entry_hash`.
   - If no previous entry exists (first log), set `previous_hash="0000000000000000000000000000000000000000000000000000000000000000"` (64 zeros).

4. **Append entry to substrate**:
   - **SIS substrate**: call `sis_append_entry(vault="grimoire", entry={log_id, stage, input_id, output_id, decision, rationale, cost_usd, duration_ms, metadata, timestamp, entry_hash, previous_hash})`.
   - **Local substrate**: append JSON line to `grimoire/log.json` (newline-delimited JSON format):

     ```json
     {"log_id":"...","stage":"...","decision":"...","entry_hash":"...","previous_hash":"...","timestamp":"..."}
     ```

5. **Return result** — Populate `GrimoireLogResult` with `log_id`, `entry_hash`, `previous_hash`, `substrate`, `timestamp`.

### 2. **Querying entries from substrate**

When user queries grimoire via `/grimoire-query` command:

1. **Parse filters** — Extract `query_type`, `filters` (stage, decision, date_range, topic), `limit`.

2. **Execute query**:
   - **SIS substrate**: call `sis_vault_search(vault="grimoire", query={keyword or semantic search}, filters={stage, decision, date_range}, limit=limit)`.
   - **Local substrate**: read `grimoire/log.json`, parse all lines, filter in-memory by `stage`, `decision`, `date_range`, `topic` (keyword match in rationale/metadata), apply limit.

3. **Compute stats** (if `query_type="stats"`):
   - **Total entries** (count)
   - **By stage** (count per stage)
   - **By decision** (count per decision: accept, defer, reject, blocked, error)
   - **Total cost** (sum of `cost_usd` across all entries)
   - **Average duration** (mean of `duration_ms` across all entries)

4. **Return result** — Populate `GrimoireQueryResult` with `query_id`, `results` array, `count`, `substrate`, `timestamp`.

### 3. **Contradiction detection (SIS only)**

When logging a new entry, check for contradictions with prior entries:

- **Only if SIS substrate is active** (local fallback does not support contradiction detection).
- After appending entry, call `sis_contradict(vault="grimoire", entry_id=log_id)`.
- SIS returns list of prior entries that contradict the new entry (e.g., same topic but opposite decision, same stage but conflicting metadata).
- If contradictions found:
  - Log warning to console: `"grimoire-keeper: contradiction detected with entry {prior_log_id}"`.
  - Append contradiction metadata to new entry (via `sis_append_entry` update).
  - User can query contradictions later: `query_type="search"`, `filters={metadata.contradictions: true}`.

### 4. **Seed curation from production (quality ratchet)**

Periodically (e.g., weekly), grimoire-keeper can be invoked to curate high-quality shorts for LoRA retraining:

1. **Query top 10% engagement** — Search grimoire for `publish-orchestrator` entries with `decision="published"` (when platforms go live), sort by `metadata.metrics.24h.views` descending, take top 10%.

2. **Extract artifact paths** — For each top-performing short, extract:
   - `storyboard_id` → query for corresponding `gen-director` entry → extract `artifacts` array → collect all `image_path` values.
   - These images are candidates for next LoRA training cycle (mascot character consistency improvement).

3. **Export seed manifest** — Write JSON manifest to `training/seeds/{date}_top10pct.json`:

   ```json
   {
     "seed_id": "uuid",
     "date_range": {"start": "...", "end": "..."},
     "shorts": [
       {"distribute_id": "...", "views_24h": 5000, "images": ["path1.png", "path2.png", ...]},
       ...
     ]
   }
   ```

4. **Handoff to training pipeline** — This manifest can be consumed by LoRA training scripts (outside this repo, in AnimeLegends studio monorepo).

### 5. **Counsel audit export (legal posture)**

Grimoire supports tamper-evident audit export for legal counsel:

1. **Full audit trail** — Export all log entries from substrate (SIS or local) as JSON:

   ```bash
   grimoire-keeper export --format=json --output=audit_{date}.json
   ```

2. **Hash verification** — Recompute `entry_hash` and `previous_hash` for all entries to verify chain integrity. If any hash mismatch: flag as `TAMPER_DETECTED`.

3. **Counsel report** — Generate human-readable report:
   - Total shorts produced (count of `publish-orchestrator` "prepared" or "published" entries)
   - Total cost incurred (sum of all `cost_usd`)
   - Decision breakdown (accept / defer / reject / blocked / error counts per stage)
   - Legal firewall triggers (count of entries with `metadata.legal_flags` non-empty)
   - Contradiction log (count of entries with contradictions detected)

4. **SHA256 audit signature** — Compute SHA256 hash of entire export file, include in report footer as tamper-evidence seal.

## Worked examples

### Example 1: Log entry (SIS substrate available)

**Input:**

```json
{
  "stage": "signal-forge",
  "input_id": null,
  "output_id": "550e8400-e29b-41d4-a716-446655440000",
  "decision": "accept",
  "rationale": "high_engagement_philosophy_topic",
  "cost_usd": 0.00,
  "duration_ms": 234,
  "metadata": {
    "weighted_total": 81.65,
    "channel": "Philosophy",
    "legal_flags": ["Gojo (Jujutsu Kaisen)"]
  },
  "timestamp": "2026-08-16T09:15:00Z"
}
```

**Output:**

```json
{
  "log_id": "aaaa1111-bbbb-2222-cccc-333344445555",
  "entry_hash": "a3f5d9c8b7e6f5a4d3c2b1a0987654321fedcba9876543210fedcba987654321",
  "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "substrate": "sis",
  "timestamp": "2026-08-16T09:15:01Z"
}
```

**Why this output:** SIS MCP available. Entry logged to SIS `grimoire` vault. SHA256 hash computed. Previous hash is all-zeros (first entry). Log ID returned for reference.

### Example 2: Log entry (SIS unavailable, local fallback)

**Input:**

```json
{
  "stage": "gen-director",
  "input_id": "aaaa1111-bbbb-2222-cccc-333344445555",
  "output_id": null,
  "decision": "error",
  "rationale": "mcp_unavailable",
  "cost_usd": 0.00,
  "duration_ms": 45,
  "timestamp": "2026-08-16T10:15:00Z"
}
```

**Output:**

```json
{
  "log_id": "bbbb2222-cccc-3333-dddd-444455556666",
  "entry_hash": "b4e6c7f8a9d0e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
  "previous_hash": "a3f5d9c8b7e6f5a4d3c2b1a0987654321fedcba9876543210fedcba987654321",
  "substrate": "local",
  "timestamp": "2026-08-16T10:15:01Z"
}
```

**Why this output:** SIS MCP not available. Grimoire-keeper falls back to local `grimoire/log.json`. Entry appended as newline-delimited JSON. SHA256 hash chains to previous entry hash. Substrate "local" indicates fallback mode.

### Example 3: Query entries (user query)

**Input:**

```json
{
  "query_type": "list",
  "filters": {
    "stage": "signal-forge",
    "decision": "accept",
    "date_range": {"start": "2026-08-16T00:00:00Z", "end": "2026-08-16T23:59:59Z"}
  },
  "limit": 10
}
```

**Output:**

```json
{
  "query_id": "cccc3333-dddd-4444-eeee-555566667777",
  "results": [
    {
      "stage": "signal-forge",
      "input_id": null,
      "output_id": "550e8400-e29b-41d4-a716-446655440000",
      "decision": "accept",
      "rationale": "high_engagement_philosophy_topic",
      "cost_usd": 0.00,
      "duration_ms": 234,
      "metadata": {"weighted_total": 81.65, "channel": "Philosophy"},
      "timestamp": "2026-08-16T09:15:00Z"
    },
    {
      "stage": "signal-forge",
      "input_id": null,
      "output_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "decision": "accept",
      "rationale": "moderate_brand_fit_manual_topic",
      "cost_usd": 0.00,
      "duration_ms": 189,
      "metadata": {"weighted_total": 52.5, "channel": "LegendsLabs"},
      "timestamp": "2026-08-16T09:20:00Z"
    }
  ],
  "count": 2,
  "substrate": "sis",
  "timestamp": "2026-08-16T11:00:00Z"
}
```

**Why this output:** User queried for signal-forge "accept" decisions on 2026-08-16. Grimoire returned 2 matching entries (limit 10, found 2). Substrate "sis" (query executed via SIS MCP vault search).

### Example 4: Query stats

**Input:**

```json
{
  "query_type": "stats",
  "filters": {
    "date_range": {"start": "2026-08-16T00:00:00Z", "end": "2026-08-16T23:59:59Z"}
  }
}
```

**Output:**

```json
{
  "query_id": "dddd4444-eeee-5555-ffff-666677778888",
  "stats": {
    "total_entries": 15,
    "by_stage": {
      "signal-forge": 3,
      "concept-forge": 3,
      "script-forge": 3,
      "storyboard-forge": 3,
      "gen-director": 1,
      "remotion-composer": 1,
      "publish-orchestrator": 1
    },
    "by_decision": {
      "accept": 12,
      "error": 1,
      "prepared": 1,
      "defer": 1
    },
    "total_cost_usd": 8.92,
    "average_duration_ms": 187
  },
  "substrate": "sis",
  "timestamp": "2026-08-16T11:05:00Z"
}
```

**Why this output:** User queried for stats on 2026-08-16. Grimoire computed: 15 total entries, breakdown by stage and decision, total cost $8.92 (from gen-director), average duration 187ms.

## Failure modes

- **SIS MCP unavailable (fallback to local)** — If `GetMcpTools(server="sis")` returns empty or error, grimoire-keeper **automatically falls back to local `grimoire/log.json`**. Log warning to console: `"SIS MCP not available, using local fallback"`. Proceed with logging (no abort).

- **Local file write permission error** — If `grimoire/log.json` is not writable (permissions issue), **log error to stderr** but **do NOT abort pipeline**. Return `GrimoireLogResult` with `substrate="none"`, `entry_hash="ERROR"`. Pipeline stages continue (logging failure does not block generation).

- **Hash chain integrity failure** — If recomputed `entry_hash` does not match stored hash (tamper detected), **log CRITICAL error** to console and audit report. Flag affected entries as `TAMPER_DETECTED`. Do not block new entries from being appended.

- **Query timeout (SIS)** — If `sis_vault_search` times out (>30s), **fall back to local query** (read `grimoire/log.json`). If local query also fails, return empty results and log error.

- **Contradiction detection false positive** — If `sis_contradict` returns false positive (two entries that are not actually contradictory), user can manually mark as `false_positive` via `/grimoire-update` command. Contradiction metadata updated in SIS vault.

## Grimoire logging contract

**Grimoire-keeper logs itself** (meta-logging):

- When grimoire-keeper logs an entry from another skill, it also logs its own operation:
  - `stage`: `"grimoire-keeper-meta"`
  - `decision`: `"logged"` | `"fallback"` | `"error"`
  - `rationale`: `"logged_entry_from_{stage}"` | `"sis_unavailable_fallback_local"` | `"write_error"`
  - `metadata`: `{substrate: "sis" | "local", entry_hash: "..."}`

## Legal firewall

Grimoire-keeper does not generate external content. It only logs structured metadata (stage, decision, rationale, cost, duration). Legal filtering is applied upstream (signal-forge, script-forge). Grimoire stores legal firewall triggers in `metadata.legal_flags` for audit trail. Counsel audit export includes counts of legal firewall triggers per stage.

## Quality gates

- [ ] Grimoire-keeper never blocks pipeline execution (logging failure = warning, not abort)
- [ ] Substrate selection succeeds (SIS or local fallback)
- [ ] Log entries have valid SHA256 hashes (`entry_hash` is 64-char hex)
- [ ] Hash chain is valid (each `previous_hash` matches prior entry's `entry_hash`)
- [ ] Local fallback file `grimoire/log.json` is newline-delimited JSON (parseable)
- [ ] SIS substrate calls complete within 5s (timeout → fallback to local)
- [ ] Query results match filters (manual spot-check: query for stage X decision Y, verify results)
- [ ] Stats computation is accurate (sum of cost_usd, count by stage/decision)
- [ ] Counsel audit export includes SHA256 audit signature (tamper-evidence seal)
- [ ] Contradiction detection (SIS only) does not block logging (async operation)

## Changelog

### 0.1.0 — 2026-08-16

- Initial release
- Substrate selection: SIS MCP (primary) with local `grimoire/log.json` fallback (secondary)
- SHA256 hash chaining for tamper-evident audit trail
- Log entry API for all pipeline stages (signal-forge through publish-orchestrator)
- Query API (list, search, stats) for user queries
- Contradiction detection via SIS `sis_contradict` (when SIS available)
- Seed curation from production (top 10% engagement → LoRA retrain)
- Counsel audit export with SHA256 audit signature
- Meta-logging (grimoire-keeper logs its own operations)
- Never-block guarantee (logging failure does not abort pipeline)

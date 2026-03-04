# BTC Price Prediction Game

Real-time Bitcoin price betting game. Guess whether BTC goes up or down in the next 60 seconds.

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind, Lightweight Charts |
| API | Python Lambdas behind API Gateway (HTTP + WebSocket) |
| Data | DynamoDB (pay-per-request) |
| Scheduling | EventBridge → price-updater Lambda (every 1 min) |
| Hosting | S3 static website hosting |
| IaC | Terraform (~1.14, AWS provider ~6.34) |

**No CloudFront** — blocked in the AWS account used for this project. Normally you'd put CloudFront in front of S3 for caching and HTTPS on a custom domain. Support told me that 24/48hrs are needed.

## How It Works

1. **Price updater** runs every 1 minute via EventBridge. Fetches BTC price from the CoinStats API, writes to DynamoDB, and broadcasts to all connected clients over WebSocket. Drift of ±5s is expected and acceptable.
2. **Bet settlement** happens inside the same invocation. Scans for bets placed ≥60s ago (via GSI on `bet_at`), compares stored price to current price, and updates user scores.
3. **Leaderboard** is rebuilt on every price update: full scan of the users table, sort by score, slice top 20, cache as a single DynamoDB item. The API Lambda just reads the cached item. Not extremely optimize for huge loads as it's not the focus of this project.

## Authentication

Intentionally simple — user picks a username, stored in `localStorage`. No tokens, no sessions. Good enough for a coding challenge; obviously not production-grade.

## Known Trade-offs & Improvements

- **Leaderboard scan**: scans all users every minute. Fine at small scale. At scale, use a DynamoDB sort key design or add a TTL-based cache that only recomputes after score changes.
- **No CloudFront**: see above. Would add CDN caching, HTTPS, and edge distribution.
- **EventBridge ±5s drift**: acceptable for a 60s bet window. If tighter timing mattered, a Step Functions wait loop or a dedicated poller would be more precise.
- **No CI/CD**: manual deploy via scripts. A real project would have GitHub Actions or similar.

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm setup` | End-to-end: prereqs → build → deploy → test |
| `pnpm check` | Validate Node, Terraform, AWS CLI, credentials |
| `pnpm tf:init` | `terraform init` |
| `pnpm tf:plan` | `terraform plan` |
| `pnpm tf:apply` | `terraform apply` |
| `pnpm tf:destroy` | `terraform destroy` |
| `pnpm lambdas:build` | Package Lambda zips and updates tf |
| `pnpm lambdas:update` | Update TF to a specific Lambda version from lambdas:list |
| `pnpm lambdas:list` | List available Lambda versions |
| `pnpm frontend:setup` | Write `.env.local` from Terraform outputs to setup frontend |
| `pnpm frontend:deploy` | Build Next.js + sync to S3 |
| `pnpm frontend:dev` | Local dev server |
| `pnpm test` | E2E tests (price freshness + WebSocket) |

## Quick Start

### Prerequisites

- Node.js ≥ 18, pnpm
- Python ≥ 3.12, [uv](https://github.com/astral-sh/uv)
- Terraform ≥ 1.14
- AWS CLI v2 with configured credentials

### One-command setup

```bash
cp .env.example .env   # fill in AWS creds + CoinStats API key
pnpm setup             # runs everything end-to-end
```

> **Required:** You must set `COINSTATS_API_KEY` in `.env` with a valid [CoinStats API](https://coinstats.app/) key. Without it, the price updater Lambda cannot fetch BTC prices and the game won't work.

### Manual steps

```bash
pnpm check           # verify prerequisites
pnpm tf:init         # init terraform
pnpm lambdas:build   # package lambdas
pnpm tf:apply        # provision infrastructure
pnpm frontend:setup  # generate .env.local
pnpm frontend:deploy # build & deploy to S3
pnpm test            # run E2E tests
```

## Testing

E2E only — two tests in `packages/test/test_api.py`:

1. **Price freshness**: `GET /price` returns data updated within the last 60s.
2. **WebSocket connectivity**: connects to the WebSocket API and waits for a `price_update` message within 60s.

Run after a full deploy since they hit live AWS endpoints.

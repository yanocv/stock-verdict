# Stock Verdict

> AI-powered stock analysis tool that gives you **BUY / WAIT / AVOID** verdicts backed by financial formulas, valuation models, and macro context.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| UI | shadcn/ui + Tailwind CSS 4 |
| State | Zustand |
| Data Fetching | TanStack React Query |
| i18n | next-intl (EN / JA / PT) |
| Validation | Zod |
| Testing | Vitest + happy-dom |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Run tests
npm run test

# Run tests (single pass, for CI)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

---

## Project Structure

```
src/
├── app/
│   ├── api/stock/[ticker]/route.ts   # Stock data API (Phase 2)
│   ├── layout.tsx
│   ├── page.tsx                      # Landing page
│   ├── providers.tsx                 # QueryClient + next-intl
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn/ui base components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── tabs.tsx
│   ├── stock/                        # Stock-specific components (Phase 2)
│   └── verdict/                      # Verdict display components (Phase 2)
├── hooks/
│   └── useStock.ts                   # TanStack Query hook (Phase 2)
├── lib/
│   ├── utils.ts                      # cn() utility
│   ├── benchmarks/
│   │   └── industries.ts             # Industry benchmark data
│   ├── classifiers/
│   │   ├── capSize.ts                # Market cap classification
│   │   └── lynchCategory.ts          # Peter Lynch stock categories
│   ├── formulas/
│   │   ├── ratios.ts                 # Financial ratio calculations
│   │   ├── valuation.ts              # DCF, Graham, Lynch fair values
│   │   └── health.ts                 # Altman Z-Score, Piotroski F-Score
│   └── scoring/
│       ├── buffettScore.ts           # Buffett investment lens
│       ├── grahamScore.ts            # Graham investment lens
│       ├── lynchScore.ts             # Lynch investment lens
│       └── verdictEngine.ts          # Weighted scoring → BUY/WAIT/AVOID
├── messages/
│   ├── en/common.json
│   ├── ja/common.json
│   └── pt/common.json
├── state/
│   └── langStore.ts                  # Zustand locale store
├── types/
│   ├── stock.ts
│   ├── financials.ts
│   ├── verdict.ts
│   ├── macro.ts
│   ├── news.ts
│   └── index.ts
└── validators/
    └── stock.ts                      # Zod schemas
```

---

## Development Phases

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Foundation: shadcn/ui, Vitest, types, formulas, scoring engine | ✅ Done |
| **Phase 2** | Data fetching: Yahoo Finance API, stock overview, price chart | 🔜 Next |
| **Phase 3** | Technical analysis: SMA, volume, drawdown detection | 🔜 Planned |
| **Phase 4** | Dividends & calendar: ex-div dates, payout ratio warnings | 🔜 Planned |
| **Phase 5** | News & macro intelligence: sentiment, BOJ/Fed rates, USD/JPY | 🔜 Planned |
| **Phase 6** | Full verdict UI: BUY/WAIT/AVOID card, AI-generated summaries | 🔜 Planned |
| **Phase 7** | Polish: watchlist, price alerts, dark mode, mobile responsive | 🔜 Planned |

---

## Verdict Engine

Scores are weighted across five dimensions:

| Dimension | Weight |
|---|---|
| Financials (ROE, margins, FCF) | 30% |
| Valuation (P/E, P/S, PEG) | 20% |
| Financial Health (current ratio, D/E, Z-Score) | 20% |
| Technical (EPS growth, beta) | 15% |
| Macro & News | 15% |

**Final score → BUY (> 7) / WAIT (4–7) / AVOID (< 4)**

Three investor lenses are also available: Buffett, Graham, Lynch.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests alongside any formula or scoring changes (TDD approach)
4. Ensure tests pass: `npm run test:run`
5. Submit a pull request

---

## Disclaimer

Stock Verdict is a **decision-support tool**, not financial advice. Always do your own research before investing.
# Bid Ladder brand contract

Near-clone **Outbid structure**. Own **gold** color. Never coral/red prices, never their logo.

## Promise

Credits allocated to a listing determine its rank. The UI should look like a professional trading board, not a marketing landing page.

## Copy from Outbid’s IA

- Rank on the left of every row
- Allocation is the loudest number on the row and on listing detail
- Views / shares / clicks stay muted and watch-only
- Board tabs (All-time / Today / Daily) plus a horizontal category rail
- Claim #1 is the homepage hero action, using live `costToClaimFirstCents`

## Do not copy

- Outbid coral/orange price color
- Their wordmark, favicon, or product logos
- Invented visitor counts or revenue stats

## Tokens (`src/styles.css`)

All color in components must be semantic. No hardcoded hex in routes.

| Token | Role |
|---|---|
| `--primary` | Gold/amber actions, tabs, Claim #1 |
| `--allocation` | Dominant price (same family as primary — not `--fall`) |
| `--rise` / `--fall` | Movement up / down only |
| `--surface` / `--card` | Board chrome |
| `--shadow-card` | One card elevation everywhere |
| `--board-max` | Content width (5xl) |
| `--board-row-pad` | Dense row padding |

Type:

- Display: Space Grotesk (`--font-display`) — names, Claim #1
- UI: IBM Plex Sans (`--font-sans`)
- Figures: IBM Plex Mono + `.rank-number` / `.allocation-price`

Radius: `--radius` 0.75rem. Pills (tabs, categories) are full-round.

## Surfaces that must match

Header, board, card, listing detail, how-ranking, auth, submit, dashboard, admin, empty and error states. Same type scale, same card border, same gold CTA.

Light and dark both use the gold allocation color. Dark stays a trading-floor charcoal, not a second brand.

## Wordmark

[`src/components/SiteHeader.tsx`](../src/components/SiteHeader.tsx): “Bid Ladder” + gold mark. Do not substitute an Outbid-like script logo.

## Owners

- Cursor: tokens, this file, ranking copy constants, and UI restyles against this contract

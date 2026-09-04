# Guide App — architecture decisions

The provider/guide-facing half of Terhal. Six screens from the `guide-app/`
Claude Design export, built against **the same backend and database** as the
tourist app: a booking a tourist makes is the same row a guide accepts.

## Decisions taken before implementation

| Question | Decision |
|---|---|
| Separate app or role-gated section? | **Role-gated, same codebase.** Guide routes under `/guide/*`; `GuideTabBar` replaces the tourist `TabBar` for a provider. Shares the API client, i18n files, Tailwind theme and brand assets, so the two surfaces cannot drift visually. |
| Booking lifecycle | **Pending until accepted.** Tourist bookings are created `pending`; the guide accepts or declines. This changes the tourist side too — Booking Confirmed can no longer claim confirmation. |
| Offerings | **Build the table.** Four of six screens name specific offerings; without it G1, G2, G3 and G5 have nothing real to show. |
| Availability | **In scope.** `availability_blocks`, driving G3's "Block this day" and "Open a slot". |

## What the design actually shows (checked, not assumed)

- **GuideTabBar has 5 tabs**, not 6: Today · Requests · Calendar · Earnings ·
  Profile. **Offerings (G5) is not a tab** — it nests under Profile.
- **G2 is accept/decline**, not bidding: tabs New / Accepted / Declined, with an
  expiry countdown per request. The bidding mechanic the team removed stays
  removed.
- **G3 includes availability management**, not just a booking display.
- **G5 shows several offerings per guide**, each with hours, max group size,
  price, location, rating, trip count, views and a Live/Draft/Paused state.

## No authentication exists anywhere in this product

There is no users table, no sessions, no login — on either side. Role-gating
needs *some* notion of who is signed in, so the guide side uses an explicit
**demo identity picker**: you choose which of the seeded providers you are, and
it persists locally. Guide endpoints take that provider id.

This is labelled as demo-only in the UI rather than dressed up as a login,
because a fake sign-in screen would imply an account system that does not
exist. Real provider registration and verification remain unbuilt — see
PROJECT.md §5, where they are out of MVP scope.

## Honesty rules carried over

- **Earnings are mocked**, like every price in the app. G4 uses the same amber
  disclosure component already used for pricing. "Withdraw" and payout accounts
  have nothing behind them and are rendered inert and labelled.
- **Licences & permits** on G6 has no verification flow behind it; it reports
  what the provider record actually holds.
- **Reply rate** and **years guiding** on G6 are not fields that exist. Where a
  number cannot be derived, the row says so rather than showing a plausible one.

# Design exports

The Claude Design artboards the app was built from. **Reference material, not
build inputs** — nothing here is imported, bundled or served. The implementation
lives in `frontend/src/`, and `frontend/tailwind.config.js` is the single source
of colour.

Open any `.dc.html` directly in a browser to see the artboard.

| Folder | What |
|---|---|
| [`tourist/`](tourist/) | The main set — 18 numbered screens plus `TabBar` and the combined `Terhal Mobile App` board |
| [`guide/`](guide/) | The provider side — `G1`–`G6` plus `GuideTabBar` |
| [`onboarding/`](onboarding/) | Splash and the three onboarding screens, delivered as their own batch |
| [`revisions/`](revisions/) | Later single-screen deliveries that **supersede** same-numbered files in `tourist/` |

## Which file is current

Screens were redelivered over the project, so three exist in more than one
place. The one to trust:

| Screen | Current | Superseded |
|---|---|---|
| **00 Choose Role** | `revisions/` | — new screen, no earlier version |
| **16 Camera Guide** | `revisions/` | `tourist/16 Camera Guide.dc.html` — the current camera screen was built from the revision, which is a different design entirely (dark viewfinder, three-way mode switch) |
| **01 Splash** | `tourist/` | `onboarding/01 Splash.dc.html` differs by a few bytes; `tourist/` is the one being maintained |

`onboarding/02`, `03` and `04` are byte-identical to their `tourist/`
counterparts. Both copies are kept because each batch is a delivery record.

## Why every folder repeats support.js

Each artboard loads its runtime with `<script src="./support.js">` — a relative
path — so the file has to sit beside the HTML. Same for `terhal-icon.png` and
`terhal-lockup.png`. The copies are identical and that is deliberate: hoisting
them to one place would mean editing every export, and an export edited by hand
stops being a faithful record of what the designer delivered.

## Where each screen was implemented

| Design | Implementation |
|---|---|
| `tourist/01`–`04`, `revisions/00` | `frontend/src/pages/Splash.jsx`, `Onboarding.jsx`, `ChooseRole.jsx` |
| `tourist/05` Passport | `frontend/src/pages/Passport.jsx` |
| `tourist/06` Marketplace | `frontend/src/pages/Marketplace.jsx` |
| `tourist/07` Post-Trip Review | `frontend/src/pages/PostTripReview.jsx` |
| `tourist/08` Toast system | `frontend/src/components/Toast.jsx` |
| `tourist/09`, `10` | `frontend/src/pages/Explore.jsx`, `components/LandmarkSheet.jsx` |
| `tourist/11` My Trip | `frontend/src/pages/Trip.jsx` |
| `tourist/12`–`15` | `Advisors.jsx`, `AdvisorProfile.jsx`, `BookingConfirmed.jsx`, `Bookings.jsx` |
| `revisions/16` Camera Guide | `frontend/src/pages/CameraGuide.jsx` |
| `tourist/17` Chat | `frontend/src/pages/Chat.jsx` |
| `tourist/18` Profile | `frontend/src/pages/Profile.jsx` |
| `tourist/TabBar` | `frontend/src/components/Shell.jsx` |
| `guide/G1`–`G6`, `GuideTabBar` | `frontend/src/pages/guide/`, `components/GuideShell.jsx` |

Where the implementation deviates from an artboard, the reason is in a comment
at the top of the component. The artboards are static mocks — several carry
layout bugs that only appear once real data of real length goes through them.

# DESIGN.md — CasinOnline.ro

## Design direction

CasinOnline.ro should feel like a premium casino discovery platform.

Visual inspiration:

* Steam
* Netflix
* modern casino dashboards
* premium gaming interfaces
* modern SaaS products

The design should be:

* dark
* premium
* clean
* fast
* dense but readable
* interactive
* modern
* highly structured

Avoid:

* cheap neon overload
* giant gradients everywhere
* excessive glow
* flashing banners
* visual clutter
* casino clichés everywhere

The UI should look premium enough to feel like a real product, not an affiliate blog.

---

# Global layout

Desktop layout:

Left Sidebar
+
Main Content
+
Right Sidebar

Preferred proportions:

Left sidebar:
240px

Main content:
flexible

Right sidebar:
300px–320px

Maximum page width:
1600px

Main content should remain visually dominant.

---

# Page grid

Recommended desktop structure:

240px / minmax(0, 1fr) / 320px

Gap between columns:

24px

Main page padding:

24px desktop

20px tablet

16px mobile

---

# Left sidebar

Desktop width:

240px

Minimum width:

220px

Position:

fixed or sticky

Top:

0 or below header depending on final layout

Height:

100vh

Background:

#0D1117

Border right:

1px solid #202833

Padding:

16px

Navigation should feel compact.

---

# Sidebar logo area

Height:

64px

Logo should have:

* brand mark
* CasinOnline.ro text
* small premium accent

Avoid oversized logo.

---

# Sidebar navigation

Item height:

44px

Horizontal padding:

12px

Border radius:

10px

Icon size:

18px–20px

Gap between icon and text:

10px

Default text:

#A8B3C2

Hover:

background #151C25

text #F8FAFC

Active:

background rgba(34,197,94,0.12)

text #F8FAFC

left accent or subtle icon color:
#22C55E

Avoid huge active backgrounds.

---

# Sidebar groups

Use small section labels:

EXPLORARE

JOCURI

CONT

Label font:

11px–12px

Uppercase

Letter spacing:

0.08em

Color:

#667085

Margin top:

20px

---

# Header

Desktop height:

68px

Position:

sticky

Top:

0

Z-index:

high enough to remain above content

Background:

rgba(11,15,20,0.88)

Backdrop blur:

12px

Bottom border:

1px solid #202833

Header content:

Search
quick actions
favorites
login
register

---

# Header search

Desktop width:

360px–480px

Height:

42px

Background:

#121821

Border:

1px solid #252F3A

Border radius:

12px

Placeholder:

Cauta cazinouri, jocuri, bonusuri...

Search icon:

18px

Focus border:

#22C55E

Focus ring:

very subtle

---

# Header actions

Use icon buttons for:

* favorites
* notifications later
* profile later

Icon button size:

40px

Radius:

10px

Background hover:

#171F29

---

# Login button

Secondary style:

background transparent

border 1px solid #2B3542

text white

Height:

40px

Padding:

0 16px

---

# Register button

Primary CTA

Background:

#22C55E

Hover:

#16A34A

Text:

#06110A

Font weight:

600

Height:

40px

Padding:

0 18px

Radius:

10px

---

# Main background

Primary body background:

#090D12

Alternative gradient allowed only very subtly:

linear-gradient(
180deg,
#090D12 0%,
#0B1016 100%
)

Do not use obvious gradients across every section.

---

# Surface colors

Base:

#090D12

Sidebar:

#0D1117

Header:

#0B0F14

Card:

#121821

Elevated card:

#151C25

Hover card:

#18212C

Border:

#222C38

Strong border:

#2B3745

---

# Text colors

Primary:

#F8FAFC

Secondary:

#AAB4C3

Muted:

#6E7A89

Disabled:

#4B5563

Positive:

#22C55E

Warning / rating:

#F4B740

Negative:

#EF4444

Info:

#38BDF8

---

# Accent system

Primary accent:

#22C55E

Secondary accent:

#14B8A6

Premium accent:

#F4B740

Purple may be used very sparingly:

#8B5CF6

Do not use all accent colors in the same component.

---

# Typography

Primary font:

Geist

Fallback:

Inter, system-ui, sans-serif

---

# Font sizing

H1 desktop:

40px–48px

H1 mobile:

30px–34px

H2 desktop:

28px–32px

H2 mobile:

24px–28px

H3:

20px–22px

Body:

15px–16px

Small:

13px–14px

Meta:

12px–13px

---

# Font weight

H1:

700

H2:

700

H3:

600

Body:

400

Labels:

500

Buttons:

600

---

# Line height

Headings:

1.15–1.25

Body:

1.6

Compact metadata:

1.4

---

# Spacing scale

Use consistent spacing:

4px
8px
12px
16px
20px
24px
32px
40px
48px
64px

Avoid random values like 13px, 27px, 43px unless visually justified.

---

# Border radius

Small control:

8px

Input:

10px

Button:

10px

Normal card:

12px

Feature card:

14px

Hero:

16px

Modal:

16px

Avoid excessive 24px–32px rounded everything.

---

# Shadows

Use very subtle shadows.

Default card shadow:

0 8px 30px rgba(0,0,0,0.18)

Elevated hover:

0 14px 40px rgba(0,0,0,0.25)

Do not use large colored shadows.

---

# Borders

Most cards should rely on border + subtle shadow.

Default:

1px solid #222C38

Hover:

1px solid #314052

Highlighted:

1px solid rgba(34,197,94,0.45)

---

# Hero section

Hero should feel like a discovery dashboard, not a traditional banner.

Desktop:

Full-width main content area

Minimum height:

260px–320px

Background:

#111821

Optional subtle green radial glow.

Example:

radial-gradient(
circle at 80% 20%,
rgba(34,197,94,0.10),
transparent 35%
)

Hero should include:

* H1
* short description
* search or category shortcuts
* primary CTA
* secondary CTA
* trust indicators
* subtle casino/gaming visual

---

# Hero H1

Should be short and strong.

Example style:

Descopera cele mai bune cazinouri online din Romania

Avoid multi-line giant promotional text.

---

# Hero description

Max width:

620px

Font size:

16px–18px

Color:

#AAB4C3

Keep concise.

---

# Hero CTA row

Gap:

12px

Desktop:
horizontal

Mobile:
stacked or wrap

---

# Trust indicators

Examples:

Licentiate ONJN

Actualizate zilnic

Oferte verificate

Recenzii independente

Use:
small icons
compact text
no giant badges

---

# Section structure

Each major section should follow:

SectionHeader

content

optional footer link

Section spacing:

48px desktop

36px mobile

---

# Section header

Contains:

Title

Optional subtitle

Optional right-side action:

Vezi toate

Title:

24px–28px

Action:

14px

Color:

#22C55E

---

# Casino cards

Preferred desktop shape:

horizontal card

Height:

150px–180px

Layout:

Logo
Casino info
Bonus
Key facts
Actions

Background:

#121821

Border:

1px solid #222C38

Radius:

12px

Padding:

18px

---

# Casino card logo area

Width:

110px–130px

Centered logo container

Background:

#0D1218

Radius:

10px

Padding:

16px

Logo should never touch the card edges.

---

# Casino card metadata

Possible fields:

Rating

License

Verified date

Payout speed

Payment methods

Keep visible data concise.

---

# Casino card bonus area

Highlight bonus using larger typography.

Example:

100% pana la 1.000 RON

Secondary:

+ 100 rotiri gratuite

Do not exaggerate with giant numbers.

---

# Casino card CTA

Primary:

Vezi oferta

Secondary:

Recenzie

Desktop:

right aligned

Mobile:

full width buttons

---

# Casino badges

Examples:

Recomandat

Nou

Retrageri rapide

Bonus exclusiv

ONJN

Badge style:

height 24px–26px

font 11px–12px

radius 999px allowed here

subtle background

---

# Game cards

Aspect ratio:

4:3 or 16:10

Preferred:

4:3

Card width:

180px–220px desktop

Game card includes:

thumbnail

name

provider

small metadata

favorite action

Hover overlay:

RTP

Volatility

Vezi jocul

Do not show too many details at once.

---

# Game image overlay

Use subtle dark gradient from bottom.

Avoid full-card aggressive overlay.

---

# Provider cards

Simple compact cards.

Contain:

logo

provider name

game count

optional category

Background:

#121821

Height:

90px–110px

---

# Bonus cards

Bonus cards can use subtle accent backgrounds.

Example:

linear-gradient(
135deg,
rgba(34,197,94,0.12),
rgba(34,197,94,0.03)
)

Still retain dark card structure.

---

# Right sidebar

Width:

300px–320px

Position:

sticky

Top:

88px

Widgets should stack vertically.

Gap:

16px

---

# Right sidebar widgets

Possible widgets:

Top cazinouri

Bonusul zilei

Jocuri populare

Cazinouri noi

Ghiduri recente

Each widget:

Background:

#111821

Border:

1px solid #222C38

Radius:

12px

Padding:

16px

---

# Right sidebar title

Font:

16px

Weight:

600

Margin bottom:

14px

---

# Compact ranked list

Example:

1.

Superbet
4.9
Vezi

Row height:

52px–60px

Separator:

1px solid #1E2732

---

# Filters

Filter bar should feel product-like.

Desktop:

horizontal

Mobile:

filter button opens drawer

Controls:

Category

Provider

Bonus type

Payment method

Rating

Sort

---

# Filter buttons

Height:

38px

Radius:

10px

Background:

#121821

Border:

1px solid #273241

Hover:

#18212C

Active:

green tinted background

---

# Tables

Tables should be readable, not Excel-like.

Header:

#111821

Rows:

#0E141B

Alternating background only if subtle.

Hover row:

#141C25

Sticky header where useful.

Mobile:
convert to cards or horizontal scroll.

---

# Search results

Search dropdown:

Width same as input

Max height:

520px

Background:

#111821

Border:

#273241

Radius:

12px

Shadow:

0 18px 50px rgba(0,0,0,0.35)

Grouped by:

Cazinouri

Jocuri

Bonusuri

Ghiduri

---

# Buttons

Primary:

green

Secondary:

dark

Tertiary:

text only

Danger:

red only when required

Avoid:
too many button styles

---

# Primary button

Background:

#22C55E

Text:

#06110A

Hover:

#16A34A

Active:

#15803D

Height:

40px–44px

Radius:

10px

---

# Secondary button

Background:

#151C25

Border:

#2A3543

Text:

#F8FAFC

Hover:

#1B2530

---

# Text button

Background:

transparent

Text:

#22C55E

Hover:

lighter green

---

# Links

Normal text links:

#7DD3A0

Hover:

#A7F3D0

Editorial links should remain visually distinct.

---

# Inputs

Height:

42px

Background:

#10161E

Border:

#26313E

Radius:

10px

Text:

#F8FAFC

Placeholder:

#667085

Focus:

border #22C55E

---

# Tooltips

Background:

#1A2330

Text:

#F8FAFC

Radius:

8px

Font:

12px

---

# Dropdowns

Background:

#121821

Border:

#273241

Radius:

10px

Shadow:

subtle

---

# Modals

Backdrop:

rgba(0,0,0,0.70)

Modal:

#111821

Max width:

600px default

Radius:

16px

Border:

#273241

---

# Mobile navigation

Desktop left sidebar disappears.

Mobile uses:

Top bar
+
bottom navigation or drawer

Preferred approach:

Header with menu button

Side drawer for full navigation

Optional bottom navigation for:

Home

Cazinouri

Jocuri

Bonusuri

Cont

---

# Mobile card design

Casino cards become vertical or compact stacked layout.

Keep visible:

logo

name

rating

bonus

primary CTA

Do not display all metadata.

---

# Mobile right sidebar

Right sidebar widgets move into main content.

Recommended order:

Main content

Relevant widget blocks

Footer

---

# Tablet

At medium widths:

Hide right sidebar first.

Keep left sidebar collapsed if space permits.

Then switch left sidebar to drawer.

---

# Breakpoint behavior

Desktop large:

> = 1440px

Full 3-column layout

Desktop:

1200–1439px

3-column but tighter

Tablet:

768–1199px

No right sidebar

Left nav may collapse

Mobile:

< 768px

Single column

---

# Animations

Default duration:

180ms

Longer layout transitions:

220ms–250ms

Easing:

ease-out

Use animations for:

hover

accordion

dropdown

drawer

modal

carousel

Avoid animation on every element.

---

# Card hover

Desktop only where useful.

Transform:

translateY(-2px)

Border:

lighter

Shadow:

slightly stronger

Do not scale cards aggressively.

---

# Skeleton loading

Use skeletons for:

search

cards

dynamic lists

Use dark neutral skeleton blocks.

Avoid spinners for large content sections.

---

# Empty states

Should be useful.

Example:

Nu am gasit cazinouri pentru filtrele selectate.

CTA:

Reseteaza filtrele

---

# Error states

Should be clear, not technical.

Example:

Nu am putut incarca datele.

CTA:

Incearca din nou

---

# Breadcrumbs

Small and subtle.

Font:

13px

Color:

#7A8797

Current page:

#AAB4C3

Spacing:

8px

---

# Author box

Compact.

Image:

44px–52px

Name

Role

Last updated date

Avoid oversized biography blocks inside commercial sections.

---

# Review score

Use rating:

0–5

Display example:

4.8 / 5

Stars:

gold

Do not use fake user counts.

---

# Pros and cons

Two-column desktop.

Single-column mobile.

Pros accent:

green

Cons accent:

muted red

Do not overuse colored backgrounds.

---

# FAQ

Accordion.

Background:

#111821

Border:

#222C38

Radius:

10px

Question:

16px

Answer:

15px

Spacing:

16px–20px

---

# Footer

Dark but visually separated.

Background:

#080B0F

Top border:

1px solid #1C252F

Desktop:

4–5 columns

Sections:

Cazinouri

Bonusuri

Jocuri

Ghiduri

Despre

Legal

Responsible Gambling

Footer text:

13px–14px

---

# Footer trust area

Include:

18+

responsible gambling

affiliate disclosure

licensing information

editorial policy

Keep professional and discreet.

---

# Visual hierarchy rule

Every screen should answer this order:

1. What page am I on?
2. What can I do here?
3. What is most important?
4. What should I explore next?

If the page does not communicate this quickly, simplify it.

---

# Density rule

The interface can be information-rich.

But each component must remain readable.

Avoid huge whitespace like luxury fashion websites.

Avoid ultra-dense casino dashboards.

Target:
balanced information density.

---

# Color rule

Green is the action color.

Gold is rating/premium.

Red is warning.

Blue is informational.

Purple should remain rare.

This prevents visual chaos.

---

# Icon rule

Use Lucide icons by default.

Icon stroke:

1.75–2px

Common size:

18px

Large navigation:

20px

Avoid mixing multiple icon styles.

---

# Image treatment

Game images:

vibrant

Casino logos:

neutral container

Editorial images:

dark overlay where text appears

Avoid heavy filters.

---

# Main desktop mockup structure

Visual hierarchy:

HEADER

LEFT SIDEBAR
|
MAIN
| Hero
| Recommended Casinos
| Popular Games
| Latest Bonuses
| Providers
| Fast Payout Casinos
| Guides
| FAQ
|
RIGHT SIDEBAR
| Top Casinos
| Bonus of the Day
| Popular Games
| Latest Guides

FOOTER

---

# Initial implementation priority

When implementing design, build in this order:

1. global background
2. font
3. left sidebar
4. header
5. main layout
6. right sidebar
7. section header
8. base card
9. buttons
10. responsive behavior

Do not build detailed casino/game cards before the global layout feels correct.

---

# Design quality requirement

Before considering a component complete, verify:

* visually balanced
* responsive
* readable
* consistent with design tokens
* no random colors
* no unnecessary animation
* no duplicated styles
* good hover/focus states
* usable on mobile
* compatible with dark theme
* does not resemble a generic template

The final product should feel intentional and premium.

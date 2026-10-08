# TASKS.md — CasinOnline.ro

## Current phase

PHASE 1 — FOUNDATION

Goal:
Build the reusable application shell and design foundation before building detailed content pages.

---

# Phase 1 — Foundation

## Project structure

* [ ] Review current Next.js project structure
* [ ] Create reusable component folders
* [ ] Create shared types folder
* [ ] Create utilities folder
* [ ] Create data/mock-data folder
* [ ] Keep structure simple and scalable

Suggested structure:

src/
app/
components/
layout/
ui/
casino/
games/
bonuses/
providers/
widgets/
data/
hooks/
lib/
types/

---

## Global design setup

* [ ] Configure global colors
* [ ] Configure font
* [ ] Configure body background
* [ ] Define reusable spacing conventions
* [ ] Define border radius conventions
* [ ] Define button styles
* [ ] Define card styles
* [ ] Define focus states

---

## Global application shell

* [ ] Create main application layout
* [ ] Create desktop 3-column structure
* [ ] Create left sidebar area
* [ ] Create main content area
* [ ] Create right sidebar area
* [ ] Ensure correct max width
* [ ] Ensure layout is responsive

Desktop concept:

Left Sidebar
+
Main Content
+
Right Sidebar

---

## Left sidebar

Create reusable:

`Sidebar`

Requirements:

* [ ] Brand/logo area
* [ ] Main navigation
* [ ] Game category navigation
* [ ] Guide/navigation section
* [ ] Active state
* [ ] Hover state
* [ ] Lucide icons
* [ ] Sticky/fixed desktop behavior
* [ ] Responsive mobile behavior
* [ ] Collapsible groups if useful

Initial navigation:

Home

Cazinouri

Bonusuri

Jocuri

Furnizori

Metode de plata

Ghiduri

Recenzii

Compara

Favorite

Game categories:

Sloturi

Live Casino

Ruleta

Blackjack

Jocuri de masa

Crash Games

---

## Header

Create reusable:

`Header`

Requirements:

* [ ] Sticky header
* [ ] Global search input
* [ ] Favorites action
* [ ] Login button
* [ ] Register button
* [ ] Mobile menu button
* [ ] Responsive layout
* [ ] Subtle backdrop blur
* [ ] Correct focus states

Search placeholder:

"Cauta cazinouri, jocuri, bonusuri..."

Do not implement real search yet.

---

## Right sidebar

Create reusable:

`RightSidebar`

Initial widgets:

* [ ] Top Casinos
* [ ] Bonus of the Day
* [ ] Popular Games
* [ ] Latest Guides

Requirements:

* [ ] Sticky behavior on large desktop
* [ ] Hide on smaller screens
* [ ] Reusable widget containers
* [ ] Mock data only for now

---

## Base UI components

Create only what is necessary during Phase 1.

Potential components:

* [ ] Button
* [ ] Card
* [ ] Badge
* [ ] SectionHeader
* [ ] IconButton
* [ ] RatingStars
* [ ] SearchInput
* [ ] WidgetCard

Avoid overengineering.

---

# Phase 2 — Homepage foundation

Goal:
Create the first premium homepage using reusable components.

---

## Hero section

Create:

`HeroSection`

Requirements:

* [ ] H1
* [ ] short description
* [ ] primary CTA
* [ ] secondary CTA
* [ ] trust indicators
* [ ] visual element
* [ ] responsive layout

Initial H1 concept:

"Descopera cele mai bune cazinouri online din Romania"

---

## Trust indicators

Create compact indicators for:

* [ ] Licentiate ONJN
* [ ] Oferte verificate
* [ ] Actualizate constant
* [ ] Recenzii independente

---

## Recommended casinos

Create reusable:

`CasinoCard`

First version should support:

* [ ] logo
* [ ] casino name
* [ ] rating
* [ ] badge
* [ ] bonus
* [ ] free spins
* [ ] license
* [ ] payout speed
* [ ] primary CTA
* [ ] review CTA

Use mock data.

---

## Popular games

Create reusable:

`GameCard`

First version supports:

* [ ] image
* [ ] game name
* [ ] provider
* [ ] RTP
* [ ] volatility
* [ ] favorite button
* [ ] hover interaction

---

## Latest bonuses

Create reusable:

`BonusCard`

First version supports:

* [ ] bonus type
* [ ] casino
* [ ] offer
* [ ] wagering information
* [ ] CTA

---

## Providers

Create reusable:

`ProviderCard`

Supports:

* [ ] logo
* [ ] provider name
* [ ] game count
* [ ] CTA

---

## Guides

Create reusable:

`GuideCard`

Supports:

* [ ] image
* [ ] title
* [ ] category
* [ ] excerpt
* [ ] author/update information

---

## FAQ

Create reusable:

`FAQAccordion`

Requirements:

* [ ] accessible
* [ ] keyboard usable
* [ ] subtle animations
* [ ] server-friendly architecture

---

## Footer

Create reusable:

`Footer`

Sections:

* [ ] Cazinouri
* [ ] Bonusuri
* [ ] Jocuri
* [ ] Ghiduri
* [ ] Despre
* [ ] Legal
* [ ] Responsible Gambling
* [ ] Affiliate disclosure

---

# Phase 3 — Casino architecture

Do not start until homepage foundation is stable.

---

## Casino data model

Create TypeScript types for:

* [ ] Casino
* [ ] CasinoBonus
* [ ] PaymentMethod
* [ ] Provider
* [ ] CasinoRating

---

## Casino listing

Route:

`/cazinouri-online`

Features:

* [ ] SEO metadata
* [ ] H1
* [ ] filters
* [ ] sorting
* [ ] casino cards
* [ ] comparison logic later
* [ ] contextual internal links

---

## Casino page

Route concept:

`/cazinouri-online/[slug]`

Sections:

* [ ] overview
* [ ] rating
* [ ] license
* [ ] current offer
* [ ] payments
* [ ] withdrawals
* [ ] KYC
* [ ] games
* [ ] providers
* [ ] mobile
* [ ] support
* [ ] pros and cons
* [ ] author opinion
* [ ] FAQ
* [ ] related casinos
* [ ] related guides

---

# Phase 4 — Game architecture

## Game listing

Route:

`/jocuri-casino`

---

## Game page

Route:

`/jocuri-casino/[slug]`

Sections:

* [ ] title
* [ ] provider
* [ ] RTP
* [ ] volatility
* [ ] max win
* [ ] paylines
* [ ] release information
* [ ] mechanics
* [ ] features
* [ ] similar games
* [ ] casinos offering game
* [ ] related guides

---

# Phase 5 — Providers

Routes:

`/furnizori`

`/furnizori/[slug]`

---

# Phase 6 — Payment methods

Routes:

`/metode-de-plata`

`/metode-de-plata/[slug]`

---

# Phase 7 — Bonuses

Routes:

`/bonusuri-casino`

Examples:

`/bonusuri-casino/bonus-fara-depunere`

`/bonusuri-casino/rotiri-gratuite`

`/bonusuri-casino/bonus-de-bun-venit`

---

# Phase 8 — Search and filtering

* [ ] real global search
* [ ] search results page
* [ ] filters
* [ ] sorting
* [ ] URL state
* [ ] mobile filter drawer

---

# Phase 9 — Supabase and PostgreSQL

Do not begin until data structures are stable.

Tasks:

* [ ] Create Supabase project
* [ ] Connect environment variables
* [ ] Design database schema
* [ ] Casinos table
* [ ] Games table
* [ ] Providers table
* [ ] Bonuses table
* [ ] Payment methods table
* [ ] Relationships
* [ ] Row level security
* [ ] Seed data

---

# Phase 10 — Authentication

Potential features:

* [ ] email login
* [ ] Google login
* [ ] favorites
* [ ] ratings
* [ ] saved comparisons

---

# Phase 11 — Admin

Create protected admin dashboard.

Manage:

* [ ] casinos
* [ ] games
* [ ] bonuses
* [ ] providers
* [ ] payments
* [ ] guides
* [ ] media
* [ ] affiliate URLs

---

# Phase 12 — SEO hardening

* [ ] metadata audit
* [ ] canonical audit
* [ ] robots
* [ ] sitemap
* [ ] structured data
* [ ] breadcrumbs
* [ ] internal linking audit
* [ ] image SEO
* [ ] Open Graph
* [ ] pagination/indexation logic
* [ ] Core Web Vitals

---

# Phase 13 — Performance

* [ ] Lighthouse
* [ ] bundle analysis
* [ ] image optimization
* [ ] font optimization
* [ ] JS reduction
* [ ] cache strategy
* [ ] prefetch strategy
* [ ] database query optimization

---

# Phase 14 — Production

* [ ] GitHub repository
* [ ] Vercel deployment
* [ ] custom domain
* [ ] production environment variables
* [ ] analytics
* [ ] Search Console
* [ ] monitoring
* [ ] backups

---

# Immediate next task

Build the Phase 1 application shell only.

Do NOT build detailed homepage sections yet.

The first implementation should include:

1. Global design foundation
2. Desktop left sidebar
3. Sticky header
4. Main content container
5. Desktop right sidebar
6. Responsive behavior
7. Basic placeholder content

The goal is to establish the visual shell from the CasinOnline.ro mockup before building detailed components.

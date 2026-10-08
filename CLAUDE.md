# CLAUDE.md — CasinOnline.ro

## Project purpose

CasinOnline.ro is a premium Romanian casino affiliate platform.

The site must NOT look like a traditional affiliate blog.

It should feel like a modern casino discovery platform inspired by premium products such as:

* Steam
* Netflix
* modern casino interfaces
* modern SaaS dashboards

The experience should be fast, interactive, visually premium and easy to navigate.

The platform will eventually contain:

* online casinos
* casino bonuses
* casino games
* slots
* live casino games
* providers
* payment methods
* guides
* reviews
* news
* comparison pages
* user favorites
* user ratings
* filters
* search
* admin functionality

The architecture must be able to scale to thousands of pages.

---

# Core development principles

## 1. Reusable components

Do not duplicate UI code.

If the same visual or functional pattern appears more than once, create a reusable component.

Examples:

* CasinoCard
* GameCard
* BonusCard
* ProviderCard
* RatingStars
* Badge
* CTAButton
* Breadcrumbs
* SearchBar
* FilterBar
* SectionHeader

Prefer composition over duplication.

---

## 2. Component size

Avoid giant components.

As a general rule:

* target under 200 lines per component
* if a component becomes difficult to understand, split it
* extract repeated logic into hooks or utilities

Do not create 800–1000 line page components.

---

## 3. TypeScript

Use TypeScript everywhere.

Avoid `any`.

Create clear interfaces and types for:

* Casino
* Game
* Provider
* Bonus
* PaymentMethod
* Review
* Guide
* User
* Rating

Types should be reusable.

---

## 4. Next.js

Use the modern Next.js App Router.

Prefer:

* Server Components when possible
* static rendering when appropriate
* server-side data fetching where beneficial
* client components only when interaction requires them

Do not add `"use client"` unnecessarily.

Performance and SEO are priorities.

---

## 5. Tailwind CSS

Use Tailwind CSS for styling.

Avoid:

* large custom CSS files
* inline styles
* duplicated utility combinations

Create reusable UI components for repeated visual patterns.

---

# Design philosophy

The site should feel:

* premium
* modern
* dark
* elegant
* fast
* trustworthy
* casino-inspired
* not tacky
* not overloaded

Avoid the typical cheap casino affiliate look.

Do not use excessive:

* gradients
* glow
* neon
* animations
* giant shadows
* flashing elements

Casino styling should feel sophisticated.

---

# Base design direction

Primary background:

#0B0F14

Secondary background:

#10151C

Card background:

#141A22

Elevated card:

#181F29

Primary border:

#252D38

Primary green:

#22C55E

Primary green hover:

#16A34A

Text primary:

#F8FAFC

Text secondary:

#A1AAB8

Muted text:

#697586

Rating / premium accent:

#F5B942

Danger / warning:

#EF4444

---

# Border radius

Use consistent radiuses.

Small UI:
8px

Buttons:
10px

Cards:
12px

Large cards / hero:
16px

Avoid excessive pill-shaped UI except:

* tags
* filters
* badges

---

# Typography

Primary font:

Geist

Fallback:

Inter, sans-serif

Typography hierarchy should be clear.

Avoid excessive font weights.

Suggested:

H1:
bold

H2:
bold

H3:
semibold

Body:
regular

Labels:
medium

---

# Layout

Desktop layout should support three main regions:

LEFT SIDEBAR

MAIN CONTENT

RIGHT SIDEBAR

Example:

240px / flexible / 320px

Left sidebar:
navigation

Main:
primary page content

Right sidebar:
contextual discovery widgets

---

# Left sidebar

The left sidebar should be persistent on desktop.

Possible navigation:

Home

Casinos

Bonuses

Games

Providers

Payment Methods

Guides

News

Reviews

Compare

Favorites

Game categories:

Slots

Live Casino

Roulette

Blackjack

Table Games

Crash Games

Bingo

Bonus Games

Do not overload the sidebar.

Use expandable groups when necessary.

---

# Header

The global header should contain:

* search
* theme controls if added later
* favorites
* login/account
* mobile navigation
* useful quick actions

The search experience will eventually support:

* casinos
* games
* providers
* bonuses
* guides

---

# Right sidebar

The right sidebar should be contextual.

Possible widgets:

Top Casinos

Latest Bonuses

Popular Games

Fast Payout Casinos

New Casinos

Latest Guides

Trending

Do NOT fill the right sidebar with advertisements.

The sidebar should improve discovery.

---

# Responsive behavior

Mobile-first responsiveness is mandatory.

Desktop:
left sidebar + content + right sidebar

Tablet:
collapsed sidebar + content

Mobile:
single column

On mobile:

* sidebars should not occupy permanent screen space
* navigation should become drawer/menu
* cards should be compact
* important information should remain visible
* CTA buttons must remain easy to tap

Minimum touch target:
44px

---

# SEO

SEO is critical.

Pages must render meaningful HTML.

Do not hide primary page content behind client-side JavaScript.

Use proper semantic HTML:

header
nav
main
section
article
aside
footer

Use heading hierarchy correctly.

Each indexable page should normally contain one clear H1.

Use H2/H3 logically.

Do not use headings only for styling.

---

# Metadata

Every important page should support:

* title
* meta description
* canonical
* Open Graph
* Twitter/X metadata
* robots directives when necessary

Metadata should eventually come from structured page data.

---

# Structured data

Prepare architecture for Schema.org.

Possible schemas:

Organization

WebSite

BreadcrumbList

Article

Review

FAQPage where appropriate

ItemList

Do not add fake ratings or fake reviews.

---

# Internal linking

Internal linking is a core platform feature.

Pages should connect naturally.

Example:

Casino page links to:

* bonuses
* games
* providers
* payment methods
* guides

Game page links to:

* provider
* casinos offering the game
* similar games
* relevant guides

Provider page links to:

* games
* casinos
* related providers

Avoid isolated pages.

---

# Performance

Performance is a priority.

Target:

* fast LCP
* low CLS
* low JavaScript usage
* optimized images
* minimal blocking resources

Use next/image where appropriate.

Always define image dimensions where possible.

Avoid loading large assets unnecessarily.

Lazy-load below-the-fold content when appropriate.

---

# Images

Prefer:

AVIF
WebP

Use PNG only when transparency or format requirements justify it.

Casino logos should have consistent containers.

Game thumbnails should use consistent aspect ratios.

Avoid gigantic hero images.

---

# Accessibility

The site must be usable with keyboard navigation.

Include:

* alt text
* labels
* focus states
* sufficient contrast
* semantic buttons and links

Never use a div when a button or link is semantically correct.

---

# Buttons

Primary CTA:

green background

Secondary CTA:

dark background with border

Avoid having five different button styles.

Common labels may include:

Vezi oferta

Citeste recenzia

Vezi cazinoul

Vezi jocul

Compara

---

# Data architecture

UI must not be tightly coupled to hardcoded casino data.

Temporary mock data is acceptable during development.

However components should receive data via props.

BAD:

CasinoCard contains Superbet values inside component.

GOOD:

<CasinoCard casino={casino} />

This allows future connection to Supabase/PostgreSQL.

---

# Future database

The project will later use:

Supabase

PostgreSQL

Potential entities:

casinos

games

providers

bonuses

payment_methods

casino_payment_methods

casino_providers

game_providers

reviews

guides

users

favorites

ratings

Do not implement database dependencies until explicitly requested.

---

# Authentication

Authentication will be added later.

Possible functionality:

login

favorites

ratings

comments

saved comparisons

Do not build fake authentication.

---

# Admin

A custom admin dashboard will eventually manage:

Casinos

Games

Providers

Bonuses

Payments

Guides

Reviews

Media

Users

Do not build admin functionality until explicitly requested.

---

# Security

Never expose:

* secret keys
* service role keys
* database passwords
* private API tokens

Public environment variables must only contain values safe for the browser.

Secrets belong in environment variables.

Never hardcode credentials.

---

# Project organization

Preferred structure:

src/
app/
components/
layout/
casino/
games/
bonuses/
providers/
widgets/
ui/
lib/
types/
hooks/
data/

public/
images/
logos/
icons/

Exact structure may evolve.

Do not reorganize the entire project without a clear reason.

---

# UI component rules

Before creating a new component:

1. Check if an equivalent component already exists.
2. Reuse existing primitives.
3. Avoid unnecessary dependencies.
4. Keep props clear.
5. Keep presentation separate from data logic where practical.

---

# Dependencies

Do not install libraries unnecessarily.

Before adding a dependency, determine whether:

* Next.js already supports the feature
* React already supports it
* Tailwind can handle it
* a small internal component would be sufficient

Avoid bloating the project.

---

# Icons

Prefer a consistent icon library.

Use Lucide icons unless there is a strong reason otherwise.

Do not mix multiple icon libraries casually.

---

# Animations

Animations should be subtle.

Recommended:
150–250ms

Use animations for:

* hover
* dropdowns
* sidebar transitions
* card interaction
* modal transitions

Avoid distracting animation.

---

# Casino cards

Casino cards should eventually support:

logo

name

rating

badge

bonus

free spins

license

payout speed

payment methods

review link

affiliate CTA

Cards should remain readable and compact.

---

# Game cards

Game cards should eventually support:

thumbnail

name

provider

rating

RTP

volatility

category

favorite action

details CTA

Do not expose every metric directly on compact cards.

---

# Page types

Expected main page types:

Homepage

Casino listing

Casino review

Bonus listing

Bonus detail

Game listing

Game detail

Provider listing

Provider detail

Payment listing

Payment detail

Guide listing

Guide article

Search

Compare

Favorites

---

# Homepage philosophy

The homepage should behave like a discovery platform.

Suggested flow:

Hero / Search

Trust indicators

Recommended Casinos

Popular Games

Latest Bonuses

Providers

Fast Payout Casinos

Guides

Latest Content

FAQ

Do not turn the homepage into a giant SEO text wall.

Useful content and internal discovery come first.

---

# Content

Content should sound natural and expert.

Avoid:

* keyword stuffing
* filler
* generic AI phrases
* repetitive introductions

Content must provide genuine value.

Romanian content should be written naturally.

---

# Affiliate links

Affiliate links must be centralized and manageable.

Do not scatter hardcoded affiliate URLs throughout components.

The future database should store affiliate URLs.

CTA components should receive URLs from data.

---

# Responsible gambling

Responsible gambling information should be visible and easy to access.

Age requirements must be respected.

The platform should not make misleading claims about guaranteed winnings.

---

# Development workflow

Before implementing a significant feature:

1. Inspect existing files.
2. Understand the architecture.
3. Reuse existing components.
4. Make the smallest clean change.
5. Run lint/build where relevant.
6. Fix introduced errors.
7. Explain major architectural changes.

---

# Claude behavior

When asked to modify the project:

DO:

* inspect relevant files first
* preserve working functionality
* follow existing patterns
* write production-quality code
* prioritize performance
* prioritize reusable architecture
* keep SEO in mind
* keep responsive behavior in mind

DO NOT:

* rewrite unrelated files
* install random libraries
* duplicate components
* hardcode large datasets
* add fake features
* introduce unnecessary complexity
* remove working functionality without permission

---

# Current project phase

The project is currently in:

PHASE 1 — FOUNDATION

Current priorities:

1. base architecture
2. global design tokens
3. layout system
4. left sidebar
5. header
6. main content container
7. right sidebar
8. responsive behavior

Do NOT build:

* Supabase
* database
* authentication
* admin
* thousands of pages

until the foundation is stable.

---

# Decision rule

When multiple implementations are possible, prioritize in this order:

1. performance
2. maintainability
3. SEO
4. accessibility
5. scalability
6. visual polish
7. development convenience

The result should feel like a professionally engineered product, not a collection of generated pages.

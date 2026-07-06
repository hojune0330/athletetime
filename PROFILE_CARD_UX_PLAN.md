# Profile Card Feature - UX/UI Integration Plan
## Athlete Time Community x Athletic Card News

---

## 1. Executive Summary

### Goal
Integrate the profile-card generator into the Athlete Time community so athletes can:
1. Create shareable athletics record cards (Instagram, Stories, KakaoTalk)
2. Post cards directly to the community board
3. Share their achievements on external SNS platforms

### Key Principle
**"Record your moment, share your pride"** - The card should feel like a trophy that athletes want to show off.

---

## 2. Current State Analysis

### Athlete Time (athletetime) - Existing Navigation
```
Header Nav:
  [Home] [Community] [Pace Calc] [Training Calc] [Match Results] [Marketplace] [Chat]
  [Login] [Register]
```

### Key Observations from Screenshots
1. **Design Language**: Clean white background, primary blue (#4F46E5 indigo), rounded-xl cards, subtle shadows
2. **Mobile**: Hamburger menu with drawer navigation
3. **Content Pattern**: Card-based layouts, list views with metadata (views, likes, comments)
4. **Match Results Page**: Competition list with "보기" (View) buttons, filter dropdowns for events/divisions/rounds
5. **Community**: Anonymous board with sort options (newest/popular/comments), post cards with thumbnails
6. **Typography**: Korean-first, "애타" brand, modern sans-serif

### Profile Card Service (Current Webapp) - Capabilities
- 3 Layouts: stamp (Garmin), corner (Nike Run), fullcard (Strava)
- 3 Ratios: 1:1 (Feed), 9:16 (Story/Reels), 4:5 (Instagram Portrait)
- 2 Themes: dark, light
- Outputs: High-quality PNG (1080px width, 2x device scale)
- Data: athlete name, affiliation, rank, record, event, competition, wind, comment

---

## 3. User Personas & Use Cases

### Persona A: Active Athlete (선수)
- "대회 끝나고 내 기록으로 인스타 스토리 올리고 싶다"
- Uploads competition photo, selects their result, generates and shares to IG Story
- Primary flow: Photo upload -> Record search -> Card generate -> Share to SNS

### Persona B: Team Coach / Manager (코치/팀 관계자)
- "우리 팀 선수들 기록을 카드로 만들어서 팀 인스타에 올리자"
- Searches by affiliation, creates multiple cards for team members
- Primary flow: Search by team -> Select records -> Batch generate

### Persona C: Athletics Fan (팬/동호인)
- "좋아하는 선수 기록으로 커뮤니티에 축하글 올리고 싶다"
- Doesn't upload a photo (uses default/placeholder), selects record, posts to community
- Primary flow: Record search -> Generate with default -> Post to community

### Persona D: Anonymous Browser (비로그인 방문자)
- "프로필카드 기능이 뭐지? 한번 해볼까"
- Tries the tool without login, prompted to login only when sharing/posting
- Primary flow: Try without login -> Preview -> Login prompt on share

---

## 4. Navigation Integration

### New Nav Item Position
```
Header Nav (Updated):
  [Community] [Pace Calc] [Training Calc] [Profile Card] [Match Results] [Marketplace] [Chat]
```

**Why here?** Profile Card sits between tools (calculators) and data (match results), acting as the bridge: "use your match result data to create visual content."

### Route: `/profile-card`
- No login required to USE the tool (generate preview)
- Login required to SHARE or POST to community
- This removes friction and lets users experience the value first

---

## 5. User Flow Design

### Flow A: Main Entry - Profile Card Page

```
/profile-card
  |
  v
+================================+
|  STEP 1: Search Your Record    |
|  +--------------------------+  |
|  | Search: [___________] [Go]| |
|  | Type: [Name v] [Team v]  | |
|  +--------------------------+  |
|                                |
|  Results:                      |
|  +-----+----+----+----+-----+ |
|  | Rank|Name|Team|Rec |Event | |
|  +-----+----+----+----+-----+ |
|  | 1   |이은빈|해남|11.84|100m| |  <- clickable to select
|  | 2   |신현진|포항|11.96|100m| |
|  +-----+----+----+----+-----+ |
|                                |
|  Selected: [이은빈 - 100m 11.84] |
+================================+
            |
            v
+================================+
|  STEP 2: Upload Photo          |
|  +--------------------------+  |
|  |   [  Drop photo here  ] |  |
|  |   or click to upload     |  |
|  |   JPG/PNG/WEBP <=10MB   |  |
|  +--------------------------+  |
|  (Optional: Skip & use default)|
+================================+
            |
            v
+================================+
|  STEP 3: Customize Card        |
|  Layout: [Stamp] [Corner] [Full]|
|  Ratio:  [1:1] [9:16] [4:5]   |
|  Theme:  [Dark] [Light]        |
|  Comment: [최선을 다한 결과!__] |
|                                 |
|  +---------+                    |
|  | PREVIEW |  <- live preview   |
|  | (card)  |                    |
|  +---------+                    |
+================================+
            |
            v
+================================+
|  STEP 4: Generate & Share       |
|  [  Generate Card  ]           |
|  (loading... generating PNG)    |
|                                 |
|  Result:                        |
|  +---------+                    |
|  | FINAL   |                    |
|  | CARD    |                    |
|  | IMAGE   |                    |
|  +---------+                    |
|                                 |
|  Actions:                       |
|  [Download] [Share] [Post]      |
|  [Instagram] [Kakao] [Twitter]  |
+================================+
```

### Flow B: Entry from Match Results Page

```
/matchResult/:competitionId
  |
  User sees results table
  -> Each row has a "카드 만들기" button
  |
  v
/profile-card?event=100m&name=이은빈&comp=53...
  |
  -> Step 1 is pre-filled (record auto-selected)
  -> User jumps directly to Step 2 (Photo upload)
```

### Flow C: Share to Community

```
After card is generated:
  |
  [커뮤니티에 올리기] button clicked
  |
  v
If not logged in:
  -> Login modal appears
  -> After login, continue
  |
  v
/write?type=profile-card&imageUrl=<generated-card-url>
  |
  -> WritePage opens with:
     - Card image auto-attached
     - Title pre-filled: "이은빈 - 여자 100m 11.84 (제53회 KBS배)"
     - User can edit title and add body text
  |
  -> Post to community board
```

---

## 6. Page-by-Page UI Specification

### 6.1 Profile Card Page (`/profile-card`)

#### Desktop Layout (max-w-5xl, matching Layout.tsx)
```
+--[Header]------------------------------------+
|                                               |
|  +-- Page Title Bar -------------------------+|
|  | Profile Card Generator                     ||
|  | "대회 기록으로 나만의 프로필 카드를 만들어보세요" ||
|  +-------------------------------------------+|
|                                               |
|  +-- Left Column (60%) --+ +-- Right (40%) --+|
|  | Step indicator (1-4)   | | Live Preview    ||
|  |                        | |                 ||
|  | [Active Step Content]  | | +----------+   ||
|  |                        | | | Card     |   ||
|  |                        | | | Preview  |   ||
|  |                        | | | (live)   |   ||
|  |                        | | +----------+   ||
|  |                        | |                 ||
|  +------------------------+ +-----------------+|
|                                               |
+--[Footer]------------------------------------+
```

#### Mobile Layout
```
+--[Header]--+
|             |
| Page Title  |
|             |
| Step 1/4    |
| [Step Content]|
|             |
| [Preview]   |
| (collapsible)|
|             |
| [Next Step] |
+--[Footer]--+
```

#### Step Indicator Component
```
(1)-----(2)-----(3)-----(4)
Record  Photo   Style  Share
  *
```
Active step = filled circle + label. Completed = green check. Upcoming = gray outline.

### 6.2 Record Search Step (Step 1)

#### Search Bar
- Input field with placeholder "선수명 또는 소속을 입력하세요"
- Search type toggle: [선수명] [소속]
- Competition filter dropdown (optional, loads from DB)
- Real-time debounced search (300ms)

#### Results Display
- Table format on desktop, card list on mobile
- Each result shows: Event | Division/Round | Rank | Name | Team | Record
- Competition name and date as section headers
- Click/tap a row to select it (highlight with primary color border)
- Selected record shows as a chip below the search bar: "이은빈 - 여자 100m 결승 - 11.84 (제53회 KBS배)"

#### Empty State
"검색 결과가 없습니다. 대회 경기결과 페이지에서 결과를 확인해보세요."
[경기 결과 보러가기 ->]

### 6.3 Photo Upload Step (Step 2)

#### Dropzone
- Large area (200px height) with dashed border
- Icons: camera + upload
- Text: "대회에서 찍은 사진을 올려주세요"
- Subtext: "JPG, PNG, WEBP / 최대 10MB"
- Click to browse or drag-and-drop
- After upload: shows photo preview with [X] remove button

#### Skip Option
- Below dropzone: "사진 없이 만들기 →"
- Uses a default gradient/pattern background instead of photo
- Good for coaches sharing team records without individual photos

### 6.4 Style Customization Step (Step 3)

#### Layout Selector (Visual Cards)
Three clickable cards showing mini-previews:
```
[Stamp]        [Corner]       [Full Card]
 +---------+   +---------+   +---------+
 | photo   |   | photo   |   | HEADER  |
 |         |   |    +--+ |   | photo   |
 | ======= |   |    |  | |   |         |
 | info bar|   |    +--+ |   | DATA    |
 +---------+   +---------+   +---------+
 Garmin style   Nike style    Strava style
```

#### Ratio Selector (Button Group)
```
[1:1 피드] [9:16 스토리] [4:5 세로]
```
With small icons showing aspect ratio visually.

#### Theme Toggle
```
[Dark] [Light]
```
Simple toggle switch or segmented control.

#### Comment Input
```
[응원 한마디를 남겨보세요 (최대 40자)] (23/40)
```
Character counter, optional field.

### 6.5 Generate & Share Step (Step 4)

#### Generate Button
- Large, full-width primary button: "카드 생성하기"
- Loading state: spinner + "카드를 만들고 있어요..."
- Success: shows generated card image

#### Action Buttons (Post-Generation)
```
Primary Actions:
  [Download]  - Downloads PNG directly
  [Share]     - Opens share sheet (Web Share API on mobile, custom modal on desktop)

Community Action:
  [커뮤니티에 올리기] - Creates a post with the card attached

SNS Quick Share:
  [Instagram] [Twitter/X] [KakaoTalk] [Link Copy]
```

#### Share Behavior Details

**Download**:
- Direct file download as `profile_{date}_{name}_{event}.png`
- On mobile: triggers native save-to-photos dialog

**Instagram**:
- Mobile: Opens Instagram with image pre-loaded via Web Share API (if supported)
- Desktop: Shows instructions: "이미지를 저장한 후 Instagram 앱에서 업로드하세요"
- Recommended hashtags auto-copied: `#육상 #AthleteTime #100m #KBS배전국육상`

**KakaoTalk**:
- Uses Kakao JavaScript SDK share
- Creates a link card with card preview image + link back to AthleteTime
- Template: title = "이은빈 - 100m 11.84", description = "제53회 KBS배 전국육상경기대회", imageUrl = card image

**Twitter/X**:
- Opens tweet compose with pre-filled text + image
- Text: "이은빈 선수의 100m 기록 11.84! #육상 #AthleteTime"

**Link Copy**:
- Generates a shareable URL: `https://athletetime.com/profile-card/share/{cardId}`
- Shows a toast: "링크가 복사되었습니다!"
- The shared link opens a page showing the card with a CTA to create your own

---

## 7. Match Results Page Integration

### New "카드 만들기" Button
Each match result row gets a small action button:

```
| Rank | Name     | Team    | Record | Actions         |
|------|----------|---------|--------|-----------------|
| 1    | 이은빈    | 해남군청 | 11.84  | [카드 만들기]    |
| 2    | 신현진    | 포항시청 | 11.96  | [카드 만들기]    |
```

- Icon: small card/image icon + "카드"
- Click navigates to `/profile-card?record={encodedRecord}`
- Pre-fills the record selection step

### Match Result Detail Page Enhancement
After the detailed result view, add a section:

```
+-- 이 기록으로 카드 만들기 --+
|  Record card preview       |
|  (auto-generated dark/stamp)|
|  [이 기록으로 카드 만들기 →]  |
+----------------------------+
```

---

## 8. Community Integration

### Profile Card Post Type
When posting a profile card to the community:

```
Post Card in Community Feed:
+-----------------------------------------+
| [Profile Card]  관리자  2026년 3월 13일    |
| 이은빈 - 여자 100m 결승 11.84             |
|                                         |
| +---+                                   |
| |카드|  (thumbnail of generated card)    |
| |   |                                   |
| +---+                                   |
|                                         |
| 👁 12  👍 3  💬 2                        |
+-----------------------------------------+
```

### Community Board Category (Optional Future)
Consider adding a dedicated "기록 자랑" or "카드뉴스" category/board for card posts, making them easy to browse.

---

## 9. Shared Card Landing Page

### Route: `/profile-card/share/{cardId}`

When someone receives a shared link (KakaoTalk, Twitter, etc.):

```
+-- Athlete Time --+
|                  |
|  [Card Image]    |
|  이은빈           |
|  여자 100m 결승   |
|  11.84           |
|                  |
|  제53회 KBS배     |
|  전국육상경기대회  |
|                  |
| [나도 카드 만들기] |
| [앱으로 보기]     |
+------------------+
```

OG Meta Tags for rich link previews:
```html
<meta property="og:title" content="이은빈 - 100m 11.84 | Athlete Time" />
<meta property="og:description" content="제53회 KBS배 전국육상경기대회 여자 100m 결승" />
<meta property="og:image" content="https://athletetime.com/cards/{cardId}.png" />
```

---

## 10. Technical Architecture

### Frontend Components (React + TypeScript + Tailwind)

```
frontend/src/
  pages/
    ProfileCardPage/
      index.tsx                    # Main page container
      ProfileCardPage.tsx          # Page logic + state management
      components/
        StepIndicator.tsx          # Step 1-4 progress bar
        RecordSearch.tsx           # Step 1: Search + select
        PhotoUpload.tsx            # Step 2: Photo dropzone
        StyleCustomizer.tsx        # Step 3: Layout/ratio/theme/comment
        CardResult.tsx             # Step 4: Generated card + share actions
        CardPreview.tsx            # Live preview sidebar
        ShareModal.tsx             # SNS sharing options modal
        RecordRow.tsx              # Individual result row
      hooks/
        useProfileCard.ts          # Main state management hook
        useRecordSearch.ts         # Search API hook
        useCardGeneration.ts       # Generation API hook
      types.ts                     # TypeScript interfaces
    ProfileCardSharePage.tsx       # /profile-card/share/:cardId

  api/
    profileCard.ts                 # API client for profile-card endpoints

  components/
    common/
      ShareButton.tsx              # Reusable SNS share buttons
```

### Backend Endpoints (Express + PostgreSQL)

```
NEW Routes (/api/profile-card/):
  GET    /api/profile-card/search?q=...&type=name|team
  POST   /api/profile-card/generate
  GET    /api/profile-card/share/:cardId
  POST   /api/profile-card/share         (create shareable link)

MODIFIED Routes:
  GET    /api/match-results/competition/:id  (add card action metadata)
```

### Data Flow
```
[User] -> Search athlete name
       -> GET /api/profile-card/search?q=이은빈&type=name
       -> Backend queries match_results table
       -> Returns matching records

[User] -> Upload photo + select record + choose style
       -> POST /api/profile-card/generate
          Body: { photo (base64), record, layout, ratio, theme, comment }
       -> Backend: Puppeteer renders HTML template -> PNG
       -> Returns: { image (base64), filename, shareId }

[User] -> Click "Share"
       -> POST /api/profile-card/share
          Body: { cardImage, metadata }
       -> Backend stores card in Cloudinary/S3
       -> Returns: { shareUrl, shareId }

[External User] -> Opens shared link
               -> GET /profile-card/share/:cardId
               -> Renders card + CTA page
```

---

## 11. Authentication & Access Control

| Action | Auth Required? | Notes |
|--------|---------------|-------|
| Search records | No | Public data |
| Upload photo | No | Client-side only |
| Preview card | No | Client-side rendering |
| Generate card (server) | No* | Rate-limited (5/hour for anonymous) |
| Download card | No | Direct file download |
| Share to SNS | No | Client-side Web Share API |
| Post to community | Yes | Requires login |
| Create share link | Yes | Requires login for persistent links |

*Anonymous generation is rate-limited by IP to prevent abuse. Logged-in users get higher limits (20/hour).

---

## 12. Mobile-First Considerations

### Touch-Friendly Interactions
- Large tap targets (min 44x44px) for all buttons
- Swipe between steps on mobile (optional gesture navigation)
- Photo upload integrates with mobile camera roll
- Bottom-fixed action bar on mobile for primary actions

### Performance
- Card preview rendered client-side (HTML/CSS only, no Puppeteer)
- Server-side generation only on final "Generate" action
- Lazy-load Puppeteer on backend (first generation may take 2-3s)
- Show skeleton loading states during generation

### Web Share API (Mobile)
```typescript
if (navigator.share) {
  await navigator.share({
    title: '이은빈 - 100m 11.84',
    text: '#육상 #AthleteTime',
    files: [new File([blob], 'profile_card.png', { type: 'image/png' })]
  });
}
```
Falls back to custom share modal on desktop.

---

## 13. SNS Optimization Details

### Instagram
- **1:1 (1080x1080)**: Feed post - most versatile
- **9:16 (1080x1920)**: Story/Reels - highest engagement for personal records
- **4:5 (1080x1350)**: Portrait feed - shows more info
- Auto-suggest hashtags: `#육상 #Athletics #AthleteTime #대회명 #종목`
- Copy-to-clipboard: format text + hashtags for easy paste

### KakaoTalk
- Uses Kakao Link API (JavaScript SDK)
- Feed template with:
  - imageUrl: card image (from Cloudinary/CDN)
  - title: "이은빈 - 100m 11.84"
  - description: "제53회 KBS배 전국육상경기대회"
  - link: share page URL

### Twitter/X
- Intent URL: `https://twitter.com/intent/tweet?text=...&url=...`
- Pre-filled text with athlete name, record, and hashtags
- Card image shown via OG tags on share page

### Facebook
- Share dialog: `https://www.facebook.com/sharer/sharer.php?u=...`
- Relies on OG meta tags for rich preview

---

## 14. Implementation Priority

### Phase 1A: Core Profile Card Page (MVP)
1. `/profile-card` page with 4-step wizard
2. Record search via API (querying match_results)
3. Photo upload (client-side)
4. Style customization (layout, ratio, theme, comment)
5. Server-side card generation (Puppeteer)
6. Download button
7. Basic share (link copy, Web Share API)

### Phase 1B: Community Integration
8. "Post to community" flow
9. Share link generation + landing page
10. KakaoTalk share integration
11. Instagram/Twitter share helpers

### Phase 1C: Match Results Integration
12. "카드 만들기" button on match result rows
13. Deep-link from match results to profile-card page
14. Auto-generated card preview on match result detail

### Phase 2 (Future):
- Batch generation for coaches
- Custom templates / user template uploads
- Card gallery (browse other users' cards)
- Analytics (how many cards shared, views)
- Watermark / branding customization

---

## 15. Key Design Decisions

### D1: Step-by-Step Wizard vs. Single Page
**Decision: Step-by-step wizard with live preview sidebar**
- Reason: Reduces cognitive load. Athletes are not designers; guide them through each decision.
- On mobile: vertical steps with "Next" buttons.
- On desktop: left panel (steps) + right panel (live preview).

### D2: Login Requirement
**Decision: Login NOT required for card creation; only for sharing/posting**
- Reason: Lower friction = higher conversion. Let users see the value before asking for signup.
- Anonymous users get rate-limited generation (5/hour).

### D3: Client-Side Preview vs. Server-Side Only
**Decision: Client-side HTML preview + Server-side final PNG**
- Reason: Instant feedback during customization. Only hit the server for the final high-res PNG.
- Client preview uses the same HTML templates rendered in an iframe or shadow DOM.

### D4: Default Photo for No-Upload
**Decision: Offer gradient/pattern backgrounds when no photo uploaded**
- Reason: Coaches and fans may not have personal photos. A styled card without a photo still shows the record data clearly.
- 3-4 default backgrounds: track texture, dark gradient, team colors (optional).

### D5: Navigation Tab Label
**Decision: "프로필 카드" (Profile Card)**
- Reason: Clear, matches the feature name. Alternatively "기록 카드" or "카드뉴스" could work, but "프로필 카드" implies personal ownership and shareability.

---

## 16. Success Metrics

| Metric | Target (30 days post-launch) |
|--------|------------------------------|
| Card generations per day | 50+ |
| Download rate (of generated) | 80%+ |
| Share rate (of downloaded) | 30%+ |
| Community posts with cards | 10+ per week |
| New user signups via card share links | 5% conversion |
| Average time to generate first card | < 2 minutes |

---

## Appendix: File Structure Summary

```
athletetime/
  backend/
    routes/
      profileCard.js          # NEW - profile card API routes
    services/
      profileCardService.js   # MIGRATED from webapp
    templates/
      profile-card/
        stamp.html            # COPIED from webapp
        corner.html           # COPIED from webapp
        fullcard.html         # COPIED from webapp
    utils/
      eventClassifier.js      # MIGRATED from webapp

  frontend/
    src/
      pages/
        ProfileCardPage/      # NEW - main profile card page
      api/
        profileCard.ts        # NEW - API client
      components/
        common/
          ShareButton.tsx     # NEW - reusable share component
```

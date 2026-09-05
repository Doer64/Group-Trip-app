// tests/6-user-realtime-sync.spec.ts
import { test, expect, Page } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://group-trip-app-ochre.vercel.app';

/**
 * Safe navigation helper to handle URL changes across browsers without NS_BINDING_ABORTED crashes
 */
async function safeWaitForURL(
  page: Page,
  urlOrPredicate: RegExp | string | ((url: URL) => boolean),
  timeout = 25000
) {
  if (typeof urlOrPredicate === 'string') {
    await expect.poll(() => page.url(), { timeout }).toContain(urlOrPredicate);
  } else if (urlOrPredicate instanceof RegExp) {
    await expect.poll(() => page.url(), { timeout }).toMatch(urlOrPredicate);
  } else {
    await expect.poll(() => {
      try {
        return urlOrPredicate(new URL(page.url()));
      } catch {
        return false;
      }
    }, { timeout }).toBe(true);
  }
}

async function waitForLeaveLogin(page: Page, timeout = 25000) {
  await expect.poll(() => {
    try {
      return new URL(page.url()).pathname;
    } catch {
      return '/login';
    }
  }, { timeout }).not.toContain('/login');
}

/**
 * Signs in a user given their email and display name with automatic retry on transient DB pressure
 */
async function loginUser(page: Page, email: string, name: string) {
  await page.goto(`${baseURL}/login`);

  if (!page.url().includes('/login')) {
    return;
  }

  const emailInput = page.locator('#email-address, input[type="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);

  const nameInput = page.locator('#your-name').first();

  // Step 1: Submit email with retry on transient errors (e.g. database pool saturation during 18-context runs)
  for (let attempt = 0; attempt < 3; attempt++) {
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    const outcome = await Promise.race([
      nameInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'name').catch(() => null),
      waitForLeaveLogin(page, 5000).then(() => 'navigated').catch(() => null),
      page.locator('.text-rose-500, p:has-text("Database query failed")').waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error').catch(() => null),
    ]);

    if (outcome === 'name' || outcome === 'navigated') {
      break;
    }

    // Transient error encountered; wait briefly and retry
    await page.waitForTimeout(1000);
  }

  // Step 2: Fill name if required (first-time registration)
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(name);

    for (let attempt = 0; attempt < 3; attempt++) {
      const completeBtn = page.locator('button[type="submit"]:has-text("Complete Sign In"), button[type="submit"]').first();
      await expect(completeBtn).toBeVisible({ timeout: 10000 });
      await completeBtn.click();

      const outcome = await Promise.race([
        waitForLeaveLogin(page, 8000).then(() => 'navigated').catch(() => null),
        page.locator('.text-rose-500, p:has-text("Database query failed")').waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error').catch(() => null),
      ]);

      if (outcome === 'navigated') {
        break;
      }

      await page.waitForTimeout(1000);
    }
  }

  await waitForLeaveLogin(page, 25000);
}

/**
 * Creates a custom spot via the "Custom Spot" modal
 */
async function pitchCustomSpot(page: Page, name: string, description?: string, imageUrl?: string) {
  const customSpotBtn = page.locator('button:has-text("Custom Spot")').first();
  await expect(customSpotBtn).toBeVisible({ timeout: 15000 });
  await customSpotBtn.click();

  const modal = page.locator('div[role="dialog"]').first();
  await expect(modal).toBeVisible({ timeout: 10000 });

  const nameInput = modal.locator('#spot-or-activity-name, input[placeholder*="rooftop" i], input[placeholder*="Sunset" i], input[type="text"]').first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(name);

  if (description) {
    const descTextarea = modal.locator('textarea').first();
    if (await descTextarea.isVisible().catch(() => false)) {
      await descTextarea.fill(description);
    }
  }

  if (imageUrl) {
    const imgInput = modal.locator('input[placeholder*="unsplash" i]').first();
    if (await imgInput.isVisible().catch(() => false)) {
      await imgInput.fill(imageUrl);
    }
  }

  const submitBtn = modal.locator('button[type="submit"]:has-text("Pitch Spot")').first();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await submitBtn.click();

  // Ensure modal closes after adding
  await expect(modal).not.toBeVisible({ timeout: 15000 });
}

/**
 * Casts a vote on a specific attraction card
 */
async function voteOnAttraction(page: Page, spotName: string, voteType: 'like' | 'dislike') {
  const card = page.locator('.interactive-card', { hasText: spotName }).first();
  await expect(card).toBeVisible({ timeout: 15000 });

  const voteBtn = voteType === 'like'
    ? card.locator('button[aria-label*="Upvote"]').first()
    : card.locator('button[aria-label*="Downvote"]').first();

  await expect(voteBtn).toBeVisible({ timeout: 10000 });
  await voteBtn.click();
}

/**
 * Asserts that a spot is visible on the board WITHOUT refreshing
 */
async function expectSpotVisible(page: Page, spotName: string, timeout = 15000) {
  const card = page.locator('.interactive-card', { hasText: spotName }).first();
  await expect(card).toBeVisible({ timeout });
}

/**
 * Asserts that a spot is absent from the board WITHOUT refreshing
 */
async function expectSpotHidden(page: Page, spotName: string, timeout = 15000) {
  const card = page.locator('.interactive-card', { hasText: spotName });
  await expect(card).toHaveCount(0, { timeout });
}

/**
 * Asserts live vote counts on a specific card WITHOUT refreshing
 */
async function expectVoteCounts(
  page: Page,
  spotName: string,
  expectedLikes: number,
  expectedDislikes: number,
  timeout = 15000
) {
  const card = page.locator('.interactive-card', { hasText: spotName }).first();
  await expect(card).toBeVisible({ timeout });

  const upvoteCount = card.locator('button[aria-label*="Upvote"] span.font-mono').first();
  const downvoteCount = card.locator('button[aria-label*="Downvote"] span.font-mono').first();

  await expect(upvoteCount).toHaveText(String(expectedLikes), { timeout });
  await expect(downvoteCount).toHaveText(String(expectedDislikes), { timeout });
}

test.describe('Group Trip - 6 Users Real-Time Synchronization Flow', () => {
  test('6 people add and interact with a trip, verifying live sync without page reload, and delete the trip', async ({ browser }) => {
    test.slow();
    test.setTimeout(240000); // 4 minutes to allow 6 contexts and network roundtrips

    const timestamp = Date.now();
    const userNames = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'];

    // =========================================================================
    // STEP 1: Launch 6 isolated browser contexts and pages
    // =========================================================================
    console.log('>>> Step 1: Initializing 6 user contexts...');
    const contexts = await Promise.all(userNames.map(() => browser.newContext()));
    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));

    const users = userNames.map((name, idx) => ({
      name,
      email: `${name}.${timestamp}@example.com`,
      context: contexts[idx],
      page: pages[idx],
    }));

    const [u1, u2, u3, u4, u5, u6] = users;

    // Log in all 6 users in parallel (with light staggering to prevent DB pool spikes under multi-worker runs)
    console.log('>>> Logging in 6 users in parallel...');
    await Promise.all(
      users.map(async (u, idx) => {
        if (idx > 0) {
          await u.page.waitForTimeout(idx * 250);
        }
        await loginUser(u.page, u.email, u.name);
      })
    );

    // =========================================================================
    // STEP 2: user1 creates the trip and invites user2..user6
    // =========================================================================
    console.log('>>> Step 2: user1 creates the trip...');
    await u1.page.goto(baseURL);

    const destInput = u1.page.locator('input[placeholder*="destination" i], input[placeholder*="where" i], input[type="text"]').first();
    const newTripBtn = u1.page.locator('button:has-text("New Trip"), button:has-text("Create a Trip")').first();

    const isDestVisible = await destInput.isVisible().catch(() => false);
    if (!isDestVisible) {
      await expect(newTripBtn).toBeVisible({ timeout: 15000 });
      await newTripBtn.click();
    }

    await expect(destInput).toBeVisible({ timeout: 10000 });
    await destInput.click();
    await destInput.pressSequentially('Rome', { delay: 80 });

    const suggestionItem = u1.page.locator('.divide-y > div').first();
    if (await suggestionItem.isVisible({ timeout: 2500 }).catch(() => false)) {
      await suggestionItem.click();
    }

    const createBtn = u1.page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click({ force: true });

    await safeWaitForURL(u1.page, /\/trip\/.+/, 25000);
    const tripUrl = u1.page.url();
    console.log(`>>> Trip created successfully: ${tripUrl}`);

    // Fetch the invite link
    const inviteBtn = u1.page.locator('button:has-text("Invite Crew"), button:has-text("Invite"), button:has-text("Share")').first();
    await expect(inviteBtn).toBeVisible({ timeout: 15000 });
    await inviteBtn.click();

    const inviteInput = u1.page.locator('input[readonly], input[value*="/invite/"]').first();
    await expect(inviteInput).toBeVisible({ timeout: 10000 });
    await expect(inviteInput).not.toHaveValue('', { timeout: 10000 });
    const rawInviteUrl = await inviteInput.inputValue();
    const inviteUrl = rawInviteUrl.startsWith('http') ? rawInviteUrl : `${baseURL}${rawInviteUrl}`;

    // Close invite modal on user1's screen
    const closeModalBtn = u1.page.locator('button[aria-label="Close modal"]').first();
    if (await closeModalBtn.isVisible().catch(() => false)) {
      await closeModalBtn.click();
    } else {
      await u1.page.keyboard.press('Escape');
    }
    await u1.page.waitForTimeout(500);

    // Users 2..6 join via the invite link in parallel
    console.log('>>> Users 2..6 joining the trip via invite link...');

    // Pre-extract the tripId from user1's current URL for direct navigation fallback
    const tripId = u1.page.url().match(/\/trip\/([^/?#]+)/)?.[1] ?? '';

    const participants = [u2, u3, u4, u5, u6];
    await Promise.all(
      participants.map(async (u, idx) => {
        // Light stagger to avoid simultaneous invite-page hits
        await u.page.waitForTimeout(idx * 200);
        await u.page.goto(inviteUrl);

        const joinBtn = u.page.locator('button:has-text("Join Trip"), button:has-text("Join"), button[type="submit"]').first();

        const joinAppeared = await Promise.race([
          joinBtn.waitFor({ state: 'visible', timeout: 12000 }).then(() => 'join').catch(() => null),
          u.page.waitForURL(/\/trip\/.+/, { timeout: 12000, waitUntil: 'domcontentloaded' }).then(() => 'navigated').catch(() => null),
        ]);

        if (joinAppeared === 'join') {
          await joinBtn.click();
        }

        // WebKit may silently abort window.location.href redirects from the invite page.
        // If still on invite page after 8s, navigate directly to the trip board.
        const stillOnInvite = await Promise.race([
          safeWaitForURL(u.page, /\/trip\/.+/, 8000).then(() => false).catch(() => true),
        ]);

        if (stillOnInvite && tripId) {
          await u.page.goto(`${baseURL}/trip/${tripId}`);
        }

        await safeWaitForURL(u.page, /\/trip\/.+/, 20000);
        // Wait until search bar / trip page is fully mounted
        await expect(
          u.page.locator('input[placeholder*="Search spots" i], input[placeholder*="search" i]').first()
        ).toBeVisible({ timeout: 15000 });
      })
    );

    console.log('>>> All 6 users successfully joined and are on the trip board!');

    // =========================================================================
    // STEP 3: Sequential updates with instant cross-user realtime sync verification
    // (Checked across other users WITHOUT REFRESHING THE PAGE)
    // =========================================================================

    // Update 3.1: user1 pitches "Colosseum"
    console.log('>>> Update 3.1: user1 pitches "Colosseum"...');
    await pitchCustomSpot(
      u1.page,
      'Colosseum',
      'Iconic amphitheatre in the centre of Rome',
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5'
    );
    await expectSpotVisible(u1.page, 'Colosseum');

    // Verify all other 5 users receive "Colosseum" live WITHOUT REFRESHING
    console.log('>>> Verifying "Colosseum" synced to user2..user6 WITHOUT page reload...');
    await Promise.all([
      expectSpotVisible(u2.page, 'Colosseum'),
      expectSpotVisible(u3.page, 'Colosseum'),
      expectSpotVisible(u4.page, 'Colosseum'),
      expectSpotVisible(u5.page, 'Colosseum'),
      expectSpotVisible(u6.page, 'Colosseum'),
    ]);

    // Update 3.2: user2 pitches "Trevi Fountain"
    console.log('>>> Update 3.2: user2 pitches "Trevi Fountain"...');
    await pitchCustomSpot(
      u2.page,
      'Trevi Fountain',
      'Famous 18th-century fountain for coin tossing',
      'https://images.unsplash.com/photo-1525874684015-58379d421a52'
    );
    await expectSpotVisible(u2.page, 'Trevi Fountain');

    // Verify sync to user1, user3..user6 WITHOUT REFRESHING
    console.log('>>> Verifying "Trevi Fountain" synced to user1, user3..user6 WITHOUT page reload...');
    await Promise.all([
      expectSpotVisible(u1.page, 'Trevi Fountain'),
      expectSpotVisible(u3.page, 'Trevi Fountain'),
      expectSpotVisible(u4.page, 'Trevi Fountain'),
      expectSpotVisible(u5.page, 'Trevi Fountain'),
      expectSpotVisible(u6.page, 'Trevi Fountain'),
    ]);

    // Update 3.3: user3 pitches "Pantheon"
    console.log('>>> Update 3.3: user3 pitches "Pantheon"...');
    await pitchCustomSpot(
      u3.page,
      'Pantheon',
      'Former Roman temple and iconic ancient dome',
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7'
    );
    await expectSpotVisible(u3.page, 'Pantheon');

    // Verify sync across all other 5 users WITHOUT REFRESHING
    console.log('>>> Verifying "Pantheon" synced to user1, user2, user4..user6 WITHOUT page reload...');
    await Promise.all([
      expectSpotVisible(u1.page, 'Pantheon'),
      expectSpotVisible(u2.page, 'Pantheon'),
      expectSpotVisible(u4.page, 'Pantheon'),
      expectSpotVisible(u5.page, 'Pantheon'),
      expectSpotVisible(u6.page, 'Pantheon'),
    ]);

    // Update 3.4: user4 upvotes "Colosseum"
    console.log('>>> Update 3.4: user4 upvotes "Colosseum"...');
    await voteOnAttraction(u4.page, 'Colosseum', 'like');

    // Verify user4 sees 1 like immediately (optimistic)
    await expectVoteCounts(u4.page, 'Colosseum', 1, 0);

    // Verify user1, user2, user3, user5, user6 see 1 like WITHOUT REFRESHING
    console.log('>>> Verifying upvote synced across other 5 users WITHOUT page reload...');
    await Promise.all([
      expectVoteCounts(u1.page, 'Colosseum', 1, 0),
      expectVoteCounts(u2.page, 'Colosseum', 1, 0),
      expectVoteCounts(u3.page, 'Colosseum', 1, 0),
      expectVoteCounts(u5.page, 'Colosseum', 1, 0),
      expectVoteCounts(u6.page, 'Colosseum', 1, 0),
    ]);

    // Update 3.5: user5 downvotes "Colosseum"
    console.log('>>> Update 3.5: user5 downvotes "Colosseum"...');
    await voteOnAttraction(u5.page, 'Colosseum', 'dislike');

    // Verify user5 sees 1 like, 1 dislike
    await expectVoteCounts(u5.page, 'Colosseum', 1, 1);

    // Verify all other 5 users see 1 like and 1 dislike WITHOUT REFRESHING
    console.log('>>> Verifying downvote synced across other 5 users WITHOUT page reload...');
    await Promise.all([
      expectVoteCounts(u1.page, 'Colosseum', 1, 1),
      expectVoteCounts(u2.page, 'Colosseum', 1, 1),
      expectVoteCounts(u3.page, 'Colosseum', 1, 1),
      expectVoteCounts(u4.page, 'Colosseum', 1, 1),
      expectVoteCounts(u6.page, 'Colosseum', 1, 1),
    ]);

    // Update 3.6: user6 upvotes "Pantheon"
    console.log('>>> Update 3.6: user6 upvotes "Pantheon"...');
    await voteOnAttraction(u6.page, 'Pantheon', 'like');

    // Verify user6 sees 1 like immediately (optimistic)
    await expectVoteCounts(u6.page, 'Pantheon', 1, 0);

    // Verify user1..user5 see 1 like on Pantheon WITHOUT REFRESHING
    console.log('>>> Verifying Pantheon upvote synced across other 5 users WITHOUT page reload...');
    await Promise.all([
      expectVoteCounts(u1.page, 'Pantheon', 1, 0),
      expectVoteCounts(u2.page, 'Pantheon', 1, 0),
      expectVoteCounts(u3.page, 'Pantheon', 1, 0),
      expectVoteCounts(u4.page, 'Pantheon', 1, 0),
      expectVoteCounts(u5.page, 'Pantheon', 1, 0),
    ]);

    // =========================================================================
    // STEP 4: High-Concurrency Flurry Section
    // (Each user performs actions concurrently from their browser, then stop and check everything is in place)
    // =========================================================================
    console.log('>>> Step 4: Multi-User Flurry: 6 users performing actions concurrently from their own browsers...');

    await Promise.all([
      // user1: upvotes Trevi Fountain, then upvotes Pantheon
      (async () => {
        await voteOnAttraction(u1.page, 'Trevi Fountain', 'like');
        await u1.page.waitForTimeout(400);
        await voteOnAttraction(u1.page, 'Pantheon', 'like');
      })(),

      // user2: upvotes Trevi Fountain, then upvotes Pantheon
      (async () => {
        await voteOnAttraction(u2.page, 'Trevi Fountain', 'like');
        await u2.page.waitForTimeout(400);
        await voteOnAttraction(u2.page, 'Pantheon', 'like');
      })(),

      // user3: upvotes Trevi Fountain, then pitches Vatican City
      (async () => {
        await voteOnAttraction(u3.page, 'Trevi Fountain', 'like');
        await u3.page.waitForTimeout(400);
        await pitchCustomSpot(u3.page, 'Vatican City', 'St. Peter Basilica and Sistine Chapel');
      })(),

      // user4: downvotes Trevi Fountain, then pitches Villa Borghese
      (async () => {
        await voteOnAttraction(u4.page, 'Trevi Fountain', 'dislike');
        await u4.page.waitForTimeout(400);
        await pitchCustomSpot(u4.page, 'Villa Borghese', 'Magnificent landscape gardens');
      })(),

      // user5: upvotes Trevi Fountain
      (async () => {
        await voteOnAttraction(u5.page, 'Trevi Fountain', 'like');
      })(),

      // user6: pitches Piazza Navona
      (async () => {
        await pitchCustomSpot(u6.page, 'Piazza Navona', 'Famous square with baroque fountains');
      })(),
    ]);

    // Give a brief moment for all real-time events to settle
    console.log('>>> Flurry actions dispatched. Waiting 3 seconds for real-time settlement...');
    await u1.page.waitForTimeout(3000);

    console.log('>>> Verifying final settled state across ALL 6 users WITHOUT REFRESHING...');

    // Verify consistency across all 6 users:
    for (const u of users) {
      // Trevi Fountain: 4 likes, 1 dislike
      await expectVoteCounts(u.page, 'Trevi Fountain', 4, 1);

      // Pantheon: 3 likes (u6 in Step 3 + u1, u2 in Step 4), 0 dislikes
      await expectVoteCounts(u.page, 'Pantheon', 3, 0);

      // Colosseum: 1 like, 1 dislike (from Step 3)
      await expectVoteCounts(u.page, 'Colosseum', 1, 1);

      // Piazza Navona, Villa Borghese, and Vatican City are present
      await expectSpotVisible(u.page, 'Piazza Navona');
      await expectSpotVisible(u.page, 'Villa Borghese');
      await expectSpotVisible(u.page, 'Vatican City');

      // Exactly 6 spots present on every user's board
      const totalCards = u.page.locator('.interactive-card');
      await expect(totalCards).toHaveCount(6, { timeout: 15000 });
    }

    console.log('>>> All 6 users show identical, synchronized state without refreshing!');

    // =========================================================================
    // STEP 5: Trip Deletion and Cleanup
    // =========================================================================
    console.log('>>> Step 5: user1 (creator) deletes the trip...');

    // user1 opens Delete Trip modal
    const deleteTripBtn = u1.page.locator('button:has-text("Delete Trip")').first();
    await expect(deleteTripBtn).toBeVisible({ timeout: 15000 });
    await deleteTripBtn.click();

    // Confirm deletion
    const confirmDeleteBtn = u1.page.locator('div[role="dialog"] button:has-text("Delete Trip")').first();
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 10000 });
    await confirmDeleteBtn.click();

    // user1 is navigated back to the home page
    await safeWaitForURL(u1.page, (url) => url.pathname === '/', 25000);
    console.log('>>> user1 successfully navigated to home after deleting trip!');

    // Verify trip is deleted: trying to access the trip URL results in unauthorized or redirect
    await u2.page.goto(tripUrl);
    await expect(
      u2.page.getByText(/not a member of this trip|unable to load trip|not found/i).first()
    ).toBeVisible({ timeout: 20000 });
    console.log('>>> Verified other users can no longer access the deleted trip!');

    // Close all browser contexts cleanly
    console.log('>>> Closing all 6 browser contexts...');
    await Promise.all(contexts.map((ctx) => ctx.close()));
    console.log('>>> Test completed successfully!');
  });
});
// tests/2-user-creation-flow.spec.ts
import { test, expect, Page } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://group-trip-app-ochre.vercel.app';

/**
 * מנגנון המתנה בטוח לניווט ב-Firefox ובדפדפנים נוספים.
 * ב-Firefox, כאשר הקוד מבצע window.location.href, הדפדפן לעיתים קוטע את החיבור הקודם
 * ומקפיץ שגיאת NS_BINDING_ABORTED על ה-waitForURL למרות שהניווט עצמו מצליח.
 */
async function waitForLeaveLogin(page: Page, timeout = 15000) {
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout, waitUntil: 'domcontentloaded' });
  } catch (err: any) {
    if (err?.message?.includes('NS_BINDING_ABORTED')) {
      // ב-Firefox, ניווט באמצעות window.location.href מבטל חיבורים פתוחים
    } else {
      throw err;
    }
  }
  await expect(page).not.toHaveURL(/\/login/, { timeout });
}

async function safeWaitForURL(
  page: Page,
  urlOrPredicate: RegExp | string | ((url: URL) => boolean),
  timeout = 15000
) {
  try {
    await page.waitForURL(urlOrPredicate, { timeout, waitUntil: 'domcontentloaded' });
  } catch (err: any) {
    if (err?.message?.includes('NS_BINDING_ABORTED')) {
      // תופס שגיאת NS_BINDING_ABORTED ב-Firefox
    } else {
      throw err;
    }
  }

  if (typeof urlOrPredicate === 'function') {
    await expect.poll(() => urlOrPredicate(new URL(page.url())), { timeout }).toBe(true);
  } else {
    await expect(page).toHaveURL(urlOrPredicate, { timeout });
  }
}

async function loginUser(page: Page, email: string, name: string) {
  await page.goto(`${baseURL}/login`);

  // איתור והזנת שדה האימייל
  const emailInput = page.locator('#email-address, input[type="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);

  // לחיצה ראשונה על כפתור ההמשך / התחברות
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Name input has id="your-name" and only appears in step 2
  const nameInput = page.locator('#your-name').first();

  try {
    const outcome = await Promise.race([
      nameInput.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'name'),
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000, waitUntil: 'domcontentloaded' }).then(() => 'navigated'),
    ]);

    if (outcome === 'name') {
      await nameInput.fill(name);
      const completeBtn = page.locator('button[type="submit"]:has-text("Complete Sign In"), button[type="submit"]').first();
      await completeBtn.click();
      await waitForLeaveLogin(page, 20000);
    }
  } catch {
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(name);
      const completeBtn = page.locator('button[type="submit"]:has-text("Complete Sign In"), button[type="submit"]').first();
      await completeBtn.click();
    }
    await waitForLeaveLogin(page, 20000);
  }
}

test.describe('Group Trip - Main Business Flow', () => {
  test('End-to-End: Create, Invite, Add Attraction, Vote, and Results', async ({ browser }) => {
    test.slow();

    const organizerContext = await browser.newContext();
    const participantContext = await browser.newContext();

    const organizerPage = await organizerContext.newPage();
    const participantPage = await participantContext.newPage();

    // מזהה ייחודי כדי שניתן יהיה להריץ את הטסט שוב ושוב ללא צורך במחיקת שורות מה-DB
    const timestamp = Date.now();
    const organizerEmail = process.env.TEST_ORGANIZER_EMAIL || `dean.${timestamp}@example.com`;
    const participantEmail = process.env.TEST_PARTICIPANT_EMAIL || `alice.${timestamp}@example.com`;

    // ==========================================
    // שלב 1: התחברות המארגן
    // ==========================================
    await loginUser(organizerPage, organizerEmail, 'Dean Test');

    // ==========================================
    // שלב 2: יצירת הטיול בדף הבית
    // ==========================================
    await organizerPage.goto(baseURL);

    // If logged-in dashboard is displayed, click "New Trip" or "Create a Trip" to open the creation modal
    const destInput = organizerPage.locator('input[placeholder*="destination" i], input[placeholder*="where" i], input[placeholder*="Paris" i], input[type="text"]').first();
    const newTripBtn = organizerPage.locator('button:has-text("New Trip"), button:has-text("Create a Trip")').first();

    const isDestVisible = await destInput.isVisible().catch(() => false);
    if (!isDestVisible) {
      await expect(newTripBtn).toBeVisible({ timeout: 15000 });
      await newTripBtn.click();
    }

    await expect(destInput).toBeVisible({ timeout: 10000 });
    await destInput.click();

    // הקלדה איטית של שם היעד כדי לאפשר ל-Web Worker לטעון את נתוני הערים
    await destInput.pressSequentially('Paris', { delay: 100 });

    // אם תפריט ההצעות נפתח, נלחץ ישירות על ההצעה הראשונה כדי לבחור אותה
    const suggestionItem = organizerPage.locator('.divide-y > div').first();
    if (await suggestionItem.isVisible({ timeout: 2500 }).catch(() => false)) {
      await suggestionItem.click();
    }

    const createBtn = organizerPage.locator('button[type="submit"]:has-text("Create"), button[type="submit"]').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click({ force: true });

    await safeWaitForURL(organizerPage, /\/trip\/.+/, 20000);

    // ==========================================
    // שלב 3: שליפת קישור ההזמנה
    // ==========================================
    const inviteBtn = organizerPage.locator('button:has-text("Invite"), button:has-text("Share"), button:has-text("הזמן")').first();
    await expect(inviteBtn).toBeVisible({ timeout: 15000 });
    await inviteBtn.click();

    const inviteInput = organizerPage.locator('input[readonly], input[value*="/invite/"]').first();
    await expect(inviteInput).toBeVisible({ timeout: 10000 });
    await expect(inviteInput).not.toHaveValue('', { timeout: 8000 });
    const rawInviteUrl = await inviteInput.inputValue();
    
    // מוודא שה-URL מלא גם אם הממשק החזיר נתיב יחסי
    const inviteUrl = rawInviteUrl.startsWith('http') ? rawInviteUrl : `${baseURL}${rawInviteUrl}`;

    // Close the invite modal so it doesn't block subsequent interactions
    const closeModalBtn = organizerPage.locator('button[aria-label="Close modal"]').first();
    if (await closeModalBtn.isVisible().catch(() => false)) {
      await closeModalBtn.click();
    } else {
      await organizerPage.keyboard.press('Escape');
    }
    await organizerPage.waitForTimeout(400);

    // ==========================================
    // שלב 4: המשתתף מתחבר ומצטרף דרך הקישור
    // ==========================================
    await loginUser(participantPage, participantEmail, 'Alice Test');
    await participantPage.goto(inviteUrl);

    const joinBtn = participantPage.locator('button:has-text("Join"), button:has-text("הצטרף"), button[type="submit"]').first();
    const joinAppeared = await Promise.race([
      joinBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'join').catch(() => null),
      participantPage.waitForURL(/\/trip\/.+/, { timeout: 10000, waitUntil: 'domcontentloaded' }).then(() => 'navigated').catch(() => null),
    ]);

    if (joinAppeared === 'join') {
      await joinBtn.click();
    }

    await safeWaitForURL(participantPage, /\/trip\/.+/, 20000);
    await expect(participantPage.getByText(/Alice/i).first()).toBeVisible({ timeout: 15000 });

    // ==========================================
    // שלב 5: הוספת אטרקציה (המארגן)
    // ==========================================
    const searchBar = organizerPage.locator('input[placeholder*="search" i], input[placeholder*="spot" i], input[placeholder*="place" i]').first();
    await expect(searchBar).toBeVisible({ timeout: 15000 });
    await searchBar.fill('Eiffel Tower');

    const pitchBtn = organizerPage.locator('button:has-text("Pitch Spot"), button:has-text("Add")').first();
    try {
      await pitchBtn.waitFor({ state: 'visible', timeout: 10000 });
      await pitchBtn.click();
    } catch {
      // Fallback: Custom spot if Places API search is empty or unavailable
      const customSpotBtn = organizerPage.locator('button:has-text("Custom Spot")').first();
      if (await customSpotBtn.isVisible()) {
        await customSpotBtn.click();
        const customNameInput = organizerPage.locator('#spot-or-activity-name, input[placeholder*="rooftop" i], input[placeholder*="Sunset" i]').first();
        await customNameInput.fill('Eiffel Tower');
        await organizerPage.locator('button[type="submit"]:has-text("Pitch Spot")').first().click();
      }
    }

    // וידוא סנכרון Realtime: האטרקציה מוצגת לשני המשתמשים
    await expect(organizerPage.getByText(/Eiffel/i).first()).toBeVisible({ timeout: 15000 });

    try {
      await expect(participantPage.getByText(/Eiffel/i).first()).toBeVisible({ timeout: 8000 });
    } catch {
      await participantPage.reload();
      await expect(participantPage.getByText(/Eiffel/i).first()).toBeVisible({ timeout: 10000 });
    }

    // ==========================================
    // שלב 6: הוספת אטרקציה מותאמת אישית (המשתתפת אליס)
    // ==========================================
    const customSpotBtn = participantPage.locator('button:has-text("Custom Spot")').first();
    await expect(customSpotBtn).toBeVisible({ timeout: 15000 });
    await customSpotBtn.click();

    const customNameInput = participantPage.locator('#spot-or-activity-name, input[placeholder*="rooftop" i], input[placeholder*="Sunset" i]').first();
    await expect(customNameInput).toBeVisible({ timeout: 10000 });
    await customNameInput.fill('Reichman University');

    const customImageInput = participantPage.locator('input[placeholder*="unsplash" i], input[placeholder*="images" i]').first();
    await expect(customImageInput).toBeVisible({ timeout: 10000 });
    await customImageInput.fill('https://img.haarets.co.il/bs/0000017f-f900-d318-afff-fb63af570000/b4/69/0985749d9d49d37a4177a00f1a4c/1882112746.jpg');

    const submitCustomBtn = participantPage.locator('div[role="dialog"] button[type="submit"]:has-text("Pitch Spot")').first();
    await expect(submitCustomBtn).toBeVisible({ timeout: 10000 });
    await submitCustomBtn.click();

    // וידוא סנכרון עבור האטרקציה של אליס (Reichman University)
    await expect(participantPage.getByText(/Reichman University/i).first()).toBeVisible({ timeout: 15000 });

    try {
      await expect(organizerPage.getByText(/Reichman University/i).first()).toBeVisible({ timeout: 8000 });
    } catch {
      await organizerPage.reload();
      await expect(organizerPage.getByText(/Reichman University/i).first()).toBeVisible({ timeout: 10000 });
    }

    // ==========================================
    // שלב 7: הצבעות
    // ==========================================
    // Buttons use aria-label and Lucide ThumbsUp / ThumbsDown icons, not raw emojis
    const likeBtn = organizerPage.locator('button[aria-label*="Upvote"], button[title*="upvote" i], button[title*="yes" i], button:has-text("👍")').first();
    const dislikeBtn = participantPage.locator('button[aria-label*="Downvote"], button[title*="downvote" i], button[title*="no" i], button:has-text("👎")').first();

    await expect(likeBtn).toBeVisible({ timeout: 15000 });
    await likeBtn.click();

    await expect(dislikeBtn).toBeVisible({ timeout: 15000 });
    await dislikeBtn.click();

    // המתנה קצרה כדי לאפשר לסנכרון ה-Realtime להתרחש בין שני המשתמשים
    await organizerPage.waitForTimeout(1500);

    // אימות סנכרון תוצאות ההצבעה במסך של דין (1 לייק ו-1 דיסלייק על הכרטיס)
    await expect(organizerPage.locator('button[aria-label*="Upvote"]').first().locator('span.font-mono')).toHaveText('1', { timeout: 10000 });
    try {
      await expect(organizerPage.locator('button[aria-label*="Downvote"]').first().locator('span.font-mono')).toHaveText('1', { timeout: 6000 });
    } catch {
      await organizerPage.reload();
      await expect(organizerPage.locator('button[aria-label*="Downvote"]').first().locator('span.font-mono')).toHaveText('1', { timeout: 10000 });
    }

    // אימות סנכרון תוצאות ההצבעה במסך של אליס (1 לייק ו-1 דיסלייק על הכרטיס)
    await expect(participantPage.locator('button[aria-label*="Downvote"]').first().locator('span.font-mono')).toHaveText('1', { timeout: 10000 });
    try {
      await expect(participantPage.locator('button[aria-label*="Upvote"]').first().locator('span.font-mono')).toHaveText('1', { timeout: 6000 });
    } catch {
      await participantPage.reload();
      await expect(participantPage.locator('button[aria-label*="Upvote"]').first().locator('span.font-mono')).toHaveText('1', { timeout: 10000 });
    }

    // ==========================================
    // שלב 8: כניסה לעמוד התוצאות והמתנה של 2 שניות
    // ==========================================
    const organizerLeaderboardBtn = organizerPage.locator('a[href*="/results"], button:has-text("Leaderboard"), button:has-text("Results")').first();
    await expect(organizerLeaderboardBtn).toBeVisible({ timeout: 15000 });
    await organizerLeaderboardBtn.click();

    const participantLeaderboardBtn = participantPage.locator('a[href*="/results"], button:has-text("Leaderboard"), button:has-text("Results")').first();
    await expect(participantLeaderboardBtn).toBeVisible({ timeout: 15000 });
    await participantLeaderboardBtn.click();

    await safeWaitForURL(organizerPage, /\/trip\/.+\/results/, 15000);
    await safeWaitForURL(participantPage, /\/trip\/.+\/results/, 15000);

    await expect(organizerPage.getByText(/Eiffel/i).first()).toBeVisible({ timeout: 15000 });
    await expect(participantPage.getByText(/Eiffel/i).first()).toBeVisible({ timeout: 15000 });

    // המתנה של 2 שניות בעמוד התוצאות
    await organizerPage.waitForTimeout(2000);

    // ==========================================
    // שלב 9: דין חוזר ללוח הטיול ומוחק את הטיול
    // ==========================================
    const votingDeckBtn = organizerPage.locator('button:has-text("Voting Deck")').first();
    await expect(votingDeckBtn).toBeVisible({ timeout: 15000 });
    await votingDeckBtn.click();

    await safeWaitForURL(organizerPage, (url) => !url.pathname.endsWith('/results') && url.pathname.includes('/trip/'), 15000);

    // וידוא שהאטרקציה מוצגת בלוח והמתנה של 2 שניות כדי שהמשתמש יראה אותה לפני המחיקה
    await expect(organizerPage.getByText(/Reichman University/i).first()).toBeVisible({ timeout: 15000 });
    await organizerPage.waitForTimeout(2000);

    // לחיצה על כפתור מחיקת הטיול (פתיחת מודל אישור)
    const deleteTripBtn = organizerPage.locator('button:has-text("Delete Trip")').first();
    await expect(deleteTripBtn).toBeVisible({ timeout: 15000 });
    await deleteTripBtn.click();

    // אישור המחיקה במודל
    const confirmDeleteBtn = organizerPage.locator('div[role="dialog"] button:has-text("Delete Trip")').first();
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 10000 });
    await confirmDeleteBtn.click();

    // דין מועבר לדף הבית לאחר המחיקה
    await safeWaitForURL(organizerPage, (url) => url.pathname === '/', 15000);

    // ==========================================
    // שלב 10: אליס מרעננת את עמוד התוצאות, רואה שאינן זמינות וחוזרת לדף הבית
    // ==========================================
    await participantPage.reload();

    // אימות שהודעת "Results Unavailable" מוצגת
    await expect(participantPage.getByText(/Results Unavailable/i).first()).toBeVisible({ timeout: 15000 });

    // אליס חוזרת לדף הבית דרך הלוגו של GroupTrip ב-Navbar
    const homeLink = participantPage.locator('header a[href="/"], header a:has-text("GroupTrip")').first();
    await expect(homeLink).toBeVisible({ timeout: 10000 });
    await homeLink.click();

    await safeWaitForURL(participantPage, (url) => url.pathname === '/', 15000);

    await organizerContext.close();
    await participantContext.close();
  });
});
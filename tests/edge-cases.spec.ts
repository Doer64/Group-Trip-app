// tests/3-edge-cases.spec.ts
import { test, expect, Page } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://group-trip-app-ochre.vercel.app';

/**
 * מנגנוני ניווט בטוחים המונעים קריסות עקב NS_BINDING_ABORTED ב-Firefox
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

  const emailInput = page.locator('#email-address, input[type="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

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

/**
 * יצירת טיול חדש ע"י משתמש מחובר
 */
async function createTrip(page: Page, destination: string): Promise<string> {
  await page.goto(baseURL);

  const destInput = page.locator('input[placeholder*="destination" i], input[placeholder*="where" i], input[type="text"]').first();
  const newTripBtn = page.locator('button:has-text("New Trip"), button:has-text("Create a Trip")').first();

  const isDestVisible = await destInput.isVisible().catch(() => false);
  if (!isDestVisible) {
    await expect(newTripBtn).toBeVisible({ timeout: 15000 });
    await newTripBtn.click();
  }

  await expect(destInput).toBeVisible({ timeout: 10000 });
  await destInput.click();
  await destInput.pressSequentially(destination, { delay: 100 });

  // אם תפריט ההצעות נפתח, נלחץ ישירות על ההצעה הראשונה כדי לבחור אותה
  const suggestionItem = page.locator('.divide-y > div').first();
  if (await suggestionItem.isVisible({ timeout: 2500 }).catch(() => false)) {
    await suggestionItem.click();
  }

  const createBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]').first();
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  await createBtn.click({ force: true });

  await safeWaitForURL(page, /\/trip\/.+/, 20000);
  const currentUrl = page.url();
  const match = currentUrl.match(/\/trip\/([^/?#]+)/);
  return match ? match[1] : '';
}

/**
 * מחיקת טיול ע"י היוצר וניקוי בסיס הנתונים
 */
async function deleteTrip(page: Page) {
  // אם נמצאים בעמוד תוצאות, חוזרים ללוח הטיול
  const votingDeckBtn = page.locator('button:has-text("Voting Deck")').first();
  if (await votingDeckBtn.isVisible().catch(() => false)) {
    await votingDeckBtn.click();
    await safeWaitForURL(page, (url) => !url.pathname.endsWith('/results') && url.pathname.includes('/trip/'), 15000);
  }

  const deleteTripBtn = page.locator('button:has-text("Delete Trip")').first();
  await expect(deleteTripBtn).toBeVisible({ timeout: 15000 });
  await deleteTripBtn.click();

  const confirmDeleteBtn = page.locator('div[role="dialog"] button:has-text("Delete Trip")').first();
  await expect(confirmDeleteBtn).toBeVisible({ timeout: 10000 });
  await confirmDeleteBtn.click();

  await safeWaitForURL(page, (url) => url.pathname === '/', 15000);
}

test.describe('Group Trip - Edge Cases & Security', () => {
  test.slow();

  // ==========================================
  // מקרה קצה 1: בקרת גישה - קישורים לא תקפים וגישה של משתמש שאינו חבר
  // ==========================================
  test('Edge Case: Invalid invite token and non-member unauthorized access', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1.1 קישור הזמנה שגוי או פג תוקף
    const fakeToken = `invalid-token-${Date.now()}`;
    await page.goto(`${baseURL}/invite/${fakeToken}`);

    await expect(page.getByText(/Invite Link Not Found/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Trip invite link not found or expired|expired|not found/i).first()).toBeVisible({ timeout: 10000 });

    // לחיצה על כפתור חזרה לדף הבית
    const goHomeBtn = page.locator('button:has-text("Go to Home"), a:has-text("Go to Home")').first();
    await expect(goHomeBtn).toBeVisible({ timeout: 10000 });
    await goHomeBtn.click();
    await safeWaitForURL(page, (url) => url.pathname === '/', 15000);

    // 1.2 משתמש א' מייצר טיול
    const creatorContext = await browser.newContext();
    const creatorPage = await creatorContext.newPage();
    const creatorEmail = `creator.${Date.now()}@example.com`;
    await loginUser(creatorPage, creatorEmail, 'Creator User');
    const tripId = await createTrip(creatorPage, 'Berlin');

    // 1.3 משתמש ב' מתחבר ומנסה לגשת ישירות ל-URL של הטיול ללא הזמנה
    const nonMemberContext = await browser.newContext();
    const nonMemberPage = await nonMemberContext.newPage();
    const nonMemberEmail = `nonmember.${Date.now()}@example.com`;
    await loginUser(nonMemberPage, nonMemberEmail, 'Non Member User');

    await nonMemberPage.goto(`${baseURL}/trip/${tripId}`);

    // אימות שהמערכת חוסמת אותו ומציגה הודעת אי-חברות
    await expect(nonMemberPage.getByText(/not a member of this trip/i).first()).toBeVisible({ timeout: 15000 });
    await expect(nonMemberPage.getByText(/Ask the trip organizer to share their invite link/i).first()).toBeVisible();

    // אימות שגם ניסיון גישה ל-ID שאינו קיים כלל מציג את אותה הודעה בדיוק (מונע דליפת מידע אילו טיולים קיימים)
    await nonMemberPage.goto(`${baseURL}/trip/00000000-0000-0000-0000-000000000000`);
    await expect(nonMemberPage.getByText(/not a member of this trip/i).first()).toBeVisible({ timeout: 15000 });

    // 1.4 משתמש שאינו היוצר אינו רואה כפתור "Delete Trip"
    // שליפת קישור ההזמנה ע"י היוצר
    const inviteBtn = creatorPage.locator('button:has-text("Invite"), button:has-text("Share")').first();
    await expect(inviteBtn).toBeVisible({ timeout: 15000 });
    await inviteBtn.click();

    const inviteInput = creatorPage.locator('input[readonly], input[value*="/invite/"]').first();
    await expect(inviteInput).toBeVisible({ timeout: 10000 });
    await expect(inviteInput).not.toHaveValue('', { timeout: 8000 });
    const rawInviteUrl = await inviteInput.inputValue();
    const inviteUrl = rawInviteUrl.startsWith('http') ? rawInviteUrl : `${baseURL}${rawInviteUrl}`;

    // סגירת מודל ההזמנה
    const closeModalBtn = creatorPage.locator('button[aria-label="Close modal"]').first();
    if (await closeModalBtn.isVisible().catch(() => false)) {
      await closeModalBtn.click();
    } else {
      await creatorPage.keyboard.press('Escape');
    }

    // משתמש ב' מצטרף לטיול בצורה חוקית דרך ההזמנה
    await nonMemberPage.goto(inviteUrl);
    const joinBtn = nonMemberPage.locator('button:has-text("Join"), button[type="submit"]').first();
    const joinAppeared = await Promise.race([
      joinBtn.waitFor({ state: 'visible', timeout: 12000 }).then(() => 'join').catch(() => null),
      nonMemberPage.waitForURL(/\/trip\/.+/, { timeout: 12000, waitUntil: 'domcontentloaded' }).then(() => 'navigated').catch(() => null),
    ]);

    if (joinAppeared === 'join') {
      await joinBtn.click();
    }
    await safeWaitForURL(nonMemberPage, /\/trip\/.+/, 20000);

    // וידוא שלמשתמש ב' אין הרשאה למחוק את הטיול (כפתור Delete Trip לא מופיע עבורו)
    await expect(nonMemberPage.locator('button:has-text("Delete Trip")')).toBeHidden();

    // ניקוי: היוצר מוחק את הטיול
    await deleteTrip(creatorPage);

    await context.close();
    await creatorContext.close();
    await nonMemberContext.close();
  });

  // ==========================================
  // מקרה קצה 2: מנגנון הצבעה - ביטול הצבעה (Toggle) והחלפת הצבעה
  // ==========================================
  test('Edge Case: Voting mechanics - Toggle vote off and vote switching', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const userEmail = `voter.${Date.now()}@example.com`;

    await loginUser(page, userEmail, 'Voter Test');
    await createTrip(page, 'London');

    // הוספת אטרקציה מותאמת אישית
    const customSpotBtn = page.locator('button:has-text("Custom Spot")').first();
    await expect(customSpotBtn).toBeVisible({ timeout: 15000 });
    await customSpotBtn.click();

    const customNameInput = page.locator('#spot-or-activity-name, input[placeholder*="rooftop" i], input[placeholder*="Sunset" i]').first();
    await customNameInput.fill('Big Ben');
    await page.locator('button[type="submit"]:has-text("Pitch Spot")').first().click();

    await expect(page.getByText(/Big Ben/i).first()).toBeVisible({ timeout: 15000 });

    const likeBtn = page.locator('button[aria-label*="Upvote"]').first();
    const dislikeBtn = page.locator('button[aria-label*="Downvote"]').first();

    // 2.1 הצבעה חיובית ראשונה - כמות הלייקים עולה ל-1
    await expect(likeBtn).toBeVisible({ timeout: 15000 });
    const voteRes1 = page.waitForResponse((res) => res.url().includes('/votes') && res.status() === 200);
    await likeBtn.click();
    await voteRes1;
    await expect(likeBtn.locator('span.font-mono')).toHaveText('1', { timeout: 10000 });

    // 2.2 ביטול הצבעה (Toggle OFF) - לחיצה שנייה על אותו כפתור מאפסת את ההצבעה
    const voteRes2 = page.waitForResponse((res) => res.url().includes('/votes') && res.status() === 200);
    await likeBtn.click();
    await voteRes2;
    await expect(likeBtn.locator('span.font-mono')).toHaveText('0', { timeout: 10000 });

    // 2.3 החלפת הצבעה - לחיצה על Downvote מעלה את ה-Dislikes ל-1
    const voteRes3 = page.waitForResponse((res) => res.url().includes('/votes') && res.status() === 200);
    await dislikeBtn.click();
    await voteRes3;
    await expect(dislikeBtn.locator('span.font-mono')).toHaveText('1', { timeout: 10000 });

    // לחיצה על Upvote כעת: מבטלת את ה-Downvote ומעבירה את הקול ל-Upvote
    const voteRes4 = page.waitForResponse((res) => res.url().includes('/votes') && res.status() === 200);
    await likeBtn.click();
    await voteRes4;
    await expect(dislikeBtn.locator('span.font-mono')).toHaveText('0', { timeout: 10000 });
    await expect(likeBtn.locator('span.font-mono')).toHaveText('1', { timeout: 10000 });

    // ניקוי הטיול
    await deleteTrip(page);
    await context.close();
  });

  // ==========================================
  // מקרה קצה 3: מניעת כפילויות - אי-אפשר להוסיף את אותה אטרקציה פעמיים
  // ==========================================
  test('Edge Case: Duplicate attraction pitch prevention', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const userEmail = `duplicate.${Date.now()}@example.com`;

    await loginUser(page, userEmail, 'Duplicate Tester');
    await createTrip(page, 'Madrid');

    // הוספת אטרקציה פעם ראשונה
    const customSpotBtn = page.locator('button:has-text("Custom Spot")').first();
    await expect(customSpotBtn).toBeVisible({ timeout: 15000 });
    await customSpotBtn.click();

    const customNameInput = page.locator('#spot-or-activity-name, input[placeholder*="rooftop" i], input[placeholder*="Sunset" i]').first();
    await customNameInput.fill('Prado Museum');
    await page.locator('button[type="submit"]:has-text("Pitch Spot")').first().click();

    await expect(page.getByText(/Prado Museum/i).first()).toBeVisible({ timeout: 15000 });

    // ניסיון להוסיף את אותה אטרקציה פעם שנייה
    await customSpotBtn.click();
    const customNameInput2 = page.locator('#spot-or-activity-name, input[placeholder*="rooftop" i], input[placeholder*="Sunset" i]').first();
    await customNameInput2.fill('Prado Museum');
    await page.locator('button[type="submit"]:has-text("Pitch Spot")').first().click();

    // אימות שהמערכת מציגה הודעת שגיאה על כפילות
    await expect(page.getByText(/Place already in trip/i).first()).toBeVisible({ timeout: 10000 });

    // סגירת מודל ההוספה
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
    }

    // ניקוי
    await deleteTrip(page);
    await context.close();
  });

  // ==========================================
  // מקרה קצה 4: התחברות משתמש קיים עוקפת את שלב הזנת השם
  // ==========================================
  test('Edge Case: Existing user login bypasses name registration step', async ({ browser }) => {
    const email = `existing.${Date.now()}@example.com`;
    const name = 'Existing Pro User';

    // 4.1 רישום ראשוני
    const firstContext = await browser.newContext();
    const firstPage = await firstContext.newPage();
    await loginUser(firstPage, email, name);
    await expect(firstPage).not.toHaveURL(/\/login/);
    await firstContext.close();

    // 4.2 התחברות חוזרת מקונטקסט נקי
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();

    await secondPage.goto(`${baseURL}/login`);
    const emailInput = secondPage.locator('#email-address, input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(email);

    const submitBtn = secondPage.locator('button[type="submit"]').first();
    await submitBtn.click();

    // המשתמש מועבר ישירות בלי שקופץ שדה השם `#your-name`
    await waitForLeaveLogin(secondPage, 15000);
    await expect(secondPage.locator('#your-name')).toBeHidden();

    // אימות ששם המשתמש מוצג ב-Navbar
    await expect(secondPage.locator('header').getByText(/Existing Pro User/i).first()).toBeVisible({ timeout: 10000 });

    await secondContext.close();
  });

  // ==========================================
  // מקרה קצה 5: וולידציות קלט ומצבי ריק (Empty States)
  // ==========================================
  test('Edge Case: Input validation on trip creation and empty state rendering', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const userEmail = `validation.${Date.now()}@example.com`;

    await loginUser(page, userEmail, 'Validation Tester');
    await page.goto(baseURL);

    // פתיחת מודל יצירת טיול
    const newTripBtn = page.locator('button:has-text("New Trip"), button:has-text("Create a Trip")').first();
    await expect(newTripBtn).toBeVisible({ timeout: 15000 });
    await newTripBtn.click();

    // 5.1 לחיצה על Create Trip ללא הזנת יעד
    const createBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // אימות שמופיעה הודעת ולידציה על שדה חובה
    await expect(page.getByText(/Destination is required/i).first()).toBeVisible({ timeout: 8000 });

    // 5.2 הזנת יעד תקין ומעבר ללוח טיול ריק
    const destInput = page.locator('input[placeholder*="destination" i], input[placeholder*="where" i], input[type="text"]').first();
    await destInput.fill('Rome');
    await createBtn.click();

    await safeWaitForURL(page, /\/trip\/.+/, 20000);

    // אימות תצוגת Empty State כאשר אין עדיין אטרקציות
    await expect(page.getByText(/No spots on the radar yet/i).first()).toBeVisible({ timeout: 15000 });

    // 5.3 מעבר לעמוד תוצאות כאשר אין הצבעות כלל
    const leaderboardBtn = page.locator('a[href*="/results"], button:has-text("Leaderboard")').first();
    await expect(leaderboardBtn).toBeVisible({ timeout: 15000 });
    await leaderboardBtn.click();

    await safeWaitForURL(page, /\/trip\/.+\/results/, 15000);

    // אימות תצוגת Empty State בלוח התוצאות
    await expect(page.getByText(/No votes on the ballot yet/i).first()).toBeVisible({ timeout: 15000 });

    // ניקוי: חזרה ללוח ומחיקת הטיול
    await deleteTrip(page);
    await context.close();
  });
});

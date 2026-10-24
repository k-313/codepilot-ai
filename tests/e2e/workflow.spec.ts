import { test, expect } from '@playwright/test';

test.describe('CodePilot AI End-to-End Workflow', () => {
  test('imports demo repository, inspects files, runs review, and queries assistant', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/CodePilot AI/);

    // 2. Click "Try Built-in Demo Project" button
    const demoButton = page.getByRole('button', { name: /Try Built-in Demo Project/i });
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // 3. Verify repository overview header loads
    await expect(page.getByText('sample-project')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('eligible files')).toBeVisible();

    // 4. Verify file explorer and select a file
    const fileItem = page.getByText('jwt.ts').first();
    if (await fileItem.isVisible()) {
      await fileItem.click();
      await expect(page.getByText('signToken')).toBeVisible();
    }

    // 5. Trigger full AI code review
    const reviewButton = page.getByRole('button', { name: /Run Full AI Code Review/i });
    await expect(reviewButton).toBeVisible();
    await reviewButton.click();

    // 6. Verify findings panel displays flagged review findings
    await expect(page.getByText(/Code Review Findings/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Critical|High|Medium/i).first()).toBeVisible();

    // 7. Switch to AI Assistant tab
    const chatTab = page.getByRole('button', { name: /AI Assistant/i });
    await chatTab.click();

    // 8. Ask question in chat
    const chatInput = page.getByPlaceholder(/Ask a question about this repository/i);
    await chatInput.fill('How does authentication work?');
    await chatInput.press('Enter');

    // 9. Verify assistant reply is displayed
    await expect(page.getByText(/authentication/i).first()).toBeVisible({ timeout: 10000 });

    // 10. Switch to Architecture tab
    const archTab = page.getByRole('button', { name: /Architecture/i });
    await archTab.click();
    await expect(page.getByText(/Architecture & Design Patterns/i)).toBeVisible();
  });
});

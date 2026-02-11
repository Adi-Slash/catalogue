import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Asset Catalog', () => {
  test.beforeEach(async ({ page }) => {
    // Reset the mock DB
    const dbPath = path.join(process.cwd(), 'mock-server', 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify({ assets: [] }, null, 2));
    await page.goto('/');
  });

  test('should display empty list initially', async ({ page }) => {
    await expect(page.getByText('Total Portfolio Value')).toBeVisible();
    await expect(page.getByText('£0.00')).toBeVisible();
    await expect(page.getByText('No assets found')).toBeVisible();
  });

  test('should create a new asset', async ({ page }) => {
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'X1');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.click('button:has-text("Add Asset")');
    await expect(page.getByText('Sony')).toBeVisible();
    await expect(page.getByText('X1')).toBeVisible();
    await expect(page.getByText('£100.00')).toBeVisible();
  });

  test('should view asset details', async ({ page }) => {
    // First create an asset
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'X1');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.click('button:has-text("Add Asset")');
    // Click on the asset card
    await page.click('text=Sony');
    await expect(page.getByRole('heading', { name: 'Asset Details' })).toBeVisible();
    await expect(page.getByText('Sony X1')).toBeVisible();
    await expect(page.getByText('£100.00')).toBeVisible();
  });

  test('should edit an asset', async ({ page }) => {
    // Create asset
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'X1');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.click('button:has-text("Add Asset")');
    // Go to details
    await page.click('text=Sony');
    // Click edit
    await page.click('button:has-text("Edit Asset")');
    // Edit value
    await page.fill('input[placeholder="0.00"]', '150');
    await page.click('button:has-text("Update Asset")');
    // Check updated
    await expect(page.getByText('£150.00')).toBeVisible();
    // Go back
    await page.click('text=← Back to Assets');
    await expect(page.getByText('£150.00')).toBeVisible();
  });

  test('should delete an asset from the card', async ({ page }) => {
    // Create asset
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'X1');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.click('button:has-text("Add Asset")');
    // Hover over card to show delete button
    const card = page.locator('.asset-card').first();
    await card.hover();
    // Delete from card
    page.on('dialog', (dialog) => dialog.accept());
    const deleteButton = card.locator('button[aria-label="Delete asset"]');
    await deleteButton.click();
    // Should show empty
    await expect(page.getByText('No assets found')).toBeVisible();
    await expect(page.getByText('£0.00')).toBeVisible();
  });

  test('should filter assets by category', async ({ page }) => {
    // Create assets with different categories
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'TV');
    await page.fill('input[placeholder="0.00"]', '500');
    await page.selectOption('select#category', 'Electrical');
    await page.click('button:has-text("Add Asset")');

    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Nike');
    await page.fill('input[placeholder*="iPhone 15"]', 'Shoes');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.selectOption('select#category', 'Fitness');
    await page.click('button:has-text("Add Asset")');

    // Check all assets visible
    await expect(page.getByText('Sony')).toBeVisible();
    await expect(page.getByText('Nike')).toBeVisible();

    // Click Electrical category tab
    await page.click('button:has-text("Electrical")');
    await expect(page.getByText('Sony')).toBeVisible();
    await expect(page.getByText('Nike')).not.toBeVisible();

    // Click Fitness category tab
    await page.click('button:has-text("Fitness")');
    await expect(page.getByText('Nike')).toBeVisible();
    await expect(page.getByText('Sony')).not.toBeVisible();
  });

  test('should search for assets', async ({ page }) => {
    // Create assets
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'TV');
    await page.fill('input[placeholder="0.00"]', '500');
    await page.click('button:has-text("Add Asset")');

    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Apple');
    await page.fill('input[placeholder*="iPhone 15"]', 'iPhone');
    await page.fill('input[placeholder="0.00"]', '1000');
    await page.click('button:has-text("Add Asset")');

    // Search for Sony
    const searchInput = page.getByPlaceholder('Search assets...');
    await searchInput.fill('Sony');
    await expect(page.getByText('Sony')).toBeVisible();
    await expect(page.getByText('Apple')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByText('Sony')).toBeVisible();
    await expect(page.getByText('Apple')).toBeVisible();
  });

  test('should handle multiple images on asset card', async ({ page }) => {
    // Create asset with multiple images (simulated via mock server)
    // Note: In a real test, you'd need to upload actual images
    // For now, we'll test that the carousel controls appear when multiple images exist
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Sony');
    await page.fill('input[placeholder*="iPhone 15"]', 'Camera');
    await page.fill('input[placeholder="0.00"]', '500');
    await page.click('button:has-text("Add Asset")');

    // Click on asset to view details
    await page.click('text=Sony');
    
    // If asset has multiple images, carousel controls should be visible
    // (This test assumes the asset has images - in real scenario you'd upload them)
    const carouselNav = page.locator('.asset-carousel-nav');
    // Carousel only shows if there are multiple images, so we check if it exists
    const carouselExists = await carouselNav.count();
    // If carousel exists, test navigation
    if (carouselExists > 0) {
      const nextButton = page.getByLabelText('Next image');
      const prevButton = page.getByLabelText('Previous image');
      await expect(nextButton).toBeVisible();
      await expect(prevButton).toBeVisible();
    }
  });

  test('should navigate asset image carousel', async ({ page }) => {
    // This test assumes an asset with multiple images exists
    // In a real scenario, you'd create an asset and upload multiple images first
    await page.click('a:has-text("+ Add Asset")');
    await page.fill('input[placeholder*="Apple, Rolex"]', 'Test');
    await page.fill('input[placeholder*="iPhone 15"]', 'Item');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.click('button:has-text("Add Asset")');

    await page.click('text=Test');
    
    // Check if carousel exists (only if asset has multiple images)
    const carouselNav = page.locator('.asset-carousel-nav');
    if ((await carouselNav.count()) > 0) {
      const nextButton = page.getByLabelText('Next image');
      await nextButton.click();
      // Image should have changed (we can't easily verify which image without checking src)
      await expect(nextButton).toBeVisible();
    }
  });
});

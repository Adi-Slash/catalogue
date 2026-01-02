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
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
    await expect(page.getByText('Total Value: $0.00')).toBeVisible();
    await expect(page.getByText('No assets yet')).toBeVisible();
  });

  test('should create a new asset', async ({ page }) => {
    await page.fill('input[placeholder="Make"]', 'Sony');
    await page.fill('input[placeholder="Model"]', 'X1');
    await page.fill('input[placeholder="Estimated value"]', '100');
    await page.click('button:has-text("Add Asset")');
    await expect(page.getByText('Sony X1')).toBeVisible();
    await expect(page.getByText('Total Value: $100.00')).toBeVisible();
  });

  test('should view asset details', async ({ page }) => {
    // First create an asset
    await page.fill('input[placeholder="Make"]', 'Sony');
    await page.fill('input[placeholder="Model"]', 'X1');
    await page.fill('input[placeholder="Estimated value"]', '100');
    await page.click('button:has-text("Add Asset")');
    // Click on the asset card
    await page.click('text=Sony X1');
    await expect(page.getByText('Asset Details')).toBeVisible();
    await expect(page.getByText('Make: Sony')).toBeVisible();
    await expect(page.getByText('Model: X1')).toBeVisible();
    await expect(page.getByText('Value: $100.00')).toBeVisible();
  });

  test('should edit an asset', async ({ page }) => {
    // Create asset
    await page.fill('input[placeholder="Make"]', 'Sony');
    await page.fill('input[placeholder="Model"]', 'X1');
    await page.fill('input[placeholder="Estimated value"]', '100');
    await page.click('button:has-text("Add Asset")');
    // Go to details
    await page.click('text=Sony X1');
    // Click edit
    await page.click('button:has-text("Edit")');
    // Edit value
    await page.fill('input[placeholder="Estimated value"]', '150');
    await page.click('button:has-text("Update Asset")');
    // Check updated
    await expect(page.getByText('Value: $150.00')).toBeVisible();
    // Go back
    await page.click('text=Back to list');
    await expect(page.getByText('Total Value: $150.00')).toBeVisible();
  });

  test('should delete an asset', async ({ page }) => {
    // Create asset
    await page.fill('input[placeholder="Make"]', 'Sony');
    await page.fill('input[placeholder="Model"]', 'X1');
    await page.fill('input[placeholder="Estimated value"]', '100');
    await page.click('button:has-text("Add Asset")');
    // Go to details
    await page.click('text=Sony X1');
    // Delete
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Delete")');
    // Should navigate back and show empty
    await expect(page.getByText('No assets yet')).toBeVisible();
    await expect(page.getByText('Total Value: $0.00')).toBeVisible();
  });
});
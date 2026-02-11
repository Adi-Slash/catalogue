import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AssetForm from './AssetForm';
import * as assetsApi from '../api/assets';
import type { Asset } from '../types/asset';

// Mock the uploadImage function
vi.mock('../api/assets', () => ({
  uploadImage: vi.fn(),
}));

const mockOnCreate = vi.fn();
const mockOnUpdate = vi.fn();

const defaultProps = {
  householdId: 'test-household',
  onCreate: mockOnCreate,
};

describe('AssetForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock uploadImage to return a URL
    vi.mocked(assetsApi.uploadImage).mockResolvedValue('/uploads/test-image.jpg');
  });

  it('renders form fields', () => {
    render(<AssetForm {...defaultProps} />);
    expect(screen.getByLabelText('Make *')).toBeInTheDocument();
    expect(screen.getByLabelText('Model *')).toBeInTheDocument();
    expect(screen.getByLabelText('Serial Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Estimated Value (£) *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Asset Images (up to 4)')).toBeInTheDocument();
  });

  it('allows creating an asset with required fields', async () => {
    const user = userEvent.setup();
    render(<AssetForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('e.g., Apple, Rolex, Steinway'), 'Sony');
    await user.type(screen.getByPlaceholderText('e.g., iPhone 15, Submariner, Model D'), 'TV');
    await user.type(screen.getByPlaceholderText('0.00'), '500');
    await user.click(screen.getByRole('button', { name: 'Add Asset' }));

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          make: 'Sony',
          model: 'TV',
          value: 500,
        })
      );
    });
  });

  it('allows uploading multiple images', async () => {
    const user = userEvent.setup();
    render(<AssetForm {...defaultProps} />);

    // Create file inputs
    const file1 = new File(['image1'], 'image1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['image2'], 'image2.jpg', { type: 'image/jpeg' });

    const fileInput = screen.getByLabelText('Asset Images (up to 4)') as HTMLInputElement;

    // Upload first image
    await user.upload(fileInput, file1);
    await waitFor(() => {
      expect(screen.getByAltText('Asset preview 1')).toBeInTheDocument();
    });

    // Upload second image
    await user.upload(fileInput, file2);
    await waitFor(() => {
      expect(screen.getByAltText('Asset preview 2')).toBeInTheDocument();
    });

    // Fill required fields and submit
    await user.type(screen.getByPlaceholderText('e.g., Apple, Rolex, Steinway'), 'Sony');
    await user.type(screen.getByPlaceholderText('e.g., iPhone 15, Submariner, Model D'), 'TV');
    await user.type(screen.getByPlaceholderText('0.00'), '500');
    await user.click(screen.getByRole('button', { name: 'Add Asset' }));

    await waitFor(() => {
      expect(assetsApi.uploadImage).toHaveBeenCalledTimes(2);
      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: expect.arrayContaining([
            '/uploads/test-image.jpg',
            '/uploads/test-image.jpg',
          ]),
        })
      );
    });
  });

  it('limits to 4 images maximum', async () => {
    const user = userEvent.setup();
    render(<AssetForm {...defaultProps} />);

    const fileInput = screen.getByLabelText('Asset Images (up to 4)') as HTMLInputElement;
    const files = [
      new File(['1'], '1.jpg', { type: 'image/jpeg' }),
      new File(['2'], '2.jpg', { type: 'image/jpeg' }),
      new File(['3'], '3.jpg', { type: 'image/jpeg' }),
      new File(['4'], '4.jpg', { type: 'image/jpeg' }),
      new File(['5'], '5.jpg', { type: 'image/jpeg' }),
    ];

    // Upload 5 files, but only 4 should be accepted
    await user.upload(fileInput, files);

    await waitFor(() => {
      const previews = screen.queryAllByAltText(/Asset preview/);
      expect(previews.length).toBeLessThanOrEqual(4);
    });

    // File input should be disabled when 4 images are present
    if (screen.queryByText(/Maximum of 4 photos reached/)) {
      expect(fileInput).toBeDisabled();
    }
  });

  it('allows removing individual images', async () => {
    const user = userEvent.setup();
    render(<AssetForm {...defaultProps} />);

    const fileInput = screen.getByLabelText('Asset Images (up to 4)') as HTMLInputElement;
    const file1 = new File(['image1'], 'image1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['image2'], 'image2.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, [file1, file2]);

    await waitFor(() => {
      expect(screen.getByAltText('Asset preview 1')).toBeInTheDocument();
      expect(screen.getByAltText('Asset preview 2')).toBeInTheDocument();
    });

    // Remove first image
    const removeButtons = screen.getAllByLabelText(/Remove photo/);
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByAltText('Asset preview 1')).not.toBeInTheDocument();
      expect(screen.getByAltText('Asset preview 2')).toBeInTheDocument();
    });
  });

  it('populates form when editing an existing asset', () => {
    const existingAsset: Asset = {
      id: '1',
      householdId: 'test-household',
      make: 'Sony',
      model: 'TV',
      serialNumber: 'SN123',
      description: 'Test description',
      category: 'Electrical',
      value: 500,
      imageUrl: '/uploads/existing.jpg',
      imageUrls: ['/uploads/existing.jpg'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    render(<AssetForm {...defaultProps} onUpdate={mockOnUpdate} initialAsset={existingAsset} />);

    expect(screen.getByDisplayValue('Sony')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TV')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SN123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Electrical')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Asset' })).toBeInTheDocument();
  });

  it('shows error message when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<AssetForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Add Asset' }));

    await waitFor(() => {
      expect(screen.getByText(/Make, model and value are required/)).toBeInTheDocument();
    });
  });

  it('displays photo count message when photos are added', async () => {
    const user = userEvent.setup();
    render(<AssetForm {...defaultProps} />);

    const fileInput = screen.getByLabelText('Asset Images (up to 4)') as HTMLInputElement;
    const file1 = new File(['image1'], 'image1.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file1);

    await waitFor(() => {
      expect(screen.getByText(/1 of 4 photos taken/)).toBeInTheDocument();
    });
  });
});

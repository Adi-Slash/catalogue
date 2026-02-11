import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AssetCard from './AssetCard';
import type { Asset } from '../types/asset';

const mockAsset: Asset = {
  id: '1',
  householdId: 'house-1',
  make: 'Sony',
  model: 'X1',
  serialNumber: '123',
  description: 'Test asset',
  category: 'Electrical',
  value: 100,
  imageUrl: '',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('AssetCard', () => {
  it('renders asset details', () => {
    render(<AssetCard asset={mockAsset} />);
    expect(screen.getByText('Make:')).toBeInTheDocument();
    expect(screen.getByText('Sony')).toBeInTheDocument();
    expect(screen.getByText('Model:')).toBeInTheDocument();
    expect(screen.getByText('X1')).toBeInTheDocument();
    expect(screen.getByText('Serial Number:')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('Electrical')).toBeInTheDocument();
    expect(screen.getByText('Value:')).toBeInTheDocument();
    expect(screen.getByText('£100.00')).toBeInTheDocument();
    expect(screen.getByText('Added:')).toBeInTheDocument();
  });

  it('renders "No Image" when no image is provided', () => {
    render(<AssetCard asset={mockAsset} />);
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    const assetWithImage: Asset = {
      ...mockAsset,
      imageUrl: '/uploads/test.jpg',
    };
    render(<AssetCard asset={assetWithImage} />);
    const image = screen.getByAltText('Sony X1');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('/uploads/test.jpg'));
  });

  it('renders image from imageUrls array when provided', () => {
    const assetWithImages: Asset = {
      ...mockAsset,
      imageUrls: ['/uploads/test1.jpg', '/uploads/test2.jpg'],
    };
    render(<AssetCard asset={assetWithImages} />);
    const image = screen.getByAltText('Sony X1');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('/uploads/test1.jpg'));
  });

  it('shows carousel controls when multiple images are present', () => {
    const assetWithImages: Asset = {
      ...mockAsset,
      imageUrls: ['/uploads/test1.jpg', '/uploads/test2.jpg'],
    };
    render(<AssetCard asset={assetWithImages} />);
    expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
    expect(screen.getByLabelText('Next image')).toBeInTheDocument();
  });

  it('shows thumbnails when multiple images are present', () => {
    const assetWithImages: Asset = {
      ...mockAsset,
      imageUrls: ['/uploads/test1.jpg', '/uploads/test2.jpg'],
    };
    render(<AssetCard asset={assetWithImages} />);
    expect(screen.getByAltText('Thumbnail 1')).toBeInTheDocument();
    expect(screen.getByAltText('Thumbnail 2')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    render(<AssetCard asset={mockAsset} onDelete={mockOnDelete} />);
    const deleteButton = screen.getByLabelText('Delete asset');
    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    render(<AssetCard asset={mockAsset} onClick={mockOnClick} />);
    const card = screen.getByText('Make:').closest('.asset-card');
    if (card) {
      await user.click(card);
      expect(mockOnClick).toHaveBeenCalled();
    }
  });

  it('does not call onClick when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    const mockOnDelete = vi.fn();
    render(<AssetCard asset={mockAsset} onClick={mockOnClick} onDelete={mockOnDelete} />);
    const deleteButton = screen.getByLabelText('Delete asset');
    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('allows navigating through images with carousel buttons', async () => {
    const user = userEvent.setup();
    const assetWithImages: Asset = {
      ...mockAsset,
      imageUrls: ['/uploads/test1.jpg', '/uploads/test2.jpg'],
    };
    render(<AssetCard asset={assetWithImages} />);
    
    // Initially shows first image
    const image = screen.getByAltText('Sony X1');
    expect(image).toHaveAttribute('src', expect.stringContaining('/uploads/test1.jpg'));
    
    // Click next button
    const nextButton = screen.getByLabelText('Next image');
    await user.click(nextButton);
    
    // Should now show second image
    const updatedImage = screen.getByAltText('Sony X1');
    expect(updatedImage).toHaveAttribute('src', expect.stringContaining('/uploads/test2.jpg'));
  });
});

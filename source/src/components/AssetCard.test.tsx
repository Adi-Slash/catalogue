import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import AssetCard from './AssetCard'
import type { Asset } from '../types/asset'

const mockAsset: Asset = {
  id: '1',
  householdId: 'house-1',
  make: 'Sony',
  model: 'X1',
  serialNumber: '123',
  description: 'Test asset',
  value: 100,
  imageUrl: '',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}

describe('AssetCard', () => {
  it('renders asset details', () => {
    render(<AssetCard asset={mockAsset} />)
    expect(screen.getByText('Sony X1')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn()
    render(<AssetCard asset={mockAsset} onDelete={mockOnDelete} />)
    const deleteButton = screen.getByText('Delete')
    deleteButton.click()
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('calls onClick when card is clicked', () => {
    const mockOnClick = vi.fn()
    render(<AssetCard asset={mockAsset} onClick={mockOnClick} />)
    const card = screen.getByText('Sony X1').closest('div')
    card?.click()
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('does not call onClick when delete button is clicked', () => {
    const mockOnClick = vi.fn()
    const mockOnDelete = vi.fn()
    render(<AssetCard asset={mockAsset} onClick={mockOnClick} onDelete={mockOnDelete} />)
    const deleteButton = screen.getByText('Delete')
    deleteButton.click()
    expect(mockOnDelete).toHaveBeenCalledWith('1')
    expect(mockOnClick).not.toHaveBeenCalled()
  })
})
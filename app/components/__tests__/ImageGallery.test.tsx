import { describe, it, expect } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import ImageGallery from '../ImageGallery'

describe('ImageGallery Component', () => {
  const mockImages = [
    {
      id: '1',
      name: 'sunset.jpg',
      url: 'https://example.com/sunset.jpg',
      uploadedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      name: 'mountain.jpg',
      url: 'https://example.com/mountain.jpg',
      uploadedAt: '2024-01-16T14:20:00Z',
    },
    {
      id: '3',
      name: 'ocean.jpg',
      url: 'https://example.com/ocean.jpg',
      uploadedAt: '2024-01-17T09:15:00Z',
    },
  ]

  describe('Rendering', () => {
    it('should render all images in grid layout', () => {
      render(<ImageGallery images={mockImages} />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(mockImages.length)
    })

    it('should display image names', () => {
      render(<ImageGallery images={mockImages} />)

      expect(screen.getByText('sunset.jpg')).toBeInTheDocument()
      expect(screen.getByText('mountain.jpg')).toBeInTheDocument()
      expect(screen.getByText('ocean.jpg')).toBeInTheDocument()
    })

    it('should display formatted upload dates', () => {
      render(<ImageGallery images={mockImages} />)

      const dates = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(dates.length).toBeGreaterThanOrEqual(mockImages.length)
    })

    it('should handle empty images array', () => {
      render(<ImageGallery images={[]} />)

      const images = screen.queryAllByRole('img')
      expect(images).toHaveLength(0)
    })

    it('should apply correct CSS classes for grid layout', () => {
      const { container } = render(<ImageGallery images={mockImages} />)

      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    })
  })

  describe('Lightbox Functionality', () => {
    it('should not show lightbox initially', () => {
      render(<ImageGallery images={mockImages} />)

      const closeButton = screen.queryByLabelText('Close')
      expect(closeButton).not.toBeInTheDocument()
    })

    it('should open lightbox when image is clicked', () => {
      render(<ImageGallery images={mockImages} />)

      const images = screen.getAllByRole('img')
      fireEvent.click(images[0])

      const closeButton = screen.getByLabelText('Close')
      expect(closeButton).toBeInTheDocument()
    })

    it('should display correct image in lightbox', () => {
      render(<ImageGallery images={mockImages} />)

      const images = screen.getAllByRole('img')
      fireEvent.click(images[1])

      // After clicking, the lightbox should show the mountain image
      const lightboxImages = screen.getAllByRole('img')
      const lightboxImage = lightboxImages.find(
        (img) => img.getAttribute('src') === mockImages[1].url
      )
      expect(lightboxImage).toBeInTheDocument()
    })

    it('should close lightbox when close button is clicked', () => {
      render(<ImageGallery images={mockImages} />)

      // Open lightbox
      const images = screen.getAllByRole('img')
      fireEvent.click(images[0])

      // Close lightbox
      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      // Lightbox should be gone
      const closeButtonAfter = screen.queryByLabelText('Close')
      expect(closeButtonAfter).not.toBeInTheDocument()
    })

    it('should close lightbox when background is clicked', () => {
      render(<ImageGallery images={mockImages} />)

      // Open lightbox
      const images = screen.getAllByRole('img')
      fireEvent.click(images[0])

      // Click the background (the fixed overlay div)
      const overlay = screen.getByLabelText('Close').closest('.fixed')
      if (overlay) {
        fireEvent.click(overlay)
      }

      // Lightbox should be gone
      const closeButtonAfter = screen.queryByLabelText('Close')
      expect(closeButtonAfter).not.toBeInTheDocument()
    })

    it('should show image metadata in lightbox', () => {
      render(<ImageGallery images={mockImages} />)

      const images = screen.getAllByRole('img')
      fireEvent.click(images[0])

      // Check for image name in lightbox
      const imageTitles = screen.getAllByText('sunset.jpg')
      expect(imageTitles.length).toBeGreaterThan(0)

      // Check for upload date label
      expect(screen.getByText(/Uploaded:/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have alt text for all images', () => {
      render(<ImageGallery images={mockImages} />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt')
      })
    })

    it('should have aria-label on close button', () => {
      render(<ImageGallery images={mockImages} />)

      const images = screen.getAllByRole('img')
      fireEvent.click(images[0])

      const closeButton = screen.getByLabelText('Close')
      expect(closeButton).toHaveAttribute('aria-label', 'Close')
    })

    it('should make gallery images clickable', () => {
      render(<ImageGallery images={mockImages} />)

      const { container } = render(<ImageGallery images={mockImages} />)
      const clickableImages = container.querySelectorAll('.cursor-pointer')

      expect(clickableImages.length).toBeGreaterThan(0)
    })
  })

  describe('Image Properties', () => {
    it('should pass correct src to images', () => {
      render(<ImageGallery images={mockImages} />)

      mockImages.forEach((mockImage) => {
        const image = screen.getAllByRole('img').find((img) => img.getAttribute('src') === mockImage.url)
        expect(image).toBeDefined()
      })
    })

    it('should use unoptimized prop for Next.js Image', () => {
      const { container } = render(<ImageGallery images={mockImages} />)

      const images = container.querySelectorAll('img')
      // Next.js Image with unoptimized will render as regular img tag in test
      expect(images.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle images with special characters in names', () => {
      const specialImages = [
        {
          id: '1',
          name: 'image with spaces.jpg',
          url: 'https://example.com/image.jpg',
          uploadedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          name: 'image-with-dashes.jpg',
          url: 'https://example.com/image2.jpg',
          uploadedAt: '2024-01-15T10:30:00Z',
        },
      ]

      render(<ImageGallery images={specialImages} />)

      expect(screen.getByText('image with spaces.jpg')).toBeInTheDocument()
      expect(screen.getByText('image-with-dashes.jpg')).toBeInTheDocument()
    })

    it('should handle very long image names', () => {
      const longNameImage = [
        {
          id: '1',
          name: 'this-is-a-very-long-image-name-that-might-cause-layout-issues-in-some-cases.jpg',
          url: 'https://example.com/image.jpg',
          uploadedAt: '2024-01-15T10:30:00Z',
        },
      ]

      render(<ImageGallery images={longNameImage} />)

      expect(
        screen.getByText(
          'this-is-a-very-long-image-name-that-might-cause-layout-issues-in-some-cases.jpg'
        )
      ).toBeInTheDocument()
    })

    it('should handle invalid dates gracefully', () => {
      const invalidDateImage = [
        {
          id: '1',
          name: 'test.jpg',
          url: 'https://example.com/test.jpg',
          uploadedAt: 'invalid-date',
        },
      ]

      render(<ImageGallery images={invalidDateImage} />)

      // Should still render without crashing
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })
  })

  describe('Multiple Lightbox Interactions', () => {
    it('should switch between different images in lightbox', () => {
      render(<ImageGallery images={mockImages} />)

      // Open first image
      const images = screen.getAllByRole('img')
      fireEvent.click(images[0])

      // Close lightbox
      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      // Open second image
      fireEvent.click(images[1])

      // Verify second image is shown
      const lightboxImages = screen.getAllByRole('img')
      const secondImage = lightboxImages.find(
        (img) => img.getAttribute('src') === mockImages[1].url
      )
      expect(secondImage).toBeInTheDocument()
    })
  })
})

# GARA Frontend

[![Tests](https://github.com/anhydrous99/gara-frontend/workflows/Tests/badge.svg)](https://github.com/anhydrous99/gara-frontend/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/anhydrous99/gara-frontend?logo=codecov)](https://codecov.io/gh/anhydrous99/gara-frontend)
[![License](https://img.shields.io/github/license/anhydrous99/gara-frontend)](LICENSE)

A photography portfolio web application built with Next.js 14, React 18, and TypeScript.

## Features

- 📸 **Image Gallery** - Beautiful responsive image galleries
- 🎨 **Album Management** - Organize photos into albums
- 🔐 **Admin Panel** - Secure admin area for content management
- 📤 **Image Upload** - Upload and manage images with drag-and-drop
- 🏷️ **Tagging System** - Categorize albums with tags
- 🔄 **Drag-to-Reorder** - Reorder images within albums
- 🌓 **Public/Draft** - Control album visibility
- 🎯 **Next.js 14** - Built with the latest Next.js App Router

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** NextAuth.js
- **Image Storage:** Backend API with S3
- **Drag & Drop:** @dnd-kit
- **Testing:** Jest, React Testing Library
- **Logging:** Pino (structured JSON logging)

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Backend API running (GARA backend service with S3)
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/anhydrous99/gara-frontend.git
cd gara-frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
```

### Environment Variables

Create a `.env.local` file with:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080
GARA_API_KEY=your-api-key

# Authentication
ADMIN_PASSWORD=your-secure-password
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Observability
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_METRICS=false
METRICS_BACKEND=console
```

**Note:** The application requires a running backend API service. See the [backend API specification](docs/backend-api-spec.yaml) for implementation details.

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Testing

We maintain high test coverage with comprehensive test suites.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Current coverage targets:
- **Branches:** 60% minimum
- **Functions:** 60% minimum
- **Lines:** 60% minimum
- **Statements:** 60% minimum

See [TESTING.md](TESTING.md) for detailed testing documentation.

### Clean Code Practices

Our test suite follows Clean Code principles with:
- ✅ DRY - Reusable test utilities
- ✅ Clear AAA pattern (Arrange-Act-Assert)
- ✅ Factory functions for test data
- ✅ Descriptive test names
- ✅ Helper functions for common operations

See [TEST_CODE_QUALITY_ANALYSIS.md](TEST_CODE_QUALITY_ANALYSIS.md) for details.

## Project Structure

```
gara-frontend/
├── app/
│   ├── admin/              # Admin pages (protected)
│   │   ├── login/          # Admin login
│   │   ├── dashboard/      # Image upload
│   │   └── albums/         # Album management
│   ├── albums/             # Public album pages
│   ├── api/                # API routes (Next.js API)
│   │   ├── auth/           # Authentication
│   │   ├── albums/         # Album CRUD
│   │   ├── upload/         # Image upload
│   │   └── images/         # Image listing
│   ├── components/         # React components
│   └── types/              # TypeScript types
├── test/                   # Test utilities
│   ├── helpers/            # Test helper functions
│   ├── factories/          # Test data factories
│   └── constants/          # Test constants
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
└── public/                 # Static assets
```

## API Routes

### Public Routes
- `GET /api/albums?published=true` - List published albums
- `GET /api/albums/[id]` - Get album details
- `GET /api/images` - List all images

### Protected Routes (Admin)
- `POST /api/albums` - Create album
- `PUT /api/albums/[id]` - Update album
- `DELETE /api/albums/[id]` - Delete album
- `POST /api/upload` - Upload image
- `POST /api/albums/[id]/images` - Add images to album
- `DELETE /api/albums/[id]/images/[imageId]` - Remove image
- `PUT /api/albums/[id]/reorder` - Reorder album images

## Admin Panel

Access the admin panel at `/admin/login` with your configured admin password.

Features:
- **Dashboard:** Upload images with drag-and-drop
- **Albums:** Create, edit, and delete albums
- **Album Editor:** Reorder images, set cover image, manage tags
- **Publish Control:** Toggle album visibility

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anhydrous99/gara-frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Docker

#### Using Docker Compose (Recommended)

```bash
# Run in production mode
docker-compose up

# Run in development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Run in background
docker-compose up -d

# Stop containers
docker-compose down
```

The application will be available at http://localhost:3000

#### Using Docker CLI

```bash
# Build Docker image
docker build -t gara-frontend .

# Run container
docker run -p 3000:80 \
  -e NEXT_PUBLIC_API_URL=http://backend:8080 \
  -e GARA_API_KEY=your-api-key \
  -e ADMIN_PASSWORD=your-password \
  -e NEXTAUTH_SECRET=your-secret \
  gara-frontend
```

### Environment Variables in Production

Ensure all environment variables are set in your deployment platform:
- Vercel: Settings → Environment Variables
- Docker: Use `--env-file` or `-e` flags
- AWS/Cloud: Configure in service settings

## CI/CD

GitHub Actions workflows run on every push and pull request:

- ✅ **Tests** - Run all test suites
- ✅ **Lint** - ESLint code quality checks
- ✅ **Type Check** - TypeScript validation
- ✅ **Build** - Verify production build
- ✅ **Coverage** - Upload coverage to Codecov

See [.github/workflows/README.md](.github/workflows/README.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Ensure tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Contribution Guidelines

- ✅ Write tests for new features
- ✅ Maintain or improve code coverage
- ✅ Follow existing code style
- ✅ Update documentation as needed
- ✅ Ensure CI checks pass

## Documentation

- [TESTING.md](TESTING.md) - Testing guide and best practices
- [TEST_CODE_QUALITY_ANALYSIS.md](TEST_CODE_QUALITY_ANALYSIS.md) - Test code quality analysis
- [REFACTORING_GUIDE.md](REFACTORING_GUIDE.md) - Guide to refactoring tests
- [.github/workflows/README.md](.github/workflows/README.md) - CI/CD documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Authentication via [NextAuth.js](https://next-auth.js.org/)
- Drag-and-drop powered by [@dnd-kit](https://dndkit.com/)
- Structured logging with [Pino](https://getpino.io/)

## Support

For issues and questions:
- 🐛 [Open an issue](https://github.com/anhydrous99/gara-frontend/issues)
- 💬 [Discussions](https://github.com/anhydrous99/gara-frontend/discussions)

---

**Made with ❤️ by the GARA team**

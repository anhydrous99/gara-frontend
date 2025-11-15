const mockGetServerSession = jest.fn()

const NextAuth = jest.fn(() => ({
  GET: jest.fn(),
  POST: jest.fn(),
}))

module.exports = NextAuth
module.exports.getServerSession = mockGetServerSession
module.exports.default = NextAuth

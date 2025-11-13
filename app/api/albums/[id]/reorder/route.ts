import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.GARA_API_KEY

// PUT /api/albums/[id]/reorder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(
      `${BACKEND_URL}/api/albums/${params.id}/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY || ''
        },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

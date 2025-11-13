import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.GARA_API_KEY

// DELETE /api/albums/[id]/images/[imageId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(
      `${BACKEND_URL}/api/albums/${params.id}/images/${params.imageId}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-Key': API_KEY || ''
        }
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

import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { PushSubscription } from '../../../lib/push-notifications'

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured')
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI)
}

export async function GET() {
  return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '' })
}

export async function POST(request) {
  try {
    await connect()
    const { subscription, recipient } = await request.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth || !['brume', 'deborah'].includes(recipient)) {
      return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 })
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { endpoint: subscription.endpoint, keys: subscription.keys, recipient },
      { upsert: true, runValidators: true },
    )
    return NextResponse.json({ subscribed: true })
  } catch {
    return NextResponse.json({ error: 'Could not save notification preferences.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connect()
    const { endpoint } = await request.json()
    if (endpoint) await PushSubscription.deleteOne({ endpoint })
    return NextResponse.json({ subscribed: false })
  } catch {
    return NextResponse.json({ error: 'Could not update notification preferences.' }, { status: 500 })
  }
}

import mongoose from 'mongoose'
import webpush from 'web-push'
import { createECDH } from 'node:crypto'

const subscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  recipient: { type: String, enum: ['brume', 'deborah'], required: true, index: true },
}, { timestamps: true })

export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', subscriptionSchema)

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function getVapidConfiguration() {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { configured: false, error: 'VAPID keys are not configured.' }
  }

  try {
    const ecdh = createECDH('prime256v1')
    ecdh.setPrivateKey(decodeBase64Url(VAPID_PRIVATE_KEY))
    const expectedPublicKey = ecdh.getPublicKey()
    const publicKey = decodeBase64Url(NEXT_PUBLIC_VAPID_PUBLIC_KEY)

    if (publicKey.length !== 65 || !expectedPublicKey.equals(publicKey)) {
      return { configured: false, error: 'The VAPID public and private keys do not belong to the same key pair.' }
    }

    webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:notifications@example.com', NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    return { configured: true, publicKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY }
  } catch {
    return { configured: false, error: 'The configured VAPID keys are invalid.' }
  }
}

export async function sendNoteNotification(note) {
  const vapid = getVapidConfiguration()
  if (!vapid.configured) {
    console.error(`Push notification skipped: ${vapid.error}`)
    return
  }
  const subscriptions = await PushSubscription.find({ recipient: note.recipient }).lean()
  const payload = JSON.stringify({
    title: 'A love note for you ♥',
    body: note.message.length > 100 ? `${note.message.slice(0, 97)}…` : note.message,
    url: '/notes',
  })

  await Promise.allSettled(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload)
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ endpoint: subscription.endpoint })
      } else {
        throw error
      }
    }
  }))
}

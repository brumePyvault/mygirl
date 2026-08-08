import mongoose from 'mongoose'
import webpush from 'web-push'

const subscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  recipient: { type: String, enum: ['brume', 'deborah'], required: true, index: true },
}, { timestamps: true })

export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', subscriptionSchema)

function configureWebPush() {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:notifications@example.com', NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  return true
}

export async function sendNoteNotification(note) {
  if (!configureWebPush()) return
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

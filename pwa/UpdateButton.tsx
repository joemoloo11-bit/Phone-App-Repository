import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

// Top-right "force update" button. Unregisters all service workers,
// clears all caches, and reloads — guaranteed to fetch the latest deploy.
export default function UpdateButton() {
  const [updating, setUpdating] = useState(false)

  async function handleUpdate() {
    setUpdating(true)
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      window.location.reload()
    } catch (e) {
      console.error('[update] failed', e)
      setUpdating(false)
    }
  }

  return (
    <button
      type="button"
      className="update-btn"
      onClick={handleUpdate}
      disabled={updating}
      aria-label="Check for app updates"
      title="Check for app updates"
    >
      <RefreshCw size={16} className={updating ? 'update-btn-spin' : ''} />
    </button>
  )
}

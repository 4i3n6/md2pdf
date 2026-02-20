import { logErro } from '@/utils/logger'

class SWUpdateNotifier {
  init(): void {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      this.showUpdateNotification()
    })

    setInterval(() => this.checkForUpdates(), 30 * 60 * 1000)
  }

  private async checkForUpdates(): Promise<void> {
    if (!navigator.serviceWorker.controller) return

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      logErro(`Failed to check for updates: ${errorMsg}`)
    }
  }

  private showUpdateNotification(): void {
    const logger = window.Logger

    if (logger && logger.log) {
      logger.log('Updating application...', 'success')
      logger.log('Please reload the page to use the latest version', 'warning')
    }

    this.createUpdateBanner()
  }

  private createUpdateBanner(): void {
    const existing = document.getElementById('update-banner')
    if (existing) {
      existing.remove()
    }

    const banner = document.createElement('div')
    banner.id = 'update-banner'
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      max-width: 400px;
      background: #059669;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: monospace;
      font-size: 13px;
    `

    const content = document.createElement('div')
    content.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: bold;">🔄 Update Available</div>
      <div style="margin-bottom: 12px; opacity: 0.9;">A new version of MD2PDF is ready. Reload to use it.</div>
      <button id="update-reload-btn" style="
        width: 100%;
        padding: 8px;
        background: white;
        color: #059669;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-family: monospace;
      ">RELOAD NOW</button>
    `

    banner.appendChild(content)
    document.body.appendChild(banner)

    const btn = document.getElementById('update-reload-btn')
    if (btn) {
      btn.addEventListener('click', () => {
        window.location.reload()
      })
    }

    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.opacity = '0'
        banner.style.transition = 'opacity 0.3s ease-out'
        setTimeout(() => {
          banner.remove()
        }, 300)
      }
    }, 15000)
  }
}

export default new SWUpdateNotifier()

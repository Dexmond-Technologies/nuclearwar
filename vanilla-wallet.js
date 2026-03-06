import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

class VanillaWalletDemo {
  constructor() {
    this.adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ];
    this.currentAdapter = null;
  }

  async connect(walletName = 'Phantom') {
    const adapter = this.adapters.find(a => a.name === walletName);
    if (!adapter) {
      alert(`Wallet ${walletName} not found!`);
      return null;
    }

    try {
      this.currentAdapter = adapter;
      await adapter.connect();
      console.log('Connected to:', adapter.publicKey.toBase58());
      
      // Update UI
      const address = adapter.publicKey.toBase58();
      const statusEl = document.getElementById('lobby-auth-status');
      if (statusEl) {
        statusEl.innerHTML = '✓ WALLET CONNECTED: ' + address.substring(0,4) + '...' + address.substring(address.length-4);
      }
      const authFlex = document.getElementById('auth-container-flex');
      if (authFlex) {
        authFlex.style.display = 'none';
      }
      
      // Bridge to Nuclear War game logic
      window.pendingSolanaAddress = address;
      if (typeof window.joinGlobalWar === 'function') {
        window.joinGlobalWar();
      }

      return address;
    } catch (err) {
      console.error('Connection failed', err);
      alert('Wallet connection failed: ' + err.message);
      return null;
    }
  }

  // Very simple custom modal for Vanilla JS
  showWalletModal() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999';

    const modal = document.createElement('div');
    modal.style.background = '#0a192f';
    modal.style.border = '1px solid #00ffcc';
    modal.style.padding = '30px';
    modal.style.borderRadius = '8px';
    modal.style.fontFamily = 'monospace';
    modal.style.color = '#fff';
    modal.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.2)';
    modal.style.textAlign = 'center';

    const title = document.createElement('h2');
    title.innerText = 'SELECT SOLANA WALLET';
    title.style.marginBottom = '20px';
    title.style.color = '#00ffcc';
    modal.appendChild(title);

    this.adapters.forEach(adapter => {
      const btn = document.createElement('button');
      btn.innerText = `Connect ${adapter.name}`;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.padding = '12px';
      btn.style.marginBottom = '10px';
      btn.style.background = '#112240';
      btn.style.color = '#fff';
      btn.style.border = '1px solid #233554';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '16px';
      
      btn.onmouseover = () => btn.style.background = '#233554';
      btn.onmouseout = () => btn.style.background = '#112240';

      btn.onclick = async () => {
        overlay.remove();
        await this.connect(adapter.name);
      };
      
      // Only show if readyState is 'Installed' or 'Loadable' (some wallets inject late)
      if (adapter.readyState === 'Installed' || adapter.readyState === 'Loadable') {
        modal.appendChild(btn);
      } else {
        const notInstalled = document.createElement('div');
        notInstalled.innerText = `${adapter.name} not installed`;
        notInstalled.style.color = '#8892b0';
        notInstalled.style.marginBottom = '10px';
        notInstalled.style.fontSize = '12px';
        modal.appendChild(notInstalled);
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'CANCEL';
    closeBtn.style.marginTop = '15px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#ff3366';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
}

window.solanaWalletManager = new VanillaWalletDemo();

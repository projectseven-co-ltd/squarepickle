import { useEffect, useState } from 'react';
import './main.css';
import { fetchDashboard, AssemblyRecord, CharacterInfo } from './queries';
import { AssemblyCard } from './AssemblyCard';

const WALLET_ADDRESS = import.meta.env.VITE_CHARACTER_ID || '';

function abbreviate(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
}

export default function App() {
  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [view, setView] = useState<'dashboard' | 'gates'>('dashboard');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { character, assemblies } = await fetchDashboard(WALLET_ADDRESS);
      setCharacter(character);
      setAssemblies(assemblies);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Stats
  const onlineCount = assemblies.filter(a => a.status.online).length;
  const nodeCount = assemblies.filter(a => a.kind === 'NetworkNode').length;
  const activeNode = assemblies.find(a => a.kind === 'NetworkNode' && a.status.online && a.fuel?.isBurning);

  return (
    <div className="sp-app">
      {/* ── Header ── */}
      <header className="sp-header">
        <div className="sp-logo">
          <div className="sp-logo-mark" />
          <div>
            <div className="sp-logo-text">SQUAREPICKLE</div>
            <div className="sp-logo-sub">Corp Operations</div>
          </div>
        </div>

        <nav className="sp-nav">
          <button
            className={`sp-nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`sp-nav-btn ${view === 'gates' ? 'active' : ''}`}
            onClick={() => setView('gates')}
          >
            Gates
          </button>
        </nav>

        <button className="sp-connect-btn connected" onClick={load}>
          {WALLET_ADDRESS ? abbreviate(WALLET_ADDRESS) : 'Connect'}
        </button>
      </header>

      {/* ── Main ── */}
      <main className="sp-main">
        {/* Character Banner */}
        {character && (
          <div className="sp-char-banner">
            <div className="sp-char-avatar">🦝</div>
            <div>
              <div className="sp-char-name">{character.name}</div>
              <div className="sp-char-meta">
                {abbreviate(character.walletAddress)} · Tribe {character.tribeId} · Stillness
              </div>
            </div>
            <div className="sp-char-stats">
              <div className="sp-stat">
                <div className="sp-stat-val">{assemblies.length}</div>
                <div className="sp-stat-label">Assemblies</div>
              </div>
              <div className="sp-stat">
                <div className="sp-stat-val" style={{ color: onlineCount > 0 ? 'var(--sp-accent)' : 'var(--sp-red)' }}>
                  {onlineCount}
                </div>
                <div className="sp-stat-label">Online</div>
              </div>
              <div className="sp-stat">
                <div className="sp-stat-val">{nodeCount}</div>
                <div className="sp-stat-label">Nodes</div>
              </div>
              {activeNode?.fuel && (
                <div className="sp-stat">
                  <div className="sp-stat-val" style={{
                    color: activeNode.fuel.quantity < activeNode.fuel.maxCapacity * 0.15
                      ? 'var(--sp-red)'
                      : activeNode.fuel.quantity < activeNode.fuel.maxCapacity * 0.35
                      ? 'var(--sp-amber)'
                      : 'var(--sp-text-bright)'
                  }}>
                    {Math.floor((activeNode.fuel.quantity * activeNode.fuel.burnRateMs) / 3600000)}h
                  </div>
                  <div className="sp-stat-label">Fuel Left</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="sp-error">⚠ {error}</div>}

        {/* Loading */}
        {loading && (
          <div className="sp-loading">
            <div className="sp-spinner" />
            <span>querying chain...</span>
          </div>
        )}

        {/* Dashboard View */}
        {!loading && view === 'dashboard' && (
          <>
            <div className="sp-section-title">Network Nodes</div>
            <div className="sp-grid">
              {assemblies.filter(a => a.kind === 'NetworkNode').map(a => (
                <AssemblyCard key={a.id} assembly={a} />
              ))}
              {assemblies.filter(a => a.kind === 'NetworkNode').length === 0 && (
                <div style={{ color: 'var(--sp-muted)', fontFamily: 'var(--sp-mono)', fontSize: 12 }}>
                  No network nodes found.
                </div>
              )}
            </div>

            <div className="sp-section-title">Assemblies</div>
            <div className="sp-grid">
              {assemblies.filter(a => a.kind !== 'NetworkNode').map(a => (
                <AssemblyCard key={a.id} assembly={a} />
              ))}
              {assemblies.filter(a => a.kind !== 'NetworkNode').length === 0 && (
                <div style={{ color: 'var(--sp-muted)', fontFamily: 'var(--sp-mono)', fontSize: 12 }}>
                  No assemblies found.
                </div>
              )}
            </div>
          </>
        )}

        {/* Gates View (placeholder until you deploy a gate) */}
        {!loading && view === 'gates' && (
          <>
            <div className="sp-section-title">Gate Manager</div>
            <div style={{
              background: 'var(--sp-surface)',
              border: '1px solid var(--sp-border)',
              borderRadius: 6,
              padding: '48px 32px',
              textAlign: 'center',
              fontFamily: 'var(--sp-mono)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
              <div style={{ color: 'var(--sp-text-bright)', fontSize: 16, marginBottom: 8 }}>
                No gates deployed yet
              </div>
              <div style={{ color: 'var(--sp-muted)', fontSize: 12, maxWidth: 380, margin: '0 auto' }}>
                Deploy a Smart Gate in-game and anchor it at a Lagrange point.
                Once it shows up on-chain it will appear here with full access control management.
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="sp-footer">
        <span>
          <span className="sp-footer-accent">SQUAREPICKLE</span> · EVE Frontier · Testnet
        </span>
        <span>
          {lastRefresh
            ? `last sync ${lastRefresh.toLocaleTimeString()}`
            : 'not synced'}
        </span>
      </footer>
    </div>
  );
}

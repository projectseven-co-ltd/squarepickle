import { AssemblyRecord } from './queries';

const KIND_LABEL: Record<AssemblyRecord['kind'], string> = {
  NetworkNode: 'Network Node',
  StorageUnit: 'Storage Unit',
  Turret: 'Turret',
  Assembly: 'Assembly',
  Character: 'Character',
};

const KIND_ICON: Record<AssemblyRecord['kind'], string> = {
  NetworkNode: '⬡',
  StorageUnit: '▣',
  Turret: '◈',
  Assembly: '◆',
  Character: '◉',
};

function FuelBar({ fuel }: { fuel: NonNullable<AssemblyRecord['fuel']> }) {
  const pct = fuel.maxCapacity > 0 ? (fuel.quantity / fuel.maxCapacity) * 100 : 0;
  const hoursLeft = fuel.burnRateMs > 0 ? Math.floor((fuel.quantity * fuel.burnRateMs) / 3600000) : 0;
  const fillClass = pct < 15 ? 'critical' : pct < 35 ? 'low' : '';

  return (
    <div className="sp-fuel">
      <div className="sp-fuel-header">
        <span className="sp-fuel-label">⛽ Fuel</span>
        <span className="sp-fuel-val">
          {fuel.quantity.toLocaleString()} / {fuel.maxCapacity.toLocaleString()}
          {fuel.isBurning && ` · ~${hoursLeft}h left`}
        </span>
      </div>
      <div className="sp-fuel-bar">
        <div className={`sp-fuel-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EnergyRow({ energy }: { energy: NonNullable<AssemblyRecord['energy']> }) {
  const available = energy.currentProduction - energy.totalReserved;
  return (
    <div className="sp-energy-row">
      <div className="sp-energy-item">
        <div className="sp-energy-val">{energy.currentProduction}</div>
        <div className="sp-energy-label">Output</div>
      </div>
      <div className="sp-energy-item">
        <div className="sp-energy-val">{energy.totalReserved}</div>
        <div className="sp-energy-label">Reserved</div>
      </div>
      <div className="sp-energy-item">
        <div className="sp-energy-val" style={{ color: available > 0 ? 'var(--sp-accent)' : 'var(--sp-red)' }}>
          {available}
        </div>
        <div className="sp-energy-label">Available</div>
      </div>
    </div>
  );
}

export function AssemblyCard({ assembly }: { assembly: AssemblyRecord }) {
  const isOnline = assembly.status.online;
  const displayName = assembly.name || null;

  return (
    <div className={`sp-card ${isOnline ? 'online' : 'offline'}`}>
      <div className="sp-card-type">
        {KIND_ICON[assembly.kind]} {KIND_LABEL[assembly.kind]}
      </div>

      <div className={`sp-card-name ${!displayName ? 'unnamed' : ''}`}>
        {displayName || '— unnamed —'}
      </div>

      {assembly.description && (
        <div className="sp-card-desc">"{assembly.description}"</div>
      )}

      <div className="sp-card-id">{assembly.id}</div>

      <span className={`sp-badge ${isOnline ? 'online' : 'offline'}`}>
        <span className="sp-badge-dot" />
        {isOnline ? 'Online' : 'Offline'}
      </span>

      {assembly.fuel && <FuelBar fuel={assembly.fuel} />}
      {assembly.energy && <EnergyRow energy={assembly.energy} />}

      {assembly.connectedCount !== undefined && (
        <div className="sp-connected">
          <span className="sp-connected-count">{assembly.connectedCount}</span> assemblies connected
        </div>
      )}
    </div>
  );
}

// GraphQL queries for SquarePickle dashboard
// Hitting: https://graphql.testnet.sui.io/graphql

const GRAPHQL_ENDPOINT = import.meta.env.VITE_SUI_GRAPHQL_ENDPOINT || 'https://graphql.testnet.sui.io/graphql';
export const DEFAULT_WALLET = '0x5c6c0edea73a486221651526694e03756066ec7994bc53a7b7458294ab4f79fc';

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export interface AssemblyStatus { online: boolean }
export interface FuelInfo {
  quantity: number;
  maxCapacity: number;
  isBurning: boolean;
  burnRateMs: number;
}
export interface EnergyInfo {
  maxProduction: number;
  currentProduction: number;
  totalReserved: number;
}

export interface AssemblyRecord {
  id: string;
  kind: 'NetworkNode' | 'StorageUnit' | 'Turret' | 'Assembly' | 'Character';
  name: string;
  description: string;
  typeId?: string;
  status: AssemblyStatus;
  fuel?: FuelInfo;
  energy?: EnergyInfo;
  connectedCount?: number;
  energySourceId?: string;
}

export interface CharacterInfo {
  id: string;
  name: string;
  tribeId: number;
  walletAddress: string;
}

// ── Fetch owner caps from wallet address ──────────────────────────────────────
export async function fetchOwnerCaps(walletAddress: string): Promise<{ type: string; authorizedId: string }[]> {
  const data = await gql(`
    query GetOwnerCaps($addr: SuiAddress!) {
      address(address: $addr) {
        objects(first: 50) {
          nodes {
            contents {
              type { repr }
              json
            }
          }
        }
      }
    }
  `, { addr: walletAddress });

  const nodes = data?.address?.objects?.nodes ?? [];
  return nodes
    .filter((n: any) => n?.contents?.type?.repr?.includes('::access::OwnerCap'))
    .map((n: any) => ({
      type: n.contents.type.repr,
      authorizedId: n.contents.json?.authorized_object_id ?? '',
    }))
    .filter((n: any) => n.authorizedId);
}

// ── Fetch a single object by address ─────────────────────────────────────────
async function fetchObject(id: string): Promise<{ typeRepr: string; json: any } | null> {
  const data = await gql(`
    query GetObject($id: SuiAddress!) {
      object(address: $id) {
        asMoveObject {
          contents { type { repr } json }
        }
      }
    }
  `, { id });

  const contents = data?.object?.asMoveObject?.contents;
  if (!contents) return null;
  return { typeRepr: contents.type.repr, json: contents.json };
}

// ── Parse assembly type from type string ──────────────────────────────────────
function inferKind(typeRepr: string): AssemblyRecord['kind'] {
  if (typeRepr.includes('::network_node::NetworkNode')) return 'NetworkNode';
  if (typeRepr.includes('::storage_unit::StorageUnit')) return 'StorageUnit';
  if (typeRepr.includes('::turret::Turret')) return 'Turret';
  if (typeRepr.includes('::character::Character')) return 'Character';
  return 'Assembly';
}

// ── Parse status ──────────────────────────────────────────────────────────────
function parseStatus(json: any): AssemblyStatus {
  const variant = json?.status?.status?.['@variant'];
  return { online: variant === 'ONLINE' };
}

// ── Parse fuel ────────────────────────────────────────────────────────────────
function parseFuel(json: any): FuelInfo | undefined {
  if (!json?.fuel) return undefined;
  return {
    quantity: parseInt(json.fuel.quantity ?? '0', 10),
    maxCapacity: parseInt(json.fuel.max_capacity ?? '0', 10),
    isBurning: json.fuel.is_burning ?? false,
    burnRateMs: parseInt(json.fuel.burn_rate_in_ms ?? '0', 10),
  };
}

// ── Parse energy ──────────────────────────────────────────────────────────────
function parseEnergy(json: any): EnergyInfo | undefined {
  if (!json?.energy_source) return undefined;
  return {
    maxProduction: parseInt(json.energy_source.max_energy_production ?? '0', 10),
    currentProduction: parseInt(json.energy_source.current_energy_production ?? '0', 10),
    totalReserved: parseInt(json.energy_source.total_reserved_energy ?? '0', 10),
  };
}

// ── Main: fetch all assemblies for a wallet ───────────────────────────────────
export async function fetchDashboard(walletAddress: string): Promise<{
  character: CharacterInfo | null;
  assemblies: AssemblyRecord[];
}> {
  // 1. Get all owner caps from wallet
  const caps = await fetchOwnerCaps(walletAddress);

  // 2. Resolve each authorized object
  const results = await Promise.all(caps.map(cap => fetchObject(cap.authorizedId)));

  const assemblies: AssemblyRecord[] = [];
  let character: CharacterInfo | null = null;

  results.forEach((obj, i) => {
    if (!obj) return;
    const { typeRepr, json } = obj;
    const kind = inferKind(typeRepr);
    const id = caps[i].authorizedId;

    if (kind === 'Character') {
      character = {
        id,
        name: json?.metadata?.name || 'Unknown',
        tribeId: json?.tribe_id ?? 0,
        walletAddress: json?.character_address ?? walletAddress,
      };
      return;
    }

    assemblies.push({
      id,
      kind,
      name: json?.metadata?.name || '',
      description: json?.metadata?.description || '',
      typeId: json?.type_id,
      status: parseStatus(json),
      fuel: parseFuel(json),
      energy: parseEnergy(json),
      connectedCount: json?.connected_assembly_ids?.length,
      energySourceId: json?.energy_source_id,
    });
  });

  // Sort: NetworkNodes first, then online before offline, then by name
  assemblies.sort((a, b) => {
    if (a.kind === 'NetworkNode' && b.kind !== 'NetworkNode') return -1;
    if (a.kind !== 'NetworkNode' && b.kind === 'NetworkNode') return 1;
    if (a.status.online !== b.status.online) return a.status.online ? -1 : 1;
    return (a.name || 'zzz').localeCompare(b.name || 'zzz');
  });

  return { character, assemblies };
}

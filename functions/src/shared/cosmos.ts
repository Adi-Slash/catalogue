import { CosmosClient, Container, Database } from '@azure/cosmos';
import type { Asset } from './types';

const connectionString = process.env.COSMOS_CONNECTION_STRING || '';
const databaseId = 'assetsdb';
const containerId = 'assets';

let client: CosmosClient | null = null;
let database: Database | null = null;
let container: Container | null = null;

function getClient(): CosmosClient {
  if (!client) {
    if (!connectionString) {
      throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
    }
    client = new CosmosClient(connectionString);
  }
  return client;
}

function getDatabase(): Database {
  if (!database) {
    database = getClient().database(databaseId);
  }
  return database;
}

export function getContainer(): Container {
  if (!container) {
    container = getDatabase().container(containerId);
  }
  return container;
}

export async function getAssetsByHousehold(householdId: string): Promise<Asset[]> {
  const container = getContainer();
  const querySpec = {
    query: 'SELECT * FROM c WHERE c.householdId = @householdId',
    parameters: [{ name: '@householdId', value: householdId }],
  };
  const { resources } = await container.items.query<Asset>(querySpec).fetchAll();
  return resources;
}

export async function getAssetById(id: string, householdId: string): Promise<Asset | null> {
  const container = getContainer();
  try {
    const { resource } = await container.item(id, householdId).read<Asset>();
    return resource || null;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

export async function createAsset(asset: Asset): Promise<Asset> {
  const container = getContainer();
  const { resource } = await container.items.create(asset);
  if (!resource) {
    throw new Error('Failed to create asset');
  }
  return resource as Asset;
}

export async function updateAsset(asset: Asset): Promise<Asset> {
  const container = getContainer();
  const { resource } = await container.item(asset.id, asset.householdId).replace(asset);
  if (!resource) {
    throw new Error('Failed to update asset');
  }
  return resource as Asset;
}

export async function deleteAsset(id: string, householdId: string): Promise<void> {
  const container = getContainer();
  await container.item(id, householdId).delete();
}

import { CosmosClient, Container, Database } from '@azure/cosmos';
import type { UserPreferences } from './types';

const connectionString = process.env.COSMOS_CONNECTION_STRING || '';
const databaseId = 'assetsdb';
const containerId = 'userPreferences';

let client: CosmosClient | null = null;
let database: Database | null = null;
let container: Container | null = null;
let initialized = false;

function getClient(): CosmosClient {
  if (!client) {
    if (!connectionString) {
      throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
    }
    client = new CosmosClient(connectionString);
  }
  return client;
}

async function ensureDatabaseAndContainer(): Promise<void> {
  if (initialized) return;

  try {
    const cosmosClient = getClient();
    
    // Create database if it doesn't exist
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: databaseId,
    });
    
    // Create container if it doesn't exist (partitioned by userId)
    await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: {
        paths: ['/userId'],
      },
    });
    
    initialized = true;
  } catch (error) {
    console.error('Error initializing User Preferences Cosmos DB:', error);
    throw error;
  }
}

function getDatabase(): Database {
  if (!database) {
    database = getClient().database(databaseId);
  }
  return database;
}

export async function getUserPreferencesContainer(): Promise<Container> {
  await ensureDatabaseAndContainer();
  if (!container) {
    container = getDatabase().container(containerId);
  }
  return container;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const container = await getUserPreferencesContainer();
  try {
    const { resource } = await container.item(userId, userId).read<UserPreferences>();
    return resource || null;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

export async function upsertUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  const container = await getUserPreferencesContainer();
  const { resource } = await container.items.upsert(preferences);
  if (!resource) {
    throw new Error('Failed to save user preferences');
  }
  return resource as UserPreferences;
}

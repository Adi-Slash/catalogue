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
  if (initialized) {
    console.log('[UserPreferences] Database and container already initialized');
    return;
  }

  try {
    console.log('[UserPreferences] Initializing database and container...');
    const cosmosClient = getClient();
    
    // Create database if it doesn't exist
    console.log('[UserPreferences] Creating/checking database:', databaseId);
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: databaseId,
    });
    console.log('[UserPreferences] Database ready');
    
    // Create container if it doesn't exist (partitioned by userId)
    console.log('[UserPreferences] Creating/checking container:', containerId);
    const containerResult = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: {
        paths: ['/userId'],
      },
    });
    console.log('[UserPreferences] Container ready:', containerResult.container.id);
    
    initialized = true;
    console.log('[UserPreferences] Initialization complete');
  } catch (error: any) {
    console.error('[UserPreferences] Error initializing Cosmos DB:', error);
    console.error('[UserPreferences] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
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
  try {
    console.log('[UserPreferences] Starting upsert for userId:', preferences.userId);
    const container = await getUserPreferencesContainer();
    console.log('[UserPreferences] Container obtained, performing upsert...');
    
    const result = await container.items.upsert(preferences);
    console.log('[UserPreferences] Upsert result:', result);
    
    if (!result.resource) {
      console.error('[UserPreferences] Upsert returned no resource');
      throw new Error('Failed to save user preferences - no resource returned');
    }
    
    console.log('[UserPreferences] Successfully saved preferences:', result.resource);
    return result.resource as unknown as UserPreferences;
  } catch (error: any) {
    console.error('[UserPreferences] Error in upsertUserPreferences:', error);
    console.error('[UserPreferences] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      preferences: preferences
    });
    throw error;
  }
}

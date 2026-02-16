@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name prefix for resources (must be globally unique for some resources)')
param baseName string = 'ak-aai-003'

var storageApiVersion = '2023-01-01'
var cosmosApiVersion = '2023-04-15'
var staticWebAppUrl = 'https://swa-${baseName}.azurestaticapps.net'

// primary key and connection string for the storage account
var storageAccountKey = listKeys(storage.id, storageApiVersion).keys[0].value
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageAccountKey};EndpointSuffix=core.windows.net'

// Storage account for Azure Functions and blob container
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'st${uniqueString(resourceGroup().id, baseName)}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob container for asset images (private - accessed via SAS tokens)
resource imageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/asset-images'
  properties: {
    publicAccess: 'None'
  }
}

// Cosmos DB account
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'cosmos-${baseName}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

// Cosmos DB database
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  name: 'assetsdb'
  parent: cosmos
  properties: {
    resource: {
      id: 'assetsdb'
    }
    options: {}
  }
}

// Cosmos DB container, partitioned by householdId
resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  name: 'assets'
  parent: cosmosDb
  properties: {
    resource: {
      id: 'assets'
      partitionKey: {
        paths: [
          '/householdId'
        ]
        kind: 'Hash'
      }
    }
    options: {}
  }
}

// Hosting plan for Functions (Consumption)
resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'func-plan-${baseName}'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false
  }
}

// Function App for backend API
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: 'func-api-${baseName}'
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      cors: {
        allowedOrigins: [
          '*'
        ]
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'COSMOS_CONNECTION_STRING'
          value: 'AccountEndpoint=${cosmos.properties.documentEndpoint};AccountKey=${listKeys(cosmos.id, cosmosApiVersion).primaryMasterKey};'
        }
        {
          name: 'BLOB_ACCOUNT_NAME'
          value: storage.name
        }
        {
          name: 'BLOB_CONTAINER_NAME'
          value: 'asset-images'
        }
        {
          name: 'FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR'
          value: 'true'
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Azure Static Web App for frontend
// Note: Deployed via GitHub Actions, not through Static Web App's built-in GitHub integration
resource staticWeb 'Microsoft.Web/staticSites@2022-03-01' = {
  name: 'swa-${baseName}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    // No repositoryUrl needed - deployment is handled by GitHub Actions
  }
}

@description('Primary connection string for the Cosmos DB account')
output cosmosConnectionString string = 'AccountEndpoint=${cosmos.properties.documentEndpoint};AccountKey=${listKeys(cosmos.id, cosmosApiVersion).primaryMasterKey};'

@description('Name of the storage account used for Functions and blob storage')
output storageAccountName string = storage.name

@description('URL of the Static Web App')
output staticWebUrl string = 'https://${staticWeb.name}.azurestaticapps.net'


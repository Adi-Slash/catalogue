/**
 * Price estimation service for assets
 * Uses internet sources to estimate current market value based on:
 * - Asset metadata (make, model, category)
 * - Asset age (calculated from datePurchased)
 */

export interface PriceEstimationParams {
  make: string;
  model: string;
  category?: string;
  serialNumber?: string;
  description?: string;
  datePurchased?: string;
}

export interface PriceEstimationResult {
  estimatedValue: number;
  confidence: 'low' | 'medium' | 'high';
  source: string;
  notes?: string;
}

/**
 * Calculates the age of an asset in years based on purchase date
 */
export function calculateAssetAge(datePurchased?: string): number | null {
  if (!datePurchased) {
    return null;
  }

  try {
    const purchaseDate = new Date(datePurchased);
    const today = new Date();
    const ageInMs = today.getTime() - purchaseDate.getTime();
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.floor(ageInYears * 10) / 10); // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating asset age:', error);
    return null;
  }
}

/**
 * Estimates the current market value of an asset
 * This is a placeholder implementation that can be extended with real APIs
 * 
 * TODO: Integrate with real price estimation APIs such as:
 * - Google Custom Search API (to find similar items for sale)
 * - eBay API (to get sold listings)
 * - Amazon Product API (for retail prices)
 * - SerpAPI (for web search results)
 * - Custom ML model trained on asset depreciation data
 */
export async function estimateAssetPrice(
  params: PriceEstimationParams
): Promise<PriceEstimationResult> {
  const { make, model, category, datePurchased } = params;

  // Validate required fields
  if (!make || !model) {
    throw new Error('Make and model are required for price estimation');
  }

  // Calculate asset age
  const ageInYears = calculateAssetAge(datePurchased);

  // Build search query for price estimation
  const searchQuery = buildSearchQuery(params);

  try {
    // TODO: Replace with actual API call
    // For now, use a mock estimation based on category and age
    const estimatedValue = await mockPriceEstimation({
      make,
      model,
      category,
      ageInYears,
      searchQuery,
    });

    return {
      estimatedValue,
      confidence: ageInYears !== null ? 'medium' : 'low',
      source: 'Estimation Service',
      notes: ageInYears !== null
        ? `Based on ${ageInYears} year${ageInYears !== 1 ? 's' : ''} of depreciation`
        : 'Estimated without age data',
    };
  } catch (error) {
    console.error('Price estimation error:', error);
    throw new Error('Failed to estimate price. Please enter a value manually.');
  }
}

/**
 * Builds a search query string for price estimation
 */
function buildSearchQuery(params: PriceEstimationParams): string {
  const { make, model, category } = params;
  const parts = [make, model];
  
  if (category) {
    parts.push(category);
  }
  
  return parts.join(' ');
}

/**
 * Mock price estimation - replace with real API integration
 * 
 * This uses a simple depreciation model:
 * - Electronics: 20% depreciation per year
 * - Furniture: 10% depreciation per year
 * - Instruments: 15% depreciation per year
 * - Jewellery: 5% depreciation per year (may appreciate)
 * - Transport: 15% depreciation per year
 * - Tools: 10% depreciation per year
 * - Fitness: 15% depreciation per year
 * - Default: 15% depreciation per year
 */
async function mockPriceEstimation(params: {
  make: string;
  model: string;
  category?: string;
  ageInYears: number | null;
  searchQuery: string;
}): Promise<number> {
  const { category, ageInYears } = params;

  // Base value estimation (in a real implementation, this would come from API)
  // For now, use a placeholder base value based on category
  const baseValues: Record<string, number> = {
    electrical: 500,
    furniture: 300,
    instrument: 800,
    jewellery: 1000,
    transport: 2000,
    tools: 200,
    fitness: 400,
  };

  const baseValue = baseValues[category?.toLowerCase() || ''] || 500;

  // Apply depreciation based on age
  if (ageInYears === null) {
    // Without age data, return base value with low confidence
    return baseValue;
  }

  // Depreciation rates by category (annual percentage)
  const depreciationRates: Record<string, number> = {
    electrical: 0.20, // 20% per year
    furniture: 0.10, // 10% per year
    instrument: 0.15, // 15% per year
    jewellery: 0.05, // 5% per year (may appreciate)
    transport: 0.15, // 15% per year
    tools: 0.10, // 10% per year
    fitness: 0.15, // 15% per year
  };

  const depreciationRate = depreciationRates[category?.toLowerCase() || ''] || 0.15;
  
  // Calculate depreciated value: value * (1 - rate) ^ age
  const depreciatedValue = baseValue * Math.pow(1 - depreciationRate, ageInYears);
  
  // Ensure value doesn't go below 10% of original (residual value)
  return Math.max(depreciatedValue, baseValue * 0.1);
}

/**
 * Example integration with Google Custom Search API
 * Uncomment and configure when API key is available
 */
/*
async function estimateWithGoogleSearch(
  searchQuery: string,
  apiKey: string,
  searchEngineId: string
): Promise<number> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery + ' price buy sell')}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Parse search results to extract price information
  // This would need custom logic based on the search results format
  // ...
  
  return estimatedPrice;
}
*/

/**
 * Example integration with SerpAPI
 * Uncomment and configure when API key is available
 */
/*
async function estimateWithSerpAPI(
  searchQuery: string,
  apiKey: string
): Promise<number> {
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Parse shopping results to get average price
  if (data.shopping_results && data.shopping_results.length > 0) {
    const prices = data.shopping_results
      .map((item: any) => parseFloat(item.price?.replace(/[^0-9.]/g, '')))
      .filter((price: number) => !isNaN(price));
    
    if (prices.length > 0) {
      const averagePrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      return averagePrice;
    }
  }
  
  throw new Error('No price data found');
}
*/

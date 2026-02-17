// Azure Functions v4 Programming Model Entry Point
// Import all functions to register them with the app object
import './functions/options'; // Must be first to handle OPTIONS requests
import './functions/getAssets';
import './functions/getAsset';
import './functions/createAsset';
import './functions/updateAsset';
import './functions/deleteAsset';
import './functions/uploadImage';
import './functions/proxyImage';
import './functions/getUserPreferences';
import './functions/updateUserPreferences';

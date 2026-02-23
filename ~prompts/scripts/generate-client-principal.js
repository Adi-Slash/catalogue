/**
 * Helper script to generate x-ms-client-principal header for Postman testing
 * 
 * Usage:
 *   1. Get an access token from Microsoft Entra ID
 *   2. Decode it at https://jwt.ms to get user info
 *   3. Run: node generate-client-principal.js <userId> <userDetails>
 *   4. Copy the base64 output and use it as x-ms-client-principal header in Postman
 * 
 * Example:
 *   node generate-client-principal.js "69e63858-ac90-41a1-a491-edc5804134e6" "user@domain.com"
 */

const userId = process.argv[2];
const userDetails = process.argv[3];

if (!userId || !userDetails) {
  console.error('Usage: node generate-client-principal.js <userId> <userDetails>');
  console.error('Example: node generate-client-principal.js "69e63858-ac90-41a1-a491-edc5804134e6" "user@domain.com"');
  process.exit(1);
}

const clientPrincipal = {
  userId: userId,
  userDetails: userDetails,
  identityProvider: 'aad',
  userRoles: [],
  claims: {
    oid: userId,
    name: userDetails,
    preferred_username: userDetails
  }
};

const jsonString = JSON.stringify(clientPrincipal);
const base64Encoded = Buffer.from(jsonString).toString('base64');

console.log('\n=== Client Principal JSON ===');
console.log(JSON.stringify(clientPrincipal, null, 2));
console.log('\n=== Base64 Encoded (for x-ms-client-principal header) ===');
console.log(base64Encoded);
console.log('\n=== Postman Header ===');
console.log('Header Name: x-ms-client-principal');
console.log('Header Value:', base64Encoded);
console.log('\n');

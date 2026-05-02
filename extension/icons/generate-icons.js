/**
 * Run with Node.js to generate placeholder PNG icons.
 * In production, replace with proper branded icons.
 *
 *   node generate-icons.js
 *
 * Requires: npm install canvas
 * Or just supply your own icon16.png, icon48.png, icon128.png
 */

// Fallback: create minimal valid 1x1 PNG as placeholder
// Real icons should be designed and provided separately.
const { writeFileSync } = require('fs');

// Minimal valid 1x1 transparent PNG (base64)
const TRANSPARENT_PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

writeFileSync('icon16.png', TRANSPARENT_PNG_1x1);
writeFileSync('icon48.png', TRANSPARENT_PNG_1x1);
writeFileSync('icon128.png', TRANSPARENT_PNG_1x1);

console.log('Placeholder icons created. Replace with proper branded icons before publishing.');

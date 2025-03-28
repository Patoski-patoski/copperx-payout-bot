const networkEmoji = {
    'Ethereum': '⧫',
    'Polygon': '⬡',
    'Arbitrum': '🔵',
    'Base': '🟢',
    'Test Network': '🔧'
}['Test Network'] || '🌐';

const networkNames = {
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '8453': 'Base',
  '23434': 'Test Network'
}['137'] || 'Unknown Network';

console.log(networkEmoji);
console.log(networkNames);

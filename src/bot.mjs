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

const wallets = [
  "0xF553638a865B1Cdc711fF827552e51D9065ae1B3",
  "0x034c8eefe0f0221ecd8f6ed4b065ed54c64bad24525467eaff7a114ae5184e5f"

]

console.log(wallets.length);

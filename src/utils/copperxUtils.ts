// src/utils/copperxUtils.ts

export function convertToBaseUnit(amount: number, decimals: number = 8)
    : string {
    return (amount * Math.pow(10, decimals)).toString();
}

export function convertFromBaseUnit(amount: number, decimals: number = 8)
    : number {
    return Number(amount) / Math.pow(10, decimals);
}
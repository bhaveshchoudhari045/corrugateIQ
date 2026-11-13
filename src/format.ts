export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const t1 = (n: number) => n.toFixed(1) + ' t';
export const t2 = (n: number) => n.toFixed(2) + ' t';
export const p1 = (n: number) => n.toFixed(1) + '%';
export const n0 = (n: number) => Math.round(n).toLocaleString('en-IN');

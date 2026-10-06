// Entirely synthetic data. Nothing here corresponds to a real dataset.

export interface Category {
  id: string;
  name: string;
}

export interface Insight {
  title: string;
  detail: string;
  score: number;
}

const CATEGORIES: Category[] = [
  { id: "cat-001", name: "Sparkling Water" },
  { id: "cat-002", name: "Oat Snacks" },
  { id: "cat-003", name: "Frozen Noodles" },
];

export function resolveCategory(query: string): Category[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CATEGORIES.filter((c) => c.name.toLowerCase().includes(q));
}

export function getInsights(categoryId: string, limit: number): Insight[] | null {
  if (!CATEGORIES.some((c) => c.id === categoryId)) return null;
  const all: Insight[] = [
    { title: "Segment A is growing", detail: "Placeholder insight text.", score: 0.82 },
    { title: "Segment B is flat", detail: "Placeholder insight text.", score: 0.51 },
    { title: "Segment C is shrinking", detail: "Placeholder insight text.", score: 0.34 },
  ];
  return all.slice(0, limit);
}

import { useMemo } from 'react';
import Fuse from 'fuse.js';

const FUSE_OPTIONS = {
  threshold: 0.3,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'shortDescription', weight: 0.18 },
    { name: 'tags', weight: 0.2 },
    { name: 'deploymentVariants', weight: 0.05 },
    { name: 'category', weight: 0.04 },
    { name: 'subcategory', weight: 0.04 },
    { name: 'uiCategory', weight: 0.04 },
  ],
};

export function useProductSearch(products, query, uiCategory) {
  const fuse = useMemo(() => new Fuse(products, FUSE_OPTIONS), [products]);

  return useMemo(() => {
    const q = query.trim();
    let working = products;

    if (q.length >= 2) {
      working = fuse.search(q).map((r) => r.item);
    }

    if (uiCategory && uiCategory !== 'All') {
      working = working.filter((p) => p.uiCategory === uiCategory);
    }

    return working;
  }, [products, query, uiCategory, fuse]);
}

export default useProductSearch;

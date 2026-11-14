import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const productsFile = fileURLToPath(new URL('../data/products.json', import.meta.url));

async function readProducts() {
  const contents = await readFile(productsFile, 'utf8');
  return JSON.parse(contents);
}

export async function findProducts({ category, q, sort } = {}) {
  let products = await readProducts();

  if (category) {
    const normalizedCategory = category.toLocaleLowerCase();
    products = products.filter(
      (product) => product.category.toLocaleLowerCase() === normalizedCategory,
    );
  }

  if (q) {
    const searchTerm = q.toLocaleLowerCase();
    products = products.filter((product) =>
      [product.name, product.sku, product.category].some((value) =>
        value.toLocaleLowerCase().includes(searchTerm),
      ),
    );
  }

  if (sort === 'price' || sort === '-price') {
    const direction = sort === 'price' ? 1 : -1;
    products.sort((a, b) => direction * (a.price - b.price));
  }

  return products;
}

export async function findProductById(id) {
  const products = await readProducts();
  return products.find((product) => product.id === id) ?? null;
}

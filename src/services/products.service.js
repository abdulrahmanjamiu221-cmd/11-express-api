import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import HttpError from '../errors/HttpError.js';

const productsFile = fileURLToPath(new URL('../data/products.json', import.meta.url));
let writeQueue = Promise.resolve();

async function readProducts() {
  const contents = await readFile(productsFile, 'utf8');
  return JSON.parse(contents);
}

function serializeWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function writeProducts(products) {
  const temporaryFile = `${productsFile}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporaryFile, productsFile);
  } catch (error) {
    try {
      await rm(temporaryFile, { force: true });
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Failed to write products data atomically');
    }
    throw error;
  }
}

function assertUniqueSku(products, sku, excludedId) {
  if (products.some((product) => product.sku === sku && product.id !== excludedId)) {
    throw new HttpError(422, 'Validation failed', { sku: 'must be unique' });
  }
}

export async function isSkuAvailable(sku, excludedId) {
  const products = await readProducts();
  return !products.some((product) => product.sku === sku && product.id !== excludedId);
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

export async function createProduct(productData) {
  return serializeWrite(async () => {
    const products = await readProducts();
    assertUniqueSku(products, productData.sku);

    const product = {
      id: randomUUID(),
      ...productData,
      createdAt: new Date().toISOString(),
    };

    await writeProducts([...products, product]);
    return product;
  });
}

export async function replaceProduct(id, productData) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
      throw new HttpError(404, 'Product not found');
    }

    assertUniqueSku(products, productData.sku, id);
    const existingProduct = products[index];
    const product = {
      id: existingProduct.id,
      ...productData,
      createdAt: existingProduct.createdAt,
    };
    const updatedProducts = [...products];
    updatedProducts[index] = product;

    await writeProducts(updatedProducts);
    return product;
  });
}

export async function patchProduct(id, productData) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
      throw new HttpError(404, 'Product not found');
    }

    const existingProduct = products[index];
    const updatedProduct = { ...existingProduct, ...productData };
    assertUniqueSku(products, updatedProduct.sku, id);
    const updatedProducts = [...products];
    updatedProducts[index] = updatedProduct;

    await writeProducts(updatedProducts);
    return updatedProduct;
  });
}

export async function deleteProduct(id) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const filteredProducts = products.filter((product) => product.id !== id);

    if (filteredProducts.length === products.length) {
      throw new HttpError(404, 'Product not found');
    }

    await writeProducts(filteredProducts);
  });
}

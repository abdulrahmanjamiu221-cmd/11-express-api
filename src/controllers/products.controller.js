import HttpError from '../errors/HttpError.js';
import {
  createProduct as createProductRecord,
  deleteProduct as deleteProductRecord,
  findProductById,
  findProducts,
  patchProduct as patchProductRecord,
  replaceProduct as replaceProductRecord,
} from '../services/products.service.js';

export async function getProducts(req, res) {
  const { category, q, sort } = req.query;
  const products = await findProducts({
    category: typeof category === 'string' ? category : undefined,
    q: typeof q === 'string' ? q : undefined,
    sort: typeof sort === 'string' ? sort : undefined,
  });

  res.json({ data: products });
}

export async function getProductById(req, res) {
  const product = await findProductById(req.params.id);

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  res.json({ data: product });
}

export async function createProduct(req, res) {
  const product = await createProductRecord(req.body);
  res.location(`/api/products/${product.id}`);
  res.status(201).json({ data: product });
}

export async function replaceProduct(req, res) {
  const product = await replaceProductRecord(req.params.id, req.body);
  res.json({ data: product });
}

export async function patchProduct(req, res) {
  const product = await patchProductRecord(req.params.id, req.body);
  res.json({ data: product });
}

export async function deleteProduct(req, res) {
  await deleteProductRecord(req.params.id);
  res.status(204).end();
}

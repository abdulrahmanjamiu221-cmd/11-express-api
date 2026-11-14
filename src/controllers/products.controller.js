import {
  findProductById,
  findProducts,
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
    return res.status(404).json({ error: { message: 'Product not found' } });
  }

  res.json({ data: product });
}

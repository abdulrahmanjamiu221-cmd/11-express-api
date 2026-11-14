import HttpError from '../errors/HttpError.js';
import { isSkuAvailable } from '../services/products.service.js';

const allowedCategories = new Set([
  'Accessories',
  'Apparel',
  'Electronics',
  'Home',
  'Outdoors',
  'Stationery',
]);
const productFields = ['name', 'sku', 'category', 'price', 'stock'];

export async function validateProduct(req, res, next) {
  if (
    typeof req.body !== 'object'
    || req.body === null
    || Array.isArray(req.body)
  ) {
    return next(new HttpError(422, 'Validation failed', {
      body: 'must be a JSON object',
    }));
  }

  const fields = {};
  const isPartialUpdate = req.method === 'PATCH';
  const bodyKeys = Object.keys(req.body);

  for (const key of bodyKeys) {
    if (!productFields.includes(key)) {
      fields[key] = 'is not allowed';
    }
  }

  if (isPartialUpdate && bodyKeys.length === 0) {
    fields.body = 'must include at least one product field';
  }

  for (const field of productFields) {
    const value = req.body[field];

    if (value === undefined) {
      if (!isPartialUpdate) {
        fields[field] = 'is required';
      }
      continue;
    }

    if (field === 'name') {
      if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100) {
        fields.name = 'must be a string between 2 and 100 characters';
      } else {
        req.body.name = value.trim();
      }
    } else if (field === 'sku') {
      if (typeof value !== 'string' || !/^[A-Z]{3}-\d{4}$/.test(value)) {
        fields.sku = 'must match the pattern AAA-0000';
      } else if (!(await isSkuAvailable(value, req.params.id))) {
        fields.sku = 'must be unique';
      }
    } else if (field === 'category') {
      if (typeof value !== 'string' || !allowedCategories.has(value)) {
        fields.category = `must be one of: ${[...allowedCategories].join(', ')}`;
      }
    } else if (field === 'price') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        fields.price = 'must be a number greater than 0';
      }
    } else if (!Number.isInteger(value) || value < 0) {
      fields.stock = 'must be an integer greater than or equal to 0';
    }
  }

  if (Object.keys(fields).length > 0) {
    return next(new HttpError(422, 'Validation failed', fields));
  }

  next();
}

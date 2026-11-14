import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  patchProduct,
  replaceProduct,
} from '../controllers/products.controller.js';
import { validateProduct } from '../middleware/validateProduct.js';

const router = Router();

router.get('/', getProducts);
router.post('/', validateProduct, createProduct);
router.put('/:id', validateProduct, replaceProduct);
router.patch('/:id', validateProduct, patchProduct);
router.delete('/:id', deleteProduct);
router.get('/:id', getProductById);

export default router;

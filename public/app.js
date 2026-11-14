import {
  createProduct,
  deleteProduct,
  getHealth,
  listProducts,
  updateProductStock,
} from './api.js';

const elements = {
  apiStatusDot: document.querySelector('#api-status-dot'),
  apiStatusLabel: document.querySelector('#api-status-label'),
  openDialog: document.querySelector('#open-product-dialog'),
  dialog: document.querySelector('#product-dialog'),
  closeDialog: document.querySelector('#close-product-dialog'),
  cancelDialog: document.querySelector('#cancel-product-dialog'),
  form: document.querySelector('#product-form'),
  formError: document.querySelector('#form-error'),
  submitButton: document.querySelector('#submit-product'),
  search: document.querySelector('#search-input'),
  category: document.querySelector('#category-filter'),
  sort: document.querySelector('#sort-filter'),
  rows: document.querySelector('#product-rows'),
  resultCount: document.querySelector('#result-count'),
  footerSummary: document.querySelector('#footer-summary'),
  toast: document.querySelector('#toast'),
};

const state = {
  products: [],
  loading: true,
  loadSequence: 0,
  searchTimer: null,
  toastTimer: null,
};

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

function showToast(message, type = 'success') {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast is-visible toast-${type}`;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 3600);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function makeTableMessage(message, loading = false) {
  const row = document.createElement('tr');
  const cell = makeElement('td', 'table-message');
  cell.colSpan = 5;

  if (loading) {
    cell.append(makeElement('span', 'spinner'));
  } else {
    cell.append(makeElement('span', 'empty-icon', '—'));
  }
  cell.append(document.createTextNode(message));
  row.append(cell);
  return row;
}

function makeStockControl(product) {
  const control = makeElement('div', 'stock-control');
  const decrease = makeElement('button', 'stock-button', '−');
  decrease.type = 'button';
  decrease.dataset.action = 'decrease';
  decrease.dataset.productId = product.id;
  decrease.setAttribute('aria-label', `Decrease stock for ${product.name}`);
  decrease.disabled = product.stock <= 0;

  const stock = makeElement(
    'span',
    `stock-value${product.stock <= 5 ? ' is-low' : ''}`,
    String(product.stock),
  );
  stock.setAttribute('aria-label', `${product.stock} in stock`);

  const increase = makeElement('button', 'stock-button', '+');
  increase.type = 'button';
  increase.dataset.action = 'increase';
  increase.dataset.productId = product.id;
  increase.setAttribute('aria-label', `Increase stock for ${product.name}`);

  control.append(decrease, stock, increase);
  return control;
}

function makeProductRow(product) {
  const row = document.createElement('tr');

  const productCell = makeElement('td', 'product-cell');
  const mark = makeElement('span', 'product-mark');
  const initials = product.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  mark.textContent = initials;
  mark.setAttribute('aria-hidden', 'true');

  const copy = makeElement('span', 'product-copy');
  copy.append(
    makeElement('strong', 'product-name', product.name),
    makeElement('small', 'product-sku', product.sku),
  );
  productCell.append(mark, copy);

  const categoryCell = document.createElement('td');
  categoryCell.append(makeElement('span', 'category-badge', product.category));

  const priceCell = makeElement('td', 'price-cell', currency.format(product.price));
  const stockCell = document.createElement('td');
  stockCell.append(makeStockControl(product));

  const actionsCell = makeElement('td', 'actions-cell');
  const deleteButton = makeElement('button', 'delete-button', 'Delete');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.dataset.productId = product.id;
  deleteButton.setAttribute('aria-label', `Delete ${product.name}`);
  actionsCell.append(deleteButton);

  row.append(productCell, categoryCell, priceCell, stockCell, actionsCell);
  return row;
}

function render() {
  elements.resultCount.textContent = state.loading
    ? 'Loading'
    : `${state.products.length} ${state.products.length === 1 ? 'item' : 'items'}`;

  if (state.loading) {
    elements.rows.replaceChildren(makeTableMessage('Loading products...', true));
    elements.footerSummary.textContent = 'Fetching your inventory';
    return;
  }

  if (state.products.length === 0) {
    elements.rows.replaceChildren(makeTableMessage('No products match your filters.'));
    elements.footerSummary.textContent = 'Try a different search or category';
    return;
  }

  elements.rows.replaceChildren(...state.products.map(makeProductRow));
  elements.footerSummary.textContent = 'Inventory is up to date';
}

async function loadProducts() {
  const sequence = ++state.loadSequence;
  const filters = {
    q: elements.search.value.trim(),
    category: elements.category.value,
    sort: elements.sort.value,
  };

  state.loading = true;
  render();

  try {
    const products = await listProducts(filters);
    if (sequence !== state.loadSequence) {
      return;
    }
    state.products = products;
  } catch (error) {
    if (sequence !== state.loadSequence) {
      return;
    }
    state.products = [];
    showToast(error.message || 'Could not load products.', 'error');
  } finally {
    if (sequence === state.loadSequence) {
      state.loading = false;
      render();
    }
  }
}

function clearFieldErrors() {
  elements.formError.hidden = true;
  elements.formError.textContent = '';
  elements.form.querySelectorAll('[data-error-for]').forEach((message) => {
    message.textContent = '';
  });
  elements.form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
    input.removeAttribute('aria-invalid');
  });
}

function showFieldErrors(fields) {
  clearFieldErrors();
  let hasVisibleField = false;

  for (const [field, message] of Object.entries(fields)) {
    const input = elements.form.elements.namedItem(field);
    const messageElement = elements.form.querySelector(`[data-error-for="${field}"]`);

    if (input && messageElement) {
      input.setAttribute('aria-invalid', 'true');
      messageElement.textContent = message;
      hasVisibleField = true;
    } else {
      elements.formError.textContent = message;
      elements.formError.hidden = false;
    }
  }

  if (!hasVisibleField && elements.formError.hidden) {
    elements.formError.textContent = 'Please check the product details and try again.';
    elements.formError.hidden = false;
  }
}

function setSubmitting(isSubmitting) {
  elements.submitButton.disabled = isSubmitting;
  elements.submitButton.querySelector('.submit-label').textContent = isSubmitting
    ? 'Saving...'
    : 'Create product';
}

async function submitProduct(event) {
  event.preventDefault();
  clearFieldErrors();

  const formData = new FormData(elements.form);
  const product = {
    name: String(formData.get('name') ?? ''),
    sku: String(formData.get('sku') ?? '').trim(),
    category: String(formData.get('category') ?? ''),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock')),
  };

  setSubmitting(true);
  try {
    await createProduct(product);
    elements.dialog.close();
    elements.form.reset();
    showToast('Product added to your inventory.');
    await loadProducts();
  } catch (error) {
    if (error.status === 422 && error.fields) {
      showFieldErrors(error.fields);
    } else {
      showToast(error.message || 'Could not create product.', 'error');
    }
  } finally {
    setSubmitting(false);
  }
}

async function changeStock(id, amount, button) {
  const product = state.products.find((item) => item.id === id);
  if (!product || product.stock + amount < 0) {
    return;
  }

  const row = button.closest('tr');
  row.querySelectorAll('.stock-button').forEach((control) => {
    control.disabled = true;
  });

  try {
    const updatedProduct = await updateProductStock(id, product.stock + amount);
    state.products = state.products.map((item) =>
      item.id === updatedProduct.id ? updatedProduct : item,
    );
    render();
    showToast(`Stock updated for ${updatedProduct.name}.`);
  } catch (error) {
    showToast(error.message || 'Could not update stock.', 'error');
    render();
  }
}

async function removeProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product || !window.confirm(`Delete "${product.name}" from your inventory?`)) {
    return;
  }

  try {
    await deleteProduct(id);
    state.products = state.products.filter((item) => item.id !== id);
    render();
    showToast(`${product.name} was deleted.`);
  } catch (error) {
    showToast(error.message || 'Could not delete product.', 'error');
  }
}

elements.openDialog.addEventListener('click', () => {
  clearFieldErrors();
  elements.form.reset();
  elements.dialog.showModal();
  elements.form.elements.name.focus();
});

elements.closeDialog.addEventListener('click', () => elements.dialog.close());
elements.cancelDialog.addEventListener('click', () => elements.dialog.close());
elements.form.addEventListener('submit', submitProduct);

elements.search.addEventListener('input', () => {
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(loadProducts, 300);
});
elements.category.addEventListener('change', loadProducts);
elements.sort.addEventListener('change', loadProducts);

elements.rows.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const { action, productId } = button.dataset;
  if (action === 'delete') {
    removeProduct(productId);
  } else {
    changeStock(productId, action === 'increase' ? 1 : -1, button);
  }
});

elements.form.querySelectorAll('input, select').forEach((input) => {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    const message = elements.form.querySelector(`[data-error-for="${input.name}"]`);
    if (message) {
      message.textContent = '';
    }
    elements.formError.hidden = true;
  });
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.search.focus();
  }
});

getHealth()
  .then(() => {
    elements.apiStatusDot.classList.add('is-online');
    elements.apiStatusLabel.textContent = 'API connected';
  })
  .catch(() => {
    elements.apiStatusDot.classList.add('is-offline');
    elements.apiStatusLabel.textContent = 'API unavailable';
  });

loadProducts();

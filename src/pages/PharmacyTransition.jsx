import { useEffect, useMemo, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  createPharmacyProduct,
  createPharmacySale,
  getPharmacyDailySummary,
  listPharmacyProducts,
  listPharmacySales,
} from "@/lib/backendTest";


export default function PharmacyTransition() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "Paracetamol 500mg",
    sku: "PCM-500",
    batch_number: "",
    quantity_on_hand: 100,
    unit_price: 25,
  });
  const [saleForm, setSaleForm] = useState({
    product_id: "",
    quantity: 1,
    customer_name: "",
    payment_method: "cash",
    discount: 0,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadPharmacy();
    }
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === saleForm.product_id),
    [products, saleForm.product_id]
  );

  const saleTotal = useMemo(() => {
    const price = selectedProduct?.unit_price || 0;
    const quantity = Number(saleForm.quantity || 0);
    const discount = Number(saleForm.discount || 0);
    return Math.max(0, price * quantity - discount);
  }, [selectedProduct, saleForm.quantity, saleForm.discount]);

  const loadPharmacy = async () => {
    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      const [productResponse, saleResponse, summaryResponse] = await Promise.all([
        listPharmacyProducts("", backendBaseUrl),
        listPharmacySales(backendBaseUrl),
        getPharmacyDailySummary(backendBaseUrl),
      ]);
      const loadedProducts = productResponse.products || [];
      setProducts(loadedProducts);
      setSales(saleResponse.sales || []);
      setSummary(summaryResponse);
      if (!saleForm.product_id && loadedProducts[0]?.id) {
        setSaleForm((current) => ({ ...current, product_id: loadedProducts[0].id }));
      }
    } catch (loadError) {
      setError(loadError?.message || "Unable to load pharmacy data");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await createPharmacyProduct(productForm, backendBaseUrl);
      setMessage(`Product created: ${response.product?.name}`);
      await loadPharmacy();
    } catch (productError) {
      setError(productError?.message || "Unable to create product");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateSale = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      if (!selectedProduct) {
        throw new Error("Select a product before completing sale");
      }

      const response = await createPharmacySale(
        {
          customer_name: saleForm.customer_name,
          payment_method: saleForm.payment_method,
          discount: Number(saleForm.discount || 0),
          items: [
            {
              product_id: selectedProduct.id,
              product_name: selectedProduct.name,
              quantity: Number(saleForm.quantity || 1),
              unit_price: selectedProduct.unit_price,
            },
          ],
        },
        backendBaseUrl
      );
      setMessage(`Sale completed: ${response.sale?.receipt_number}`);
      await loadPharmacy();
    } catch (saleError) {
      setError(saleError?.message || "Unable to complete sale");
    } finally {
      setIsBusy(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <PharmacyShell>
        <StatusMessage title="Pharmacy inactive" message="Firebase auth feature flag is not enabled." tone="muted" />
      </PharmacyShell>
    );
  }

  return (
    <PharmacyShell>
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
        <div className="font-semibold">Sri Lanka pharmacy transition module</div>
        <div className="mt-1">
          Use this for live pharmacy workflow testing: product stock, sales, stock reduction, and daily totals.
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Backend URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={backendBaseUrl}
            onChange={(event) => setBackendBaseUrl(event.target.value)}
          />
        </label>
        <button
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={loadPharmacy}
          type="button"
          disabled={isBusy}
        >
          Refresh pharmacy
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}
      {message && <StatusMessage title="Status" message={message} tone="success" />}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Today sales" value={summary?.sale_count ?? 0} />
        <Metric label="Today total" value={`LKR ${Number(summary?.total_sales || 0).toFixed(2)}`} />
        <Metric label="Products" value={products.length} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={handleCreateProduct}>
          <h2 className="text-lg font-semibold">Add stock item</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Medicine name" value={productForm.name} onChange={(value) => setProductForm((current) => ({ ...current, name: value }))} />
            <Field label="SKU/code" value={productForm.sku} onChange={(value) => setProductForm((current) => ({ ...current, sku: value }))} />
            <Field label="Batch number" value={productForm.batch_number} onChange={(value) => setProductForm((current) => ({ ...current, batch_number: value }))} />
            <Field label="Quantity" type="number" value={productForm.quantity_on_hand} onChange={(value) => setProductForm((current) => ({ ...current, quantity_on_hand: Number(value) }))} />
            <Field label="Unit price LKR" type="number" value={productForm.unit_price} onChange={(value) => setProductForm((current) => ({ ...current, unit_price: Number(value) }))} />
          </div>
          <button className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isBusy}>
            Add product
          </button>
        </form>

        <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={handleCreateSale}>
          <h2 className="text-lg font-semibold">Create sale</h2>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Product</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={saleForm.product_id}
              onChange={(event) => setSaleForm((current) => ({ ...current, product_id: event.target.value }))}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - stock {product.quantity_on_hand} - LKR {product.unit_price}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Quantity" type="number" value={saleForm.quantity} onChange={(value) => setSaleForm((current) => ({ ...current, quantity: Number(value) }))} />
            <Field label="Discount LKR" type="number" value={saleForm.discount} onChange={(value) => setSaleForm((current) => ({ ...current, discount: Number(value) }))} />
            <Field label="Customer name optional" value={saleForm.customer_name} onChange={(value) => setSaleForm((current) => ({ ...current, customer_name: value }))} />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Payment</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={saleForm.payment_method}
                onChange={(event) => setSaleForm((current) => ({ ...current, payment_method: event.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-3 font-semibold">
            Sale total: LKR {saleTotal.toFixed(2)}
          </div>
          <button className="mt-5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isBusy}>
            Complete sale and reduce stock
          </button>
        </form>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Current stock">
          {products.map((product) => (
            <div className="rounded-md border border-slate-200 p-3" key={product.id}>
              <div className="font-semibold">{product.name}</div>
              <div className="mt-1 text-sm text-slate-600">
                {product.sku || "No SKU"} | stock {product.quantity_on_hand} | LKR {product.unit_price}
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Recent sales">
          {sales.map((sale) => (
            <div className="rounded-md border border-slate-200 p-3" key={sale.id}>
              <div className="font-semibold">{sale.receipt_number}</div>
              <div className="mt-1 text-sm text-slate-600">
                LKR {sale.total} | {sale.payment_method} | {sale.status}
              </div>
            </div>
          ))}
        </Panel>
      </section>
    </PharmacyShell>
  );
}

function PharmacyShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Horizon Pharmacy</p>
        <h1 className="mt-2 text-3xl font-semibold">Pharmacy Transition</h1>
        {children}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function StatusMessage({ title, message, tone }) {
  const toneClass = {
    error: "border-red-200 bg-red-50 text-red-900",
    muted: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];

  return (
    <section className={`mt-6 rounded-lg border px-5 py-4 ${toneClass}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 break-all text-sm">{message}</p>
    </section>
  );
}

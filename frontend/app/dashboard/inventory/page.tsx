'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Package, AlertTriangle, AlertCircle, CheckCircle2, Plus, Loader2 } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, threshold: 0, unit: '', vendorEmail: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/inventory')
      .then(r => setItems(r.data.data || []))
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setLoading(false));
  }, []);

  async function saveItem() {
    if (!newItem.name || newItem.threshold < 0) return;
    setSaving(true);
    try {
      const r = await api.post('/api/inventory', newItem);
      setItems(i => [...i, r.data.data]);
      setAdding(false);
      setNewItem({ name: '', quantity: 0, threshold: 0, unit: '', vendorEmail: '' });
      toast.success('Item added');
    } catch { toast.error('Failed to add item'); }
    finally { setSaving(false); }
  }

  async function updateQuantity(id: string, quantity: number) {
    try {
      await api.put(`/api/inventory/${id}`, { quantity });
      setItems(is => is.map(i => i.id === id ? { ...i, quantity } : i));
      toast.success('Quantity updated');
    } catch { toast.error('Update failed'); }
  }

  const critical = items.filter(i => i.quantity === 0);
  const low = items.filter(i => i.quantity > 0 && i.quantity <= i.threshold);
  const ok = items.filter(i => i.quantity > i.threshold);

  function getStockStatus(item: InventoryItem) {
    if (item.quantity === 0) return { label: 'Out of stock', class: 'badge-red', icon: AlertCircle };
    if (item.quantity <= item.threshold) return { label: 'Low stock', class: 'badge-yellow', icon: AlertTriangle };
    return { label: 'In stock', class: 'badge-green', icon: CheckCircle2 };
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{items.length} items tracked</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Out of Stock', value: critical.length, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
          { label: 'Low Stock', value: low.length, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Well Stocked', value: ok.length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
        ].map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', c.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold font-display text-slate-900">{c.value}</div>
                <div className="text-sm text-slate-500">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add item form */}
      {adding && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Add New Item</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Item Name', key: 'name', type: 'text', placeholder: 'Disposable gloves' },
              { label: 'Quantity', key: 'quantity', type: 'number', placeholder: '100' },
              { label: 'Alert Threshold', key: 'threshold', type: 'number', placeholder: '20' },
              { label: 'Unit', key: 'unit', type: 'text', placeholder: 'boxes' },
              { label: 'Vendor Email', key: 'vendorEmail', type: 'email', placeholder: 'vendor@supplier.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{f.label}</label>
                <input type={f.type} value={(newItem as any)[f.key]}
                  onChange={e => setNewItem({ ...newItem, [f.key]: f.type === 'number' ? +e.target.value : e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveItem} disabled={saving || !newItem.name}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Item
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      {/* Items table */}
      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No inventory items</p>
          <p className="text-slate-400 text-sm mt-1">Add items to track stock levels and get low-stock alerts</p>
          <button onClick={() => setAdding(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500">
            Add First Item
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Item', 'Quantity', 'Threshold', 'Vendor', 'Status', 'Update'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(item => {
                const status = getStockStatus(item);
                const StatusIcon = status.icon;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="font-medium text-sm text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold font-display text-slate-900">{item.quantity}</span>
                      {item.unit && <span className="text-xs text-slate-400 ml-1">{item.unit}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      Alert at {item.threshold}
                      {item.unit && ` ${item.unit}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[160px]">
                      {item.vendorEmail || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 w-fit', status.class)}>
                        <StatusIcon className="w-3 h-3" />{status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          className="w-6 h-6 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors">-</button>
                        <span className="text-sm text-slate-700 w-10 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors">+</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

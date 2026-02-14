import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, PlusCircle, Search, Trash2, CreditCard, BarChart3, FileText, User, CheckCircle, X, ChevronRight, ArrowLeft, Minus, Plus, AlertTriangle, Coins, Pencil, PackagePlus, CloudUpload, UserPlus, DollarSign, ShoppingCart, Calendar, Wifi, Users, ArrowUpRight, TrendingUp, PieChart, Package, Activity } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
// Firebase Imports
import { db } from './firebase';
import { collection, setDoc, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, query, orderBy, where, getDocs } from 'firebase/firestore';

// --- 1. TYPES & INTERFACES ---
export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  parts?: { text: string }[];
}
export interface Product {
  id: string;
  code: string;
  category?: string;
  name: string;
  price: number;
  stock: number;
}
export interface Customer {
  id: string;
  loyaltyId: string;
  name: string;
  email: string;
  dob?: string;
  points: number;
}
export interface SalesRecord {
  id: string;
  customerId: string;
  productCode: string;
  pointsEarned: number;
  pointsRedeemed: number;
  total: number;
  date: string;
  timestamp: number;
}
export interface AppState {
  inventory: Product[];
  customers: Customer[];
  sales: SalesRecord[];
}
export interface CartItem extends Product {
  cartQuantity: number;
}

// --- 2. MOCK DATA ---
const INITIAL_INVENTORY: Product[] = [
  { id: '1', code: 'RNG839201', category: 'Rings', name: 'Gold Band Ring', price: 1500, stock: 20 },
  { id: '2', code: 'NK293841', category: 'Necklace', name: 'Silver Chain', price: 2500, stock: 10 },
  { id: '3', code: 'BL938271', category: 'Bracelet', name: 'Charm Bracelet', price: 1200, stock: 15 },
  { id: '4', code: 'GFT004', category: 'Other', name: 'Gift Box', price: 800, stock: 5 },
];
const INITIAL_CUSTOMERS: Customer[] = [
    { id: '1', loyaltyId: 'GFT100200', name: 'John Doe', email: 'john@example.com', points: 150 }
];

// --- 3. COMPONENTS ---

const ChatInterface = ({ messages }: { messages: ChatMessage[] }) => {
  return (
    <div className="p-4 space-y-3">
      {messages.map((m, i) => {
        const isModel = m.role === 'model';
        const bubbleClass = isModel ? "bg-gray-100 text-gray-800" : "bg-[#99042E] text-white ml-auto max-w-[80%]";
        return (
          <div key={i} className={`p-3 rounded-lg text-sm ${bubbleClass}`}>
            <p className="whitespace-pre-wrap font-mono text-xs md:text-sm">{m.text || (m.parts && m.parts[0].text)}</p>
          </div>
        );
      })}
    </div>
  );
};

const AddCustomerModal = ({ onClose, onSave }: { onClose: () => void, onSave: (c: { name: string, email: string, dob: string }) => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');

    const handleSave = () => {
        if (!name || !email) return alert("Full Name and Email are required.");
        onSave({ name, email, dob });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl animate-fade-in">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><UserPlus size={20} className="text-[#99042E]" /> New Member Sign Up</h2>
                <div className="space-y-3">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name *</label><input className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-[#99042E] outline-none" placeholder="e.g. Jane Doe" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Email *</label><input className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-[#99042E] outline-none" placeholder="jane@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">D.O.B (Optional)</label><input className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancel</button>
                    <button onClick={handleSave} className="flex-1 bg-[#99042E] text-white py-3 rounded-lg font-bold hover:bg-[#7a0325]">Sign Up</button>
                </div>
            </div>
        </div>
    );
};

const EditCustomerModal = ({ customer, onClose, onSave }: { customer: Customer, onClose: () => void, onSave: (c: Customer) => void }) => {
    const [name, setName] = useState(customer.name);
    const [email, setEmail] = useState(customer.email || '');
    const [dob, setDob] = useState(customer.dob || '');

    const handleSave = () => {
        if (!name || !email) return alert("Full Name and Email are required.");
        onSave({ ...customer, name, email, dob });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg flex items-center gap-2"><Pencil size={20} className="text-[#99042E]" /> Edit Member</h2><button onClick={onClose}><X size={20}/></button></div>
                <div className="space-y-3">
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 mb-2 font-mono">ID: {customer.loyaltyId} (Cannot change)</div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name *</label><input className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-[#99042E] outline-none" value={name} onChange={e => setName(e.target.value)}/></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Email *</label><input className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-[#99042E] outline-none" value={email} onChange={e => setEmail(e.target.value)}/></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">D.O.B</label><input className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="date" value={dob} onChange={e => setDob(e.target.value)}/></div>
                </div>
                <div className="flex gap-2 mt-6"><button onClick={handleSave} className="w-full bg-[#99042E] text-white py-3 rounded-lg font-bold hover:bg-[#7a0325]">Save Changes</button></div>
            </div>
        </div>
    );
};

const CustomerListModal = ({ customers, onClose, onSelectCustomer, onOpenSignUp, onEditCustomer, onDeleteCustomer }: { customers: Customer[], onClose: () => void, onSelectCustomer: (c: Customer) => void, onOpenSignUp: () => void, onEditCustomer: (c: Customer) => void, onDeleteCustomer: (c: Customer) => void }) => {
    const [search, setSearch] = useState('');
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.loyaltyId.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden font-sans animate-fade-in">
                <div className="bg-[#99042E] p-4 flex justify-between items-center text-white shrink-0">
                    <h2 className="font-bold text-lg flex items-center gap-2"><Users size={20} /> Customer Directory</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1"><Search className="absolute left-3 top-3 text-gray-400" size={18} /><input className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#99042E] focus:outline-none" placeholder="Search by Name or Loyalty ID..." value={search} onChange={(e) => setSearch(e.target.value)}/></div>
                    <button onClick={onOpenSignUp} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"><UserPlus size={18} /> Sign Up New</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-white sticky top-0">
                            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">ID</th><th className="px-4 py-3 text-right">Points</th><th className="px-4 py-3 text-right w-40">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.length === 0 ? (<tr><td colSpan={4} className="text-center py-8 text-gray-400">No customers found.</td></tr>) : (filteredCustomers.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50 transition group">
                                    <td className="px-4 py-3 font-bold text-gray-800">{c.name}{c.dob && <span className="block text-[10px] text-gray-400 font-normal">🎂 {c.dob}</span>}</td>
                                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{c.loyaltyId}</td>
                                    <td className="px-4 py-3 text-right font-bold text-[#99042E]">{c.points}</td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                                        <button onClick={() => onSelectCustomer(c)} className="bg-gray-100 hover:bg-blue-600 hover:text-white text-blue-600 p-2 rounded-lg transition" title="Select"><ArrowUpRight size={16} /></button>
                                        <button onClick={() => onEditCustomer(c)} className="bg-gray-100 hover:bg-orange-500 hover:text-white text-orange-500 p-2 rounded-lg transition" title="Edit"><Pencil size={16} /></button>
                                        <button onClick={() => onDeleteCustomer(c)} className="bg-gray-100 hover:bg-red-600 hover:text-white text-red-500 p-2 rounded-lg transition" title="Delete"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AddInventoryModal = ({ onClose, onSave }: { onClose: () => void, onSave: (products: Product[]) => void }) => {
  const generateCode = (cat: string) => {
      const random = Math.floor(100000 + Math.random() * 900000);
      const prefix = cat === 'Necklace' ? 'NK' : cat === 'Bracelet' ? 'BL' : 'RNG';
      return `${prefix}${random}`;
  };

  const [rows, setRows] = useState<Product[]>([
      { id: uuidv4(), category: 'Rings', code: generateCode('Rings'), name: '', price: 0, stock: 10 }
  ]);

  const addRow = () => setRows([...rows, { id: uuidv4(), category: 'Rings', code: generateCode('Rings'), name: '', price: 0, stock: 10 }]);
  const removeRow = (index: number) => { if(rows.length > 1) setRows(rows.filter((_, i) => i !== index)); };
  
  const updateRow = (index: number, field: keyof Product, value: any) => {
      const newRows = [...rows];
      newRows[index] = { ...newRows[index], [field]: value };
      if (field === 'category') newRows[index].code = generateCode(value);
      setRows(newRows);
  };

  const handleSave = () => {
      if (rows.some(r => !r.name || r.price <= 0)) return alert("Please fill in Name and valid Price for all items.");
      onSave(rows);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg w-full max-w-5xl shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg flex items-center gap-2"><PlusCircle size={20} className="text-[#99042E]"/> Bulk Add Inventory</h2><button onClick={onClose}><X size={20} /></button></div>
            <div className="flex-1 overflow-auto border rounded-lg mb-4">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-xs font-bold text-gray-500 uppercase sticky top-0"><tr><th className="p-3">Category</th><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3 w-24">Price</th><th className="p-3 w-20">Qty</th><th className="p-3 w-10"></th></tr></thead>
                    <tbody className="divide-y divide-gray-100">{rows.map((row, i) => (
                        <tr key={row.id}>
                            <td className="p-2"><select className="w-full border p-1 rounded" value={row.category} onChange={e => updateRow(i, 'category', e.target.value)}><option value="Rings">Rings</option><option value="Necklace">Necklace</option><option value="Bracelet">Bracelet</option></select></td>
                            <td className="p-2"><input className="w-full border p-1 rounded font-mono text-xs" value={row.code} onChange={e => updateRow(i, 'code', e.target.value)} /></td>
                            <td className="p-2"><input className="w-full border p-1 rounded" placeholder="Product Name" value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} /></td>
                            <td className="p-2"><input type="number" className="w-full border p-1 rounded" value={row.price || ''} onChange={e => updateRow(i, 'price', parseFloat(e.target.value))} /></td>
                            <td className="p-2"><input type="number" className="w-full border p-1 rounded" value={row.stock} onChange={e => updateRow(i, 'stock', parseInt(e.target.value))} /></td>
                            <td className="p-2 text-center"><button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
            <div className="flex gap-2"><button onClick={addRow} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 font-bold text-sm"><Plus size={16} /> Add Row</button><div className="flex-1"></div><button onClick={onClose} className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancel</button><button onClick={handleSave} className="px-6 py-2 bg-[#99042E] text-white rounded-lg font-bold hover:bg-[#7a0325]">Save All</button></div>
        </div>
    </div>
  );
};

const EditProductModal = ({ product, onClose, onSave, onDelete }: { product: Product, onClose: () => void, onSave: (p: Product) => void, onDelete: (p: Product) => void }) => {
    const [code, setCode] = useState(product.code);
    const [category, setCategory] = useState(product.category || 'Rings');
    const [name, setName] = useState(product.name);
    const [price, setPrice] = useState(product.price);
    const [stock, setStock] = useState(product.stock);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl animate-fade-in">
                <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">Edit Product</h2><button onClick={onClose}><X size={20} /></button></div>
                <div className="space-y-3">
                    <div><label className="text-xs font-bold text-gray-500">Category</label><div className="relative"><select className="w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-[#99042E] outline-none appearance-none text-gray-800" value={category} onChange={(e) => setCategory(e.target.value)}><option value="Rings">Rings</option><option value="Necklace">Necklace</option><option value="Bracelet">Bracelet</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronRight className="rotate-90" size={16} /></div></div></div>
                    <div><label className="text-xs font-bold text-gray-500">Unique ID</label><input className="w-full border border-gray-300 p-2 rounded font-mono text-sm focus:ring-2 focus:ring-[#99042E] outline-none" value={code} onChange={e => setCode(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-gray-500">Name</label><input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="text-xs font-bold text-gray-500">Price</label><input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} /></div>
                        <div className="flex-1"><label className="text-xs font-bold text-gray-500">Stock</label><input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="number" value={stock} onChange={e => setStock(Number(e.target.value))} /></div>
                    </div>
                </div>
                <div className="mt-6 flex gap-2"><button onClick={() => onDelete(product)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-lg font-bold hover:bg-red-100">Delete</button><button onClick={() => onSave({ ...product, category, code, name, price, stock })} className="flex-[2] bg-[#99042E] text-white py-3 rounded-lg font-bold hover:bg-[#7a0325]">Save</button></div>
            </div>
        </div>
    );
};

const RestockModal = ({ product, onClose, onRestock }: { product: Product, onClose: () => void, onRestock: (p: Product, qty: number) => void }) => {
    const [amount, setAmount] = useState('');
    const handleRestock = () => {
        const qty = parseInt(amount);
        if (isNaN(qty) || qty <= 0) return alert("Please enter a valid quantity");
        onRestock(product, qty);
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-xs shadow-xl animate-fade-in">
                <h2 className="font-bold mb-2">Restock Product</h2>
                <p className="text-sm text-gray-500 mb-4">Adding stock for: <b>{product.name}</b></p>
                <input className="w-full border border-gray-300 p-3 rounded mb-4 focus:ring-2 focus:ring-[#99042E] outline-none text-lg" type="number" placeholder="Qty to add" autoFocus value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Cancel</button><button onClick={handleRestock} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Confirm</button></div>
            </div>
        </div>
    );
};

const SalesDashboardModal = ({ onClose, sales, inventory, onReverseSale, onDeleteLog, onSeed }: { onClose: () => void, sales: SalesRecord[], inventory: Product[], onReverseSale: (saleId: string) => void, onDeleteLog: (saleId: string) => void, onSeed: () => void }) => {
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'all'>('today');
    const [viewMode, setViewMode] = useState<'TRANSACTIONS' | 'INSIGHTS'>('TRANSACTIONS');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSales = sales.filter(s => {
        const saleDate = new Date(s.timestamp);
        const now = new Date();
        let matchesTime = true;
        if (activeTab === 'today') { matchesTime = saleDate.toDateString() === now.toDateString(); }
        else if (activeTab === 'week') { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); matchesTime = saleDate >= weekAgo; }
        else if (activeTab === 'month') { matchesTime = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear(); }
        return matchesTime;
    });

    const displaySales = filteredSales.filter(s => s.customerId.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()));

    // ANALYTICS LOGIC
    const productStats: Record<string, { name: string, qty: number, revenue: number }> = {};
    const categoryStats: Record<string, number> = {};

    filteredSales.forEach(sale => {
        const items = sale.productCode.split('|');
        items.forEach(itemStr => {
            const match = itemStr.match(/(.+)\((\d+)\)/);
            if(match) {
                const code = match[1];
                const qty = parseInt(match[2]);
                const product = inventory.find(p => p.code === code);
                const name = product ? product.name : code;
                const price = product ? product.price : 0;
                const category = product?.category || 'Other';

                if(!productStats[code]) productStats[code] = { name, qty: 0, revenue: 0 };
                productStats[code].qty += qty;
                productStats[code].revenue += (price * qty);

                if(!categoryStats[category]) categoryStats[category] = 0;
                categoryStats[category] += (price * qty);
            }
        });
    });

    const sortedProducts = Object.values(productStats).sort((a,b) => b.qty - a.qty).slice(0, 5);
    const sortedCategories = Object.entries(categoryStats).sort((a,b) => b[1] - a[1]);
    const sortedInventory = [...inventory].sort((a,b) => a.stock - b.stock);

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = filteredSales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans animate-fade-in">
                <div className="bg-[#99042E] p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                    <h2 className="font-bold text-base md:text-lg flex items-center gap-2"><BarChart3 size={18} /> Sales Dashboard</h2>
                    <div className="flex gap-2">
                        <div className="hidden md:flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded text-green-300"><Wifi size={12} /> Live DB</div>
                        <button onClick={onSeed} className="hover:bg-white/10 p-2 rounded transition" title="Upload Data"><CloudUpload size={18} /></button>
                        <button onClick={onClose} className="hover:bg-white/10 p-2 rounded transition"><X size={20} /></button>
                    </div>
                </div>
                <div className="p-3 border-b border-gray-200 flex flex-col md:flex-row gap-3 justify-between bg-white shrink-0">
                    <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">{(['today', 'week', 'month', 'all'] as const).map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-xs md:text-sm font-bold capitalize whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#99042E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>{tab}</button>))}</div>
                    <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
                        <button onClick={() => setViewMode('TRANSACTIONS')} className={`px-3 py-1 rounded text-xs font-bold transition ${viewMode === 'TRANSACTIONS' ? 'bg-white text-[#99042E]' : 'text-white/70 hover:text-white'}`}>Transactions</button>
                        <button onClick={() => setViewMode('INSIGHTS')} className={`px-3 py-1 rounded text-xs font-bold transition ${viewMode === 'INSIGHTS' ? 'bg-white text-[#99042E]' : 'text-white/70 hover:text-white'}`}>Insights</button>
                    </div>
                    {viewMode === 'TRANSACTIONS' && <div className="relative w-full md:w-64"><Search className="absolute left-3 top-2.5 text-gray-400" size={16} /><input className="w-full bg-gray-50 text-gray-800 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#99042E] focus:outline-none placeholder-gray-400" placeholder="Search sales..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/></div>}
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-4 p-3 bg-gray-50 border-b border-gray-200 shrink-0">
                    <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center md:text-left"><div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1">Revenue</div><div className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start"><DollarSign size={20} className="text-green-600"/> ${totalRevenue.toLocaleString()}</div></div>
                    <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center md:text-left"><div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1">Orders</div><div className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start"><ShoppingCart size={20} className="text-blue-600" /> {totalOrders}</div></div>
                    <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center md:text-left"><div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1">Avg Order</div><div className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start"><Calendar size={20} className="text-orange-600" /> ${avgOrderValue.toFixed(0)}</div></div>
                </div>
                
                <div className="flex-1 overflow-auto bg-white relative p-4">
                    {viewMode === 'TRANSACTIONS' ? (
                        <table className="w-full text-sm text-left table-fixed min-w-[350px]"> 
                            <thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0 z-10"><tr><th className="px-4 py-3 font-bold w-1/4">Date</th><th className="px-4 py-3 font-bold hidden md:table-cell w-auto">Items</th><th className="px-4 py-3 font-bold hidden md:table-cell w-auto">Cust</th><th className="px-4 py-3 font-bold w-1/4">Total</th><th className="px-4 py-3 font-bold text-right w-1/4">Act</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">{displaySales.length === 0 ? (<tr><td colSpan={5} className="py-10 text-center text-gray-400">No sales found.</td></tr>) : (displaySales.map((sale) => (<tr key={sale.id} className="hover:bg-gray-50 transition"><td className="px-4 py-3"><div className="font-medium text-gray-900 truncate">{sale.date.split(' ')[0]}</div><div className="text-[10px] text-gray-400 truncate">{sale.date.split(' ')[1]}</div></td><td className="px-4 py-3 hidden md:table-cell text-gray-600 truncate" title={sale.productCode}>{sale.productCode}</td><td className="px-4 py-3 hidden md:table-cell text-gray-600 truncate">{sale.customerId}</td><td className="px-4 py-3 font-bold text-gray-800">${sale.total.toLocaleString()}</td><td className="px-4 py-3 text-right flex justify-end gap-1"><button onClick={() => onReverseSale(sale.id)} className="text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold transition" title="Reverse">Rev</button><button onClick={() => onDeleteLog(sale.id)} className="text-gray-400 hover:text-red-600 p-1 rounded transition" title="Delete"><Trash2 size={16} /></button></td></tr>)))}</tbody>
                        </table>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-[#99042E]" /> Top 5 Popular Items</h3>
                                <div className="space-y-2">
                                    {sortedProducts.length === 0 ? <p className="text-gray-400 text-sm">No sales data yet.</p> : sortedProducts.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                            <div className="flex items-center gap-2"><span className="font-bold text-[#99042E] w-6 text-center">#{i+1}</span><span className="text-sm font-medium text-gray-800 truncate max-w-[120px]" title={p.name}>{p.name}</span></div>
                                            <div className="text-right"><div className="font-bold text-sm">{p.qty} Sold</div><div className="text-[10px] text-gray-400">${p.revenue.toLocaleString()}</div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><PieChart size={18} className="text-orange-500" /> Revenue by Category</h3>
                                <div className="space-y-2">
                                    {sortedCategories.length === 0 ? <p className="text-gray-400 text-sm">No data.</p> : sortedCategories.map(([cat, amount], i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-sm"><span className="font-medium text-gray-600">{cat}</span><span className="font-bold text-gray-900">${amount.toLocaleString()}</span></div>
                                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-[#99042E] h-full rounded-full" style={{ width: `${(amount / totalRevenue) * 100}%` }}></div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 md:col-span-2">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Package size={18} className="text-blue-600" /> Live Inventory Levels</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {sortedInventory.length === 0 ? <p className="text-gray-400 text-sm">No inventory.</p> : sortedInventory.map((p) => {
                                        const stockPct = Math.min(100, (p.stock / 20) * 100); 
                                        let barColor = 'bg-green-500';
                                        if (p.stock < 5) barColor = 'bg-red-500'; else if (p.stock < 10) barColor = 'bg-orange-500';
                                        return (
                                            <div key={p.id} className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
                                                <div className="w-24 truncate text-xs font-mono text-gray-500">{p.code}</div>
                                                <div className="flex-1 font-medium text-gray-800 text-sm truncate">{p.name}</div>
                                                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${stockPct}%` }}></div></div>
                                                <div className={`w-8 text-right font-bold text-sm ${p.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{p.stock}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 4. MOCK SERVICE ---
class GeminiService {
  state: AppState;
  constructor(initialState: AppState) { this.state = initialState; }
  syncState(newState: AppState) { this.state = newState; }
  async sendMessage(_history: any[], _prompt: string, receiptDetail?: string): Promise<string> {
    if (receiptDetail) return receiptDetail;
    return "AI processing complete.";
  }
}

// --- 5. MAIN APP COMPONENT ---
const loadState = (): AppState => ({ inventory: [], customers: [], sales: [] });

export default function App() {
  const [appState, setAppState] = useState<AppState>(loadState);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeModal, setActiveModal] = useState<'INVENTORY' | 'SALES' | 'CUSTOMERS' | 'SIGNUP' | null>(null);
  const [mobileView, setMobileView] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const geminiServiceRef = useRef<GeminiService | null>(null);

  useEffect(() => {
    // Inventory
    const unsubInv = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAppState(prev => ({ ...prev, inventory: products }));
        setDbStatus('connected');
    }, (error) => { console.error("DB Error:", error); setDbStatus('error'); });
    
    // Sales
    const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
    const unsubSales = onSnapshot(q, (snapshot) => {
        const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRecord));
        setAppState(prev => ({ ...prev, sales: salesData }));
    }, () => setDbStatus('error'));

    // Customers
    const unsubCust = onSnapshot(collection(db, "customers"), (snapshot) => {
        const custData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setAppState(prev => ({ ...prev, customers: custData }));
    }, () => setDbStatus('error'));

    return () => { unsubInv(); unsubSales(); unsubCust(); };
  }, []);

  useEffect(() => { geminiServiceRef.current = new GeminiService(appState); }, []);
  useEffect(() => { if (geminiServiceRef.current) geminiServiceRef.current.syncState(appState); }, [appState]);
  useEffect(() => { setUsePoints(false); }, [customerId]);

  const handleRegisterCustomer = (data: { name: string, email: string, dob: string }) => {
      const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
      const newLoyaltyId = `GFT${randomSixDigit}`;
      const newId = uuidv4();

      setActiveModal(null);
      setTimeout(() => {
         alert(`🎉 Welcome, ${data.name}!\n\nYour Loyalty ID is: ${newLoyaltyId}`);
      }, 300);
      
      setCustomerId(newLoyaltyId);

      setDoc(doc(db, "customers", newId), {
          id: newId,
          loyaltyId: newLoyaltyId,
          name: data.name,
          email: data.email,
          dob: data.dob,
          points: 0
      }).catch(err => {
          console.error("Failed to save customer to cloud:", err);
          alert("Error: Database permission denied. Check Firebase Rules.");
      });
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
      try {
          const customerRef = doc(db, "customers", updatedCustomer.id);
          await updateDoc(customerRef, {
              name: updatedCustomer.name,
              email: updatedCustomer.email || '',
              dob: updatedCustomer.dob || ''
          });
          setEditingCustomer(null);
      } catch (e: any) { alert("Error updating: " + e.message); }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
      if (!confirm(`Delete ${customer.name}?`)) return;
      try { await deleteDoc(doc(db, "customers", customer.id)); } catch (e: any) { alert("Error deleting: " + e.message); }
  };

  const handleReverseSale = async (saleId: string) => {
      const sale = appState.sales.find(s => s.id === saleId);
      if (!sale) return alert("Sale not found locally.");
      if(!confirm(`Reverse sale?`)) return;
      try {
          const batch = writeBatch(db);
          const items = sale.productCode.split('|');
          for (const itemStr of items) {
              const match = itemStr.match(/(.+)\((\d+)\)/);
              if (match) {
                  const product = appState.inventory.find(p => p.code === match[1]);
                  if (product) batch.update(doc(db, "inventory", product.id), { stock: product.stock + parseInt(match[2]) });
              }
          }
          if (sale.customerId !== 'GUEST') {
              const customer = appState.customers.find(c => c.loyaltyId === sale.customerId);
              if (customer) {
                  const restoredPoints = Math.max(0, customer.points - sale.pointsEarned + sale.pointsRedeemed);
                  batch.update(doc(db, "customers", customer.id), { points: restoredPoints });
              }
          }
          batch.delete(doc(db, "sales", saleId));
          await batch.commit();
      } catch (e: any) { alert("Error reversing: " + e.message); }
  };

  const handleDeleteLog = async (saleId: string) => {
      if(!confirm("Delete this log ONLY?")) return;
      try { 
          const q = query(collection(db, "sales"), where("id", "==", saleId));
          const snapshot = await getDocs(q);
          snapshot.forEach(async (docSnap) => { await deleteDoc(docSnap.ref); });
      } catch (e: any) { alert("Error: " + e.message); }
  };

  const handleSeedData = async () => {
      if (!confirm("Upload Initial Data to Firebase? This will overwrite specific IDs.")) return;
      try {
          const batch = writeBatch(db);
          INITIAL_INVENTORY.forEach(p => { batch.set(doc(db, "inventory", p.id), p); });
          INITIAL_CUSTOMERS.forEach(c => { batch.set(doc(db, "customers", c.id), c); });
          await batch.commit();
          alert("✅ Data Synced! You should see products now.");
      } catch (error: any) { alert("❌ Error: " + error.message); }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
        const existing = prev.find(item => item.code === product.code);
        if (existing) {
            if (existing.cartQuantity >= product.stock) { alert(`Only ${product.stock} in stock.`); return prev; }
            return prev.map(item => item.code === product.code ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
        } else {
            if (product.stock < 1) { alert("Out of stock!"); return prev; }
            return [...prev, { ...product, cartQuantity: 1 }];
        }
    });
  };

  const updateQuantity = (code: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.code === code) {
            const newQty = item.cartQuantity + delta;
            const product = appState.inventory.find(p => p.code === code);
            if (newQty > (product?.stock || 0)) return item; 
            if (newQty < 1) return item; 
            return { ...item, cartQuantity: newQty };
        }
        return item;
    }));
  };

  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountInput(''); setUsePoints(false); setMobileView('PRODUCTS'); };

  const handleAddProduct = async (products: Product[]) => {
      try {
        const batch = writeBatch(db);
        products.forEach(p => {
            const ref = doc(db, "inventory", p.id);
            batch.set(ref, p);
        });
        await batch.commit();
        setActiveModal(null);
        alert(`✅ Added ${products.length} products!`);
      } catch (e: any) { alert("Error adding products: " + e.message); }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
        await updateDoc(doc(db, "inventory", updatedProduct.id), { 
            name: updatedProduct.name, price: updatedProduct.price, stock: updatedProduct.stock, code: updatedProduct.code, category: updatedProduct.category
        });
        setEditingProduct(null);
    } catch(e: any) { alert("Error updating: " + e.message); }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`Delete ${product.name}?`)) {
        try { await deleteDoc(doc(db, "inventory", product.id)); setEditingProduct(null); }
        catch(e: any) { alert("Error deleting: " + e.message); }
    }
  };

  const handleRestockProduct = async (product: Product, qty: number) => {
      try {
          await updateDoc(doc(db, "inventory", product.id), { stock: product.stock + qty });
          setRestockingProduct(null);
      } catch(e: any) { alert("Error restocking: " + e.message); }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  let estimatedDiscount = 0;
  if (discountInput.includes('%')) { const pct = parseFloat(discountInput); if (!isNaN(pct)) estimatedDiscount = subtotal * (pct/100); } 
  else { const flat = parseFloat(discountInput); if (!isNaN(flat)) estimatedDiscount = flat; }
  
  const activeCustomer = appState.customers.find(c => c.loyaltyId === customerId);
  const isValidLoyaltyId = /^GFT\d{6}$/.test(customerId);
  const isNewCustomer = isValidLoyaltyId && !activeCustomer;
  const intermediateTotal = Math.max(0, subtotal - estimatedDiscount);
  const pointsToRedeem = usePoints && activeCustomer ? Math.min(activeCustomer.points, intermediateTotal) : 0;
  const estimatedTotal = Math.max(0, intermediateTotal - pointsToRedeem);

  const handleProcessSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    if (customerId && !activeCustomer && !isNewCustomer && customerId !== '999') {
        alert("Invalid Customer ID format. Please use 'GFT' + 6 digits.");
        setIsProcessing(false);
        return;
    }

    const pointsEarned = Math.floor(estimatedTotal / 100);
    const prevPoints = activeCustomer ? activeCustomer.points : 0;
    const newTotalPoints = prevPoints - pointsToRedeem + pointsEarned;
    const now = new Date();
    const productCodeString = cart.map(c => `${c.code}(${c.cartQuantity})`).join('|');
    const newSaleId = uuidv4();

    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Sale timed out (10s). Check Rules/Connection.")), 10000));

      const salePromise = async () => {
          await setDoc(doc(db, "sales", newSaleId), {
            id: newSaleId, customerId: customerId || 'GUEST', productCode: productCodeString, pointsEarned, pointsRedeemed: pointsToRedeem,
            total: estimatedTotal, date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(), timestamp: now.getTime()
          });

          const batch = writeBatch(db);
          for (const cartItem of cart) {
              const product = appState.inventory.find(p => p.code === cartItem.code);
              if(product) batch.update(doc(db, "inventory", product.id), { stock: Math.max(0, product.stock - cartItem.cartQuantity) });
          }

          if (customerId && customerId !== '999') {
              if (activeCustomer) {
                  batch.update(doc(db, "customers", activeCustomer.id), { points: newTotalPoints });
              } else {
                  const newCustId = uuidv4();
                  batch.set(doc(db, "customers", newCustId), { id: newCustId, loyaltyId: customerId, name: "New Member (Manual)", points: pointsEarned, email: '', dob: '' });
              }
          }
          await batch.commit();
      };

      await Promise.race([salePromise(), timeout]);

      const receiptText = `🎁 **Gift Factory Ja.** 🎁\n~ POS Receipt ~\n\n**Loyalty Points:**\nPrevious: ${prevPoints}\n+ Earned: ${pointsEarned}\n- Used: ${pointsToRedeem}\n----------------\n= **Total: ${isNewCustomer ? pointsEarned : newTotalPoints}**\n\n**Total Paid:** $${estimatedTotal.toLocaleString()}\n\nThank you for choosing Gift Factory Ja!`;
      const response = await geminiServiceRef.current!.sendMessage([], "Record sale", receiptText);
      setLastReceipt(response); setShowReceiptModal(true); clearCart();
    } catch (error: any) {
      alert("Error processing sale: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
      setIsProcessing(true);
      try {
          const response = await geminiServiceRef.current!.sendMessage([], "Generate End of Day Report", `📊 **End of Day Report**\nDate: ${new Date().toLocaleDateString()}\n----------------\nCheck Dashboard for Live Stats`);
          setLastReceipt(response); setShowReceiptModal(true);
      } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const filteredInventory = appState.inventory.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      <header className="bg-[#99042E] text-white h-16 shrink-0 flex items-center justify-between px-3 md:px-6 shadow-md z-20">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center font-bold text-xl shrink-0">G</div><div className="flex flex-col justify-center"><h1 className="font-bold text-lg leading-none">Gift Factory Ja. <span className="text-xs bg-white/20 px-1 rounded ml-1">v13.0 (Lint Free)</span></h1><p className="text-[10px] text-[#F0C053] font-bold tracking-widest uppercase mt-1">POS Terminal</p></div></div>
        <div className="flex items-center gap-2">
           <div className={`hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${dbStatus === 'connected' ? 'bg-green-100 text-green-700' : dbStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
               {dbStatus === 'connected' ? <Wifi size={12} /> : <Activity size={12} />} 
               {dbStatus === 'connected' ? 'Online' : dbStatus === 'error' ? 'Error' : 'Connecting...'}
           </div>
           <button onClick={() => setActiveModal('CUSTOMERS')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition" title="Customer Directory"><Users size={18} /> <span className="hidden md:inline">Customers</span></button>
           <button onClick={() => setActiveModal('SALES')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition" title="Dashboard"><BarChart3 size={18} /> <span className="hidden md:inline">Dashboard</span></button>
           <button onClick={() => setActiveModal('INVENTORY')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition" title="Add Product"><PlusCircle size={18} /> <span className="hidden md:inline">Add</span></button>
           <button onClick={handleGenerateReport} className="flex items-center gap-2 bg-[#F79032] hover:bg-orange-600 text-white p-2 md:px-3 md:py-2 rounded-lg text-sm font-bold shadow-sm transition" title="EOD Report"><FileText size={18} /> <span className="hidden md:inline">Report</span></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 flex flex-col p-4 md:p-6 md:pr-3 min-w-0 bg-gray-100 ${mobileView === 'CART' ? 'hidden md:flex' : 'flex'}`}>
           <div className="mb-4 relative"><Search className="absolute left-3 top-3 text-gray-400" size={20} /><input className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-[#99042E] focus:outline-none" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)}/></div>
           <div className="flex-1 overflow-y-auto">
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-20 md:pb-0">
                {filteredInventory.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center text-gray-400 mt-10">
                        <PackagePlus size={48} className="mb-2 opacity-50" />
                        <p>No products.</p>
                        <p className="text-xs">Database Empty? Try "Cloud Upload" in Dashboard.</p>
                    </div>
                ) : (
                    filteredInventory.map(product => (
                    <button key={product.code} onClick={() => { if (product.stock > 0) addToCart(product); }} className={`relative bg-white p-3 md:p-4 rounded-xl border transition-all flex flex-col justify-between items-start text-left group h-40 shadow-sm hover:shadow-md hover:border-[#99042E] active:scale-95 ${product.stock === 0 ? 'opacity-60 bg-gray-50' : ''}`}>
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                            <div onClick={(e) => { e.stopPropagation(); setRestockingProduct(product); }} className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-green-600 text-gray-500 hover:text-white rounded-lg shadow-sm cursor-pointer" ><PackagePlus size={14} /></div>
                            <div onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }} className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-[#99042E] text-gray-500 hover:text-white rounded-lg shadow-sm cursor-pointer" ><Pencil size={14} /></div>
                        </div>
                        {product.stock > 0 && product.stock < 5 && (<div className="absolute top-2 left-2 flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold z-10"><AlertTriangle size={10} /> Low</div>)}
                        {product.stock === 0 && (<div className="absolute top-2 left-2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-[10px] font-bold z-10">Out</div>)}
                        <div className="w-full mt-6 pr-10"><span className="text-[10px] md:text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{product.code}</span><h3 className="font-bold text-gray-800 mt-1 leading-snug group-hover:text-[#99042E] text-sm md:text-base line-clamp-2 break-words" title={product.name}>{product.name}</h3></div>
                        <div className="flex justify-between items-end w-full mt-auto pt-2"><span className="text-[#F79032] font-bold text-base md:text-lg">${product.price.toLocaleString()}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>Qty: {product.stock}</span></div>
                    </button>
                    ))
                )}
             </div>
           </div>
           {cart.length > 0 && (<div className="md:hidden fixed bottom-4 left-4 right-4 bg-[#99042E] text-white p-4 rounded-xl shadow-xl flex justify-between items-center z-30 animate-slide-up cursor-pointer" onClick={() => setMobileView('CART')}><div className="flex flex-col"><span className="font-bold text-sm">{cart.reduce((a, b) => a + b.cartQuantity, 0)} Items</span><span className="text-xs text-white/80">${subtotal.toLocaleString()}</span></div><div className="flex items-center gap-2 font-bold text-sm">View Cart <ChevronRight size={18} /></div></div>)}
        </div>

        <div className={`w-full md:w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-10 ${mobileView === 'PRODUCTS' ? 'hidden md:flex' : 'flex'}`}>
          <div className="md:hidden p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50"><button onClick={() => setMobileView('PRODUCTS')} className="p-2 -ml-2 hover:bg-white rounded-full text-gray-600"><ArrowLeft size={20} /></button><span className="font-bold text-lg text-gray-800">Current Order</span></div>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
             <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><User size={12} /> Customer</label>{activeCustomer && (<span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">{activeCustomer.points} Points</span>)}</div>
             <div className="flex gap-2"><input className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none ${customerId && !activeCustomer && !isNewCustomer && customerId !== '999' ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-[#99042E]'}`} placeholder="GFT + 6 Digits" value={customerId} onChange={e => setCustomerId(e.target.value.toUpperCase())}/></div>
             {customerId && !activeCustomer && customerId !== '999' && (<div className={`mt-1 text-[10px] font-bold ${isNewCustomer ? 'text-blue-600' : 'text-red-500'}`}>{isNewCustomer ? (<span className="flex items-center gap-1"><UserPlus size={10} /> Valid Format (Will be created)</span>) : ("❌ Invalid Format / Not Found")}</div>)}
             {activeCustomer && (<div className="mt-2 text-sm text-[#99042E] font-medium animate-fade-in">Welcome back, {activeCustomer.name}</div>)}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-50"><ShoppingBag size={48} /><p>Cart is empty</p></div>) : (cart.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center group bg-white md:bg-transparent p-2 md:p-0 rounded-lg md:rounded-none border md:border-none border-gray-100 shadow-sm md:shadow-none">
                    <div className="flex-1"><div className="font-medium text-gray-800">{item.name}</div><div className="text-xs text-gray-400 font-mono">{item.code}</div></div>
                    <div className="flex items-center gap-3 mr-4"><button onClick={() => updateQuantity(item.code, -1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"><Minus size={12} /></button><span className="text-sm font-bold w-4 text-center">{item.cartQuantity}</span><button onClick={() => updateQuantity(item.code, 1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30" disabled={item.cartQuantity >= item.stock}><Plus size={12} /></button></div>
                    <div className="flex items-center gap-3"><span className="font-medium w-16 text-right">${(item.price * item.cartQuantity).toLocaleString()}</span><button onClick={() => removeFromCart(idx)} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 size={16} /></button></div>
                 </div>
               )))}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 pb-8 md:pb-4">
             <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-gray-600"><span>Discount</span><input className="w-20 text-right bg-white border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-[#99042E] outline-none" placeholder="0 or 10%" value={discountInput} onChange={e => setDiscountInput(e.target.value)}/></div>
                {activeCustomer && activeCustomer.points > 0 && (<div className="flex justify-between items-center text-gray-600 pt-1"><div className="flex items-center gap-2"><input type="checkbox" id="usePoints" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#99042E] focus:ring-[#99042E]"/><label htmlFor="usePoints" className="flex items-center gap-1 cursor-pointer select-none"><Coins size={14} className="text-[#F0C053]" /> Pay with Points</label></div><span className={`${usePoints ? 'text-[#99042E] font-bold' : ''}`}>{usePoints ? `-$${pointsToRedeem.toLocaleString()}` : `${activeCustomer.points} Avail`}</span></div>)}
                <div className="flex justify-between font-bold text-lg text-[#99042E] pt-2 border-t border-gray-200"><span>Total</span><span>${estimatedTotal.toLocaleString()}</span></div>
             </div>
             <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={clearCart} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition">Clear</button>
                <button onClick={handleProcessSale} disabled={cart.length === 0 || isProcessing} className="px-4 py-3 rounded-xl bg-[#99042E] text-white font-bold hover:bg-[#7a0325] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center gap-2">{isProcessing ? (<span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<><CreditCard size={18} /> Pay</>)}</button>
             </div>
          </div>
        </div>
      </div>

      {activeModal === 'INVENTORY' && (<AddInventoryModal onClose={() => setActiveModal(null)} onSave={handleAddProduct} />)}
      {activeModal === 'SALES' && (<SalesDashboardModal sales={appState.sales} inventory={appState.inventory} onClose={() => setActiveModal(null)} onReverseSale={handleReverseSale} onDeleteLog={handleDeleteLog} onSeed={handleSeedData} />)}
      {activeModal === 'CUSTOMERS' && (<CustomerListModal customers={appState.customers} onClose={() => setActiveModal(null)} onSelectCustomer={(c) => { setCustomerId(c.loyaltyId); setActiveModal(null); }} onOpenSignUp={() => setActiveModal('SIGNUP')} onEditCustomer={(c) => setEditingCustomer(c)} onDeleteCustomer={handleDeleteCustomer} />)}
      {activeModal === 'SIGNUP' && (<AddCustomerModal onClose={() => setActiveModal('CUSTOMERS')} onSave={handleRegisterCustomer} />)}
      {editingProduct && (<EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={handleUpdateProduct} onDelete={handleDeleteProduct} />)}
      {editingCustomer && (<EditCustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} onSave={handleUpdateCustomer} />)}
      {restockingProduct && (<RestockModal product={restockingProduct} onClose={() => setRestockingProduct(null)} onRestock={handleRestockProduct} />)}
      {showReceiptModal && lastReceipt && (
         <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
               <div className="bg-gray-900 text-white p-4 flex justify-between items-center"><h3 className="font-bold flex items-center gap-2"><CheckCircle size={18} /> Transaction Complete</h3><button onClick={() => setShowReceiptModal(false)}><X size={20} /></button></div>
               <div className="p-0 overflow-y-auto flex-1 bg-gray-50"><ChatInterface messages={[{id: 'res', role: 'model', text: lastReceipt, timestamp: new Date()}]}/></div>
               <div className="p-4 bg-white border-t border-gray-100 flex justify-end"><button onClick={() => setShowReceiptModal(false)} className="bg-[#99042E] text-white px-6 py-2 rounded-lg font-bold">Done</button></div>
            </div>
         </div>
      )}
    </div>
  );
}

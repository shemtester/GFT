import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, PlusCircle, Search, Trash2, CreditCard, BarChart3, FileText, User, CheckCircle, X, ChevronRight, ArrowLeft, Minus, Plus, AlertTriangle, Coins, Pencil, PackagePlus, CloudUpload, UserPlus, DollarSign, ShoppingCart, Calendar, Wifi, Users, ArrowUpRight } from 'lucide-react';
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
  { id: '1', loyaltyId: 'GFT100200', name: 'John Doe', points: 150 },
  { id: '2', loyaltyId: 'GFT887766', name: 'Jane Smith', points: 50 },
];

// --- 3. COMPONENTS ---

const ChatInterface = ({ messages }: { messages: ChatMessage[] }) => {
  return (
    <div className="p-4 space-y-3">
      {messages.map((m, i) => {
        const isModel = m.role === 'model';
        const bubbleClass = isModel 
          ? "bg-gray-100 text-gray-800" 
          : "bg-[#99042E] text-white ml-auto max-w-[80%]";
          
        return (
          <div key={i} className={`p-3 rounded-lg text-sm ${bubbleClass}`}>
            <p className="whitespace-pre-wrap font-mono text-xs md:text-sm">{m.text || (m.parts && m.parts[0].text)}</p>
          </div>
        );
      })}
    </div>
  );
};

// --- NEW COMPONENT: CUSTOMER LIST ---
const CustomerListModal = ({ customers, onClose, onSelectCustomer }: { customers: Customer[], onClose: () => void, onSelectCustomer: (c: Customer) => void }) => {
    const [search, setSearch] = useState('');

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.loyaltyId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden font-sans animate-fade-in">
                {/* Header */}
                <div className="bg-[#99042E] p-4 flex justify-between items-center text-white shrink-0">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Users size={20} /> Customer Directory
                    </h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#99042E] focus:outline-none"
                            placeholder="Search by Name or Loyalty ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-white sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3 text-right">Points</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No customers found.</td></tr>
                            ) : (
                                filteredCustomers.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition group">
                                        <td className="px-4 py-3 font-bold text-gray-800">{c.name}</td>
                                        <td className="px-4 py-3 font-mono text-gray-500 text-xs">{c.loyaltyId}</td>
                                        <td className="px-4 py-3 text-right font-bold text-[#99042E]">{c.points}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => onSelectCustomer(c)}
                                                className="bg-gray-100 hover:bg-[#99042E] hover:text-white text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition"
                                            >
                                                Select <ArrowUpRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-3 bg-gray-50 text-xs text-center text-gray-400 border-t border-gray-100">
                    Showing {filteredCustomers.length} members
                </div>
            </div>
        </div>
    );
};

const AddInventoryModal = ({ onClose, onSave }: { onClose: () => void, onSave: (p: Product) => void }) => {
  const [category, setCategory] = useState('Rings');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');

  useEffect(() => {
    const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
    let prefix = 'RNG';
    if (category === 'Necklace') prefix = 'NK';
    else if (category === 'Bracelet') prefix = 'BL';
    setCode(`${prefix}${randomSixDigit}`);
  }, [category]);

  const handleSave = () => {
    if (!name || !price) return alert("Please fill in Name and Price");
    const newProd: Product = { 
        id: uuidv4(),
        code: code || 'UNK',
        category, 
        name, 
        price: Number(price), 
        stock: Number(stock) 
    };
    onSave(newProd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl animate-fade-in">
        <h2 className="font-bold mb-4 text-lg">Add New Product</h2>
        <div className="space-y-3 mb-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                <div className="relative">
                    <select 
                        className="w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-[#99042E] outline-none appearance-none text-gray-800"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="Rings">Rings</option>
                        <option value="Necklace">Necklace</option>
                        <option value="Bracelet">Bracelet</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <ChevronRight className="rotate-90" size={16} />
                    </div>
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Unique Code</label>
                <input className="w-full border border-gray-300 p-2 rounded bg-gray-50 font-mono text-sm focus:ring-2 focus:ring-[#99042E] outline-none" value={code} onChange={e => setCode(e.target.value)} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
                <input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" placeholder="e.g. Gold Band" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Price</label>
                    <input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Qty</label>
                    <input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="number" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
            </div>
        </div>
        <button onClick={handleSave} className="bg-[#99042E] text-white w-full py-3 rounded-lg font-bold mb-2 hover:bg-[#7a0325]">Save Product</button>
        <button onClick={onClose} className="w-full py-3 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">Edit Product</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Category</label>
                        <div className="relative">
                            <select 
                                className="w-full border border-gray-300 p-2 rounded bg-white focus:ring-2 focus:ring-[#99042E] outline-none appearance-none text-gray-800"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="Rings">Rings</option>
                                <option value="Necklace">Necklace</option>
                                <option value="Bracelet">Bracelet</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronRight className="rotate-90" size={16} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Unique ID</label>
                        <input className="w-full border border-gray-300 p-2 rounded font-mono text-sm focus:ring-2 focus:ring-[#99042E] outline-none" value={code} onChange={e => setCode(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Name</label>
                        <input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500">Price</label>
                            <input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500">Stock</label>
                            <input className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#99042E] outline-none" type="number" value={stock} onChange={e => setStock(Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <button onClick={() => onDelete(product)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-lg font-bold hover:bg-red-100">Delete</button>
                    <button onClick={() => onSave({ ...product, category, code, name, price, stock })} className="flex-[2] bg-[#99042E] text-white py-3 rounded-lg font-bold hover:bg-[#7a0325]">Save</button>
                </div>
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
                
                <input 
                    className="w-full border border-gray-300 p-3 rounded mb-4 focus:ring-2 focus:ring-[#99042E] outline-none text-lg" 
                    type="number" 
                    placeholder="Qty to add" 
                    autoFocus
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                />
                
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                    <button onClick={handleRestock} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const SalesDashboardModal = ({ onClose, sales, onReverseSale, onDeleteLog, onSeed }: { onClose: () => void, sales: SalesRecord[], onReverseSale: (saleId: string) => void, onDeleteLog: (saleId: string) => void, onSeed: () => void }) => {
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'all'>('today');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSales = sales.filter(s => {
        const saleDate = new Date(s.timestamp);
        const now = new Date();
        let matchesTime = true;

        if (activeTab === 'today') {
            matchesTime = saleDate.toDateString() === now.toDateString();
        } else if (activeTab === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            matchesTime = saleDate >= weekAgo;
        } else if (activeTab === 'month') {
            matchesTime = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        }

        const matchesSearch = s.customerId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.productCode.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesTime && matchesSearch;
    });

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = filteredSales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans animate-fade-in">
                
                {/* --- HEADER --- */}
                <div className="bg-[#99042E] p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                    <h2 className="font-bold text-base md:text-lg flex items-center gap-2">
                        <BarChart3 size={18} /> Sales Dashboard
                    </h2>
                    <div className="flex gap-2">
                        <div className="hidden md:flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded text-green-300">
                            <Wifi size={12} /> Live DB
                        </div>
                        <button onClick={onSeed} className="hover:bg-white/10 p-2 rounded transition" title="Upload Data">
                            <CloudUpload size={18} />
                        </button>
                        <button onClick={onClose} className="hover:bg-white/10 p-2 rounded transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* --- CONTROLS --- */}
                <div className="p-3 border-b border-gray-200 flex flex-col md:flex-row gap-3 justify-between bg-white shrink-0">
                    <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                        {(['today', 'week', 'month', 'all'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-xs md:text-sm font-bold capitalize whitespace-nowrap transition-all ${
                                    activeTab === tab 
                                    ? 'bg-[#99042E] text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            className="w-full bg-gray-50 text-gray-800 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#99042E] focus:outline-none placeholder-gray-400"
                            placeholder="Search sales..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- METRICS --- */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 p-3 bg-gray-50 border-b border-gray-200 shrink-0">
                    <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center md:text-left">
                        <div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1">Revenue</div>
                        <div className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start">
                            <DollarSign size={20} className="text-green-600"/> ${totalRevenue.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center md:text-left">
                        <div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1">Orders</div>
                        <div className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start">
                            <ShoppingCart size={20} className="text-blue-600" /> {totalOrders}
                        </div>
                    </div>
                    <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center md:text-left">
                        <div className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1">Avg Order</div>
                        <div className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start">
                            <Calendar size={20} className="text-orange-600" /> ${avgOrderValue.toFixed(0)}
                        </div>
                    </div>
                </div>

                {/* --- TABLE (SCROLLABLE) --- */}
                <div className="flex-1 overflow-auto bg-white relative">
                    <table className="w-full text-sm text-left table-fixed min-w-[350px]"> 
                        <thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 font-bold w-1/4">Date</th>
                                <th className="px-4 py-3 font-bold hidden md:table-cell w-auto">Items</th>
                                <th className="px-4 py-3 font-bold hidden md:table-cell w-auto">Cust</th>
                                <th className="px-4 py-3 font-bold w-1/4">Total</th>
                                <th className="px-4 py-3 font-bold text-right w-1/4">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-gray-400">No sales found.</td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 truncate">{sale.date.split(' ')[0]}</div>
                                            <div className="text-[10px] text-gray-400 truncate">{sale.date.split(' ')[1]}</div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 truncate" title={sale.productCode}>
                                            {sale.productCode}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 truncate">
                                            {sale.customerId}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-800">
                                            ${sale.total.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                                            <button 
                                                onClick={() => onReverseSale(sale.id)} 
                                                className="text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold transition"
                                                title="Reverse Sale (Restores Stock)"
                                            >
                                                Rev
                                            </button>
                                            <button 
                                                onClick={() => onDeleteLog(sale.id)} 
                                                className="text-gray-400 hover:text-red-600 p-1 rounded transition"
                                                title="Delete Log Only (Keep Stock)"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- 4. MOCK SERVICE ---
class GeminiService {
  state: AppState;
  constructor(initialState: AppState) {
    this.state = initialState;
  }
  syncState(newState: AppState) { this.state = newState; }
  
  async sendMessage(_history: any[], _prompt: string, receiptDetail?: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800)); 
    
    if (receiptDetail) {
        return receiptDetail;
    }
    return "AI processing complete.";
  }
}

// --- 5. MAIN APP COMPONENT ---

const loadState = (): AppState => {
  return { inventory: [], customers: [], sales: [] };
};

export default function App() {
  const [appState, setAppState] = useState<AppState>(loadState);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeModal, setActiveModal] = useState<'INVENTORY' | 'SALES' | 'CUSTOMERS' | null>(null); // Added CUSTOMERS
  const [mobileView, setMobileView] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');

  const geminiServiceRef = useRef<GeminiService | null>(null);

  // --- FIREBASE SYNC (LIVE UPDATES) ---
  useEffect(() => {
    // Inventory Listener
    const unsubInv = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const products: Product[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Product));
        setAppState(prev => ({ ...prev, inventory: products }));
    });

    // Sales Listener
    const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
    const unsubSales = onSnapshot(q, (snapshot) => {
        const salesData: SalesRecord[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as SalesRecord));
        setAppState(prev => ({ ...prev, sales: salesData }));
    });

    // Customers Listener (LIVE FROM GOOGLE SHEET SYNC)
    const unsubCust = onSnapshot(collection(db, "customers"), (snapshot) => {
        const custData: Customer[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Customer));
        setAppState(prev => ({ ...prev, customers: custData }));
    });

    return () => {
        unsubInv();
        unsubSales();
        unsubCust();
    };
  }, []);

  useEffect(() => {
    geminiServiceRef.current = new GeminiService(appState);
  }, []);

  useEffect(() => {
    if (geminiServiceRef.current) geminiServiceRef.current.syncState(appState);
  }, [appState]);

  useEffect(() => {
     setUsePoints(false);
  }, [customerId]);

  // --- SMART REVERSE ---
  const handleReverseSale = async (saleId: string) => {
      const sale = appState.sales.find(s => s.id === saleId);
      if (!sale) return alert("Sale not found locally.");

      if(!confirm(`Reverse sale ${sale.id.slice(0,6)}?\nRestores Inventory & Deducts Points.`)) return;

      try {
          const batch = writeBatch(db);

          const items = sale.productCode.split('|');
          for (const itemStr of items) {
              const match = itemStr.match(/(.+)\((\d+)\)/);
              if (match) {
                  const itemCode = match[1];
                  const itemQty = parseInt(match[2]);
                  const product = appState.inventory.find(p => p.code === itemCode);
                  if (product && product.id) {
                      const prodRef = doc(db, "inventory", product.id);
                      batch.update(prodRef, { stock: product.stock + itemQty });
                  }
              }
          }

          if (sale.customerId !== 'GUEST') {
              const customer = appState.customers.find(c => c.loyaltyId === sale.customerId);
              if (customer && customer.id) {
                  const custRef = doc(db, "customers", customer.id);
                  const restoredPoints = customer.points - sale.pointsEarned + sale.pointsRedeemed;
                  batch.update(custRef, { points: Math.max(0, restoredPoints) });
              }
          }

          const saleRef = doc(db, "sales", saleId);
          batch.delete(saleRef);

          await batch.commit();

      } catch (e: any) {
          alert("Error reversing sale: " + e.message);
      }
  };

  // --- DELETE LOG ONLY (UNIVERSAL FIX) ---
  const handleDeleteLog = async (saleId: string) => {
      if(!confirm("Delete this log ONLY? (Stock & Points will NOT be changed)")) return;
      try {
          const q = query(collection(db, "sales"), where("id", "==", saleId));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
              await deleteDoc(doc(db, "sales", saleId));
          } else {
              snapshot.forEach(async (docSnap) => {
                  await deleteDoc(docSnap.ref);
              });
          }
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  const handleSeedData = async () => {
      if (!confirm("Upload Initial Data to Firebase?")) return;
      try {
          const batch = writeBatch(db);
          INITIAL_INVENTORY.forEach(p => {
              const ref = doc(db, "inventory", p.id); 
              batch.set(ref, p);
          });
          INITIAL_CUSTOMERS.forEach(c => {
              const ref = doc(db, "customers", c.id);
              batch.set(ref, c);
          });
          await batch.commit();
          alert("✅ Data Synced!");
      } catch (error: any) {
          alert("❌ Error: " + error.message);
      }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
        const existing = prev.find(item => item.code === product.code);
        if (existing) {
            if (existing.cartQuantity >= product.stock) {
                alert(`Only ${product.stock} in stock.`);
                return prev;
            }
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
            const maxStock = product ? product.stock : 0;
            if (newQty > maxStock) return item; 
            if (newQty < 1) return item; 
            return { ...item, cartQuantity: newQty };
        }
        return item;
    }));
  };

  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));

  const clearCart = () => {
    setCart([]);
    setCustomerId('');
    setDiscountInput('');
    setUsePoints(false);
    setMobileView('PRODUCTS');
  };

  const handleAddProduct = async (product: Product) => {
      try {
        await setDoc(doc(db, "inventory", product.id), product);
        setActiveModal(null);
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (!updatedProduct.id) return;
    
    const q = query(collection(db, "inventory"), where("id", "==", updatedProduct.id));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        const ref = snapshot.docs[0].ref;
        await updateDoc(ref, { 
            name: updatedProduct.name,
            price: updatedProduct.price,
            stock: updatedProduct.stock,
            code: updatedProduct.code,
            category: updatedProduct.category
        });
    }
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!product.id) return;
    if (confirm(`Delete ${product.name}?`)) {
        const q = query(collection(db, "inventory"), where("id", "==", product.id));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => {
            await deleteDoc(docSnap.ref);
        });
        setEditingProduct(null);
    }
  };

  const handleRestockProduct = async (product: Product, qty: number) => {
      if (!product.id) return;
      
      const q = query(collection(db, "inventory"), where("id", "==", product.id));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
          await updateDoc(docSnap.ref, { stock: product.stock + qty });
      });
      setRestockingProduct(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  let estimatedDiscount = 0;
  if (discountInput.includes('%')) {
     const pct = parseFloat(discountInput);
     if (!isNaN(pct)) estimatedDiscount = subtotal * (pct/100);
  } else {
     const flat = parseFloat(discountInput);
     if (!isNaN(flat)) estimatedDiscount = flat;
  }
  
  const activeCustomer = appState.customers.find(c => c.loyaltyId === customerId);
  const isValidLoyaltyId = /^GFT\d{6}$/.test(customerId);
  const isNewCustomer = isValidLoyaltyId && !activeCustomer;

  const intermediateTotal = Math.max(0, subtotal - estimatedDiscount);
  const pointsToRedeem = usePoints && activeCustomer ? Math.min(activeCustomer.points, intermediateTotal) : 0;
  const estimatedTotal = Math.max(0, intermediateTotal - pointsToRedeem);

  // --- FIXED: PROCESS SALE LOGIC ---
  const handleProcessSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const pointsEarned = Math.floor(estimatedTotal / 100);
    const prevPoints = activeCustomer ? activeCustomer.points : 0;
    const newTotalPoints = prevPoints - pointsToRedeem + pointsEarned;

    const now = new Date();
    const productCodeString = cart.map(c => `${c.code}(${c.cartQuantity})`).join('|');

    const newSaleId = uuidv4();
    const newSale: SalesRecord = {
        id: newSaleId,
        customerId: customerId || 'GUEST',
        productCode: productCodeString,
        pointsEarned: pointsEarned,
        pointsRedeemed: pointsToRedeem,
        total: estimatedTotal,
        date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(),
        timestamp: now.getTime()
    };

    try {
      await setDoc(doc(db, "sales", newSaleId), newSale);
      const batch = writeBatch(db);
      
      // Update Inventory
      for (const cartItem of cart) {
          const q = query(collection(db, "inventory"), where("code", "==", cartItem.code));
          const snapshot = await getDocs(q);
          snapshot.forEach((docSnap) => {
              const currentStock = docSnap.data().stock;
              const newStock = Math.max(0, currentStock - cartItem.cartQuantity);
              batch.update(docSnap.ref, { stock: newStock });
          });
      }

      // Update Customer (STRICT CHECK)
      if (customerId !== '999' && customerId !== '') {
          if (activeCustomer) {
              const q = query(collection(db, "customers"), where("loyaltyId", "==", customerId));
              const snapshot = await getDocs(q);
              snapshot.forEach((docSnap) => {
                  batch.update(docSnap.ref, { points: newTotalPoints });
              });
          } else {
              // MANUALLY CREATE NEW CUSTOMER (OVERRIDE)
              const newCustId = uuidv4();
              const newCustRef = doc(db, "customers", newCustId);
              batch.set(newCustRef, {
                  id: newCustId,
                  loyaltyId: customerId,
                  name: "New Member (Manual)",
                  points: pointsEarned 
              });
          }
      }

      await batch.commit();

      const receiptText = `🎁 **Gift Factory Ja.** 🎁
      ~ POS Receipt ~
      
      **Loyalty Points:**
      Previous: ${prevPoints}
      + Earned: ${pointsEarned}
      - Used: ${pointsToRedeem}
      ----------------
      = **Total: ${isNewCustomer ? pointsEarned : newTotalPoints}**
      
      **Total Paid:** $${estimatedTotal.toLocaleString()}
      
      Thank you for choosing Gift Factory Ja!
      We appreciate your business.`;

      const response = await geminiServiceRef.current!.sendMessage([], "Record sale", receiptText);
      setLastReceipt(response);
      setShowReceiptModal(true);
      clearCart();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
      setIsProcessing(true);
      try {
          const response = await geminiServiceRef.current!.sendMessage([], "Generate End of Day Report", `📊 **End of Day Report**\nDate: ${new Date().toLocaleDateString()}\n----------------\nCheck Dashboard for Live Stats`);
          setLastReceipt(response);
          setShowReceiptModal(true);
      } catch(e) { console.error(e); }
      finally { setIsProcessing(false); }
  };

  const filteredInventory = appState.inventory.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-[#99042E] text-white h-16 shrink-0 flex items-center justify-between px-3 md:px-6 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center font-bold text-xl shrink-0">G</div>
          <div className="flex flex-col justify-center">
            <h1 className="font-bold text-lg leading-none">Gift Factory Ja. <span className="text-xs bg-white/20 px-1 rounded ml-1">v6.0 (Stable)</span></h1>
            <p className="text-[10px] text-[#F0C053] font-bold tracking-widest uppercase mt-1">POS Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded text-green-300">
              <Wifi size={12} /> Live DB
           </div>
           
           {/* NEW CUSTOMER LIST BUTTON */}
           <button onClick={() => setActiveModal('CUSTOMERS')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition" title="Customer Directory">
              <Users size={18} /> <span className="hidden md:inline">Customers</span>
           </button>

           <button onClick={() => setActiveModal('SALES')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition" title="Dashboard">
              <BarChart3 size={18} /> <span className="hidden md:inline">Dashboard</span>
           </button>
           <button onClick={() => setActiveModal('INVENTORY')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition" title="Add Product">
              <PlusCircle size={18} /> <span className="hidden md:inline">Add</span>
           </button>
           <button onClick={handleGenerateReport} className="flex items-center gap-2 bg-[#F79032] hover:bg-orange-600 text-white p-2 md:px-3 md:py-2 rounded-lg text-sm font-bold shadow-sm transition" title="EOD Report">
              <FileText size={18} /> <span className="hidden md:inline">Report</span>
           </button>
        </div>
      </header>

      {/* --- Main POS Area --- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Product Grid */}
        <div className={`flex-1 flex flex-col p-4 md:p-6 md:pr-3 min-w-0 bg-gray-100 ${mobileView === 'CART' ? 'hidden md:flex' : 'flex'}`}>
           <div className="mb-4 relative">
             <Search className="absolute left-3 top-3 text-gray-400" size={20} />
             <input 
                className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-[#99042E] focus:outline-none"
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
             />
           </div>
           
           <div className="flex-1 overflow-y-auto">
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-20 md:pb-0">
                {filteredInventory.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center text-gray-400 mt-10">
                        <PackagePlus size={48} className="mb-2 opacity-50" />
                        <p>No products.</p>
                        <p className="text-xs">Tap + to add.</p>
                    </div>
                ) : (
                    filteredInventory.map(product => (
                    <button 
                        key={product.code}
                        onClick={() => {
                            if (product.stock > 0) addToCart(product);
                        }}
                        className={`relative bg-white p-3 md:p-4 rounded-xl border transition-all flex flex-col justify-between items-start text-left group h-40 shadow-sm hover:shadow-md hover:border-[#99042E] active:scale-95 ${product.stock === 0 ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                            <div 
                                onClick={(e) => { e.stopPropagation(); setRestockingProduct(product); }}
                                className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-green-600 text-gray-500 hover:text-white rounded-lg shadow-sm cursor-pointer" 
                            >
                                <PackagePlus size={14} />
                            </div>
                            <div 
                                onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }}
                                className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-[#99042E] text-gray-500 hover:text-white rounded-lg shadow-sm cursor-pointer" 
                            >
                                <Pencil size={14} />
                            </div>
                        </div>

                        {product.stock > 0 && product.stock < 5 && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold z-10">
                            <AlertTriangle size={10} /> Low
                        </div>
                        )}
                        {product.stock === 0 && (
                            <div className="absolute top-2 left-2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-[10px] font-bold z-10">
                            Out
                            </div>
                        )}

                        <div className="w-full mt-6 pr-10">
                            <span className="text-[10px] md:text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{product.code}</span>
                            <h3 className="font-bold text-gray-800 mt-1 leading-snug group-hover:text-[#99042E] text-sm md:text-base line-clamp-2 break-words" title={product.name}>
                                {product.name}
                            </h3>
                        </div>
                        
                        <div className="flex justify-between items-end w-full mt-auto pt-2">
                            <span className="text-[#F79032] font-bold text-base md:text-lg">${product.price.toLocaleString()}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                Qty: {product.stock}
                            </span>
                        </div>
                    </button>
                    ))
                )}
             </div>
           </div>

           {cart.length > 0 && (
             <div className="md:hidden fixed bottom-4 left-4 right-4 bg-[#99042E] text-white p-4 rounded-xl shadow-xl flex justify-between items-center z-30 animate-slide-up cursor-pointer" onClick={() => setMobileView('CART')}>
                <div className="flex flex-col">
                   <span className="font-bold text-sm">{cart.reduce((a, b) => a + b.cartQuantity, 0)} Items</span>
                   <span className="text-xs text-white/80">${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm">
                   View Cart <ChevronRight size={18} />
                </div>
             </div>
           )}
        </div>

        {/* Right: Current Sale / Cart */}
        <div className={`w-full md:w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-10 ${mobileView === 'PRODUCTS' ? 'hidden md:flex' : 'flex'}`}>
          <div className="md:hidden p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
             <button onClick={() => setMobileView('PRODUCTS')} className="p-2 -ml-2 hover:bg-white rounded-full text-gray-600">
                <ArrowLeft size={20} />
             </button>
             <span className="font-bold text-lg text-gray-800">Current Order</span>
          </div>

          <div className="p-4 border-b border-gray-100 bg-gray-50">
             <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                   <User size={12} /> Customer
                </label>
                {activeCustomer && (
                   <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">
                     {activeCustomer.points} Points
                   </span>
                )}
             </div>
             <div className="flex gap-2">
               <input 
                 className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none ${customerId && !activeCustomer && !isNewCustomer && customerId !== '999' ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-[#99042E]'}`}
                 placeholder="GFT + 6 Digits"
                 value={customerId}
                 onChange={e => setCustomerId(e.target.value.toUpperCase())}
               />
             </div>
             
             {/* FEEDBACK MESSAGES */}
             {customerId && !activeCustomer && customerId !== '999' && (
                <div className={`mt-1 text-[10px] font-bold ${isNewCustomer ? 'text-blue-600' : 'text-red-500'}`}>
                    {isNewCustomer ? (
                        <span className="flex items-center gap-1"><UserPlus size={10} /> Valid Format (Will be created)</span>
                    ) : (
                        "❌ Invalid Format / Not Found"
                    )}
                </div>
             )}
             
             {activeCustomer && (
                <div className="mt-2 text-sm text-[#99042E] font-medium animate-fade-in">
                   Welcome back, {activeCustomer.name}
                </div>
             )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-50">
                  <ShoppingBag size={48} />
                  <p>Cart is empty</p>
               </div>
             ) : (
               cart.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center group bg-white md:bg-transparent p-2 md:p-0 rounded-lg md:rounded-none border md:border-none border-gray-100 shadow-sm md:shadow-none">
                    <div className="flex-1">
                       <div className="font-medium text-gray-800">{item.name}</div>
                       <div className="text-xs text-gray-400 font-mono">{item.code}</div>
                    </div>
                    
                    <div className="flex items-center gap-3 mr-4">
                        <button onClick={() => updateQuantity(item.code, -1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">
                            <Minus size={12} />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{item.cartQuantity}</span>
                        <button onClick={() => updateQuantity(item.code, 1)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30" disabled={item.cartQuantity >= item.stock}>
                            <Plus size={12} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                       <span className="font-medium w-16 text-right">${(item.price * item.cartQuantity).toLocaleString()}</span>
                       <button onClick={() => removeFromCart(idx)} className="text-gray-300 hover:text-red-500 transition p-1">
                         <Trash2 size={16} />
                       </button>
                    </div>
                 </div>
               ))
             )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 pb-8 md:pb-4">
             <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                   <span>Subtotal</span>
                   <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                   <span>Discount</span>
                   <input 
                     className="w-20 text-right bg-white border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-[#99042E] outline-none"
                     placeholder="0 or 10%"
                     value={discountInput}
                     onChange={e => setDiscountInput(e.target.value)}
                   />
                </div>
                
                {activeCustomer && activeCustomer.points > 0 && (
                  <div className="flex justify-between items-center text-gray-600 pt-1">
                     <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="usePoints"
                            checked={usePoints}
                            onChange={(e) => setUsePoints(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[#99042E] focus:ring-[#99042E]"
                        />
                        <label htmlFor="usePoints" className="flex items-center gap-1 cursor-pointer select-none">
                            <Coins size={14} className="text-[#F0C053]" />
                            Pay with Points
                        </label>
                     </div>
                     <span className={`${usePoints ? 'text-[#99042E] font-bold' : ''}`}>
                         {usePoints ? `-$${pointsToRedeem.toLocaleString()}` : `${activeCustomer.points} Avail`}
                     </span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg text-[#99042E] pt-2 border-t border-gray-200">
                   <span>Total</span>
                   <span>${estimatedTotal.toLocaleString()}</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={clearCart} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition">
                   Clear
                </button>
                <button 
                   onClick={handleProcessSale}
                   // STRICT DISABLED: Pay is disabled if customer ID typed but not found
                   disabled={cart.length === 0 || isProcessing || (customerId.length > 0 && !isValidLoyaltyId && customerId !== '999' && !isNewCustomer)}
                   className="px-4 py-3 rounded-xl bg-[#99042E] text-white font-bold hover:bg-[#7a0325] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center gap-2"
                >
                   {isProcessing ? (
                     <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <>
                       <CreditCard size={18} /> Pay
                     </>
                   )}
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      {activeModal === 'INVENTORY' && (
        <AddInventoryModal onClose={() => setActiveModal(null)} onSave={handleAddProduct} />
      )}
      
      {activeModal === 'SALES' && (
         <SalesDashboardModal 
            sales={appState.sales} 
            onClose={() => setActiveModal(null)} 
            onReverseSale={handleReverseSale}
            onDeleteLog={handleDeleteLog}
            onSeed={handleSeedData}
         />
      )}

      {activeModal === 'CUSTOMERS' && (
          <CustomerListModal 
              customers={appState.customers} 
              onClose={() => setActiveModal(null)}
              onSelectCustomer={(c) => {
                  setCustomerId(c.loyaltyId);
                  setActiveModal(null);
              }}
          />
      )}

      {editingProduct && (
        <EditProductModal 
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={handleUpdateProduct}
            onDelete={handleDeleteProduct}
        />
      )}

      {restockingProduct && (
          <RestockModal 
              product={restockingProduct}
              onClose={() => setRestockingProduct(null)}
              onRestock={handleRestockProduct}
          />
      )}

      {showReceiptModal && lastReceipt && (
         <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
               <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2"><CheckCircle size={18} /> Transaction Complete</h3>
                  <button onClick={() => setShowReceiptModal(false)}><X size={20} /></button>
               </div>
               <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
                  <ChatInterface 
                     messages={[{id: 'res', role: 'model', text: lastReceipt, timestamp: new Date()}]}
                  />
               </div>
               <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                  <button onClick={() => setShowReceiptModal(false)} className="bg-[#99042E] text-white px-6 py-2 rounded-lg font-bold">
                     Done
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}

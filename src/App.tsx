import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, PlusCircle, Search, Trash2, CreditCard, RotateCcw, FileText, User, CheckCircle, X, ChevronRight, ArrowLeft, Minus, Plus, AlertTriangle, Coins, Pencil, RefreshCw, DollarSign, PackagePlus, CloudUpload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
// Firebase Imports
import { db } from './firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, writeBatch, query, orderBy } from 'firebase/firestore';

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
  id?: string; // Firebase Document ID
  code: string;
  name: string;
  price: number;
  stock: number;
}
export interface Customer {
  id: string;
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

// --- 2. MOCK DATA (For Initial Seed) ---
const INITIAL_INVENTORY: Product[] = [
  { code: 'GFT001', name: 'Custom Mug', price: 1500, stock: 20 },
  { code: 'GFT002', name: 'Keyring', price: 500, stock: 50 },
  { code: 'GFT003', name: 'T-Shirt (L)', price: 2500, stock: 10 },
  { code: 'GFT004', name: 'Gift Box', price: 800, stock: 5 },
  { code: 'GFT005', name: 'Engraved Pen', price: 1200, stock: 0 },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'CUST001', name: 'John Doe', points: 150 },
  { id: 'CUST002', name: 'Jane Smith', points: 50 },
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
            <p className="whitespace-pre-wrap">{m.text || (m.parts && m.parts[0].text)}</p>
          </div>
        );
      })}
    </div>
  );
};

const AddInventoryModal = ({ onClose, onSave }: { onClose: () => void, onSave: (p: Product) => void }) => {
  const [code, setCode] = useState('NEW' + Math.floor(Math.random() * 1000));
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');

  const handleSave = () => {
    if (!name || !price) return alert("Please fill in Name and Price");
    const newProd: Product = { 
        code: code || 'UNK', 
        name, 
        price: Number(price), 
        stock: Number(stock) 
    };
    onSave(newProd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-80 shadow-xl">
        <h2 className="font-bold mb-4 text-lg">Add New Product</h2>
        <div className="space-y-3 mb-4">
            <input className="w-full border p-2 rounded" placeholder="Unique ID (e.g. GFT001)" value={code} onChange={e => setCode(e.target.value)} />
            <input className="w-full border p-2 rounded" placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full border p-2 rounded" type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
            <input className="w-full border p-2 rounded" type="number" placeholder="Stock Qty" value={stock} onChange={e => setStock(e.target.value)} />
        </div>
        <button onClick={handleSave} className="bg-[#99042E] text-white w-full py-2 rounded-lg font-bold mb-2 hover:bg-[#7a0325]">Save Product</button>
        <button onClick={onClose} className="w-full py-2 text-gray-500 hover:text-gray-800">Cancel</button>
        </div>
    </div>
  );
};

const EditProductModal = ({ product, onClose, onSave, onDelete }: { product: Product, onClose: () => void, onSave: (p: Product) => void, onDelete: (p: Product) => void }) => {
    const [code, setCode] = useState(product.code);
    const [name, setName] = useState(product.name);
    const [price, setPrice] = useState(product.price);
    const [stock, setStock] = useState(product.stock);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-80 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">Edit Product</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Unique ID (Code)</label>
                        <input className="w-full border p-2 rounded font-mono text-sm" value={code} onChange={e => setCode(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Name</label>
                        <input className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Price</label>
                        <input className="w-full border p-2 rounded" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Stock</label>
                        <input className="w-full border p-2 rounded" type="number" value={stock} onChange={e => setStock(Number(e.target.value))} />
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <button onClick={() => onDelete(product)} className="flex-1 bg-red-100 text-red-600 py-2 rounded font-bold hover:bg-red-200">Delete</button>
                    <button onClick={() => onSave({ ...product, code, name, price, stock })} className="flex-[2] bg-[#99042E] text-white py-2 rounded font-bold hover:bg-[#7a0325]">Save</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-72 shadow-xl">
                <h2 className="font-bold mb-2">Restock Product</h2>
                <p className="text-sm text-gray-500 mb-4">Adding stock for: <b>{product.name}</b></p>
                
                <input 
                    className="w-full border p-2 rounded mb-4 focus:ring-2 focus:ring-[#99042E] outline-none" 
                    type="number" 
                    placeholder="Quantity to add (e.g. 50)" 
                    autoFocus
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                />
                
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={handleRestock} className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const SalesDashboardModal = ({ onClose, sales, onReverseSale, onRefresh, onSeed }: { onClose: () => void, sales: SalesRecord[], onReverseSale: (id: string) => void, onRefresh: () => void, onSeed: () => void }) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(new Date().setDate(now.getDate() - 7)).getTime();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const todaySales = sales.filter(s => s.timestamp >= todayStart).reduce((acc, curr) => acc + curr.total, 0);
    const weekSales = sales.filter(s => s.timestamp >= weekStart).reduce((acc, curr) => acc + curr.total, 0);
    const monthSales = sales.filter(s => s.timestamp >= monthStart).reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl h-[600px] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-lg flex items-center gap-2"><RotateCcw size={20} /> Sales Overview</h2>
                    <div className="flex gap-2">
                        <button onClick={onSeed} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200">
                            <CloudUpload size={14} /> Sync Initial Data
                        </button>
                        <button onClick={onRefresh} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100" title="Refresh Data">
                            <RefreshCw size={16} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded"><X size={20} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="text-gray-500 text-xs font-bold uppercase mb-1">Today's Sales</div>
                        <div className="text-2xl font-bold text-[#99042E]">${todaySales.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="text-gray-500 text-xs font-bold uppercase mb-1">This Week</div>
                        <div className="text-2xl font-bold text-gray-800">${weekSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="text-gray-500 text-xs font-bold uppercase mb-1">This Month</div>
                        <div className="text-2xl font-bold text-gray-800">${monthSales.toLocaleString()}</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                    <h3 className="font-bold text-gray-700 mb-3 ml-1">Transaction History</h3>
                    <div className="space-y-2">
                        {sales.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10">No sales recorded yet.</div>
                        ) : (
                            sales.map(s => (
                                <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-full text-green-600">
                                            <DollarSign size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">${s.total.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{s.date} • ID: {s.id.slice(0,6)}</div>
                                            <div className="text-[10px] text-gray-400 font-mono mt-1">{s.productCode}</div>
                                        </div>
                                    </div>
                                    {/* Reverse button disabled in sync mode for safety */}
                                    <button onClick={() => onReverseSale(s.id)} className="text-red-500 text-xs border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 font-bold transition opacity-50 cursor-not-allowed" disabled title="Reverse not supported in Sync Mode">
                                        Reverse
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
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
  async sendMessage(_history: any[], prompt: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
    
    if(prompt.includes("Record sale")) {
        const id = uuidv4();
        return `✅ **Receipt Generated**\nDate: ${new Date().toLocaleTimeString()}\nTrans ID: ${id.slice(0,8)}\n\nThank you for shopping at Gift Factory Ja!`;
    }
    if(prompt.includes("Report")) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const todaySales = this.state.sales.filter(s => s.timestamp >= startOfDay);
        const totalValue = todaySales.reduce((acc, curr) => acc + curr.total, 0);
        const count = todaySales.length;

        return `📊 **End of Day Report**\nDate: ${now.toLocaleDateString()}\n------------------------------\n✅ Total Sales: $${totalValue.toLocaleString()}\n✅ Transactions: ${count}\n\nGood work today!`;
    }
    return "AI processing complete.";
  }
}

// --- 5. MAIN APP COMPONENT ---

const loadState = (): AppState => {
  const saved = localStorage.getItem('pos_state');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse", e); }
  }
  return { inventory: INITIAL_INVENTORY, customers: INITIAL_CUSTOMERS, sales: [] };
};

export default function App() {
  const [appState, setAppState] = useState<AppState>({
      inventory: [],
      customers: [],
      sales: []
  });
  
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
  const [activeModal, setActiveModal] = useState<'INVENTORY' | 'SALES' | null>(null);
  const [mobileView, setMobileView] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');

  const geminiServiceRef = useRef<GeminiService | null>(null);

  // --- FIREBASE SYNC ---
  useEffect(() => {
    // 1. Listen to Inventory
    const unsubInv = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const products: Product[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Product));
        
        // Only update if we have data, otherwise keep initial/local
        if(products.length > 0) {
            setAppState(prev => ({ ...prev, inventory: products }));
        }
    });

    // 2. Listen to Sales
    const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
    const unsubSales = onSnapshot(q, (snapshot) => {
        const salesData: SalesRecord[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as SalesRecord));
        
        if(salesData.length > 0) {
            setAppState(prev => ({ ...prev, sales: salesData }));
        }
    });

    return () => {
        unsubInv();
        unsubSales();
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

  // --- Handlers ---

  // SEED INITIAL DATA
  const handleSeedData = async () => {
      if (confirm("This will upload mock data to Firebase. Continue?")) {
          const batch = writeBatch(db);
          
          INITIAL_INVENTORY.forEach(p => {
              const ref = doc(collection(db, "inventory"));
              batch.set(ref, p);
          });

          await batch.commit();
          alert("Data Synced! You should see products now.");
      }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
        const existing = prev.find(item => item.code === product.code);
        if (existing) {
            if (existing.cartQuantity >= product.stock) {
                alert(`Cannot add more. Only ${product.stock} in stock.`);
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

  // --- FIREBASE WRITE HANDLERS ---

  const handleAddProduct = async (product: Product) => {
      await addDoc(collection(db, "

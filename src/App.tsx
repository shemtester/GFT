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
  id?: string;
  code: string;
  category?: string; // Added optional category field
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

// --- 2. MOCK DATA ---
const INITIAL_INVENTORY: Product[] = [
  { code: 'RNG839201', category: 'Rings', name: 'Gold Band Ring', price: 1500, stock: 20 },
  { code: 'NK293841', category: 'Necklace', name: 'Silver Chain', price: 2500, stock: 10 },
  { code: 'BL938271', category: 'Bracelet', name: 'Charm Bracelet', price: 1200, stock: 15 },
  { code: 'GFT004', category: 'Other', name: 'Gift Box', price: 800, stock: 5 },
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
  const [category, setCategory] = useState('Rings');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');

  // Smart Autofill: When category changes, update the code prefix
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
        code: code || 'UNK',
        category, 
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
            {/* 1. Category */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                <select 
                    className="w-full border p-2 rounded bg-white focus:ring-2 focus:ring-[#99042E] outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="Rings">Rings</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Bracelet">Bracelet</option>
                </select>
            </div>

            {/* 2. Unique Code */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Unique Code</label>
                <input 
                    className="w-full border p-2 rounded bg-gray-50 font-mono text-sm" 
                    placeholder="Unique ID" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                />
            </div>

            {/* 3. Product Name */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
                <input 
                    className="w-full border p-2 rounded" 
                    placeholder="e.g. Gold Band" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                />
            </div>

            {/* 4. Price */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Price</label>
                <input 
                    className="w-full border p-2 rounded" 
                    type="number" 
                    placeholder="0.00" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                />
            </div>

            {/* 5. Quantity */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
                <input 
                    className="w-full border p-2 rounded" 
                    type="number" 
                    placeholder="Qty" 
                    value={stock} 
                    onChange={e => setStock(e.target.value)} 
                />
            </div>
        </div>
        <button onClick={handleSave} className="bg-[#99042E] text-white w-full py-2 rounded-lg font-bold mb-2 hover:bg-[#7a0325]">Save Product</button>
        <button onClick={onClose} className="w-full py-2 text-gray-500 hover:text-gray-800">Cancel</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-80 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">Edit Product</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Category</label>
                        <select 
                            className="w-full border p-2 rounded bg-white"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="Rings">Rings</option>
                            <option value="Necklace">Necklace</option>
                            <option value="Bracelet">Bracelet</option>
                        </select>
                    </div>
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
                    <button onClick={() => onSave({ ...product, category, code, name, price, stock })} className="flex-[2] bg-[#99042E] text-white py-2 rounded font-bold hover:bg-[#7a0325]">Save</button>
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
                        {/* THIS IS THE UPLOAD DATA BUTTON */}
                        <button onClick={onSeed} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition" title="Upload Test Data">
                            <CloudUpload size={16} /> <span className="hidden sm:inline text-xs font-bold">Data</span>
                        </button>
                        
                        {/* THIS IS THE REFRESH BUTTON */}
                        <button onClick={onRefresh} className="flex items-center gap-2 bg-gray-100 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 transition" title="Refresh Data">
                            <RefreshCw size={16} /> <span className="hidden sm:inline text-xs font-bold text-gray-600">Refresh</span>
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
    await new Promise(resolve => setTimeout(resolve, 800)); 
    
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
  return { inventory: [], customers: INITIAL_CUSTOMERS, sales: [] };
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
  const [activeModal, setActiveModal] = useState<'INVENTORY' | 'SALES' | null>(null);
  const [mobileView, setMobileView] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');

  const geminiServiceRef = useRef<GeminiService | null>(null);

  // --- FIREBASE SYNC ---
  useEffect(() => {
    const unsubInv = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const products: Product[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Product));
        setAppState(prev => ({ ...prev, inventory: products }));
    });

    const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
    const unsubSales = onSnapshot(q, (snapshot) => {
        const salesData: SalesRecord[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as SalesRecord));
        setAppState(prev => ({ ...prev, sales: salesData }));
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

  const handleRefreshData = () => {
    window.location.reload();
  };

  const handleReverseSale = (_saleId: string) => {
      alert("Reversing sales is disabled in Sync Mode to prevent data conflicts. Sale ID: " + _saleId);
  };

  // --- THE "LOUD" UPLOAD BUTTON LOGIC ---
  const handleSeedData = async () => {
      if (!confirm("This will upload Initial Data to Firebase. Continue?")) return;

      try {
          const batch = writeBatch(db);
          INITIAL_INVENTORY.forEach(p => {
              const ref = doc(collection(db, "inventory"));
              batch.set(ref, p);
          });

          await batch.commit();
          alert("✅ SUCCESS: Data has been sent to Firebase!");
          window.location.reload();

      } catch (error: any) {
          console.error("Firebase Error:", error);
          alert("❌ FAILED: " + error.message + "\n\nCheck your API Keys and Internet.");
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
      try {
        await addDoc(collection(db, "inventory"), product);
        setActiveModal(null);
      } catch (e: any) {
          alert("Error adding product: " + e.message);
      }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (!updatedProduct.id) return;
    const ref = doc(db, "inventory", updatedProduct.id);
    await updateDoc(ref, { 
        name: updatedProduct.name,
        price: updatedProduct.price,
        stock: updatedProduct.stock,
        code: updatedProduct.code,
        category: updatedProduct.category
    });
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (product: Product) => {
    alert(`To delete ${product.name} safely in this demo, just set Stock to 0 via Edit.`);
    setEditingProduct(null);
  };

  const handleRestockProduct = async (product: Product, qty: number) => {
      if (!product.id) return;
      const ref = doc(db, "inventory", product.id);
      await updateDoc(ref, { stock: product.stock + qty });
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
  
  const activeCustomer = appState.customers.find(c => c.id === customerId);
  const intermediateTotal = Math.max(0, subtotal - estimatedDiscount);
  const pointsToRedeem = usePoints && activeCustomer ? Math.min(activeCustomer.points, intermediateTotal) : 0;
  const estimatedTotal = Math.max(0, intermediateTotal - pointsToRedeem);

  const handleProcessSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const now = new Date();
    const newSale: SalesRecord = {
        id: uuidv4(),
        customerId: customerId || 'GUEST',
        productCode: cart.map(c => `${c.code}(${c.cartQuantity})`).join('|'),
        pointsEarned: Math.floor(estimatedTotal / 100), 
        pointsRedeemed: pointsToRedeem,
        total: estimatedTotal,
        date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(),
        timestamp: now.getTime()
    };

    try {
      await addDoc(collection(db, "sales"), newSale);
      const batch = writeBatch(db);
      
      for (const cartItem of cart) {
          const productDoc = appState.inventory.find(p => p.code === cartItem.code);
          if (productDoc && productDoc.id) {
              const ref = doc(db, "inventory", productDoc.id);
              const newStock = Math.max(0, productDoc.stock - cartItem.cartQuantity);
              batch.update(ref, { stock: newStock });
          }
      }
      
      await batch.commit();

      const response = await geminiServiceRef.current!.sendMessage([], "Record sale");
      setLastReceipt(response);
      setShowReceiptModal(true);
      clearCart();
    } catch (error: any) {
      console.error(error);
      alert("Error processing sale: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
      setIsProcessing(true);
      try {
          const response = await geminiServiceRef.current!.sendMessage([], "Generate End of Day Report");
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
      
      {/* --- HEADER (UPDATED FOR MOBILE VISIBILITY) --- */}
      <header className="bg-[#99042E] text-white h-16 shrink-0 flex items-center justify-between px-3 md:px-6 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center font-bold text-xl shrink-0">G</div>
          <div className="flex flex-col justify-center">
            <h1 className="font-bold text-lg leading-none">Gift Factory Ja.</h1>
            <p className="text-[10px] text-[#F0C053] font-bold tracking-widest uppercase mt-1">POS Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {/* All buttons now visible on mobile as icons */}
           <button onClick={() => setActiveModal('SALES')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              <RotateCcw size={20} />
           </button>
           <button onClick={() => setActiveModal('INVENTORY')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              <PlusCircle size={20} />
           </button>
           <button onClick={handleGenerateReport} className="p-2 bg-[#F79032] rounded-lg hover:bg-orange-600 transition shadow-sm">
              <FileText size={20} />
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
                        <p>No products found.</p>
                        <p className="text-xs">Add a product or check connection.</p>
                    </div>
                ) : (
                    filteredInventory.map(product => (
                    <button 
                        key={product.code}
                        onClick={() => {
                            if (product.stock > 0) addToCart(product);
                        }}
                        className={`relative bg-white p-3 md:p-4 rounded-xl border transition-all flex flex-col items-start text-left group h-28 md:h-32 justify-between active:scale-95 ${product.stock === 0 ? 'border-gray-200 opacity-60 bg-gray-50' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-[#99042E]'}`}
                    >
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(product);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm hover:bg-[#99042E] text-gray-500 hover:text-white rounded-lg shadow-sm z-20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer" 
                            title="Edit Product"
                        >
                            <Pencil size={14} />
                        </div>

                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                setRestockingProduct(product);
                            }}
                            className="absolute top-2 right-10 p-1.5 bg-white/90 backdrop-blur-sm hover:bg-green-600 text-gray-500 hover:text-white rounded-lg shadow-sm z-20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer" 
                            title="Add Stock (Restock)"
                        >
                            <PackagePlus size={14} />
                        </div>

                        {product.stock > 0 && product.stock < 5 && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold z-10">
                            <AlertTriangle size={10} /> Low
                        </div>
                        )}
                        {product.stock === 0 && (
                            <div className="absolute top-2 left-2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-[10px] font-bold z-10">
                            Out of Stock
                            </div>
                        )}

                        <div className="w-full mt-4 md:mt-0">
                        <span className="text-[10px] md:text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{product.code}</span>
                        <h3 className="font-bold text-gray-800 mt-1 md:mt-2 line-clamp-2 leading-snug group-hover:text-[#99042E] text-sm md:text-base">{product.name}</h3>
                        </div>
                        <div className="flex justify-between items-end w-full">
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

          {/* Customer Panel */}
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
                 className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none ${customerId && !activeCustomer && customerId !== '999' ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-[#99042E]'}`}
                 placeholder="Loyalty ID (e.g. GFT000123)"
                 value={customerId}
                 onChange={e => setCustomerId(e.target.value.toUpperCase())}
               />
             </div>
             {customerId && !activeCustomer && customerId !== '999' && (
                <div className="mt-1 text-[10px] text-red-500 font-bold">
                    ID not found. Use 999 for Guest.
                </div>
             )}
             {activeCustomer && (
                <div className="mt-2 text-sm text-[#99042E] font-medium animate-fade-in">
                   Welcome back, {activeCustomer.name}
                </div>
             )}
          </div>

          {/* Cart Items */}
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
                       {item.stock < 5 && (
                         <div className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-bold">
                            <AlertTriangle size={10} /> Low Stock ({item.stock} left)
                         </div>
                       )}
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

          {/* Calculations & Actions */}
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
                   disabled={cart.length === 0 || isProcessing || (customerId.trim() !== '' && customerId !== '999' && !activeCustomer)}
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
            onRefresh={handleRefreshData}
            onSeed={handleSeedData}
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

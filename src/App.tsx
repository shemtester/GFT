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

// --- 2. MOCK DATA (For Seeding) ---
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
  const [code, setCode] = useState('GFT' + Math.floor(Math.random() * 1000));
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
            <input className="w-full border p-2 rounded" placeholder="Product Name" value={name

"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Lang = 'en'|'es';

type Product = {
  id: string;
  sku: string;
  name: { en: string; es: string };
  description?: { en?: string; es?: string };
  category: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  status: 'active'|'hidden'|'draft'|'out_of_stock';
  featured?: boolean;
  updatedAt?: string;
  images?: { url: string; alt?: string; primary?: boolean }[];
  primaryImageIndex?: number;
};

function StatusChip({ s }:{ s: Product['status'] }){
  const map:any = {
    active: 'bg-emerald-900/30 text-emerald-200 border-emerald-700',
    out_of_stock: 'bg-rose-900/30 text-rose-200 border-rose-700',
    hidden: 'bg-neutral-800 text-white/80 border-neutral-700',
    draft: 'bg-amber-900/30 text-amber-200 border-amber-700',
  };
  const label = s==='out_of_stock' ? 'Out of Stock' : s.charAt(0).toUpperCase()+s.slice(1);
  return <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${map[s]}`}>{label}</span>;
}

export default function InventoryPage(){
  const [lang, setLang] = useState<Lang>('en');
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<{ _id:string; name:string; slug:string; productCount?:number }[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'updatedAt'|'price'|'stock'|'sku'>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  // Load products
  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const qs = new URLSearchParams();
        if (q) qs.set('query', q);
        if (status) qs.set('status', status);
        if (category) qs.set('category', category);
        qs.set('page', String(page));
        qs.set('limit', String(limit));
        qs.set('sortBy', sortBy);
        qs.set('sortDir', sortDir);
        const res = await apiGet(`/api/products?${qs.toString()}`);
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          const items = (data.items||[]).map((d:any)=> ({
            id: d._id || d.id,
            sku: d.sku,
            name: { en: d.translations?.en?.name || d.name?.en || '', es: d.translations?.es?.name || d.name?.es || '' },
            description: { en: d.translations?.en?.description || d.description?.en || '', es: d.translations?.es?.description || d.description?.es || '' },
            category: d.category || 'Uncategorized',
            price: d.price,
            stock: d.stock,
            lowStockThreshold: d.lowStockThreshold,
            status: d.status,
            featured: !!d.featured,
            updatedAt: d.updatedAt,
            images: Array.isArray(d.images) ? d.images : (d.imageUrl ? [{ url: d.imageUrl, primary: true }] : []),
          } as Product));
          setRows(items);
          setTotal(data.total||items.length);
          setTotalPages(data.totalPages||1);
        } else {
          setRows([]); setTotal(0); setTotalPages(1);
        }
      }catch{ setRows([]); setTotal(0); setTotalPages(1);}
    })();
    return ()=>{ active=false };
  },[q,status,category,page,limit,sortBy,sortDir]);

  // Load categories for dropdowns
  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const res = await apiGet('/api/categories');
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          const arr = (data.items||[]) as any[];
          setCategories(arr);
        }
      }catch{}
    })();
    return ()=>{ active=false };
  },[]);

  // Ensure a valid default category is selected when categories load
  useEffect(()=>{
    if (categories.length > 0){
      const first = categories[0];
      setForm(p=>{
        const current = p.category;
        const exists = categories.some(c=> c.slug===current || c.name===current);
        if (!current || !exists){
          return { ...p, category: (first.slug || first.name) };
        }
        return p;
      });
    }
  }, [categories]);

  const fmt = useMemo(()=> new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD'}), []);
  const filtered = useMemo(()=> rows.filter(r =>
    (!q || r.sku.toLowerCase().includes(q.toLowerCase()) || r.name.en.toLowerCase().includes(q.toLowerCase()) || r.name.es.toLowerCase().includes(q.toLowerCase()) || r.category.toLowerCase().includes(q.toLowerCase())) &&
    (!status || (status==='in_stock' ? r.stock>0 : status==='out_of_stock'? r.stock<=0 : status==='hidden'? r.status==='hidden' : status==='active'? r.status==='active' : true)) &&
    (!category || r.category===category)
  ),[rows,q,status,category]);

  const kpiTotal = rows.length;
  const kpiInStock = rows.filter(r=> r.stock>0).length;
  const kpiOOS = rows.filter(r=> r.stock<=0).length;
  const kpiLow = rows.filter(r=> r.stock>0 && r.stock<10).length;


  // Permissions from /api/me
  const [perms, setPerms] = useState<{canManageProducts:boolean; canEditStock:boolean; canManageUsers:boolean}>({
    canManageProducts: false,
    canEditStock: false,
    canManageUsers: false,
  });
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Product|null>(null);
  useEffect(()=>{
    (async()=>{
      try{
        const r = await apiGet('/api/me');
        if(r.ok){
          const me = await r.json();
          if (me?.permissions){
            setPerms({
              canManageProducts: !!me.permissions.canManageProducts,
              canEditStock: !!me.permissions.canEditStock,
              canManageUsers: !!me.permissions.canManageUsers,
            });
          } else if (me?.role){
            setPerms({
              canManageProducts: me.role==='admin',
              canEditStock: me.role==='admin' || me.role==='employee',
              canManageUsers: me.role==='admin',
            });
          }
        }
      }catch{}
    })();
  },[]);

  // Modal / Toast state
  const [modalOpen, setModalOpen] = useState(false);
  const [stockOnly, setStockOnly] = useState(false);
  const [editing, setEditing] = useState<Product|null>(null);
  const [toast, setToast] = useState<{type:'success'|'error', text:string}|null>(null);

  const [form, setForm] = useState({
    sku: '',
    nameEn: '', nameEs: '',
    descEn: '', descEs: '',
    category: '',
    priceInput: '',
    stockInput: '',
    lowStock: undefined as number|undefined,
    status: 'active' as Product['status'],
    featured: false,
    images: [] as { url: string; alt?: string; primary?: boolean }[],
    primaryImageIndex: 0,
  });

  function openAdd(){
    setEditing(null); setStockOnly(false);
    setForm({ sku:'', nameEn:'', nameEs:'', descEn:'', descEs:'', category:(categories[0]?.slug||categories[0]?.name||''), priceInput:'', stockInput:'', lowStock: undefined, status:'active', featured:false, images:[], primaryImageIndex:0 });
    setModalOpen(true);
  }
  function openEdit(p: Product){
    setEditing(p); setStockOnly(false);
    const primaryIdx = Math.max(0, (p.images||[]).findIndex(im=> im.primary) || 0);
    setForm({
      sku:p.sku,
      nameEn:p.name.en, nameEs:p.name.es,
      descEn:p.description?.en||'', descEs:p.description?.es||'',
      category:p.category,
      priceInput: (p.price!=null? String(p.price): ''),
      stockInput: String(p.stock??0),
      lowStock:p.lowStockThreshold,
      status:p.status,
      featured: !!p.featured,
      images: p.images||[],
      primaryImageIndex: primaryIdx,
    });
    setModalOpen(true);
  }
  function openStock(p: Product){
    setEditing(p); setStockOnly(true);
    const primaryIdx = Math.max(0, (p.images||[]).findIndex(im=> im.primary) || 0);
    setForm({ sku:p.sku, nameEn:p.name.en, nameEs:p.name.es, descEn:p.description?.en||'', descEs:p.description?.es||'', category:p.category, priceInput: (p.price!=null? String(p.price): ''), stockInput: String(p.stock??0), lowStock:p.lowStockThreshold, status:p.status, featured: !!p.featured, images:p.images||[], primaryImageIndex:primaryIdx });
    setModalOpen(true);
  }

  const canPublish = form.nameEn.trim().length>0 && form.nameEs.trim().length>0;

  async function saveForm(desiredStatus?: Product['status']){
    try{
      if(stockOnly && editing){
        const body:any = { stock: Math.max(0, Number((form as any).stockInput || 0)) };
        const res = await apiPatch(`/api/products/${editing.id}`, body);
        if (!res.ok) throw new Error('stock');
        const updated = await res.json();
        const mapped: Product = {
          id: updated._id || editing.id,
          sku: updated.sku,
          name: { en: updated.translations?.en?.name || '', es: updated.translations?.es?.name || '' },
          description: { en: updated.translations?.en?.description || '', es: updated.translations?.es?.description || '' },
          category: updated.category,
          price: updated.price,
          stock: updated.stock,
          lowStockThreshold: updated.lowStockThreshold,
          status: updated.status,
          updatedAt: updated.updatedAt,
          images: Array.isArray(updated.images) ? updated.images : [],
          primaryImageIndex: Math.max(0,(updated.images||[]).findIndex((im:any)=> im.primary) || 0),
        };
        setRows(prev=> prev.map(r=> r.id===editing.id ? mapped : r));
        setToast({type:'success', text:'Stock updated'});
        setModalOpen(false); return;
      }

      // Validation
      const statusTarget: Product['status'] = 'active';
      if (Number((form as any).priceInput) <= 0){ setToast({type:'error', text:'Price must be greater than 0'}); return; }
      if (Number.isNaN(Number((form as any).stockInput)) || Number((form as any).stockInput) < 0){ setToast({type:'error', text:'Stock must be 0 or more'}); return; }

      // SKU handling
      const existing = rows.map(r=> r.sku.toLowerCase());
      let sku = (form.sku||'').trim();
      function slugFromName(n:string){
        const base = (n||'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toUpperCase();
        return base || `PROD-${Date.now()}`;
      }
      if (!sku){ sku = slugFromName(form.nameEn); }
      let candidate = sku.toUpperCase();
      let i = 2;
      while (existing.includes(candidate.toLowerCase()) && (!editing || editing.sku.toLowerCase()!==candidate.toLowerCase())){
        candidate = `${sku.toUpperCase()}-${i++}`;
      }
      sku = candidate;

      // Build payload to match backend schema
      const imagesArr = (form.images||[])
        .filter(im => im.url && !String(im.url).startsWith('data:'))
        .map((im, idx)=> ({ url: im.url, alt: im.alt||'', primary: idx===form.primaryImageIndex }));
      const body:any = {
        sku,
        category: form.category,
        price: Number((form as any).priceInput || 0),
        stock: Number((form as any).stockInput || 0),
        lowStockThreshold: form.lowStock,
        status: statusTarget,
        featured: !!form.featured,
        translations: {
          en: { name: form.nameEn, description: form.descEn||'' },
          es: { name: form.nameEs, description: form.descEs||'' },
        },
        images: imagesArr,
      };

      if (editing){
        let res = await apiPatch(`/api/products/${editing.id}`, body);
        if (!res.ok) throw new Error('edit');
        const updated = await res.json();
        const mapped: Product = {
          id: updated._id || editing.id,
          sku: updated.sku,
          name: { en: updated.translations?.en?.name || '', es: updated.translations?.es?.name || '' },
          description: { en: updated.translations?.en?.description || '', es: updated.translations?.es?.description || '' },
          category: updated.category,
          price: updated.price,
          stock: updated.stock,
          lowStockThreshold: updated.lowStockThreshold,
          status: updated.status,
          updatedAt: updated.updatedAt,
          images: Array.isArray(updated.images) ? updated.images : [],
          primaryImageIndex: Math.max(0,(updated.images||[]).findIndex((im:any)=> im.primary) || 0),
        };
        setRows(prev=> prev.map(r=> r.id===editing.id ? mapped : r));
        setToast({type:'success', text:'Product updated successfully'});
      } else {
        let res = await apiPost('/api/products', body);
        if (!res.ok) throw new Error('add');
        const created = await res.json();
        const mapped: Product = {
          id: created._id,
          sku: created.sku,
          name: { en: created.translations?.en?.name || '', es: created.translations?.es?.name || '' },
          description: { en: created.translations?.en?.description || '', es: created.translations?.es?.description || '' },
          category: created.category,
          price: created.price,
          stock: created.stock,
          lowStockThreshold: created.lowStockThreshold,
          status: created.status,
          updatedAt: created.updatedAt,
          images: Array.isArray(created.images) ? created.images : [],
          primaryImageIndex: Math.max(0,(created.images||[]).findIndex((im:any)=> im.primary) || 0),
        };
        setRows(prev=> [mapped, ...prev]);
        setToast({type:'success', text:'Product added successfully'});
      }
      setModalOpen(false);
    }catch(e:any){
      setToast({type:'error', text: 'Save failed'});
    }
  }


  async function onView(id: string){
    try{
      const res = await apiGet(`/api/products/${id}`);
      if (!res.ok) throw new Error('fail');
      const d = await res.json();
      const mapped: Product = {
        id: d._id || d.id,
        sku: d.sku,
        name: { en: d.translations?.en?.name || d.name?.en || '', es: d.translations?.es?.name || d.name?.es || '' },
        description: { en: d.translations?.en?.description || d.description?.en || '', es: d.translations?.es?.description || d.description?.es || '' },
        category: d.category,
        price: d.price,
        stock: d.stock,
        lowStockThreshold: d.lowStockThreshold,
        status: d.status,
        updatedAt: d.updatedAt,
        images: Array.isArray(d.images) ? d.images : (d.imageUrl ? [{ url: d.imageUrl, primary: true }] : []),
        primaryImageIndex: Math.max(0,(d.images||[]).findIndex((im:any)=> im.primary) || 0),
      };
      setViewing(mapped); setViewOpen(true);
    }catch{
      alert('Failed to load product');
    }
  }

  async function handleFiles(files: FileList){
    if (!files || files.length===0) return;
    // 1) Instant local preview
    const previews: string[] = await Promise.all(Array.from(files).map(f => new Promise<string>((resolve)=>{
      const rd = new FileReader(); rd.onload = ()=> resolve(String(rd.result)); rd.readAsDataURL(f);
    })));
    // Remember indices for replacement after upload
    const startIdx = form.images.length;
    setForm(prev => ({ ...prev, images: [...(prev.images||[]), ...previews.map(u=> ({ url: u }))] }));

    // 2) Try background upload to storage and replace preview URLs with final URLs
    try{
      const signRes = await apiPost('/api/uploads/sign', { folder: 'products' });
      if (signRes.status === 401 || signRes.status === 403){
        setToast({ type:'error', text:'Session expired. Please sign in again to upload images.' });
        return;
      }
      if (!signRes.ok) throw new Error('sign');
      const sign = await signRes.json();
      if (!(sign.provider === 's3' && sign.url && sign.fields)) throw new Error('no-s3');

      for (let i=0;i<files.length;i++){
        const file = files[i];
        const formData = new FormData();
        const fields = { ...sign.fields };
        if (fields.key && typeof fields.key === 'string'){
          fields.key = fields.key.replace('${filename}', file.name);
        }
        Object.entries(fields).forEach(([k,v])=> formData.append(k, String(v)));
        // Ensure the same Content-Type as the file; allowed by policy via starts-with
        try { if (file.type) formData.append('Content-Type', file.type); } catch {}
        formData.append('file', file);
        const up = await fetch(sign.url, { method: 'POST', body: formData });
        if (!up.ok) throw new Error('upload');
        const finalUrl = fields.key ? `${sign.url}/${fields.key}` : sign.url;
        // Replace the preview URL at the correct index
        const replaceIdx = startIdx + i;
        setForm(prev => ({
          ...prev,
          images: prev.images.map((img, idx) => idx===replaceIdx ? { ...img, url: finalUrl } : img)
        }));
      }
    } catch {
      // Keep local previews; toast once
      setToast({ type:'error', text:'Upload failed or not configured. Using local previews only.' });
    }
  }

  async function onImage(e: any){
    const files: FileList|undefined = e?.target?.files; if(!files || files.length===0) return;
    await handleFiles(files);
  }

  function setPrimaryImage(idx:number){
    setForm(prev=>{
      const images = prev.images||[]; if (idx<0 || idx>=images.length) return prev;
      return { ...prev, primaryImageIndex: idx };
    });
  }
  function removeImage(idx:number){
    setForm(prev=>{
      const images = [...(prev.images||[])]; if (idx<0 || idx>=images.length) return prev;
      images.splice(idx,1);
      let primaryImageIndex = prev.primaryImageIndex||0;
      if (images.length===0){ return { ...prev, images, primaryImageIndex: 0 }; }
      if (idx<=primaryImageIndex){ primaryImageIndex = Math.max(0, primaryImageIndex-1); }
      return { ...prev, images, primaryImageIndex };
    });
  }

  function onAdd(){
    openAdd();
  }

  function onExport(){
    const cols = ['sku','name_en','name_es','category','price','stock','status','updatedAt'];
    const lines = [cols.join(',')].concat(
      filtered.map(p=> [p.sku, p.name.en, p.name.es, p.category, String(p.price), String(p.stock), p.status, p.updatedAt||'']
        .map(v=> JSON.stringify(v??''))
        .join(','))
    );
    const blob = new Blob([lines.join('\n')], { type:'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download='products.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function onEdit(p: Product){
    openEdit(p);
  }

  async function onDelete(p: Product){
    if(!confirm('Delete product?')) return;
    try{
      const res = await apiDelete(`/api/products/${p.id}`);
      if (!res.ok) throw new Error('fail');
      setRows(prev=> prev.filter(r=> r.id!==p.id));
    }catch{ alert('Delete failed'); }
  }
  async function onImportCSV(e: any){
    const file: File|undefined = e?.target?.files?.[0];
    if (!file) return;
    try{
      const text = await file.text();
      const rows = csvParse(text);
      if (!rows.length) { setToast({type:'error', text:'Empty CSV'}); return; }
      const header = rows[0].map(h=> h.trim().toLowerCase());
      const need = ['sku','name_en','name_es','category','price','stock','status'];
      if (!need.every(k=> header.includes(k))){ setToast({type:'error', text:'CSV headers must include: '+need.join(', ')}); return; }
      let ok=0, fail=0;
      for (let i=1;i<rows.length;i++){
        const r = rows[i]; if (!r || r.length===0 || r.join('').trim()==='') continue;
        const get = (k:string)=> r[header.indexOf(k)] ?? '';
        const body:any = {
          sku: get('sku'), category: get('category'),
          price: Number(get('price')||0), stock: Number(get('stock')||0),
          translations: { en:{ name:get('name_en'), description:'' }, es:{ name:get('name_es'), description:'' } },
          images: [], status: (get('status')||'draft')
        };
        try{
          const res = await apiPost('/api/products', body);
          if(res.ok) ok++; else fail++;
        }catch{ fail++; }
      }
      setToast({type: fail? 'error':'success', text: `Import finished: ${ok} ok, ${fail} failed`});
      setPage(1);
    }catch{
      setToast({type:'error', text:'Import failed'});
    } finally {
      e.target.value=''; // reset input so same file triggers again
    }
  }

  function csvParse(text:string): string[][]{
    const out: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i=0;i<text.length;i++){
      const ch = text[i];
      if (inQ){
        if (ch==='"'){
          if (text[i+1]==='"'){ cur+='"'; i++; } else { inQ=false; }
        } else { cur+=ch; }
      } else {
        if (ch==='"'){ inQ=true; }
        else if (ch===','){ row.push(cur); cur=''; }
        else if (ch==='\n' || ch==='\r'){ if (cur!=='' || row.length){ row.push(cur); out.push(row); row=[]; cur=''; }
          // eat \r\n pair
          if (ch==='\r' && text[i+1]==='\n') i++; }
        else { cur+=ch; }
      }
    }
    if (cur!=='' || row.length) { row.push(cur); out.push(row); }
    return out;
  }


  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory (Admin)</h1>
          <p className="text-white/50 text-sm">Inventory management (placeholders)</p>

      <input id="csvImportInput" type="file" accept="text/csv" className="hidden" onChange={(e)=> onImportCSV(e)} />



        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=> setLang(v=> v==='en'?'es':'en')} className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm">{lang.toUpperCase()}</button>
          {perms.canManageProducts && (
            <>
              <button onClick={onAdd} className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm">+ Add Product</button>
              <button onClick={()=> (document.getElementById('csvImportInput') as HTMLInputElement)?.click()} className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm">Import</button>
            </>
          )}
          <button onClick={onExport} className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm">Export</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><div className="text-white/60 text-xs">Total Products</div><div className="text-2xl font-semibold">{kpiTotal}</div></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><div className="text-white/60 text-xs">In Stock</div><div className="text-2xl font-semibold">{kpiInStock}</div></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><div className="text-white/60 text-xs">Out of Stock</div><div className="text-2xl font-semibold">{kpiOOS}</div></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><div className="text-white/60 text-xs">Low Stock</div><div className="text-2xl font-semibold">{kpiLow}</div></div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} placeholder="Search products or SKU..." className="md:col-span-2 px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-600"/>
        <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-600">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="in_stock">In Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="hidden">Hidden</option>
          <option value="draft">Draft</option>
        </select>
        <select value={category} onChange={e=>{ setCategory(e.target.value); setPage(1); }} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-600">
          <option value="">All Categories</option>
          {categories.map(c=> (
            <option key={c._id} value={c.slug||c.name}>{c.name}</option>
          ))}
        </select>
        <select value={`${sortBy}:${sortDir}`} onChange={e=>{ const [b,d]=e.target.value.split(':') as any; setSortBy(b); setSortDir(d); }} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-600">
          <option value="updatedAt:desc">Updated (Newest)</option>
          <option value="updatedAt:asc">Updated (Oldest)</option>
          <option value="price:asc">Price (Low→High)</option>
          <option value="price:desc">Price (High→Low)</option>
          <option value="stock:asc">Stock (Low→High)</option>
          <option value="stock:desc">Stock (High→Low)</option>
          <option value="sku:asc">SKU (A→Z)</option>
          <option value="sku:desc">SKU (Z→A)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr className="border-b border-neutral-800">
              <th className="py-3 px-3">Product</th>
              <th className="py-3 px-3">SKU</th>
              <th className="py-3 px-3">Name</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Stock</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Updated</th>
              <th className="py-3 px-3 text-right w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p=> (
              <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-800/40">
                <td className="py-3 px-3">
                  <div className="h-8 w-8 rounded bg-neutral-800 border border-neutral-700"/>
                </td>
                <td className="py-3 px-3 text-white/80">{p.sku}</td>
                <td className="py-3 px-3 font-medium" title={(p.description?.[lang]||'').slice(0,120)}>{p.name[lang]}</td>
                <td className="py-3 px-3">{p.category}</td>
                <td className="py-3 px-3">{fmt.format(p.price)}</td>
                <td className="py-3 px-3">{p.stock}</td>
                <td className="py-3 px-3"><StatusChip s={p.stock<=0 ? 'out_of_stock' : p.status}/></td>
                <td className="py-3 px-3 whitespace-nowrap">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '-'}</td>
                <td className="py-3 px-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={()=> onView(p.id)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">View</button>
                    {perms.canManageProducts ? (
                      <>
                        <button onClick={()=> onEdit(p)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Edit</button>
                        <button onClick={()=> onDelete(p)} className="px-2 py-1 rounded border border-red-800 text-red-200 hover:bg-red-900/30">Delete</button>
                      </>
                    ) : perms.canEditStock ? (
                      <button onClick={()=> openStock(p)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Stock</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-white/70">
        <div>Page {page} of {totalPages} • Total {total} products</div>
        <div className="flex gap-2">
          <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="px-2 py-1 rounded border border-neutral-700 disabled:opacity-50">Previous</button>
          <button disabled={page>=totalPages} onClick={()=> setPage(p=> Math.min(totalPages,p+1))} className="px-2 py-1 rounded border border-neutral-700 disabled:opacity-50">Next</button>
        </div>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={()=> setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{stockOnly ? 'Update Stock' : (editing ? 'Edit Product' : 'Add Product')}</h3>
                <button onClick={()=> setModalOpen(false)} className="px-2 py-1 rounded border border-neutral-700">Close</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!stockOnly && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-white/60 mb-1">SKU (auto-generated if blank)</label>
                      <input value={form.sku} onChange={e=> setForm(p=> ({...p, sku:e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Name (EN)</label>
                      <input value={form.nameEn} onChange={e=> setForm(p=> ({...p, nameEn:e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                    </div>

                  {/* Live EN/ES Preview */}
                  {!stockOnly && (
                    <div className="mb-3 p-2 rounded border border-neutral-800 bg-neutral-950/40">
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span>Preview ({lang.toUpperCase()})</span>
                        <button onClick={()=> setLang(v=> v==='en'?'es':'en')} className="px-2 py-0.5 rounded border border-neutral-700 hover:bg-neutral-800">{lang.toUpperCase()}</button>
                      </div>
                      <div className="mt-1 text-sm font-medium">{lang==='en'? form.nameEn : form.nameEs}</div>
                      <div className="text-xs text-white/60 truncate">{lang==='en'? (form.descEn||'') : (form.descEs||'')}</div>
                    </div>
                  )}

                    <div>
                      <label className="block text-xs text-white/60 mb-1">Nombre (ES)</label>
                      <input value={form.nameEs} onChange={e=> setForm(p=> ({...p, nameEs:e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-white/60 mb-1">Description (EN)</label>
                      <textarea rows={3} value={form.descEn} onChange={e=> setForm(p=> ({...p, descEn:e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">



                      <label className="block text-xs text-white/60 mb-1">Descripción (ES)</label>
                      <textarea rows={3} value={form.descEs} onChange={e=> setForm(p=> ({...p, descEs:e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none" />
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 mb-1">Category</label>
                      <select value={form.category} onChange={e=> setForm(p=> ({...p, category:e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none">
                        {categories.length===0 ? (
                          <option value="Uncategorized">Uncategorized</option>
                        ) : (
                          categories.map(c=> (
                            <option key={c._id} value={c.slug||c.name}>{c.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Price (USD)</label>
                      <input type="number" step="0.01" value={(form as any).priceInput} onChange={e=> setForm(p=> ({...p, priceInput: e.target.value }))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs text-white/60 mb-1">Stock</label>
                  <input type="number" value={(form as any).stockInput} onChange={e=> setForm(p=> ({...p, stockInput: e.target.value }))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                </div>
                {!stockOnly && (
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Low Stock Threshold (optional)</label>
                    <input type="number" value={form.lowStock ?? ''} onChange={e=> setForm(p=> ({...p, lowStock: e.target.value==='' ? undefined : Number(e.target.value)}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                  </div>
                )}


                {!stockOnly && (
                  <>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Status</label>
                      <div className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white">Active</div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Homepage</label>
                      <label className="inline-flex items-center gap-2 text-sm text-white/80">
                        <input type="checkbox" checked={!!form.featured} onChange={e=> setForm(p=> ({...p, featured: e.target.checked}))} />
                        <span>Display on Main Page</span>
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-white/60 mb-1">Product Images</label>
                      <div
                        className="mb-2 rounded border border-dashed border-neutral-700 bg-neutral-950/40 p-3 text-center text-white/60 text-xs cursor-pointer hover:bg-neutral-900/50"
                        onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
                        onClick={()=> (document.getElementById('imageInput') as HTMLInputElement)?.click()}
                      >
                        Drag & drop images here, or click to select files
                      </div>
                      <input id="imageInput" type="file" accept="image/*" multiple onChange={onImage} className="hidden"/>
                      <div className="grid grid-cols-4 gap-2">
                        {(form.images||[]).length===0 ? (
                          <div className="h-16 w-16 rounded bg-neutral-800 border border-neutral-700"/>
                        ) : (
                          form.images!.map((im,idx)=> (
                            <div key={idx}>
                              <img src={im.url} alt={im.alt||''} className={`h-16 w-16 object-contain bg-neutral-900 rounded border ${idx===form.primaryImageIndex? 'border-sky-600' : 'border-neutral-700'}`}/>
                              <input value={im.alt||''} onChange={e=> setForm(p=> ({...p, images: p.images.map((x,i)=> i===idx? { ...x, alt: e.target.value } : x)}))} placeholder="Alt text" className="mt-1 w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-[10px]"/>
                              <div className="flex gap-1 mt-1">
                                <button onClick={()=> setPrimaryImage(idx)} className="px-2 py-0.5 rounded border border-neutral-700 text-xs">{idx===form.primaryImageIndex? 'Primary' : 'Make Primary'}</button>
                                <button onClick={()=> removeImage(idx)} className="px-2 py-0.5 rounded border border-red-800 text-red-200 text-xs">Remove</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>


              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=> setModalOpen(false)} className="px-3 py-1.5 rounded border border-neutral-700">Cancel</button>
                <button onClick={()=> saveForm()} className="px-3 py-1.5 rounded border border-sky-700 bg-sky-900/30 hover:bg-sky-900/50">Save</button>
              </div>
            </div>
          </div>
        </>
      )}
      {viewOpen && viewing && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={()=> setViewOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="font-semibold">Product Details</div>
              <button onClick={()=> setViewOpen(false)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Close</button>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto">
              <div className="flex items-center gap-2">
                <div className="text-white/60 text-sm">SKU</div>
                <div className="font-mono text-sm">{viewing.sku}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">Name ({lang.toUpperCase()})</div>
                <div className="text-lg font-medium">{lang==='en' ? viewing.name.en : viewing.name.es}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">Description ({lang.toUpperCase()})</div>
                <div className="text-white/80 text-sm whitespace-pre-wrap">{lang==='en' ? viewing.description.en : viewing.description.es}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-neutral-900 border border-neutral-800 rounded p-2"><div className="text-white/60 text-xs">Category</div><div>{viewing.category}</div></div>
                <div className="bg-neutral-900 border border-neutral-800 rounded p-2"><div className="text-white/60 text-xs">Status</div><div className="capitalize">{viewing.status.replaceAll('_',' ')}</div></div>
                <div className="bg-neutral-900 border border-neutral-800 rounded p-2"><div className="text-white/60 text-xs">Price</div><div>{viewing.price.toFixed(2)}</div></div>
                <div className="bg-neutral-900 border border-neutral-800 rounded p-2"><div className="text-white/60 text-xs">Stock</div><div>{viewing.stock}</div></div>
              </div>
              {Array.isArray(viewing.images) && viewing.images.length>0 && (
                <div>
                  <div className="text-white/60 text-sm mb-2">Images</div>
                  <div className="grid grid-cols-3 gap-2">
                    {viewing.images.map((im,idx)=> (
                      <div key={idx} className={`relative aspect-square rounded overflow-hidden border ${im.primary?'border-sky-600':'border-neutral-800'}`}>
                        <img src={im.url} alt={im.alt||''} className="object-cover w-full h-full"/>
                        {im.primary && <span className="absolute top-1 left-1 text-2xs bg-sky-700/80 px-1.5 py-0.5 rounded">Primary</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded border text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-100' : 'bg-rose-900/50 border-rose-700 text-rose-100'}`}
             onAnimationEnd={()=> setTimeout(()=> setToast(null), 2500)}>
          {toast.text}
        </div>
      )}

    </div>
  );
}


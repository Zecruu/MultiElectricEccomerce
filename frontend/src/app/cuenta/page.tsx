"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export default function AccountPage(){
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<'orders'|'settings'|'profile'>('orders');
  const [orders, setOrders] = useState<any[] | null>(null);
  // Settings state
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [prefEmailNotifs, setPrefEmailNotifs] = useState(true);
  const [prefLanguage, setPrefLanguage] = useState<'es'|'en'>('es');
  const [secCurrent, setSecCurrent] = useState('');
  const [secNew, setSecNew] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  // Language handling (sync with navbar)
  const [lang, setLang] = useState<'en'|'es'>('es');
  useEffect(() => {
    try { const saved = localStorage.getItem('lang') as 'en'|'es'|null; if (saved) setLang(saved); } catch {}
    const handler = (e: any) => {
      const l = (e?.detail?.lang as 'en'|'es'|undefined) || ((): any => { try { return localStorage.getItem('lang'); } catch { return null; } })();
      if (l === 'en' || l === 'es') setLang(l);
    };
    window.addEventListener('lang-change', handler as any);
    return () => window.removeEventListener('lang-change', handler as any);
  }, []);

  const TXT = {
    es: {
      accountTitle: 'Mi Cuenta', orders: 'Mis órdenes', profile: 'Perfil', settings: 'Configuración',
      order: 'Orden', qty: 'Cantidad', totalPaid: 'Total pagado', loadingOrders: 'Cargando órdenes...', noOrders: 'No tienes órdenes todavía.',
      logout: 'Cerrar sesión', notSignedIn: 'No ha iniciado sesión', signIn: 'Iniciar sesión', name: 'Nombre', email: 'Email', role: 'Rol',
      profileSave: 'Guardar', security: 'Seguridad', currentPassword: 'Contraseña actual', newPassword: 'Nueva contraseña', updatePassword: 'Actualizar contraseña',
      preferences: 'Preferencias', emailNotifications: 'Recibir notificaciones por email', language: 'Idioma', savePrefs: 'Guardar preferencias',
      sessions: 'Sesiones', closeOtherSessions: 'Cerrar otras sesiones', sessionsDesc: 'Cerrar sesión en otros dispositivos.',
      privacy: 'Privacidad', requestExport: 'Solicitar exportación de datos', dangerZone: 'Zona de peligro', deleteAccount: 'Eliminar cuenta',
      paid: 'Pagado', pending: 'Pendiente', shipped: 'Enviado', completed: 'Completado', failed: 'Fallido', cancelled: 'Cancelado'
    },
    en: {
      accountTitle: 'Account', orders: 'My orders', profile: 'Profile', settings: 'Settings',
      order: 'Order', qty: 'Qty', totalPaid: 'Total paid', loadingOrders: 'Loading orders...', noOrders: "You don't have any orders yet.",
      logout: 'Log out', notSignedIn: 'Not signed in', signIn: 'Sign in', name: 'Name', email: 'Email', role: 'Role',
      profileSave: 'Save', security: 'Security', currentPassword: 'Current password', newPassword: 'New password', updatePassword: 'Update password',
      preferences: 'Preferences', emailNotifications: 'Receive email notifications', language: 'Language', savePrefs: 'Save preferences',
      sessions: 'Sessions', closeOtherSessions: 'Close other sessions', sessionsDesc: 'Sign out on other devices.',
      privacy: 'Privacy', requestExport: 'Request data export', dangerZone: 'Danger zone', deleteAccount: 'Delete account',
      paid: 'Paid', pending: 'Pending', shipped: 'Shipped', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled'
    }
  } as const;
  type TKey = keyof typeof TXT['en'];
  const t = (k: TKey) => TXT[lang][k];



  function formatCurrency(n: number) { return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(n); }
  function formatStatus(s: string){
    switch(s){
      case 'paid': return t('paid');
      case 'pending': return t('pending');
      case 'shipped': return t('shipped');
      case 'completed': return t('completed');
      case 'failed': return t('failed');
      case 'cancelled': return t('cancelled');
      default: return s;
    }
  }
  function statusClass(s: string){
    return s==='paid' ? 'bg-green-600/20 text-green-300 border-green-700' :
      s==='pending' ? 'bg-yellow-600/20 text-yellow-200 border-yellow-700' :
      s==='cancelled' ? 'bg-red-600/20 text-red-300 border-red-700' :
      s==='failed' ? 'bg-red-600/20 text-red-300 border-red-700' :
      s==='shipped' ? 'bg-blue-600/20 text-blue-200 border-blue-700' : 'bg-neutral-700 border-neutral-600';
  }
  function displayOrderNumber(o: any){ return o?.orderNumber || `MES-${String(o?._id||'').slice(-6).toUpperCase()}`; }


  useEffect(() => {
    let active = true;
    (async()=>{
      try{
        const res = await apiGet("/api/me");
        if(!active) return;
        if(!res.ok){
          setError(t('notSignedIn'));
        } else {
          const data = await res.json();
          setMe(data);
        }
      } catch(e){
        setError("Failed to load profile");
      } finally {
        if(active) setLoading(false);
      }
    })();
    return ()=>{active=false};
  },[]);
  // Load orders (backend only)
  useEffect(() => {
    if (!me) return;
    let active = true;
    (async () => {
      try {
        const res = await apiGet("/api/orders");
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        } else {
          setOrders([]);
        }
      } catch {
        setOrders([]);
      }
    })();
    return () => { active = false };
  }, [me]);


  async function onLogout(){
    setPending(true);
    try{
      await apiPost("/api/auth/logout", {});
    } finally {
      setPending(false);
      router.replace("/");
    }
  }

  // Load settings data when opening the tab
  useEffect(()=>{
    if (tab !== 'settings') return;
    let active = true; setSettingsLoading(true); setMsg(null);
    (async()=>{
      try{
        const res = await apiGet('/api/account/settings');
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          setProfileName(data.profile?.name || me?.name || '');
          setProfileEmail(data.profile?.email || me?.email || '');
          setPrefEmailNotifs(Boolean(data.preferences?.emailNotifications ?? true));
          setPrefLanguage((data.preferences?.language || (typeof window!=='undefined' ? (localStorage.getItem('lang') as any) : 'es') || 'es'));
        }
      } finally { if(active) setSettingsLoading(false); }
    })();
    return ()=>{active=false};
  },[tab]);

  function toast(m: string){ setMsg(m); setTimeout(()=>setMsg(null), 2500); }

  async function saveProfile(){
    const res = await apiPatch('/api/account/profile', { name: profileName, email: profileEmail });
    if (res.ok) toast('Perfil actualizado'); else toast('Error al actualizar perfil');
  }
  async function changePassword(){
    const res = await apiPost('/api/account/password', { currentPassword: secCurrent, newPassword: secNew });
    if (res.ok){ toast('Contraseña actualizada'); setSecCurrent(''); setSecNew(''); } else toast('Error al actualizar contraseña');
  }
  async function savePrefs(){
    const res = await apiPatch('/api/account/preferences', { language: prefLanguage, emailNotifications: prefEmailNotifs });
    if (res.ok){
      try{ localStorage.setItem('lang', prefLanguage); window.dispatchEvent(new CustomEvent('lang-change', { detail: { lang: prefLanguage }})); }catch{}
      toast('Preferencias guardadas');
    } else toast('Error al guardar preferencias');
  }
  async function revokeSessions(){
    const res = await apiPost('/api/account/sessions/revoke-all', {});
    if (res.ok) toast('Sesiones cerradas'); else toast('Error al cerrar sesiones');
  }
  async function requestExport(){
    const res = await apiPost('/api/account/privacy/export', {});
    if (res.ok) toast('Solicitud de exportación enviada'); else toast('Error al solicitar exportación');
  }
  async function deleteAccount(){
    if (!confirm('¿Eliminar tu cuenta? Esta acción es permanente.')) return;
    const res = await apiDelete('/api/account');
    if (res.ok){ alert('Cuenta eliminada'); router.replace('/'); } else toast('Error al eliminar cuenta');
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><p className="text-white/70">Loading...</p></div>;
  if (error || !me) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">{t('accountTitle')}</h1>
      <p className="text-white/80 mb-4">{error || t('notSignedIn')}</p>
      <a href="/login" className="inline-block bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">{t('signIn')}</a>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">{t('accountTitle')}</h1>

      {/* Sub-nav */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-neutral-800 border border-black p-1 text-sm">
          <button onClick={()=>setTab('orders')} className={`px-3 py-1 rounded-full ${tab==='orders'?'bg-[#D4AF37] text-black':'text-white'}`}>{t('orders')}</button>
          <button onClick={()=>setTab('profile')} className={`px-3 py-1 rounded-full ${tab==='profile'?'bg-[#D4AF37] text-black':'text-white'}`}>{t('profile')}</button>
          <button onClick={()=>setTab('settings')} className={`px-3 py-1 rounded-full ${tab==='settings'?'bg-[#D4AF37] text-black':'text-white'}`}>{t('settings')}</button>
        </div>
        <button onClick={onLogout} disabled={pending} className="text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 rounded px-3 py-1.5 border border-black">{t('logout')}</button>
      </div>

      {/* Orders */}
      {tab==='orders' && (
        <div className="space-y-4">
          {orders===null ? (
            <p className="text-white/70">{t('loadingOrders')}</p>
          ) : orders.length===0 ? (
            <div className="bg-neutral-900 border border-black rounded p-6 text-white/70">{t('noOrders')}</div>
          ) : (
            orders.map((o:any) => (
              <div key={o._id} className="bg-neutral-900 border border-black rounded overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                  <div>
                    <div className="text-xs text-white/60">{t('order')}</div>
                    <div className="font-semibold">{displayOrderNumber(o)}</div>
                    <div className="text-xs text-white/50">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusClass(o.status)}`}>{formatStatus(o.status)}</span>
                </div>
                <div>

                  {(o.items||[]).map((it:any, idx:number) => (
                    <div key={it.sku || idx} className="flex items-center gap-3 p-4 border-b border-neutral-800 last:border-b-0">
                      <div className="w-14 h-14 rounded bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                        <img src={it.imageUrl || "/MULTI%20ELECTRCI%20LOGO_LE_upscale_balanced_x4.jpg"} alt={it.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{it.name}</div>
                        <div className="text-xs text-white/60">{t('qty')}: {it.qty}</div>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency((it.price||0) * (it.qty||1))}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 p-4">
                  <div className="text-sm text-white/60">{t('totalPaid')}</div>
                  <div className="text-sm font-semibold">{formatCurrency(o.total||0)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile */}
      {tab==='profile' && (
        <div className="bg-neutral-900 border border-black rounded p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-white/60">{t('name')}</div>
              <div className="font-medium">{me.name || '-'}</div>
            </div>
            <div>
              <div className="text-white/60">{t('email')}</div>
              <div className="font-medium">{me.email || '-'}</div>
            </div>
            {me.role !== 'customer' && (
              <div>
                <div className="text-white/60">{t('role')}</div>
                <div className="font-medium capitalize">{me.role || '-'}</div>
              </div>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={onLogout} disabled={pending} className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 rounded px-4 py-2 border border-black">{t('logout')}</button>
          </div>
        </div>
      )}

      {/* Settings */}
      {tab==='settings' && (
        <div className="bg-neutral-900 border border-black rounded p-4 space-y-6 text-sm">
          {msg && <div className="bg-green-600/15 text-green-300 border border-green-700 rounded px-3 py-2">{msg}</div>}
          {settingsLoading ? (
            <p className="text-white/70">Cargando configuración...</p>
          ) : (
            <>
              {/* Perfil */}
              <div className="space-y-3">
                <div className="font-semibold">{t('profile')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-white/60 mb-1">{t('name')}</div>
                    <input value={profileName} onChange={e=>setProfileName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    <div className="text-white/60 mb-1">{t('email')}</div>
                    <input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" />
                  </label>
                </div>
                <div>
                  <button onClick={saveProfile} className="bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">{t('profileSave')}</button>
                </div>
              </div>

              {/* Seguridad */}
              <div className="space-y-3">
                <div className="font-semibold">{t('security')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-white/60 mb-1">{t('currentPassword')}</div>
                    <input type="password" value={secCurrent} onChange={e=>setSecCurrent(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    <div className="text-white/60 mb-1">{t('newPassword')}</div>
                    <input type="password" value={secNew} onChange={e=>setSecNew(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" />
                  </label>
                </div>
                <div>
                  <button onClick={changePassword} className="bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">{t('updatePassword')}</button>
                </div>
              </div>

              {/* Preferencias */}
              <div className="space-y-3">
                <div className="font-semibold">{t('preferences')}</div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={prefEmailNotifs} onChange={e=>setPrefEmailNotifs(e.target.checked)} />
                    <span className="text-white/80">{t('emailNotifications')}</span>
                  </label>
                </div>
                <div className="max-w-xs">
                  <div className="text-white/60 mb-1">{t('language')}</div>
                  <select value={prefLanguage} onChange={e=>setPrefLanguage(e.target.value as any)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <button onClick={savePrefs} className="bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">{t('savePrefs')}</button>
                </div>
              </div>

              {/* Sesiones */}
              <div className="space-y-2">
                <div className="font-semibold">{t('sessions')}</div>
                <p className="text-white/70">{t('sessionsDesc')}</p>
                <button onClick={revokeSessions} className="bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">{t('closeOtherSessions')}</button>
              </div>

              {/* Privacidad */}
              <div className="space-y-2">
                <div className="font-semibold">{t('privacy')}</div>
                <button onClick={requestExport} className="bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">{t('requestExport')}</button>
              </div>

              {/* Zona de peligro */}
              <div className="space-y-2">
                <div className="font-semibold text-red-300">{t('dangerZone')}</div>
                <button onClick={deleteAccount} className="bg-red-700 hover:bg-red-600 rounded px-4 py-2 border border-black text-white">{t('deleteAccount')}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


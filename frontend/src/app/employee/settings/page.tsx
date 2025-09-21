"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import StoreInfoTab from "./components/StoreInfoTab";
import TemplatesTab from "./components/TemplatesTab";
import WebhooksTab from "./components/WebhooksTab";
import SecurityTab from "./components/SecurityTab";
import IntegrationsTab from "./components/IntegrationsTab";
import AccountTab from "./components/AccountTab";

export default function SettingsPage(){
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('');

  useEffect(()=>{ (async()=>{
    setLoading(true);
    const res = await apiGet('/api/me');
    const data = res.ok ? await res.json() : null;
    setMe(data); setLoading(false);
  })(); },[]);

  const tabs = useMemo(()=>{
    const p = me?.permissions || {};
    const list: { id:string; label:string }[] = [];
    if (p.canManageStoreSettings || p.canViewStoreSettings) list.push({ id:'store', label:'Store Info' });
    if (p.canManageEmailTemplates) list.push({ id:'templates', label:'Templates' });
    if (p.canManageWebhooks) list.push({ id:'webhooks', label:'Webhooks' });
    if (p.canManageSecurity) list.push({ id:'security', label:'Security' });
    if (p.canManageIntegrations) list.push({ id:'integrations', label:'Integrations' });
    list.push({ id:'account', label:'Account' });
    return list;
  }, [me]);

  useEffect(()=>{ if (!tab && tabs.length) setTab(tabs[0].id); }, [tabs, tab]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-white/50 text-sm">Portal configuration and account preferences</p>
      </div>
      {loading ? (<p className="text-white/70">Loading...</p>) : (
        <div>
          <div className="flex gap-2 mb-4">
            {tabs.map(t => (
              <button key={t.id} onClick={()=> setTab(t.id)} className={`px-3 py-1.5 rounded border text-sm ${tab===t.id? 'border-sky-700 bg-sky-900/30' : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800'}`}>{t.label}</button>
            ))}
          </div>

          {tab === 'store' && <StoreInfoTab canEdit={!!me?.permissions?.canManageStoreSettings} />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'webhooks' && <WebhooksTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'account' && <AccountTab />}
        </div>
      )}
    </div>
  );
}


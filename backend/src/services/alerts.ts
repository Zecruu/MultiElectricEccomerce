import { Response } from 'express';

export type Alert = {
  id: string;
  type: 'order';
  title: string;
  detail?: string;
  at: string; // ISO
  orderId: string;
  orderNumber: string;
  amount?: number;
  customerName?: string;
};

const recent: Alert[] = [];
const clients = new Set<Response>();

function send(res: Response, event: string, data: any){
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function subscribe(res: Response){
  clients.add(res);
  // Send hello + recent items
  send(res, 'hello', { t: Date.now() });
  send(res, 'prime', { recent });
}

export function unsubscribe(res: Response){
  clients.delete(res);
}

export function push(alert: Alert){
  recent.unshift(alert);
  if (recent.length > 50) recent.pop();
  for (const c of clients){
    try { send(c, 'alert', alert); } catch {}
  }
}

export function getRecent(){
  return recent;
}


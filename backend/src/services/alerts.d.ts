import { Response } from 'express';
export type Alert = {
    id: string;
    type: 'order';
    title: string;
    detail?: string;
    at: string;
    orderId: string;
    orderNumber: string;
    amount?: number;
    customerName?: string;
};
export declare function subscribe(res: Response): void;
export declare function unsubscribe(res: Response): void;
export declare function push(alert: Alert): void;
export declare function getRecent(): Alert[];
//# sourceMappingURL=alerts.d.ts.map
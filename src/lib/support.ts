export type Transaction = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  initials: string;
};
export type CaseStatus =
  'waiting_merchant' | 'waiting_receipt' | 'queued' | 'reviewing' | 'completed';
export type SupportCase = {
  id: string;
  protocol: string;
  transactionId: string;
  description: string;
  reason: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  transaction: Transaction;
  attachments: { id: string; name: string; size: number }[];
  events: { id: string; title: string; detail: string; at: string }[];
};
export type Dashboard = {
  transactions: Transaction[];
  cases: SupportCase[];
  guide: { title: string; url: string };
  integrations: { storage: string; queue: string; automation: boolean; simulationEnabled: boolean };
};
export const statusLabels: Record<CaseStatus, string> = {
  waiting_merchant: 'Aguardando a loja',
  waiting_receipt: 'Falta o comprovante',
  queued: 'Na fila de triagem',
  reviewing: 'Em análise',
  completed: 'Simulação concluída',
};
export const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(date.length === 10 ? date + 'T12:00:00' : date),
  );
export async function supportRequest<T>(path = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/support${path}`, { ...init, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.message === 'string'
        ? data.message
        : 'Não foi possível concluir esta ação. Confira os dados e tente novamente.',
    );
  }
  return data;
}

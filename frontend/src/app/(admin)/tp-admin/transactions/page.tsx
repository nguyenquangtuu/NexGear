'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatVND } from '@/lib/currency';
import {
  Search,
  Plus,
  Minus
} from 'lucide-react';
import AdminPagination from '../components/AdminPagination';

interface Transaction {
  id: number;
  transaction_code: string;
  user_name: string;
  user_email: string;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'BONUS';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  status: 'success' | 'pending' | 'failed';
  created_at: string;
}

const typeMap = {
  DEPOSIT: { label: 'Nạp tiền', className: 'bg-green-500/10 text-green-500', icon: Plus },
  PURCHASE: { label: 'Thanh toán', className: 'bg-red-500/10 text-red-500', icon: Minus },
  REFUND: { label: 'Hoàn tiền', className: 'bg-green-500/10 text-green-500', icon: Plus },
  BONUS: { label: 'Thưởng/Cộng', className: 'bg-green-500/10 text-green-500', icon: Plus },
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/transactions?page=${page}&search=${search}&type=${typeFilter}`);
      if (res.success) {
        setTransactions(res.data.transactions);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử giao dịch</h2>
          <p className="text-muted-foreground text-sm">Theo dõi toàn bộ biến động số dư trong hệ thống</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Mã giao dịch, email..." 
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-card border border-border rounded-xl outline-none text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tất cả loại GD</option>
            <option value="DEPOSIT">Nạp tiền</option>
            <option value="PURCHASE">Mua hàng</option>
            <option value="REFUND">Hoàn tiền</option>
            <option value="BONUS">Thưởng</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Mã giao dịch</th>
                <th className="px-6 py-4 font-semibold">Khách hàng</th>
                <th className="px-6 py-4 font-semibold">Loại</th>
                <th className="px-6 py-4 font-semibold text-right">Số tiền</th>
                <th className="px-6 py-4 font-semibold text-right">Số dư sau</th>
                <th className="px-6 py-4 font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8">
                      <div className="h-4 bg-secondary/50 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Không tìm thấy giao dịch nào
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const typeInfo = typeMap[tx.type] || { label: tx.type, className: 'bg-secondary text-muted-foreground', icon: Plus };
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <tr key={tx.transaction_code} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-bold">{tx.transaction_code}</div>
                        <div className="text-[10px] text-muted-foreground truncate w-40" title={tx.description}>
                          {tx.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{tx.user_name}</div>
                        <div className="text-xs text-muted-foreground">{tx.user_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${typeInfo.className}`}>
                          <TypeIcon size={10} />
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right ${
                        tx.type === 'DEPOSIT' || tx.type === 'BONUS' || tx.type === 'REFUND' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {tx.type === 'DEPOSIT' || tx.type === 'BONUS' || tx.type === 'REFUND' ? '+' : '-'}{formatVND(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-right text-muted-foreground">
                        {formatVND(tx.balance_after)}
                      </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('vi-VN')}
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

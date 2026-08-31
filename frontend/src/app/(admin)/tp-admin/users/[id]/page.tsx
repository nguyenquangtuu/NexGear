'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatVND } from '@/lib/currency';
import { ArrowLeft, Ban, Save, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';

type UserRole = 'USER' | 'ADMIN';

interface RecentTransaction {
  id: number;
  transaction_code: string;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'BONUS';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  status: 'success' | 'pending' | 'failed';
  created_at: string;
}

interface RecentOrder {
  id: number;
  order_code: string;
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
}

interface UserDetail {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  balance: number;
  total_deposit: number;
  is_email_verified: boolean;
  is_blocked: boolean;
  block_reason: string | null;
  created_at: string;
  recentTransactions: RecentTransaction[];
  recentOrders: RecentOrder[];
}

export default function AdminUserEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id;

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);

  const [user, setUser] = useState<UserDetail | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('USER');

  const [balanceAction, setBalanceAction] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [countAsDeposit, setCountAsDeposit] = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const [txTab, setTxTab] = useState<'ALL' | 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'BONUS'>('ALL');
  const [orderTab, setOrderTab] = useState<'ALL' | 'PENDING_PAYMENT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const canSubmitBalance = useMemo(() => {
    return Number(balanceAmount) > 0 && balanceReason.trim().length >= 3;
  }, [balanceAmount, balanceReason]);

  const filteredTransactions = useMemo(() => {
    if (!user?.recentTransactions) return [];
    if (txTab === 'ALL') return user.recentTransactions;
    return user.recentTransactions.filter((tx) => tx.type === txTab);
  }, [user?.recentTransactions, txTab]);

  const filteredOrders = useMemo(() => {
    if (!user?.recentOrders) return [];
    if (orderTab === 'ALL') return user.recentOrders;
    return user.recentOrders.filter((order) => order.status === orderTab);
  }, [user?.recentOrders, orderTab]);

  const selectedTransaction = useMemo(() => {
    if (!selectedTxId || !user?.recentTransactions) return null;
    return user.recentTransactions.find((tx) => tx.id === selectedTxId) || null;
  }, [selectedTxId, user?.recentTransactions]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId || !user?.recentOrders) return null;
    return user.recentOrders.find((order) => order.id === selectedOrderId) || null;
  }, [selectedOrderId, user?.recentOrders]);

  const fetchUser = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/users/${userId}`);
      if (res.success) {
        const data: UserDetail = res.data;
        setUser(data);
        setEmail(data.email);
        setFullName(data.full_name);
        setRole(data.role);
        setIsBlocked(!!data.is_blocked);
        setBlockReason(data.block_reason || '');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tải thông tin người dùng');
      router.push('/tp-admin/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const submitProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await apiFetch(`/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email,
          full_name: fullName,
          role,
        }),
      });
      if (res.success) {
        toast.success('Cập nhật thông tin thành công');
        await fetchUser();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Cập nhật thông tin thất bại');
    } finally {
      setSavingProfile(false);
    }
  };

  const submitBalance = async () => {
    if (!user || !canSubmitBalance) return;
    setSavingBalance(true);
    try {
      const res = await apiFetch(`/admin/users/${user.id}/balance`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: balanceAction,
          amount: Number(balanceAmount),
          reason: balanceReason,
          countAsDeposit,
        }),
      });
      if (res.success) {
        toast.success('Đã cập nhật số dư');
        setBalanceAmount('');
        setBalanceReason('');
        setCountAsDeposit(false);
        await fetchUser();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Cập nhật số dư thất bại');
    } finally {
      setSavingBalance(false);
    }
  };

  const submitBlockStatus = async () => {
    if (!user) return;
    if (isBlocked && blockReason.trim().length < 3) {
      toast.error('Lý do chặn tối thiểu 3 ký tự');
      return;
    }

    setSavingBlock(true);
    try {
      const res = await apiFetch(`/admin/users/${user.id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({
          isBlocked,
          blockReason,
        }),
      });
      if (res.success) {
        toast.success(isBlocked ? 'Đã chặn user' : 'Đã mở chặn user');
        await fetchUser();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Cập nhật trạng thái chặn thất bại');
    } finally {
      setSavingBlock(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-secondary/50 rounded animate-pulse" />
        <div className="h-72 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground mb-2">
            <Link href="/tp-admin/users" className="inline-flex items-center gap-1 hover:underline">
              <ArrowLeft size={14} /> Quay lại danh sách user
            </Link>
          </div>
          <h2 className="text-2xl font-bold">Chỉnh sửa người dùng #{user.id}</h2>
          <p className="text-muted-foreground text-sm">Quản lý hồ sơ, ví tiền và quyền truy cập hệ thống</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-bold">Thông tin cơ bản</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Họ và tên</label>
              <input
                className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Vai trò</label>
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground flex flex-col justify-end pb-2">
              <span>Xác minh email: {user.is_email_verified ? 'Đã xác minh' : 'Chưa xác minh'}</span>
              <span>Ngày tạo: {new Date(user.created_at).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <button
            onClick={submitProfile}
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-60"
          >
            <Save size={16} />
            {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 h-fit">
          <h3 className="text-lg font-bold">Tổng quan ví</h3>
          <div className="text-sm text-muted-foreground">Số dư hiện tại</div>
          <div className="text-2xl font-black text-green-500">{formatVND(user.balance)}</div>
          <div className="text-sm text-muted-foreground">Tổng nạp đã tính</div>
          <div className="text-xl font-bold">{formatVND(user.total_deposit)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Wallet size={18} /> Cộng / trừ tiền
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Thao tác</label>
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none"
                value={balanceAction}
                onChange={(e) => setBalanceAction(e.target.value as 'ADD' | 'SUBTRACT')}
              >
                <option value="ADD">Cộng tiền</option>
                <option value="SUBTRACT">Trừ tiền</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Số tiền</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="VD: 50000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Lý do</label>
            <textarea
              className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none min-h-24"
              placeholder="Nhập lý do cộng/trừ tiền"
              value={balanceReason}
              onChange={(e) => setBalanceReason(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={countAsDeposit}
              disabled={balanceAction === 'SUBTRACT'}
              onChange={(e) => setCountAsDeposit(e.target.checked)}
            />
            Cộng vào tổng nạp (chỉ áp dụng khi cộng tiền)
          </label>

          <button
            onClick={submitBalance}
            disabled={savingBalance || !canSubmitBalance}
            className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-60"
          >
            {savingBalance ? 'Đang xử lý...' : 'Xác nhận cập nhật số dư'}
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Ban size={18} /> Chặn truy cập hệ thống
          </h3>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} />
            Khóa tài khoản user này
          </label>

          <div>
            <label className="block text-sm mb-2">Lý do chặn</label>
            <textarea
              className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none min-h-24"
              placeholder="Nhập lý do chặn"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              disabled={!isBlocked}
            />
          </div>

          <button
            onClick={submitBlockStatus}
            disabled={savingBlock}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:opacity-90 disabled:opacity-60"
          >
            {savingBlock ? 'Đang cập nhật...' : isBlocked ? 'Lưu trạng thái chặn' : 'Mở chặn tài khoản'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border space-y-3">
            <h3 className="font-bold">Giao dịch gần đây</h3>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'DEPOSIT', 'PURCHASE', 'REFUND', 'BONUS'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTxTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    txTab === tab ? 'bg-primary text-white border-primary' : 'bg-background border-border hover:bg-secondary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Mã GD</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.length ? (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTxId(tx.id)}
                      className={`cursor-pointer hover:bg-secondary/20 ${selectedTxId === tx.id ? 'bg-secondary/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{tx.transaction_code}</td>
                      <td className="px-4 py-3">{tx.type}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatVND(tx.amount)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Không có giao dịch cho tab này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedTransaction && (
            <div className="px-6 py-4 border-t border-border bg-secondary/10 text-sm space-y-2">
              <div className="font-bold">Chi tiết giao dịch</div>
              <div>Mã GD: <span className="font-mono">{selectedTransaction.transaction_code}</span></div>
              <div>Loại: {selectedTransaction.type}</div>
              <div>Trạng thái: {selectedTransaction.status}</div>
              <div>Số dư trước: {formatVND(selectedTransaction.balance_before)}</div>
              <div>Số dư sau: {formatVND(selectedTransaction.balance_after)}</div>
              <div>Lý do: {selectedTransaction.description || '—'}</div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border space-y-3">
            <h3 className="font-bold">Đơn hàng gần đây</h3>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'PENDING_PAYMENT', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setOrderTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    orderTab === tab ? 'bg-primary text-white border-primary' : 'bg-background border-border hover:bg-secondary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Tổng tiền</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.length ? (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`cursor-pointer hover:bg-secondary/20 ${selectedOrderId === order.id ? 'bg-secondary/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{order.order_code}</td>
                      <td className="px-4 py-3">{order.status}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatVND(order.total_amount)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Không có đơn hàng cho tab này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedOrder && (
            <div className="px-6 py-4 border-t border-border bg-secondary/10 text-sm space-y-2">
              <div className="font-bold">Chi tiết đơn hàng</div>
              <div>Mã đơn: <span className="font-mono">{selectedOrder.order_code}</span></div>
              <div>Trạng thái: {selectedOrder.status}</div>
              <div>Tạm tính: {formatVND(selectedOrder.subtotal_amount)}</div>
              <div>Giảm giá: {formatVND(selectedOrder.discount_amount)}</div>
              <div>Tổng tiền: {formatVND(selectedOrder.total_amount)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

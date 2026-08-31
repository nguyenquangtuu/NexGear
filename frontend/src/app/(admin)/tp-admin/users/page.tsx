'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatVND } from '@/lib/currency';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import AdminPagination from '../components/AdminPagination';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  balance: number;
  is_email_verified: boolean;
  is_blocked: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/users?page=${page}&search=${search}`);
      if (res.success) {
        setUsers(res.data.users);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
          <p className="text-muted-foreground text-sm">Xem và quản lý tất cả thành viên trong hệ thống</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo email, tên..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-6 py-4 font-semibold text-center">Vai trò</th>
                <th className="px-6 py-4 font-semibold">Số dư</th>
                <th className="px-6 py-4 font-semibold text-center">Xác minh</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-semibold">Ngày tham gia</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8">
                      <div className="h-4 bg-secondary/50 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {user.role === 'ADMIN' ? <Shield size={12} /> : <Users size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-500">{formatVND(user.balance)}</td>
                    <td className="px-6 py-4 text-center">
                      {user.is_email_verified ? (
                        <CheckCircle2 size={20} className="text-green-500 mx-auto" />
                      ) : (
                        <XCircle size={20} className="text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.is_blocked ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                        }`}
                      >
                        {user.is_blocked ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
                        {user.is_blocked ? 'Đã chặn' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/tp-admin/users/${user.id}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold"
                      >
                        <Edit2 size={14} />
                        Chỉnh sửa
                      </Link>
                    </td>
                  </tr>
                ))
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

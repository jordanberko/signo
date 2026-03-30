'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Search, ShieldCheck, Palette, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'artist' | 'buyer' | 'admin'>('all');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  async function fetchUsers() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data } = await query;
    if (data) setUsers(data as User[]);
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: 'buyer' | 'artist' | 'admin') {
    const supabase = createClient();
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
    fetchUsers();
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const roleBadge: Record<string, { bg: string; icon: typeof Users }> = {
    admin: { bg: 'bg-purple-50 text-purple-700', icon: ShieldCheck },
    artist: { bg: 'bg-amber-50 text-amber-700', icon: Palette },
    buyer: { bg: 'bg-blue-50 text-blue-700', icon: ShoppingBag },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted mt-1">View and manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'artist', 'buyer', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role as typeof roleFilter)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                roleFilter === role
                  ? 'bg-primary text-white'
                  : 'bg-muted-bg text-foreground hover:bg-gray-200'
              }`}
            >
              {role === 'all' ? 'All' : `${role}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border bg-muted-bg">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Location</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const badge = roleBadge[user.role] || roleBadge.buyer;
                return (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted-bg/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                          {user.avatar_url && <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded capitalize ${badge.bg}`}>
                        <badge.icon className="h-3 w-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted">{user.location || '—'}</td>
                    <td className="p-4 text-sm text-muted">
                      {new Date(user.created_at).toLocaleDateString('en-AU')}
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value as 'buyer' | 'artist' | 'admin')}
                        className="text-xs border border-border rounded px-2 py-1 bg-white"
                      >
                        <option value="buyer">Buyer</option>
                        <option value="artist">Artist</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-10 text-center text-muted">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}

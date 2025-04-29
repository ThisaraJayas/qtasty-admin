import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  verified: boolean;
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

const UserTransactionsPage = () => {
  const [orderCounts, setOrderCounts] = useState<{ [key: string]: number }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8084/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      handleError(error, 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async (userId: string) => {
    try {
      const response = await axios.get(`http://localhost:8084/api/orders/user/${userId}`);
      setUserOrders(response.data);
      setOrderCounts(prev => ({
        ...prev,
        [userId]: response.data.length
      }));
    } catch (error) {
      handleError(error, 'Failed to fetch orders');
    }
  };

  const handleError = (error: unknown, defaultMessage: string) => {
    if (axios.isAxiosError(error)) {
      toast.error(error.response?.data?.message || defaultMessage);
    } else {
      toast.error(defaultMessage);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    await fetchUserOrders(user.id);
  };

  const handleGenerateTransaction = async () => {
    if (!selectedUser) return;

    const totalAmount = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    try {
      await axios.post('http://localhost:8086/api/transactions', {
        userId: selectedUser.id,
        userName: selectedUser.name,
        totalAmount: totalAmount,
        orders: userOrders.map(order => ({
          orderId: order.id,
          orderDate: new Date(order.createdAt),
          orderTotal: order.totalAmount,
          status: order.status,
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        }))
      });
      toast.success('Transaction generated successfully');
      setSelectedUser(null);
    } catch (error) {
      handleError(error, 'Failed to generate transaction');
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Transactions</h1>
        <Link 
          to="/transactions"
          className="bg-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-200 text-indigo-700 transition-colors"
        >
          Back to Overview
        </Link>
      </div>

      {/* Search Box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 w-full border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Orders</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentUsers.map(user => (
              <tr 
                key={user.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleUserClick(user)}
              >
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">{user.phone}</td>
                <td className="px-6 py-4">{orderCounts[user.id] || 0}</td>
                <td className="px-6 py-4">
                  <button className="text-indigo-600 hover:text-indigo-900">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 bg-gray-50">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                {selectedUser.name}'s Orders
              </h2>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Order ID</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Items</th>
                    <th className="px-4 py-2 text-left">Total</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userOrders.map(order => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">#{order.id.slice(-6)}</td>
                      <td className="px-4 py-3">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {order.items.map(item => (
                          <div key={item.name} className="flex justify-between">
                            <span>{item.name}</span>
                            <span className="text-gray-500">
                              x{item.quantity} (${item.price})
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <div className="font-bold text-lg">
                Total: $$
                {userOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
              </div>
              <button
                onClick={handleGenerateTransaction}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTransactionsPage;

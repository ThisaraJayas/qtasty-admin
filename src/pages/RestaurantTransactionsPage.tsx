import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

interface Restaurant {
  id: string;
  name: string;
  owner: string;
  address: string;
  rating: number;
  isVerified: boolean;
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

const RestaurantTransactionsPage = () => {
  const [orderCounts, setOrderCounts] = useState<{ [key: string]: number }>({});
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantOrders, setRestaurantOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  console.log(restaurants);
  const fetchRestaurants = async () => {
    try {
      const response = await axios.get('http://localhost:8084/api/admin/restaurants');
      setRestaurants(response.data);
      console.log(response.data);
    } catch (error) {
      handleError(error, 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantOrders = async (restaurantId: string) => {
    try {
      const response = await axios.get(`http://localhost:8084/api/orders/restaurant/${restaurantId}`);
      setRestaurantOrders(response.data);
      setOrderCounts(prev => ({
        ...prev,
        [restaurantId]: response.data.length
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
    fetchRestaurants();
  }, []);

  const handleRestaurantClick = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    await fetchRestaurantOrders(restaurant.id);
  };

  const handleGenerateTransaction = async () => {
    if (!selectedRestaurant) return;

    const totalAmount = restaurantOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    try {
      await axios.post('http://localhost:8084/api/transactions', {
        userId: selectedRestaurant.id,
        userName: selectedRestaurant.name,
        totalAmount: totalAmount,
        orders: restaurantOrders.map(order => ({
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
      setSelectedRestaurant(null);
    } catch (error) {
      handleError(error, 'Failed to generate transaction');
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const currentRestaurants = filteredRestaurants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);

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
        <h1 className="text-3xl font-bold text-gray-800">Restaurant Transactions</h1>
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
          placeholder="Search by restaurant name..."
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Owner</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Location</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Orders</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentRestaurants.map(restaurant => (
              <tr 
                key={restaurant.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <td className="px-6 py-4">{restaurant.name}</td>
                <td className="px-6 py-4">{restaurant.owner}</td>
                <td className="px-6 py-4">{restaurant.address}</td>
                <td className="px-6 py-4">{orderCounts[restaurant.id] || 0}</td>
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
      {selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                {selectedRestaurant.name}'s Orders
              </h2>
              <button 
                onClick={() => setSelectedRestaurant(null)}
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
                  {restaurantOrders.map(order => (
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
                Total: $
                {restaurantOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
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

export default RestaurantTransactionsPage;

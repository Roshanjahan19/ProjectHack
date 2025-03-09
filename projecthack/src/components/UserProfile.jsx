import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const navigate = useNavigate();
  
  // New states for transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: ''
  });
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get current authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Authentication error:', authError);
          setLoading(false);
          return;
        }
        
        if (!authData.user) {
          console.log('No authenticated user found');
          navigate('/login');
          return;
        }
        
        setUser(authData.user);
        console.log('Current user:', authData.user);
        
        // Fetch user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          
          // If profile doesn't exist, create one
          if (profileError.code === 'PGRST116') {
            console.log('Profile not found, creating new profile');
            const newProfile = {
              user_id: authData.user.id,
              email: authData.user.email,
              username: '',
              balance: 0,
              spending_history: []
            };
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile);
              
            if (insertError) {
              console.error('Error creating profile:', insertError);
            } else {
              setUserData(newProfile);
              setEditedData(newProfile);
            }
          }
        } else {
          console.log('Profile data loaded:', profileData);
          setUserData(profileData);
          setEditedData(profileData);
          
          // If profile has spending_history, parse it
          if (profileData.spending_history) {
            try {
              // If spending_history is stored as a JSON string
              if (typeof profileData.spending_history === 'string') {
                setTransactions(JSON.parse(profileData.spending_history));
              } else {
                // If it's already an array
                setTransactions(profileData.spending_history);
              }
            } catch (e) {
              console.error('Error parsing spending history:', e);
              setTransactions([]);
            }
          }
        }
      } catch (error) {
        console.error('Unexpected error during profile fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Function to add a new transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    if (!newTransaction.amount || !newTransaction.description) {
      alert('Please enter both amount and description');
      return;
    }
    
    try {
      setTransactionLoading(true);
      
      const amount = parseFloat(newTransaction.amount);
      
      // Create new transaction object
      const transactionData = {
        id: Date.now(), // Simple unique ID
        date: newTransaction.date,
        amount: amount,
        description: newTransaction.description
      };
      
      // Add to existing transactions
      const updatedTransactions = [transactionData, ...transactions];
      
      // Update balance
      const newBalance = userData.balance + amount;
      
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ 
          balance: newBalance,
          spending_history: updatedTransactions
        })
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating profile with transaction:', error);
        alert(`Failed to add transaction: ${error.message}`);
        return;
      }
      
      // Update local state
      setUserData({
        ...userData,
        balance: newBalance,
        spending_history: updatedTransactions
      });
      setTransactions(updatedTransactions);
      
      // Reset form
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: ''
      });
      
      setShowTransactionForm(false);
    } catch (error) {
      console.error('Unexpected error adding transaction:', error);
      alert('An unexpected error occurred while adding your transaction.');
    } finally {
      setTransactionLoading(false);
    }
  };

  // Function to delete a transaction
  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    try {
      setTransactionLoading(true);
      
      // Find the transaction to delete
      const transactionToDelete = transactions.find(t => t.id === transactionId);
      if (!transactionToDelete) {
        alert('Transaction not found');
        return;
      }
      
      // Filter out the transaction
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      
      // Update balance (reverse the transaction)
      const newBalance = userData.balance - transactionToDelete.amount;
      
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ 
          balance: newBalance,
          spending_history: updatedTransactions
        })
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating profile after transaction delete:', error);
        alert(`Failed to delete transaction: ${error.message}`);
        return;
      }
      
      // Update local state
      setUserData({
        ...userData,
        balance: newBalance,
        spending_history: updatedTransactions
      });
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Unexpected error deleting transaction:', error);
      alert('An unexpected error occurred while deleting your transaction.');
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error logging out:', error);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Unexpected error during logout:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaveStatus('saving');
      console.log('Attempting to save profile for user ID:', user.id);
      console.log('Data being saved:', editedData);
      
      // Use update to modify profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: editedData.username || ''
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating profile:', error);
        setSaveStatus('error');
        alert(`Failed to update profile: ${error.message}`);
      } else {
        console.log('Profile updated successfully:', data);
        // Update local state
        const updatedUserData = {
          ...userData,
          username: editedData.username || ''
        };
        
        setUserData(updatedUserData);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 2000);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Unexpected error during profile update:', err);
      setSaveStatus('error');
      alert('An unexpected error occurred while saving your profile.');
    }
  };

  const handleCancelEdit = () => {
    setEditedData({...userData});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-xl text-gray-700">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full p-8 bg-white min-h-screen">
      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - User Info */}
        <div className="col-span-1 bg-white shadow-lg rounded-lg p-6 h-fit">
          <div className="flex flex-col items-center mb-6">
            <div className="w-32 h-32 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white text-4xl mb-4">
              {userData?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{userData?.username || 'User'}</h2>
            <p className="text-gray-600">{user?.email}</p>
          </div>
          
          {/* Dashboard Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition duration-200"
          >
            See Dashboard
          </button>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
        
        
        {/* Right Column - Main Content */}
        <div className="col-span-2 space-y-8">
          {/* Profile Edit Section */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Your Profile</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition duration-200"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-8 rounded transition duration-200 text-lg"
                    disabled={saveStatus === 'saving'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-500 hover:bg-green-600 text-white py-3 px-8 rounded transition duration-200 text-lg"
                    disabled={saveStatus === 'saving'}
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
            
            {saveStatus === 'success' && (
              <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                Profile updated successfully!
              </div>
            )}
            
            {saveStatus === 'error' && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error updating profile. Please try again.
              </div>
            )}
            
            {isEditing ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={editedData.username || ''}
                    onChange={(e) => setEditedData({ ...editedData, username: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-gray-600 mb-1">Username</p>
                  <p className="text-lg font-medium">{userData?.username || 'Not set'}</p>
                </div>
              </div>
            )}
          </div>     

          {/* Finances Section */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Your Finances</h3>
              <div className="bg-blue-100 text-blue-800 py-2 px-4 rounded-lg font-bold">
                Balance: ${(parseFloat(userData?.balance || 0)).toFixed(2)}
              </div>
            </div>
            
            {/* Transaction Form Toggle Button */}
            <div className="mb-4">
              <button
                onClick={() => setShowTransactionForm(!showTransactionForm)}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition duration-200"
              >
                {showTransactionForm ? 'Cancel' : 'Add Transaction'}
              </button>
            </div>
            
            {/* Transaction Form */}
            {showTransactionForm && (
              <form onSubmit={handleAddTransaction} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">Add New Transaction</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-gray-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="123.45 (use negative for expenses)"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-gray-800"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      placeholder="Salary, Rent, Groceries..."
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-gray-800"
                      required
                    />
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={transactionLoading}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg transition duration-200"
                  >
                    {transactionLoading ? 'Saving...' : 'Save Transaction'}
                  </button>
                </div>
              </form>
            )}
            
            <h4 className="text-xl font-semibold text-gray-700 mb-4">Recent Transactions</h4>
            
            {transactionLoading && !showTransactionForm ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading transactions...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No transactions found. Add your first transaction above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.description}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount >= 0 ? '+' : ''}{parseFloat(transaction.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete transaction"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4 text-right">
              <button 
                onClick={() => alert('View all transactions functionality coming soon!')}
                className="text-blue-500 hover:text-blue-700 font-medium"
              >
                View All Transactions →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
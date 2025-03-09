// TransactionAPI.js - API service for handling transaction-related operations
import { supabase } from '../supabaseClient';

export const TransactionAPI = {
  /**
   * Fetch all transactions for the current user
   * @param {Object} options - Query options (limit, offset, startDate, endDate)
   * @returns {Promise} - Promise resolving to transactions data
   */
  getUserTransactions: async (options = {}) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Build query
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('date', { ascending: false });
      
      // Apply filters if provided
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { 
        data,
        success: true
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Add a new transaction for the current user
   * @param {Object} transactionData - Transaction details (date, amount, description, category)
   * @returns {Promise} - Promise resolving to operation result
   */
  addTransaction: async (transactionData) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Validate transaction data
      if (!transactionData.amount) throw new Error('Transaction amount is required');
      if (!transactionData.description) throw new Error('Transaction description is required');
      
      const newTransaction = {
        user_id: userData.user.id,
        date: transactionData.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(transactionData.amount),
        description: transactionData.description,
        category: transactionData.category || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Insert transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert(newTransaction)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update user balance
      await updateUserBalance(userData.user.id, newTransaction.amount);
      
      return {
        data,
        success: true,
        message: 'Transaction added successfully'
      };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Update an existing transaction
   * @param {string} transactionId - ID of the transaction to update
   * @param {Object} updates - Fields to update
   * @returns {Promise} - Promise resolving to operation result
   */
  updateTransaction: async (transactionId, updates) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Get original transaction to calculate balance adjustment
      const { data: originalTx, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userData.user.id)
        .single();
      
      if (fetchError) throw fetchError;
      if (!originalTx) throw new Error('Transaction not found');
      
      // Create update data
      const updateData = {
        ...updates,
        updated_at: new Date()
      };
      
      // If amount is being updated, ensure it's a number
      if (updateData.amount !== undefined) {
        updateData.amount = parseFloat(updateData.amount);
      }
      
      // Update transaction
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .eq('user_id', userData.user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update user balance if amount changed
      if (updateData.amount !== undefined && updateData.amount !== originalTx.amount) {
        const amountDifference = updateData.amount - originalTx.amount;
        await updateUserBalance(userData.user.id, amountDifference);
      }
      
      return {
        data,
        success: true,
        message: 'Transaction updated successfully'
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Delete a transaction
   * @param {string} transactionId - ID of the transaction to delete
   * @returns {Promise} - Promise resolving to operation result
   */
  deleteTransaction: async (transactionId) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Get transaction before deleting to know the amount
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('id', transactionId)
        .eq('user_id', userData.user.id)
        .single();
      
      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transaction not found');
      
      // Delete transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      
      // Update user balance (reverse the transaction amount)
      await updateUserBalance(userData.user.id, -transaction.amount);
      
      return {
        success: true,
        message: 'Transaction deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Get transaction statistics
   * @param {Object} options - Query options (startDate, endDate)
   * @returns {Promise} - Promise resolving to statistics data
   */
  getTransactionStats: async (options = {}) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Build transaction query with date filters
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userData.user.id);
      
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }
      
      // Execute query
      const { data: transactions, error } = await query;
      
      if (error) throw error;
      
      // Calculate statistics
      const stats = {
        totalIncome: 0,
        totalExpenses: 0,
        netChange: 0,
        categories: {},
        byMonth: {}
      };
      
      transactions.forEach(tx => {
        // Track income vs expenses
        if (tx.amount > 0) {
          stats.totalIncome += tx.amount;
        } else {
          stats.totalExpenses += Math.abs(tx.amount);
        }
        stats.netChange += tx.amount;
        
        // Track by category
        const category = tx.category || 'Uncategorized';
        if (!stats.categories[category]) {
          stats.categories[category] = {
            total: 0,
            count: 0
          };
        }
        stats.categories[category].total += tx.amount;
        stats.categories[category].count += 1;
        
        // Track by month
        const month = tx.date.substring(0, 7); // YYYY-MM format
        if (!stats.byMonth[month]) {
          stats.byMonth[month] = {
            income: 0,
            expenses: 0,
            net: 0
          };
        }
        
        if (tx.amount > 0) {
          stats.byMonth[month].income += tx.amount;
        } else {
          stats.byMonth[month].expenses += Math.abs(tx.amount);
        }
        stats.byMonth[month].net += tx.amount;
      });
      
      return {
        data: stats,
        success: true
      };
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      return {
        error: error.message,
        success: false
      };
    }
  }
};

/**
 * Helper function to update user balance
 * @param {string} userId - User ID
 * @param {number} amountChange - Amount to adjust balance by
 * @returns {Promise} - Promise resolving when balance is updated
 */
const updateUserBalance = async (userId, amountChange) => {
  try {
    // Get current balance
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    const currentBalance = profileData?.balance || 0;
    const newBalance = currentBalance + amountChange;
    
    // Update balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        updated_at: new Date()
      })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    return true;
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
};

export default TransactionAPI;
import api from './api';

export const categorizeExpense = async (title) => {
  if (!title) return "Other";
  
  try {
    const { data } = await api.post('/ai/categorize', { title });
    return data.category || "Other";
  } catch (error) {
    console.error("Frontend AI categorization error:", error);
    return "Other";
  }
};

export const getSpendingInsights = async (expenses) => {
  if (!expenses || expenses.length === 0) return "Add some expenses to see insights!";
  
  try {
    const { data } = await api.post('/ai/insights', { expenses });
    return data.insight || "Keep tracking your spending!";
  } catch (error) {
    console.error("Frontend AI insights error:", error);
    return "Insights are taking a break right now.";
  }
};

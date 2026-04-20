import dotenv from 'dotenv';
dotenv.config();

// Rule-based categorization (no external AI dependency needed)
const CATEGORY_KEYWORDS = {
  Food: ['food', 'dinner', 'lunch', 'breakfast', 'pizza', 'burger', 'restaurant', 'cafe', 'coffee', 'meal', 'snack', 'groceries', 'grocery', 'eat', 'drink', 'beer', 'wine', 'swiggy', 'zomato'],
  Travel: ['uber', 'ola', 'cab', 'taxi', 'flight', 'hotel', 'trip', 'travel', 'bus', 'train', 'petrol', 'fuel', 'toll', 'parking', 'airbnb', 'booking'],
  Rent: ['rent', 'lease', 'accommodation', 'flat', 'room', 'house', 'apartment', 'hostel', 'maintenance'],
  Entertainment: ['movie', 'netflix', 'spotify', 'prime', 'disney', 'game', 'concert', 'show', 'tickets', 'bowling', 'golf', 'sport', 'gym', 'club'],
  Shopping: ['shopping', 'amazon', 'flipkart', 'clothes', 'shoes', 'shirt', 'dress', 'purchase', 'buy', 'bought', 'market'],
  Utilities: ['electric', 'electricity', 'water', 'internet', 'wifi', 'phone', 'bill', 'gas', 'recharge', 'dth'],
  Health: ['doctor', 'medicine', 'pharmacy', 'hospital', 'medical', 'health', 'gym', 'fitness'],
};

const categorize = (title) => {
  if (!title) return 'Other';
  const lower = title.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'Other';
};

export const categorizeExpense = async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    // Try Google GenAI if key exists, otherwise fall back to rule-based
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai').catch(() => null) || {};
        if (GoogleGenerativeAI) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const prompt = `Categorize this expense: "${title}". Respond with only one word from: Food, Travel, Rent, Entertainment, Shopping, Utilities, Health, Other.`;
          const result = await model.generateContent(prompt);
          const category = result.response.text().trim().split('\n')[0] || 'Other';
          return res.json({ category });
        }
      } catch (aiErr) {
        console.warn('AI categorization unavailable, using rule-based:', aiErr.message);
      }
    }
    // Fallback: rule-based categorization
    res.json({ category: categorize(title) });
  } catch (error) {
    console.error('Categorization error:', error);
    res.json({ category: categorize(title) });
  }
};

export const getSpendingInsights = async (req, res) => {
  const { expenses } = req.body;
  if (!expenses || expenses.length === 0) {
    return res.json({ insight: 'Add some expenses to see insights!' });
  }

  try {
    // Try Google GenAI if key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai').catch(() => null) || {};
        if (GoogleGenerativeAI) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const dataString = expenses.map(e => `${e.description || e.title}: $${e.amount}`).join(', ');
          const prompt = `Analyze these expenses and give one friendly, helpful sentence of financial advice: ${dataString}`;
          const result = await model.generateContent(prompt);
          const insight = result.response.text().trim() || 'Keep tracking your spending!';
          return res.json({ insight });
        }
      } catch (aiErr) {
        console.warn('AI insights unavailable, using rule-based:', aiErr.message);
      }
    }
    // Fallback: basic stats insight
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgPerExpense = total / expenses.length;
    res.json({ insight: `You've tracked ${expenses.length} expenses totaling $${total.toFixed(2)} — averaging $${avgPerExpense.toFixed(2)} each. Keep it up!` });
  } catch (error) {
    console.error('Insights error:', error);
    res.json({ insight: 'Keep on top of your split expenses!' });
  }
};

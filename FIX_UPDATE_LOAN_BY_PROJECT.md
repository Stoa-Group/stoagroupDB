# Fix: updateLoanByProject is not defined

## Quick Fix

Add this function to your `app.js` file, near where your other API functions are defined (like `updateLoan`, `updateProject`, etc.):

```javascript
/**
 * Update loan by ProjectId - convenience function for Domo
 * Updates the construction loan (or first loan) for a project
 * @param {number} projectId - The ProjectId
 * @param {object} updates - The fields to update (e.g., { Spread: "0.75%" })
 * @returns {Promise} API response
 */
async function updateLoanByProject(projectId, updates) {
  const API_BASE_URL = 'https://stoagroupdb.onrender.com';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/banking/loans/project/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || `API Error: ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}
```

## Where to Add It

Add this function **before** the `savePropertyChanges` function in your `app.js` file. It should be in the same scope where `updateLoan` and `updateProject` are defined.

## Alternative: Copy Entire api-client.js

If you want all the API functions available, you can copy the entire `api-client.js` file content into your Domo app. The functions will then all be available.

## Verification

After adding the function, your `savePropertyChanges` function should work correctly when it calls `updateLoanByProject(projectId, changedLoanFields)`.

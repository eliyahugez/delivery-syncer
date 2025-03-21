
// Utility function to catch and format errors
export function formatError(error: any): { message: string, details?: any } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack?.split("\n").slice(0, 3).join("\n")
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return { 
    message: 'Unknown error', 
    details: JSON.stringify(error)
  };
}

// Handler for common API errors 
export async function safeApiCall<T>(apiCall: () => Promise<T>): Promise<{ data?: T, error?: any }> {
  try {
    const result = await apiCall();
    return { data: result };
  } catch (error) {
    const formattedError = formatError(error);
    console.error('API call failed:', formattedError);
    return { error: formattedError };
  }
}

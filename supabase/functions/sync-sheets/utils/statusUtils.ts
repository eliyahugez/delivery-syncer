// Enhanced function to normalize status values
export function normalizeStatus(status: string): string {
  if (!status) return "pending";
  
  const statusLower = String(status).toLowerCase();

  // Delivered states
  if (
    statusLower.includes("delivered") ||
    statusLower.includes("נמסר") ||
    statusLower.includes("completed") ||
    statusLower.includes("הושלם") ||
    statusLower.includes("נמסרה") ||
    statusLower.includes("נמסרו") ||
    statusLower.includes("complete") ||
    statusLower.includes("done")
  ) {
    return "delivered";
  }
  
  // Pending states
  if (
    statusLower.includes("pending") ||
    statusLower.includes("ממתין") ||
    statusLower.includes("waiting") ||
    statusLower.includes("new") ||
    statusLower.includes("חדש") ||
    statusLower.includes("open") ||
    statusLower.includes("created")
  ) {
    return "pending";
  }
  
  // In progress states
  if (
    statusLower.includes("in_progress") ||
    statusLower.includes("progress") ||
    statusLower.includes("בדרך") ||
    statusLower.includes("out for delivery") ||
    statusLower.includes("בדרך למסירה") ||
    statusLower.includes("delivery in progress") ||
    statusLower.includes("בתהליך") ||
    statusLower.includes("בדרכו") ||
    statusLower.includes("נשלח")
  ) {
    return "in_progress";
  }
  
  // Failed states
  if (
    statusLower.includes("failed") ||
    statusLower.includes("נכשל") ||
    statusLower.includes("customer not answer") ||
    statusLower.includes("לקוח לא ענה") ||
    statusLower.includes("problem") ||
    statusLower.includes("בעיה") ||
    statusLower.includes("error") ||
    statusLower.includes("cancelled") ||
    statusLower.includes("מבוטל")
  ) {
    return "failed";
  }
  
  // Returned states
  if (
    statusLower.includes("return") ||
    statusLower.includes("חבילה חזרה") ||
    statusLower.includes("החזרה") ||
    statusLower.includes("הוחזר") ||
    statusLower.includes("sent back") ||
    statusLower.includes("חזר")
  ) {
    return "returned";
  }

  // Default to pending for unknown status
  return "pending";
}

// Helper function to get Hebrew label for status
export function getHebrewLabel(normalizedStatus: string, originalStatus: string): string {
  // First try to use the original status if it's in Hebrew
  if (/[\u0590-\u05FF]/.test(originalStatus)) {
    return originalStatus;
  }

  // Otherwise, use default Hebrew translations
  switch (normalizedStatus) {
    case "pending": return "ממתין";
    case "in_progress": return "בדרך";
    case "delivered": return "נמסר";
    case "failed": return "נכשל";
    case "returned": return "הוחזר";
    default: return originalStatus;
  }
}

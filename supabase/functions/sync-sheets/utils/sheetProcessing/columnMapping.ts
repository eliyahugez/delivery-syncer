
import { analyzeColumns } from "../columnUtils.ts";

export async function getColumnMappings(
  sheetsData: any, 
  supabase: any, 
  spreadsheetId: string, 
  customColumnMappings?: Record<string, number>
) {
  const columns = sheetsData.table.cols.map((col: any) => col.label || "");
  console.log('Detected columns:', columns);
  
  // Map columns to our expected fields - use custom mappings if provided, otherwise auto-detect
  let columnMap: Record<string, number>;
  
  if (customColumnMappings && Object.keys(customColumnMappings).length > 0) {
    columnMap = customColumnMappings;
    console.log('Using custom column mapping:', columnMap);
  } else {
    // Try to load saved mappings for this sheet
    let savedMappings = null;
    
    try {
      const { data, error } = await supabase
        .from('column_mappings')
        .select('mappings')
        .eq('sheet_url', spreadsheetId)
        .maybeSingle();
        
      if (data && data.mappings) {
        savedMappings = data.mappings;
        console.log('Found saved column mappings:', savedMappings);
      }
    } catch (error) {
      console.warn("Error loading saved mappings:", error);
    }
    
    // Use saved mappings if available, otherwise auto-detect
    if (savedMappings && Object.keys(savedMappings).length > 0) {
      columnMap = savedMappings;
      console.log('Using saved column mapping:', columnMap);
    } else {
      columnMap = analyzeColumns(columns);
      console.log('Auto-detected column mapping:', columnMap);
    }
  }
  
  return columnMap;
}

export async function saveColumnMappings(supabase: any, mappingId: string, columnMap: Record<string, number>) {
  try {
    const { error: mappingError } = await supabase
      .from('column_mappings')
      .upsert(
        {
          sheet_url: mappingId,
          mappings: columnMap
        },
        { onConflict: 'sheet_url' }
      );
      
    if (mappingError) {
      console.error("Error saving column mappings:", mappingError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error saving column mappings:", error);
    return false;
  }
}

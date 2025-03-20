
// Helper functions for database debugging

export async function getTableColumns(supabase: any, tableName: string) {
  try {
    // Query the information schema to get column information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');
      
    if (error) {
      console.error(`Error getting column info for ${tableName}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch table columns for ${tableName}:`, error);
    return null;
  }
}

export async function verifyDatabaseSchema(supabase: any) {
  console.log("Verifying database schema...");
  
  // List of required tables to check
  const tables = ['deliveries', 'delivery_history', 'column_mappings'];
  
  for (const table of tables) {
    const columns = await getTableColumns(supabase, table);
    console.log(`Table ${table} columns:`, columns);
  }
  
  // Try running a simple query to check general connectivity
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error("Error running test query:", error);
    } else {
      console.log("Database connection test successful");
    }
  } catch (error) {
    console.error("Database connection test failed:", error);
  }
}

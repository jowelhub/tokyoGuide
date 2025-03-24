import { createClient } from "./server";

export interface CategoryData {
  id: string;
  name: string;
}

export async function getCategories(): Promise<CategoryData[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("categories")
    .select("*");
  
  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  
  return data;
}

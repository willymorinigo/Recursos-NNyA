export type ResourceCategory = 
  | 'educacion' 
  | 'salud' 
  | 'contencion' 
  | 'comunidad' 
  | 'recreacion' 
  | 'legal'
  | 'personal';

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  subcategory: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  hours?: string;
  description: string;
  targetAge?: string;
  isPublic: boolean;
  isGuardia24h?: boolean;
  isCustom?: boolean;
  notes?: string; // Personalized user notes on the resource
}

export interface MapFilters {
  searchQuery: string;
  categories: ResourceCategory[];
  isPublicOnly: boolean | null; // null = both, true = public, false = NGO/Private
  isGuardiaOnly: boolean;
  ageGroups: string[];
}

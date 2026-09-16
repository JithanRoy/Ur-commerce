export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
  productCount?: number;
};

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  position: number;
  isActive: boolean;
};

export type CreateCategoryInput = {
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  position?: number;
  isActive?: boolean;
};

export type CreateBrandInput = {
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  position?: number;
  isActive?: boolean;
};

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  position: number;
};

export type CreateCollectionInput = {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  position?: number;
};

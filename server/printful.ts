const PRINTFUL_API_BASE = "https://api.printful.com";

export function getPrintfulToken(): string | null {
  return process.env.PRINTFUL_API_KEY || null;
}

export function isPrintfulConfigured(): boolean {
  return !!getPrintfulToken();
}

async function printfulRequest<T>(
  method: string,
  endpoint: string,
  body?: Record<string, any>
): Promise<T> {
  const token = getPrintfulToken();
  if (!token) throw new Error("Printful API key not configured");

  const res = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Printful API error ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<T>;
}

export interface PrintfulVariant {
  id: number;
  name: string;
  retail_price: string;
  currency: string;
  preview_url?: string;
}

export interface PrintfulProduct {
  id: number;
  external_id?: string;
  name: string;
  variants: PrintfulVariant[];
  thumbnail_url?: string;
}

export interface PrintfulSyncVariant {
  variant_id: number;
  retail_price: string;
  files: { type: string; url: string }[];
}

export async function createPrintfulProduct(
  artworkTitle: string,
  imageUrl: string,
  variants: PrintfulSyncVariant[]
): Promise<{ id: number; name: string }> {
  const result = await printfulRequest<{ result: { id: number; name: string } }>(
    "POST",
    "/store/products",
    {
      sync_product: {
        name: artworkTitle,
        thumbnail: imageUrl,
      },
      sync_variants: variants,
    }
  );
  return result.result;
}

export async function getPrintfulProduct(productId: string): Promise<PrintfulProduct | null> {
  try {
    const result = await printfulRequest<{
      result: {
        sync_product: { id: number; name: string; thumbnail_url?: string; external_id?: string };
        sync_variants: {
          id: number;
          name: string;
          retail_price: string;
          currency: string;
          preview_url?: string;
        }[];
      };
    }>("GET", `/store/products/${productId}`);

    const { sync_product, sync_variants } = result.result;
    return {
      id: sync_product.id,
      external_id: sync_product.external_id,
      name: sync_product.name,
      thumbnail_url: sync_product.thumbnail_url,
      variants: sync_variants.map((v) => ({
        id: v.id,
        name: v.name,
        retail_price: v.retail_price,
        currency: v.currency,
        preview_url: v.preview_url,
      })),
    };
  } catch {
    return null;
  }
}

export async function createPrintfulOrder(params: {
  variantId: number;
  quantity: number;
  retailPrice: string;
  recipient: {
    name: string;
    address1: string;
    city: string;
    state_code: string;
    zip: string;
    country_code: string;
    email: string;
  };
  imageUrl: string;
}): Promise<{ id: number; status: string }> {
  const result = await printfulRequest<{ result: { id: number; status: string } }>(
    "POST",
    "/orders",
    {
      recipient: params.recipient,
      items: [
        {
          variant_id: params.variantId,
          quantity: params.quantity,
          retail_price: params.retailPrice,
          files: [{ url: params.imageUrl }],
        },
      ],
    }
  );
  return result.result;
}

export async function getPrintfulStoreInfo(): Promise<{
  id: number;
  name: string;
  type: string;
  website: string;
} | null> {
  try {
    const result = await printfulRequest<{
      result: { id: number; name: string; type: string; website: string };
    }>("GET", "/store");
    return result.result;
  } catch {
    return null;
  }
}

export const PRINT_VARIANT_TEMPLATES: {
  label: string;
  printfulVariantId: number;
  baseCost: number;
  description: string;
}[] = [
  { label: 'Poster 11×17"', printfulVariantId: 1, baseCost: 12.5, description: "Matte poster print" },
  { label: 'Poster 18×24"', printfulVariantId: 2, baseCost: 18.0, description: "Matte poster print" },
  { label: 'Canvas 16×20"', printfulVariantId: 3, baseCost: 35.0, description: "Gallery-wrapped canvas" },
  { label: 'Canvas 24×36"', printfulVariantId: 4, baseCost: 55.0, description: "Gallery-wrapped canvas" },
];

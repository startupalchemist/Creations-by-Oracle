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

// ─── Sync Variant (product variant inside an artwork-synced product) ─────────

export interface PrintfulSyncVariant {
  id: number;            // sync_variant_id (used to submit orders)
  name: string;
  retail_price: string;
  currency: string;
  preview_url?: string;
}

export interface PrintfulSyncProduct {
  id: number;            // sync_product_id
  name: string;
  thumbnail_url?: string;
  sync_variants: PrintfulSyncVariant[];
}

// ─── Create a sync product on Printful ───────────────────────────────────────
// Note: The files URL must be publicly accessible. Each sync_variant references
// a real Printful catalog variant (printful_variant_id). These catalog IDs come
// from the Printful product catalog, not our system.
export interface SyncVariantInput {
  printful_variant_id: number;
  retail_price: string;
  files: { type: string; url: string }[];
}

export async function createPrintfulProduct(
  artworkTitle: string,
  imageUrl: string,
  variants: SyncVariantInput[]
): Promise<{ id: number; name: string }> {
  const result = await printfulRequest<{
    result: { sync_product: { id: number; name: string } };
  }>("POST", "/store/products", {
    sync_product: {
      name: artworkTitle,
      thumbnail: imageUrl,
    },
    sync_variants: variants,
  });
  return result.result.sync_product;
}

// ─── Get a sync product and its sync variants ────────────────────────────────
export async function getPrintfulProduct(productId: string): Promise<PrintfulSyncProduct | null> {
  try {
    const result = await printfulRequest<{
      result: {
        sync_product: { id: number; name: string; thumbnail_url?: string };
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
      name: sync_product.name,
      thumbnail_url: sync_product.thumbnail_url,
      sync_variants: sync_variants.map((v) => ({
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

// ─── Get sync variants for a product (lightweight) ───────────────────────────
export async function getProductVariants(productId: string): Promise<PrintfulSyncVariant[]> {
  try {
    const product = await getPrintfulProduct(productId);
    return product?.sync_variants ?? [];
  } catch {
    return [];
  }
}

// ─── Create a fulfillment order using sync_variant_id ────────────────────────
export async function createPrintfulOrder(params: {
  syncVariantId: number;    // sync_variant_id from the synced product (NOT catalog variant_id)
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
}): Promise<{ id: number; status: string }> {
  const result = await printfulRequest<{ result: { id: number; status: string } }>(
    "POST",
    "/orders",
    {
      recipient: params.recipient,
      items: [
        {
          sync_variant_id: params.syncVariantId,
          quantity: params.quantity,
          retail_price: params.retailPrice,
        },
      ],
    }
  );
  return result.result;
}

// ─── Get Printful order status + tracking ────────────────────────────────────
export async function getOrderStatus(printfulOrderId: string): Promise<{
  id: number;
  status: string;
  tracking_number?: string;
  tracking_url?: string;
} | null> {
  try {
    const result = await printfulRequest<{
      result: {
        id: number;
        status: string;
        shipments?: { tracking_number?: string; tracking_url?: string }[];
      };
    }>("GET", `/orders/${printfulOrderId}`);
    const trackingNumber = result.result.shipments?.[0]?.tracking_number;
    const trackingUrl = result.result.shipments?.[0]?.tracking_url;
    return {
      id: result.result.id,
      status: result.result.status,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
    };
  } catch {
    return null;
  }
}

// ─── Get Printful store info ──────────────────────────────────────────────────
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

// ─── Template print sizes ─────────────────────────────────────────────────────
// These are local display-only definitions used when no Printful product has been
// synced for an artwork. They define sizing options and base costs for pricing UI.
// NO Printful variant IDs are used here — orders against un-synced artworks are
// recorded locally as "pending_submission" and never submitted to Printful.
// To enable real fulfillment, the artist must sync the artwork in the Shop admin.
export const PRINT_SIZE_TEMPLATES: {
  id: string;       // local-only ID (never sent to Printful)
  label: string;
  baseCost: number;
  description: string;
}[] = [
  { id: "poster_11x17", label: 'Poster 11×17"', baseCost: 12.5, description: "Matte poster print" },
  { id: "poster_18x24", label: 'Poster 18×24"', baseCost: 18.0, description: "Matte poster print" },
  { id: "canvas_16x20", label: 'Canvas 16×20"', baseCost: 35.0, description: "Gallery-wrapped canvas" },
  { id: "canvas_24x36", label: 'Canvas 24×36"', baseCost: 55.0, description: "Gallery-wrapped canvas" },
];

// Backward compat alias
export const PRINT_VARIANT_TEMPLATES = PRINT_SIZE_TEMPLATES;

export function computeVariantRetailPrice(baseCost: number, markupPercent: number): string {
  const retail = baseCost * (1 + markupPercent / 100);
  return retail.toFixed(2);
}

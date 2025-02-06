

import Stripe from "stripe";
import { z } from "zod";

const CartItemSchema = z.object({
  id: z.number(),
  price: z.number().positive(),
  quantity: z.number().positive(),
});

const RequestSchema = z.object({
  cartItems: z.array(CartItemSchema),
});

let stripe: Stripe | null = null;

export async function POST(request: Request): Promise<Response> {
  try {
    if (!process.env.NEXT_STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key is missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!stripe) {
      stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY, {
        apiVersion: "2025-01-27.acacia",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: "Base URL is not set." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { cartItems } = RequestSchema.parse(body);

    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: `Product ${item.id}` },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cart`,
    });
console.log("Base URL:", baseUrl);
    
    return new Response(
      JSON.stringify({ id: session.id, url: session.url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe session error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

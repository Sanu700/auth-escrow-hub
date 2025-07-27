import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RELEASE-ESCROW] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Create Supabase client using service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { escrowPaymentId } = await req.json();
    if (!escrowPaymentId) {
      throw new Error("Missing required field: escrowPaymentId");
    }
    logStep("Request data parsed", { escrowPaymentId });

    // Get escrow payment details with booking info
    const { data: escrowPayment, error: escrowError } = await supabaseClient
      .from('escrow_payments')
      .select(`
        *,
        bookings!inner(*,
          vendor_profile:profiles!bookings_vendor_id_fkey(*),
          supplier_profile:profiles!bookings_supplier_id_fkey(*)
        )
      `)
      .eq('id', escrowPaymentId)
      .single();

    if (escrowError) throw new Error(`Escrow payment not found: ${escrowError.message}`);
    logStep("Escrow payment retrieved", { escrowId: escrowPayment.id });

    // Verify user is authorized to release payment (either vendor or supplier)
    const booking = escrowPayment.bookings;
    const isVendor = booking.vendor_profile.user_id === user.id;
    const isSupplier = booking.supplier_profile.user_id === user.id;
    
    if (!isVendor && !isSupplier) {
      throw new Error("Unauthorized: Only booking participants can manage escrow");
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      throw new Error("Cannot release payment: Booking must be completed first");
    }

    // Check if payment is already released
    if (escrowPayment.status === 'released') {
      throw new Error("Payment has already been released");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Capture the payment (release from escrow)
    const paymentIntent = await stripe.paymentIntents.capture(
      escrowPayment.stripe_payment_intent_id
    );

    logStep("Payment captured", { paymentIntentId: paymentIntent.id });

    // Update escrow payment status
    await supabaseClient
      .from('escrow_payments')
      .update({ status: 'released' })
      .eq('id', escrowPaymentId);

    // Update booking payment status
    await supabaseClient
      .from('bookings')
      .update({ payment_status: 'released' })
      .eq('id', booking.id);

    logStep("Payment released successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Payment released successfully",
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in release-escrow-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
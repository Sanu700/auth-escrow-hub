import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ESCROW-PAYMENT] ${step}${detailsStr}`);
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
    const { bookingId, amount } = await req.json();
    if (!bookingId || !amount) {
      throw new Error("Missing required fields: bookingId, amount");
    }
    logStep("Request data parsed", { bookingId, amount });

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        vendor_profile:profiles!bookings_vendor_id_fkey(*),
        supplier_profile:profiles!bookings_supplier_id_fkey(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw new Error(`Booking not found: ${bookingError.message}`);
    logStep("Booking retrieved", { booking: booking.id });

    // Verify user is the vendor for this booking
    if (booking.vendor_profile.user_id !== user.id) {
      throw new Error("Unauthorized: Only the booking vendor can create payment");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: booking.vendor_profile.first_name && booking.vendor_profile.last_name 
          ? `${booking.vendor_profile.first_name} ${booking.vendor_profile.last_name}`
          : booking.vendor_profile.username,
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create payment intent with escrow-like behavior
    // Note: Stripe doesn't have true escrow, so we'll hold the payment and release manually
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        bookingId: bookingId,
        vendorId: booking.vendor_profile.user_id,
        supplierId: booking.supplier_profile.user_id,
        type: 'escrow_payment'
      },
      capture_method: 'manual', // This allows us to authorize first, then capture later
      description: `Escrow payment for booking: ${booking.service_description}`,
    });

    logStep("Payment intent created", { paymentIntentId: paymentIntent.id });

    // Create escrow payment record
    const { data: escrowPayment, error: escrowError } = await supabaseClient
      .from('escrow_payments')
      .insert({
        booking_id: bookingId,
        payer_id: booking.vendor_id,
        payee_id: booking.supplier_id,
        amount: amount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending'
      })
      .select()
      .single();

    if (escrowError) throw new Error(`Failed to create escrow record: ${escrowError.message}`);
    logStep("Escrow payment record created", { escrowId: escrowPayment.id });

    // Update booking payment status
    await supabaseClient
      .from('bookings')
      .update({ payment_status: 'pending' })
      .eq('id', bookingId);

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      escrowPaymentId: escrowPayment.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-escrow-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
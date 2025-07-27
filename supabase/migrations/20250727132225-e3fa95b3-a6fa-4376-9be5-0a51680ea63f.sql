-- Fix security issues for existing tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Fix function security issues by setting search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, username, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'vendor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_cheapest_supplier(item_name text)
RETURNS TABLE(name text, price numeric)
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT public.suppliers.name, public.suppliers.min_price FROM public.suppliers
  WHERE item_name = ANY(string_to_array(public.suppliers.items_offered::TEXT, ','))
  ORDER BY public.suppliers.min_price ASC LIMIT 1;
$function$;
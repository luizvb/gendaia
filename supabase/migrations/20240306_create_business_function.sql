CREATE OR REPLACE FUNCTION create_business_with_profile(
  business_data JSONB,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id UUID;
  v_business JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Create business
    INSERT INTO businesses (
      name,
      address,
      phone,
      email,
      description,
      logo
    )
    SELECT
      business_data->>'name',
      business_data->>'address',
      business_data->>'phone',
      business_data->>'email',
      business_data->>'description',
      business_data->>'logo'
    RETURNING id INTO v_business_id;

    -- Update profile
    UPDATE profiles
    SET business_id = v_business_id
    WHERE user_id = p_user_id;

    -- Get the created business
    SELECT jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'address', b.address,
      'phone', b.phone,
      'email', b.email,
      'description', b.description,
      'logo', b.logo,
      'created_at', b.created_at,
      'updated_at', b.updated_at
    )
    FROM businesses b
    WHERE b.id = v_business_id
    INTO v_business;

    RETURN v_business;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback happens automatically
      RAISE;
  END;
END;
$$; 
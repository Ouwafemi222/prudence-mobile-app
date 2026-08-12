-- Populate Skills Data
-- Inserts all 8 skills with trainers and PDF paths

-- Digital Marketing (Mandatory)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Digital Marketing') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Digital Marketing',
      true,
      'Digital Marketing Training Manual.pdf',
      ARRAY['Miss Boluwatife', 'Miss Mercy', 'Mr Damilare', 'Mr Sheriff']::TEXT[],
      1,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = true,
      training_plan_pdf_path = 'Digital Marketing Training Manual.pdf',
      trainers = ARRAY['Miss Boluwatife', 'Miss Mercy', 'Mr Damilare', 'Mr Sheriff']::TEXT[],
      display_order = 1,
      is_active = true
    WHERE name = 'Digital Marketing';
  END IF;
END $$;

-- Prompt Engineering (Mandatory)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Prompt Engineering') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Prompt Engineering',
      true,
      'Intro_to_Prompt_Engineering_Overview.pdf',
      ARRAY['Miss Morufat', 'Mr Femi Gratitude', 'Mr Boluwatife', 'Miss Feranmi']::TEXT[],
      2,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = true,
      training_plan_pdf_path = 'Intro_to_Prompt_Engineering_Overview.pdf',
      trainers = ARRAY['Miss Morufat', 'Mr Femi Gratitude', 'Mr Boluwatife', 'Miss Feranmi']::TEXT[],
      display_order = 2,
      is_active = true
    WHERE name = 'Prompt Engineering';
  END IF;
END $$;

-- AI Coding (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'AI Coding') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'AI Coding',
      false,
      'AI CODING.pdf',
      ARRAY['Mr Abbey', 'Mr Femi Gratitude', 'Mr Quoreeb', 'Mr Emmanuel']::TEXT[],
      3,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'AI CODING.pdf',
      trainers = ARRAY['Mr Abbey', 'Mr Femi Gratitude', 'Mr Quoreeb', 'Mr Emmanuel']::TEXT[],
      display_order = 3,
      is_active = true
    WHERE name = 'AI Coding';
  END IF;
END $$;

-- WordPress Website Design (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'WordPress Website Design') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'WordPress Website Design',
      false,
      'Wordpress Website Training.pdf',
      ARRAY['IPK', 'Miss Boluwatife']::TEXT[],
      4,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Wordpress Website Training.pdf',
      trainers = ARRAY['IPK', 'Miss Boluwatife']::TEXT[],
      display_order = 4,
      is_active = true
    WHERE name = 'WordPress Website Design';
  END IF;
END $$;

-- Shopify Website Design (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Shopify Website Design') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Shopify Website Design',
      false,
      'Unified Ecommerce And Shopify Training.pdf',
      ARRAY['IPK', 'Miss Ini', 'Miss Bidemi']::TEXT[],
      5,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Unified Ecommerce And Shopify Training.pdf',
      trainers = ARRAY['IPK', 'Miss Ini', 'Miss Bidemi']::TEXT[],
      display_order = 5,
      is_active = true
    WHERE name = 'Shopify Website Design';
  END IF;
END $$;

-- Graphics & Design (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Graphics & Design') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Graphics & Design',
      false,
      'Graphics & Design.pdf',
      ARRAY['Mr Ridwan']::TEXT[],
      6,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Graphics & Design.pdf',
      trainers = ARRAY['Mr Ridwan']::TEXT[],
      display_order = 6,
      is_active = true
    WHERE name = 'Graphics & Design';
  END IF;
END $$;

-- Content Writing (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Content Writing') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Content Writing',
      false,
      'Content_Writing_and_Copywriting_Training.pdf',
      ARRAY['IPK']::TEXT[],
      7,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Content_Writing_and_Copywriting_Training.pdf',
      trainers = ARRAY['IPK']::TEXT[],
      display_order = 7,
      is_active = true
    WHERE name = 'Content Writing';
  END IF;
END $$;

-- Automation (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Automation') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Automation',
      false,
      '_AI Automation & Spreadsheets.pdf',
      ARRAY['Miss Morufat', 'Miss Seyifunmi', 'Miss Jummy']::TEXT[],
      8,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = '_AI Automation & Spreadsheets.pdf',
      trainers = ARRAY['Miss Morufat', 'Miss Seyifunmi', 'Miss Jummy']::TEXT[],
      display_order = 8,
      is_active = true
    WHERE name = 'Automation';
  END IF;
END $$;

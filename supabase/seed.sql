-- Scan2Recycle seed data. Safe to re-run: existing rows are updated in place.
--
-- !! BIN NAMES AND COLOURS ARE PLACEHOLDERS !!
-- They follow the "separate bin per material" style from the project brief.
-- Change bin_name / bin_colour to match the bins where the app will be used
-- (see PLAN.md section 13), e.g. Malaysia: blue = paper, orange = plastic & metal, brown = glass.

insert into public.materials (id, display_name, bin_name, bin_colour, is_recyclable, sort_order) values
  ('plastic', 'Plastic',     'Plastic Recycling Bin', '#f28c28', true,  1),
  ('paper',   'Paper',       'Paper Recycling Bin',   '#2f6fb5', true,  2),
  ('metal',   'Metal',       'Metal Recycling Bin',   '#e6b800', true,  3),
  ('glass',   'Glass',       'Glass Recycling Bin',   '#7a5230', true,  4),
  ('organic', 'Food waste',  'Food Waste / General Waste', '#5b7d3a', false, 5),
  ('e-waste', 'E-waste',     'E-waste Drop-off Point',     '#b3412e', false, 6),
  ('general', 'General waste', 'General Waste Bin',        '#4a4a4a', false, 7)
on conflict (id) do update set
  display_name  = excluded.display_name,
  bin_name      = excluded.bin_name,
  bin_colour    = excluded.bin_colour,
  is_recyclable = excluded.is_recyclable,
  sort_order    = excluded.sort_order;

-- Labels are what CLIP compares the photo against ("a photo of <label>").
-- typical_weight_g is left null on purpose: weigh real samples before filling it in.
-- `recyclable` is per item, so e.g. a greasy pizza box is paper but not recyclable.
insert into public.item_types (label, display_name, material_id, recyclable, tip) values
  -- Metal
  ('an aluminium drink can',        'Aluminium Can',        'metal',   true,  'Empty and rinse. No need to crush.'),
  ('a tin food can',                'Tin Can',              'metal',   true,  'Rinse out food. Lids can go in too.'),
  ('an aerosol spray can',          'Aerosol Can',          'metal',   true,  'Only if completely empty. Do not pierce.'),
  ('aluminium foil',                'Aluminium Foil',       'metal',   true,  'Must be clean. Scrunch into a ball.'),
  ('a metal bottle cap',            'Bottle Cap',           'metal',   true,  'Small items can get lost; put several in a can.'),
  -- Plastic
  ('a plastic water bottle',        'Plastic Bottle',       'plastic', true,  'Empty and rinse. Check if caps are accepted locally.'),
  ('a plastic milk jug',            'Plastic Milk Jug',     'plastic', true,  'Rinse out milk.'),
  ('a plastic food container',      'Plastic Container',    'plastic', true,  'Must be clean of food.'),
  ('a plastic detergent bottle',    'Detergent Bottle',     'plastic', true,  'Rinse and replace the cap.'),
  ('a plastic cup',                 'Plastic Cup',          'plastic', true,  'Rinse first.'),
  ('a plastic shopping bag',        'Plastic Bag',          'plastic', false, 'Usually not accepted in recycling bins. Reuse it or use a store drop-off.'),
  ('a styrofoam food box',          'Styrofoam',            'general', false, 'Polystyrene foam is rarely recyclable. General waste.'),
  ('a chip packet',                 'Snack Packet',         'general', false, 'Multi-layer foil/plastic. General waste.'),
  ('a plastic straw',               'Plastic Straw',        'general', false, 'Too small to sort. General waste.'),
  -- Paper
  ('a cardboard box',               'Cardboard Box',        'paper',   true,  'Flatten it. Remove tape if you can.'),
  ('a newspaper',                   'Newspaper',            'paper',   true,  'Keep dry.'),
  ('a magazine',                    'Magazine',             'paper',   true,  'Keep dry.'),
  ('a sheet of office paper',       'Paper',                'paper',   true,  'Staples are fine.'),
  ('a paper bag',                   'Paper Bag',            'paper',   true,  'Must be clean and dry.'),
  ('an egg carton',                 'Egg Carton',           'paper',   true,  'Paper cartons only, not foam.'),
  ('a drink carton',                'Drink Carton',         'paper',   true,  'Rinse and flatten. Check local rules for cartons.'),
  ('a disposable paper cup',        'Paper Cup',            'paper',   false, 'Plastic lining makes it hard to recycle. General waste.'),
  ('a greasy pizza box',            'Greasy Pizza Box',     'paper',   false, 'Food and grease contaminate paper. Tear off clean parts to recycle.'),
  ('a used tissue',                 'Tissue',               'general', false, 'Used tissues are not recyclable.'),
  -- Glass
  ('a glass bottle',                'Glass Bottle',         'glass',   true,  'Empty and rinse. Remove the cap.'),
  ('a glass jar',                   'Glass Jar',            'glass',   true,  'Rinse out food. Remove the lid.'),
  ('a drinking glass',              'Drinking Glass',       'general', false, 'Drinking glasses melt differently from bottles. Wrap and put in general waste.'),
  ('a ceramic mug',                 'Ceramic Mug',          'general', false, 'Ceramics are not glass. General waste.'),
  -- Food
  ('a banana peel',                 'Fruit Peel',           'organic', false, 'Food waste. Compost if you can.'),
  ('leftover food',                 'Leftover Food',        'organic', false, 'Food waste. Compost if you can.'),
  -- E-waste
  ('a battery',                     'Battery',              'e-waste', false, 'Never put batteries in bins. Take to an e-waste drop-off.'),
  ('a mobile phone',                'Mobile Phone',         'e-waste', false, 'Take to an e-waste drop-off. Wipe your data first.'),
  ('a phone charger cable',         'Cable',                'e-waste', false, 'Take to an e-waste drop-off.'),
  ('a light bulb',                  'Light Bulb',           'e-waste', false, 'Take to an e-waste or lighting drop-off.')
on conflict (label) do update set
  display_name = excluded.display_name,
  material_id  = excluded.material_id,
  recyclable   = excluded.recyclable,
  tip          = excluded.tip;

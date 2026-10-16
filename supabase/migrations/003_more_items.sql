-- More items, added after the first phone tests. Safe to re-run.
-- Run in the Supabase SQL Editor (or re-run setup_all.sql, which includes these).

insert into public.item_types (label, display_name, material_id, recyclable, tip) values
  ('a shampoo bottle',              'Shampoo Bottle',       'plastic', true,  'Rinse it out and put the cap back on.'),
  ('a yoghurt cup',                 'Yoghurt Cup',          'plastic', true,  'Scrape out and rinse.'),
  ('a squeeze tube of lotion or toothpaste', 'Squeeze Tube', 'plastic', false, 'Most tubes are multi-layer plastic and are not accepted. General waste unless your area takes them.'),
  ('plastic cling film',            'Cling Film',           'general', false, 'Soft film plastic is not accepted in recycling bins.'),
  ('a plastic toy',                 'Toy',                  'general', false, 'If it still works, donate it. Otherwise general waste.'),
  ('a toothbrush',                  'Toothbrush',           'general', false, 'Mixed materials. General waste.'),
  ('a disposable face mask',        'Face Mask',            'general', false, 'General waste. Cut the ear loops first.'),
  ('a pen',                         'Pen',                  'general', false, 'Mixed materials. General waste.'),
  ('plastic cutlery',               'Plastic Cutlery',      'general', false, 'Too small and mixed to recycle. General waste.'),
  ('a cereal box',                  'Cereal Box',           'paper',   true,  'Flatten it. Take out the plastic bag inside.'),
  ('a toilet paper roll tube',      'Toilet Roll Tube',     'paper',   true,  'Flatten it.'),
  ('an envelope',                   'Envelope',             'paper',   true,  'Window envelopes are usually fine.'),
  ('an aluminium food tray',        'Aluminium Tray',       'metal',   true,  'Clean off food first.'),
  ('a wine bottle',                 'Wine Bottle',          'glass',   true,  'Empty and rinse. Remove the cork or cap.'),
  ('old clothes',                   'Clothing',             'general', false, 'Donate wearable clothes, or use a textile recycling bin if there is one.'),
  ('earphones',                     'Earphones',            'e-waste', false, 'Take to an e-waste drop-off.')
on conflict (label) do update set
  display_name = excluded.display_name,
  material_id  = excluded.material_id,
  recyclable   = excluded.recyclable,
  tip          = excluded.tip;

select count(*) as item_types from public.item_types;

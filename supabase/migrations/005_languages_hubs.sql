-- Scan2Recycle: Bahasa Melayu names, 38 more items, and recycling hubs anyone can add.
-- Safe to re-run. Run in the Supabase SQL Editor of the project the app uses (setup_all.sql includes this too).

-- ---------------------------------------------------------------------------
-- 1. Malay columns. The app falls back to English when a Malay value is missing.
--    in_ai = false keeps an item in "Can I recycle…?" search but out of the camera AI's label list.
-- ---------------------------------------------------------------------------

alter table public.materials  add column if not exists display_name_ms text;
alter table public.materials  add column if not exists bin_name_ms     text;
alter table public.item_types add column if not exists display_name_ms text;
alter table public.item_types add column if not exists tip_ms          text;
alter table public.item_types add column if not exists in_ai           boolean not null default true;

update public.materials m set display_name_ms = v.name_ms, bin_name_ms = v.bin_ms
from (values
  ('plastic', 'Plastik',     'Tong kitar semula oren (plastik & logam)'),
  ('paper',   'Kertas',      'Tong kitar semula biru (kertas)'),
  ('metal',   'Logam',       'Tong kitar semula oren (plastik & logam)'),
  ('glass',   'Kaca',        'Tong kitar semula coklat (kaca)'),
  ('organic', 'Sisa makanan', 'Tong sisa makanan / sisa am'),
  ('e-waste', 'E-sisa',      'Pusat pengumpulan e-sisa'),
  ('general', 'Sisa am',     'Tong sisa am')
) as v(id, name_ms, bin_ms)
where m.id = v.id;

-- Malay names and tips for the 50 existing items.
update public.item_types t set display_name_ms = v.name_ms, tip_ms = v.tip_ms
from (values
  ('an aluminium drink can', 'Tin Minuman Aluminium', 'Kosongkan dan bilas. Tidak perlu dipenyekkan.'),
  ('a tin food can', 'Tin Makanan', 'Bilas sisa makanan. Penutupnya boleh dimasukkan sekali.'),
  ('an aerosol spray can', 'Tin Aerosol', 'Hanya jika benar-benar kosong. Jangan tebuk.'),
  ('aluminium foil', 'Kerajang Aluminium', 'Mesti bersih. Gumpalkan menjadi bola.'),
  ('a metal bottle cap', 'Penutup Botol', 'Barang kecil mudah hilang; kumpulkan beberapa dalam satu tin.'),
  ('a plastic water bottle', 'Botol Plastik', 'Kosongkan dan bilas. Semak sama ada penutup diterima di kawasan anda.'),
  ('a plastic milk jug', 'Botol Susu Plastik', 'Bilas sisa susu.'),
  ('a plastic food container', 'Bekas Makanan Plastik', 'Mesti bersih daripada sisa makanan.'),
  ('a plastic detergent bottle', 'Botol Detergen', 'Bilas dan pasang semula penutupnya.'),
  ('a plastic cup', 'Cawan Plastik', 'Bilas dahulu.'),
  ('a plastic shopping bag', 'Beg Plastik', 'Biasanya tidak diterima dalam tong kitar semula. Guna semula atau hantar ke tempat pengumpulan di pasar raya.'),
  ('a styrofoam food box', 'Polistirena (Styrofoam)', 'Busa polistirena jarang boleh dikitar semula. Sisa am.'),
  ('a chip packet', 'Bungkusan Snek', 'Kerajang dan plastik berlapis. Sisa am.'),
  ('a plastic straw', 'Straw Plastik', 'Terlalu kecil untuk diasingkan. Sisa am.'),
  ('a cardboard box', 'Kotak Kadbod', 'Leperkan. Tanggalkan pita pelekat jika boleh.'),
  ('a newspaper', 'Surat Khabar', 'Pastikan kering.'),
  ('a magazine', 'Majalah', 'Pastikan kering.'),
  ('a sheet of office paper', 'Kertas', 'Klip dawai tidak mengapa.'),
  ('a paper bag', 'Beg Kertas', 'Mesti bersih dan kering.'),
  ('an egg carton', 'Bekas Telur', 'Bekas kertas sahaja, bukan polistirena.'),
  ('a drink carton', 'Kotak Minuman', 'Bilas dan leperkan. Semak peraturan tempatan untuk kotak minuman.'),
  ('a disposable paper cup', 'Cawan Kertas', 'Lapisan plastik menyukarkan kitar semula. Sisa am.'),
  ('a greasy pizza box', 'Kotak Piza Berminyak', 'Sisa makanan dan minyak mencemarkan kertas. Koyakkan bahagian yang bersih untuk dikitar semula.'),
  ('a used tissue', 'Tisu', 'Tisu terpakai tidak boleh dikitar semula.'),
  ('a glass bottle', 'Botol Kaca', 'Kosongkan dan bilas. Tanggalkan penutup.'),
  ('a glass jar', 'Balang Kaca', 'Bilas sisa makanan. Tanggalkan penutup.'),
  ('a drinking glass', 'Gelas Minuman', 'Gelas minuman cair pada suhu berbeza daripada botol. Balut dan buang ke sisa am.'),
  ('a ceramic mug', 'Mug Seramik', 'Seramik bukan kaca. Sisa am.'),
  ('a banana peel', 'Kulit Buah', 'Sisa makanan. Jadikan kompos jika boleh.'),
  ('leftover food', 'Sisa Makanan', 'Sisa makanan. Jadikan kompos jika boleh.'),
  ('a battery', 'Bateri', 'Jangan sekali-kali buang bateri ke dalam tong. Hantar ke pusat pengumpulan e-sisa.'),
  ('a mobile phone', 'Telefon Bimbit', 'Hantar ke pusat pengumpulan e-sisa. Padamkan data anda dahulu.'),
  ('a phone charger cable', 'Kabel', 'Hantar ke pusat pengumpulan e-sisa.'),
  ('a light bulb', 'Mentol Lampu', 'Hantar ke pusat pengumpulan e-sisa atau lampu.'),
  ('a shampoo bottle', 'Botol Syampu', 'Bilas dan pasang semula penutupnya.'),
  ('a yoghurt cup', 'Cawan Yogurt', 'Kikis dan bilas.'),
  ('a squeeze tube of lotion or toothpaste', 'Tiub Picit', 'Kebanyakan tiub diperbuat daripada plastik berlapis dan tidak diterima. Sisa am melainkan kawasan anda menerimanya.'),
  ('plastic cling film', 'Plastik Pembalut', 'Plastik filem lembut tidak diterima dalam tong kitar semula.'),
  ('a plastic toy', 'Mainan', 'Jika masih berfungsi, dermakan. Jika tidak, sisa am.'),
  ('a toothbrush', 'Berus Gigi', 'Bahan bercampur. Sisa am.'),
  ('a disposable face mask', 'Pelitup Muka', 'Sisa am. Potong tali telinganya dahulu.'),
  ('a pen', 'Pen', 'Bahan bercampur. Sisa am.'),
  ('plastic cutlery', 'Sudu Garpu Plastik', 'Terlalu kecil dan bercampur untuk dikitar semula. Sisa am.'),
  ('a cereal box', 'Kotak Bijirin', 'Leperkan. Keluarkan beg plastik di dalamnya.'),
  ('a toilet paper roll tube', 'Tiub Gulungan Tisu', 'Leperkan.'),
  ('an envelope', 'Sampul Surat', 'Sampul bertingkap biasanya tidak mengapa.'),
  ('an aluminium food tray', 'Dulang Aluminium', 'Bersihkan sisa makanan dahulu.'),
  ('a wine bottle', 'Botol Wain', 'Kosongkan dan bilas. Tanggalkan gabus atau penutup.'),
  ('old clothes', 'Pakaian', 'Dermakan pakaian yang masih boleh dipakai, atau guna tong kitar semula tekstil jika ada.'),
  ('earphones', 'Fon Telinga', 'Hantar ke pusat pengumpulan e-sisa.')
) as v(label, name_ms, tip_ms)
where t.label = v.label;

-- ---------------------------------------------------------------------------
-- 2. 38 more items for "Can I recycle…?" (and the camera, unless in_ai = false).
--    in_ai = false for receipt, milk carton and food wrapper: they pulled paper/plastic photos
--    into the wrong bin (TrashNet test: 77% → 81% right bin without them).
-- ---------------------------------------------------------------------------

insert into public.item_types (label, display_name, material_id, recyclable, tip, display_name_ms, tip_ms, in_ai) values
  -- Paper
  ('a shoe box', 'Shoe Box', 'paper', true, 'Flatten it. Take out any tissue paper.', 'Kotak Kasut', 'Leperkan. Keluarkan kertas tisu di dalamnya.', true),
  ('a book', 'Book', 'paper', true, 'Donate it if it''s still readable. Otherwise remove hard covers and recycle the pages.', 'Buku', 'Dermakan jika masih boleh dibaca. Jika tidak, tanggalkan kulit keras dan kitar semula halamannya.', true),
  ('an exercise book', 'Exercise Book', 'paper', true, 'Remove plastic covers. Staples are fine.', 'Buku Latihan', 'Tanggalkan sampul plastik. Klip dawai tidak mengapa.', true),
  ('shredded paper', 'Shredded Paper', 'paper', true, 'Put it in a paper bag so it doesn''t blow away.', 'Kertas Carik', 'Masukkan ke dalam beg kertas supaya tidak berterbangan.', true),
  ('a paper receipt', 'Receipt', 'general', false, 'Most receipts are thermal paper with chemicals. General waste.', 'Resit', 'Kebanyakan resit ialah kertas terma yang mengandungi bahan kimia. Sisa am.', false),
  ('a milk carton', 'Milk Carton', 'paper', true, 'Rinse and flatten.', 'Kotak Susu', 'Bilas dan leperkan.', false),
  ('a paper plate', 'Paper Plate', 'general', false, 'Food-stained paper plates aren''t recyclable. General waste.', 'Pinggan Kertas', 'Pinggan kertas yang terkena makanan tidak boleh dikitar semula. Sisa am.', true),
  ('wrapping paper', 'Wrapping Paper', 'paper', true, 'Plain paper only. Glittery or foil wrapping goes in general waste.', 'Kertas Pembalut', 'Kertas biasa sahaja. Pembalut berkilat atau berkerajang dibuang ke sisa am.', true),
  -- Plastic
  ('a cooking oil bottle', 'Cooking Oil Bottle', 'plastic', true, 'Drain it well and wipe out the oil.', 'Botol Minyak Masak', 'Toskan dengan baik dan lap sisa minyak.', true),
  ('a plastic bottle cap', 'Plastic Bottle Cap', 'plastic', true, 'Screw it back on the empty bottle.', 'Penutup Botol Plastik', 'Pasang semula pada botol yang kosong.', true),
  ('a bubble tea cup', 'Bubble Tea Cup', 'plastic', true, 'Remove the straw and sealing film, then rinse.', 'Cawan Teh Boba', 'Buang straw dan filem penutup, kemudian bilas.', true),
  ('a plastic hanger', 'Plastic Hanger', 'general', false, 'Hangers jam sorting machines. Give them back to a laundry or shop.', 'Penyangkut Baju Plastik', 'Penyangkut boleh menyekat mesin pengasingan. Pulangkan kepada kedai dobi atau kedai.', true),
  ('a plastic food wrapper', 'Food Wrapper', 'general', false, 'Soft plastic wrappers are not accepted. General waste.', 'Pembungkus Makanan', 'Pembungkus plastik lembut tidak diterima. Sisa am.', false),
  ('a CD or DVD', 'CD / DVD', 'general', false, 'Not accepted in recycling bins. General waste, or reuse it.', 'CD / DVD', 'Tidak diterima dalam tong kitar semula. Sisa am, atau guna semula.', true),
  -- Metal
  ('a biscuit tin', 'Biscuit Tin', 'metal', true, 'Empty out the crumbs. Reuse it if you can.', 'Tin Biskut', 'Buang serbuk biskut. Guna semula jika boleh.', true),
  ('a metal coat hanger', 'Metal Hanger', 'metal', true, 'Take it to a recycling centre or give it back to a laundry.', 'Penyangkut Baju Logam', 'Hantar ke pusat kitar semula atau pulangkan kepada kedai dobi.', true),
  ('a cooking pot or pan', 'Pot or Pan', 'metal', true, 'Too big for the bin. Take it to a recycling centre as scrap metal.', 'Periuk atau Kuali', 'Terlalu besar untuk tong. Hantar ke pusat kitar semula sebagai besi buruk.', true),
  ('a paint tin', 'Paint Tin', 'general', false, 'Leftover paint is hazardous. Ask your council about hazardous-waste collection.', 'Tin Cat', 'Sisa cat berbahaya. Tanya majlis tempatan tentang kutipan sisa berbahaya.', true),
  -- Glass
  ('a perfume bottle', 'Perfume Bottle', 'glass', true, 'Empty it and remove the spray top if you can.', 'Botol Minyak Wangi', 'Kosongkan dan tanggalkan penyembur jika boleh.', true),
  ('a sauce bottle', 'Sauce Bottle', 'glass', true, 'Rinse and remove the cap.', 'Botol Sos', 'Bilas dan tanggalkan penutup.', true),
  ('broken glass', 'Broken Glass', 'general', false, 'Wrap it in newspaper so nobody gets cut, then general waste.', 'Kaca Pecah', 'Balut dengan surat khabar supaya tiada sesiapa terluka, kemudian sisa am.', true),
  ('a mirror', 'Mirror', 'general', false, 'Mirror glass isn''t accepted with bottles. Wrap it and put it in general waste.', 'Cermin', 'Kaca cermin tidak diterima bersama botol. Balut dan buang ke sisa am.', true),
  -- E-waste
  ('a laptop', 'Laptop', 'e-waste', false, 'Take it to an e-waste drop-off. Wipe your data first.', 'Komputer Riba', 'Hantar ke pusat pengumpulan e-sisa. Padamkan data anda dahulu.', true),
  ('a power bank', 'Power Bank', 'e-waste', false, 'Contains a lithium battery. Never put it in a bin.', 'Power Bank', 'Mengandungi bateri litium. Jangan sekali-kali buang ke dalam tong.', true),
  ('a remote control', 'Remote Control', 'e-waste', false, 'Take out the batteries, then take both to an e-waste drop-off.', 'Alat Kawalan Jauh', 'Keluarkan bateri, kemudian hantar kedua-duanya ke pusat pengumpulan e-sisa.', true),
  ('an electric kettle', 'Electric Kettle', 'e-waste', false, 'Take it to an e-waste drop-off.', 'Cerek Elektrik', 'Hantar ke pusat pengumpulan e-sisa.', true),
  ('an electric fan', 'Electric Fan', 'e-waste', false, 'Take it to an e-waste drop-off.', 'Kipas Elektrik', 'Hantar ke pusat pengumpulan e-sisa.', true),
  ('a printer ink cartridge', 'Ink Cartridge', 'e-waste', false, 'Many shops take cartridges back. Otherwise an e-waste drop-off.', 'Kartrij Dakwat', 'Banyak kedai menerima kartrij terpakai. Jika tidak, hantar ke pusat pengumpulan e-sisa.', true),
  -- Food & garden
  ('eggshells', 'Eggshells', 'organic', false, 'Food waste. Great for compost.', 'Kulit Telur', 'Sisa makanan. Sangat baik untuk kompos.', true),
  ('used coffee grounds', 'Coffee Grounds', 'organic', false, 'Food waste. Great for compost or plants.', 'Hampas Kopi', 'Sisa makanan. Sangat baik untuk kompos atau tanaman.', true),
  ('a used tea bag', 'Tea Bag', 'organic', false, 'Food waste. Some tea bags contain plastic, so check before composting.', 'Uncang Teh', 'Sisa makanan. Sesetengah uncang teh mengandungi plastik, jadi semak dahulu sebelum dijadikan kompos.', true),
  ('garden leaves', 'Garden Waste', 'organic', false, 'Compost it, or use your council''s garden-waste collection.', 'Sisa Kebun', 'Jadikan kompos, atau guna kutipan sisa kebun majlis tempatan.', true),
  -- General waste
  ('a disposable diaper', 'Diaper', 'general', false, 'General waste. Wrap it first.', 'Lampin Pakai Buang', 'Sisa am. Balut dahulu.', true),
  ('a cigarette butt', 'Cigarette Butt', 'general', false, 'General waste. Never throw it on the ground or into drains.', 'Puntung Rokok', 'Sisa am. Jangan sekali-kali buang di atas tanah atau ke dalam longkang.', true),
  ('rubber gloves', 'Rubber Gloves', 'general', false, 'General waste.', 'Sarung Tangan Getah', 'Sisa am.', true),
  ('a kitchen sponge', 'Sponge', 'general', false, 'General waste.', 'Span Dapur', 'Sisa am.', true),
  ('an umbrella', 'Umbrella', 'general', false, 'Mixed materials. Donate it if it works, otherwise general waste.', 'Payung', 'Bahan bercampur. Dermakan jika masih elok, jika tidak sisa am.', true),
  ('old shoes', 'Shoes', 'general', false, 'Donate wearable pairs, or use a textile or shoe recycling bin.', 'Kasut', 'Dermakan pasangan yang masih boleh dipakai, atau guna tong kitar semula tekstil atau kasut.', true)
on conflict (label) do update set
  display_name    = excluded.display_name,
  material_id     = excluded.material_id,
  recyclable      = excluded.recyclable,
  tip             = excluded.tip,
  display_name_ms = excluded.display_name_ms,
  tip_ms          = excluded.tip_ms,
  in_ai           = excluded.in_ai;

-- ---------------------------------------------------------------------------
-- 3. Recycling hubs: anyone signed in (including anonymous users) can add one, and it shows
--    immediately. People can delete hubs they added. The daily limit stays as spam protection.
-- ---------------------------------------------------------------------------

alter table public.recycling_points alter column approved set default true;

-- Remove the test point from the live check, then publish anything still waiting for review.
delete from public.recycling_points where name = 'Claude test point (delete me)';
update public.recycling_points set approved = true where approved = false;

drop policy if exists "signed-in users can suggest points" on public.recycling_points;
drop policy if exists "signed-in users can add hubs" on public.recycling_points;
create policy "signed-in users can add hubs"
  on public.recycling_points for insert to authenticated
  with check (suggested_by = (select auth.uid()));

drop policy if exists "people can delete hubs they added" on public.recycling_points;
create policy "people can delete hubs they added"
  on public.recycling_points for delete to authenticated
  using (suggested_by = (select auth.uid()));

grant delete on public.recycling_points to authenticated;

create or replace function public.limit_point_suggestions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.suggested_by is not null and (select count(*) from public.recycling_points
      where suggested_by = new.suggested_by and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can add up to 10 hubs a day.';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_point_suggestions on public.recycling_points;
create trigger limit_point_suggestions before insert on public.recycling_points
  for each row execute function public.limit_point_suggestions();

notify pgrst, 'reload schema';

-- Check: materials with Malay names (7), items (88), items with Malay names (88).
select
  (select count(*) from public.materials where display_name_ms is not null) as materials_ms,
  (select count(*) from public.item_types) as items,
  (select count(*) from public.item_types where display_name_ms is not null) as items_ms;

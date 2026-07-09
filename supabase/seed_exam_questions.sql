-- ============================================================================
-- Seed: 10 pre-test + 10 post-test general-knowledge questions per session.
--
-- `answer` is the ZERO-BASED index into the `choices` array.
-- Cross-joins onto `courses`, so every session gets the same 20 questions.
-- Safe to re-run: skips any course/type that already has questions.
-- ============================================================================

insert into public.exam_questions (course_id, type, question, choices, answer)
select c.id, q.type, q.question, q.choices::jsonb, q.answer
from public.courses c
cross join (values
  -- ── PRE-TEST (10) ─────────────────────────────────────────────────────────
  ('pre',  'What is the capital of the Philippines?',
           '["Cebu City","Manila","Davao City","Baguio City"]', 1),
  ('pre',  'How many continents are there on Earth?',
           '["Five","Six","Seven","Eight"]', 2),
  ('pre',  'Which planet is known as the Red Planet?',
           '["Venus","Mars","Jupiter","Mercury"]', 1),
  ('pre',  'What is the largest ocean on Earth?',
           '["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"]', 3),
  ('pre',  'Who wrote the novel Noli Me Tangere?',
           '["Andres Bonifacio","Jose Rizal","Apolinario Mabini","Emilio Aguinaldo"]', 1),
  ('pre',  'What is the chemical formula for water?',
           '["WA","H2O","O2","HO2"]', 1),
  ('pre',  'How many days are in a leap year?',
           '["364","365","366","367"]', 2),
  ('pre',  'What is the smallest prime number?',
           '["Zero","One","Two","Three"]', 2),
  ('pre',  'Which gas do plants absorb from the air for photosynthesis?',
           '["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"]', 2),
  ('pre',  'In what year did the Philippines declare independence from Spain?',
           '["1896","1898","1900","1902"]', 1),

  -- ── POST-TEST (10) ────────────────────────────────────────────────────────
  ('post', 'What is the official currency of the Philippines?',
           '["Peso","Ringgit","Baht","Rupiah"]', 0),
  ('post', 'How many sides does a hexagon have?',
           '["Five","Six","Seven","Eight"]', 1),
  ('post', 'Which organ pumps blood through the human body?',
           '["Lungs","Liver","Heart","Kidney"]', 2),
  ('post', 'What is the highest mountain in the Philippines?',
           '["Mount Pulag","Mount Apo","Mount Mayon","Mount Halcon"]', 1),
  ('post', 'Which is the largest planet in our solar system?',
           '["Saturn","Jupiter","Neptune","Earth"]', 1),
  ('post', 'What does WWW stand for?',
           '["World Wide Web","Web Wide World","Wide World Web","World Web Wide"]', 0),
  ('post', 'How many minutes are in a full day?',
           '["1200","1440","1600","2400"]', 1),
  ('post', 'Which language has the most native speakers worldwide?',
           '["English","Spanish","Mandarin Chinese","Hindi"]', 2),
  ('post', 'What is the freezing point of water in degrees Celsius?',
           '["Minus 10","Zero","32","100"]', 1),
  ('post', 'Who is known as the Father of the Philippine Revolution?',
           '["Jose Rizal","Andres Bonifacio","Emilio Aguinaldo","Marcelo del Pilar"]', 1)
) as q(type, question, choices, answer)
where not exists (
  select 1 from public.exam_questions e
  where e.course_id = c.id and e.type = q.type
);

-- Sanity check — expect 10 pre + 10 post for each session.
select course_id, type, count(*) as questions
from public.exam_questions
group by course_id, type
order by course_id, type;

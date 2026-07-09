-- ============================================================================
-- Seed: 5 pre-test + 5 post-test SAMPLE (general-knowledge) questions per
-- session. The pre and post sets are different questions.
--
-- `answer` is the ZERO-BASED index into the `choices` array.
-- Cross-joins onto `courses`, so every session gets the same sample set.
-- Re-runnable: clears existing questions first.
-- ============================================================================

delete from public.exam_questions;

insert into public.exam_questions (course_id, type, question, choices, answer)
select c.id, q.type, q.question, q.choices::jsonb, q.answer
from public.courses c
cross join (values
  -- ── PRE-TEST (5) ──────────────────────────────────────────────────────────
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

  -- ── POST-TEST (5) — different questions ───────────────────────────────────
  ('post', 'What is the official currency of the Philippines?',
           '["Peso","Ringgit","Baht","Rupiah"]', 0),
  ('post', 'How many sides does a hexagon have?',
           '["Five","Six","Seven","Eight"]', 1),
  ('post', 'Which organ pumps blood through the human body?',
           '["Lungs","Liver","Heart","Kidney"]', 2),
  ('post', 'What is the freezing point of water in degrees Celsius?',
           '["Minus 10","Zero","32","100"]', 1),
  ('post', 'Who is known as the Father of the Philippine Revolution?',
           '["Jose Rizal","Andres Bonifacio","Emilio Aguinaldo","Marcelo del Pilar"]', 1)
) as q(type, question, choices, answer);

-- Sanity check — expect 5 pre + 5 post for each session.
select course_id, type, count(*) as questions
from public.exam_questions
group by course_id, type
order by course_id, type;

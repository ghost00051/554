CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    year VARCHAR(9) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, academic_year_id)
);

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    class_id INTEGER REFERENCES classes(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id),
    grade NUMERIC(3,1) CHECK (grade >= 1 AND grade <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_recommendations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id),
    score NUMERIC(4,2) CHECK (score >= 0 AND score <= 10),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS final_recommendations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    recommended_class_id INTEGER REFERENCES classes(id),
    total_score NUMERIC(5,2),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subjects (name) VALUES 
    ('Математика'),
    ('Русский язык'),
    ('Физика'),
    ('Химия'),
    ('Биология'),
    ('История')
ON CONFLICT (name) DO NOTHING;

INSERT INTO academic_years (year, is_active) 
VALUES (to_char(CURRENT_DATE, 'YYYY') || '-' || to_char(CURRENT_DATE + interval '1 year', 'YYYY'), true)
ON CONFLICT (year) DO NOTHING;

DO $$
DECLARE
    year_id INTEGER;
    class_names TEXT[] := ARRAY['7А', '7Б', '8А', '8Б', '9А', '9Б'];
    class_name TEXT;
BEGIN
    SELECT id INTO year_id FROM academic_years WHERE is_active = true LIMIT 1;
    
    IF year_id IS NOT NULL THEN
        FOREACH class_name IN ARRAY class_names
        LOOP
            INSERT INTO classes (name, academic_year_id) 
            VALUES (class_name, year_id)
            ON CONFLICT (name, academic_year_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;
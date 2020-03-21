CREATE TABLE answers (
    id serial PRIMARY KEY,
    stage integer,
    user_id text,
    answer character(1),
    answer_time timestamp default current_timestamp,
    UNIQUE(stage, user_id)
);

CREATE TABLE corrects (
    stage integer PRIMARY KEY,
    correct character(1) NOT NULL
);

CREATE TABLE users (
    id text PRIMARY KEY,
    display_name text
);
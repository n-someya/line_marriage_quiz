CREATE TABLE answers (
    id serial PRIMARY KEY,
    stage integer,
    user_id character(256),
    answer character(1),
    UNIQUE(stage, user_id)
);

CREATE TABLE corrects (
    stage integer PRIMARY KEY,
    correct character(1)
);

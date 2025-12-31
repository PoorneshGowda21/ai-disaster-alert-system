CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50),
    severity VARCHAR(20),
    description TEXT,
    latitude FLOAT,
    longitude FLOAT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    area VARCHAR(100),
    risk_score FLOAT,
    model_confidence FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    area VARCHAR(100),
    level VARCHAR(20),
    reason TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

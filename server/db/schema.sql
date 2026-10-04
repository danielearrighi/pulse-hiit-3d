-- Database Schema for Cardio HIIT Planner

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_standard BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    keyframes JSONB NOT NULL,
    equipment JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    structure JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_assigned_plans (
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) REFERENCES plans(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, plan_id)
);

CREATE TABLE IF NOT EXISTS system_seed (
    seeded BOOLEAN DEFAULT TRUE PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS user_exercise_stats (
    user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_workouts INT DEFAULT 0 NOT NULL,
    total_minutes INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Statistical logs of plan lifecycle events (STARTPLAN / ENDPLAN).
-- "user" holds the logged-in username, or the visitor IP when anonymous.
CREATE TABLE IF NOT EXISTS exercise_logs (
    id SERIAL PRIMARY KEY,
    "user" VARCHAR(255),
    description VARCHAR(255),
    event VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_created_at ON exercise_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_event ON exercise_logs (event);
